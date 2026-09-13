"""
Skillence — Phase 3: preprocessing / feature engineering.

A single `FeaturePreprocessor` is used at BOTH train and serve time so the
feature matrix is guaranteed identical. It handles:

  * categorical encoding      -> one-hot (education, career_preference)
  * multi-label skills        -> binary indicator per skill (fixed vocab)
  * multi-label interests     -> binary indicator per interest (fixed vocab)
  * missing-value handling    -> safe defaults + imputation
  * feature engineering       -> skill_count, interest_count, experience,
                                 career_gap, years_since_passout
  * preference weighting       -> dedicated numeric column

The fitted object only needs the label encoder for y; X encoding is fully
deterministic from the fixed vocabularies, which keeps train/serve in lockstep.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .constants import (
    CURRENT_YEAR,
    EDUCATION_VOCAB,
    INTERESTS_VOCAB,
    PREFERENCE_VOCAB,
    SKILLS_VOCAB,
)


def _parse_multi(value) -> list[str]:
    """Accept ';'-separated strings or already-parsed lists."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(v).strip() for v in value if str(v).strip()]
    return [p.strip() for p in str(value).split(";") if p.strip()]


class FeaturePreprocessor:
    def __init__(self) -> None:
        self.education_vocab = EDUCATION_VOCAB
        self.skills_vocab = SKILLS_VOCAB
        self.interests_vocab = INTERESTS_VOCAB
        self.preference_vocab = PREFERENCE_VOCAB
        self.feature_names: list[str] = self._build_feature_names()

    def _build_feature_names(self) -> list[str]:
        names: list[str] = []
        names += [f"edu::{e}" for e in self.education_vocab]
        names += [f"pref::{p}" for p in self.preference_vocab]
        names += [f"skill::{s}" for s in self.skills_vocab]
        names += [f"interest::{i}" for i in self.interests_vocab]
        names += ["skill_count", "interest_count", "experience",
                  "career_gap", "years_since_passout"]
        return names

    # ----- row → feature vector -------------------------------------------
    def _row_vector(self, row: dict) -> np.ndarray:
        education = str(row.get("education") or "Other").strip()
        if education not in self.education_vocab:
            education = "Other"
        preference = str(row.get("career_preference") or "High Salary").strip()
        if preference not in self.preference_vocab:
            preference = "High Salary"

        skills = set(_parse_multi(row.get("skills")))
        interests = set(_parse_multi(row.get("interests")))

        try:
            experience = max(0, int(row.get("experience") or 0))
        except (ValueError, TypeError):
            experience = 0
        try:
            passout = int(row.get("passout_year") or CURRENT_YEAR)
        except (ValueError, TypeError):
            passout = CURRENT_YEAR

        years_since_passout = max(0, CURRENT_YEAR - passout)
        career_gap = max(0, years_since_passout - experience)

        vec: list[float] = []
        vec += [1.0 if education == e else 0.0 for e in self.education_vocab]
        vec += [1.0 if preference == p else 0.0 for p in self.preference_vocab]
        vec += [1.0 if s in skills else 0.0 for s in self.skills_vocab]
        vec += [1.0 if i in interests else 0.0 for i in self.interests_vocab]
        vec += [
            float(len(skills)),
            float(len(interests)),
            float(experience),
            float(career_gap),
            float(years_since_passout),
        ]
        return np.asarray(vec, dtype=np.float32)

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        records = df.to_dict(orient="records")
        return np.vstack([self._row_vector(r) for r in records])

    def transform_one(self, payload: dict) -> np.ndarray:
        return self._row_vector(payload).reshape(1, -1)

    # ----- persistence -----------------------------------------------------
    def save(self, path: str | Path) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: str | Path) -> "FeaturePreprocessor":
        return joblib.load(path)
