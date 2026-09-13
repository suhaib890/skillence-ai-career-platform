"""
Ensemble predictor used at serve time.

If trained artifacts exist in MODELS_DIR it runs the real CatBoost+XGBoost
ensemble (0.7 / 0.3). Otherwise it falls back to a transparent heuristic scorer
based on skill/interest/education overlap, so the API works end-to-end before
any model is trained.

A small multiplicative preference boost re-weights careers toward the user's
stated `career_preference`.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from ..config import settings
from .constants import (
    CAREERS,
    INTERESTS_VOCAB,
    PREFERENCE_AFFINITY,
    load_career_skills,
)
from .preprocessing import FeaturePreprocessor

PREF_BOOST = 1.12  # +12% to careers aligned with the user's preference


class CareerPredictor:
    def __init__(self) -> None:
        self.mode = "heuristic"
        self.models_dir = Path(settings.MODELS_DIR)
        self.careers = CAREERS
        self._career_skills = load_career_skills()
        self.pre: FeaturePreprocessor | None = None
        self.cat = None
        self.xgb = None
        self.le = None
        self.weights = {"catboost": 0.7, "xgboost": 0.3}
        self._try_load_models()

    # ------------------------------------------------------------------
    def _try_load_models(self) -> None:
        meta = self.models_dir / "meta.json"
        if not meta.exists():
            return
        try:
            import joblib
            from catboost import CatBoostClassifier
            from xgboost import XGBClassifier

            import json

            m = json.loads(meta.read_text(encoding="utf-8"))
            self.weights = m.get("weights", self.weights)
            self.pre = FeaturePreprocessor.load(self.models_dir / "preprocessor.joblib")
            self.le = joblib.load(self.models_dir / "label_encoder.joblib")
            self.cat = CatBoostClassifier()
            self.cat.load_model(str(self.models_dir / "catboost.cbm"))
            self.xgb = XGBClassifier()
            self.xgb.load_model(str(self.models_dir / "xgboost.json"))
            self.careers = list(self.le.classes_)
            self.mode = "ensemble"
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[predictor] model load failed ({exc!r}); using heuristic.")
            self.mode = "heuristic"

    # ------------------------------------------------------------------
    def _ensemble_scores(self, payload: dict) -> dict[str, float]:
        X = self.pre.transform_one(payload)
        p = (
            self.weights["catboost"] * self.cat.predict_proba(X)[0]
            + self.weights["xgboost"] * self.xgb.predict_proba(X)[0]
        )
        return {self.le.classes_[i]: float(p[i]) for i in range(len(p))}

    def _heuristic_scores(self, payload: dict) -> dict[str, float]:
        owned = {s.strip() for s in payload.get("skills", []) if s}
        interests = {i.strip() for i in payload.get("interests", [])}
        scores: dict[str, float] = {}
        for career, req in self._career_skills.items():
            skill_overlap = len(owned & set(req)) / max(1, len(req))
            # interest signal: does the career's preference-affinity / name relate?
            interest_hit = sum(
                1 for it in interests if it in INTERESTS_VOCAB and it.lower() in career.lower()
            )
            scores[career] = 0.8 * skill_overlap + 0.2 * min(1.0, interest_hit)
        return scores

    # ------------------------------------------------------------------
    def predict(self, payload: dict, top_k: int = 3) -> list[tuple[str, float]]:
        scores = (
            self._ensemble_scores(payload)
            if self.mode == "ensemble"
            else self._heuristic_scores(payload)
        )

        # preference boost
        pref = payload.get("career_preference")
        boosted = PREFERENCE_AFFINITY.get(pref, [])
        for c in boosted:
            if c in scores:
                scores[c] *= PREF_BOOST

        # convert raw scores into a clean 40–99 match % band, scaled to the best fit
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        max_raw = ranked[0][1] if ranked and ranked[0][1] > 0 else 1.0
        out: list[tuple[str, float]] = []
        for career, raw in ranked[:top_k]:
            match_pct = round(min(99.0, 40.0 + 59.0 * (raw / max_raw)), 1)
            out.append((career, match_pct))
        return out


# module-level singleton, loaded once at import
predictor = CareerPredictor()
