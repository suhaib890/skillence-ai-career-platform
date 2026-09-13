"""Resume Intelligence engine.

Compares a resume against a job description using NLP / vector-space semantic
similarity (TF-IDF + cosine) plus lexical skill & keyword extraction, then
derives:

  - Resume Match Score      (semantic + skill + keyword alignment)
  - ATS Score               (structure + keyword coverage heuristics)
  - Extracted skills & keywords  (resume and JD)
  - Missing skills & keywords
  - Improvement suggestions      (rule-based)
  - Resume rewrite suggestions    (template-based, editable)
  - Job Readiness Score          (blended, banded)

The semantic model is a TF-IDF vector space (offline, no model download). It is
intentionally swappable: replace `_semantic_similarity` with a sentence-embedding
model (e.g. sentence-transformers) for richer semantics without touching callers.
"""

from __future__ import annotations

import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..ml.constants import (
    DEFAULT_SKILL_META,
    importance_band,
    load_resume_skill_library,
    load_skill_catalog,
    readiness_level,
)

_SECTION_HINTS = [
    "experience", "education", "skills", "projects", "summary",
    "objective", "certifications", "achievements", "work history",
]
_ACTION_VERBS = [
    "built", "designed", "developed", "led", "implemented", "created",
    "improved", "managed", "launched", "automated", "analyzed", "optimized",
    "delivered", "reduced", "increased", "engineered", "deployed", "owned",
]
# common job-description boilerplate that makes poor "keywords"
_JD_STOPWORDS = {
    "hiring", "requirements", "required", "strong", "excellent", "experience",
    "role", "looking", "candidate", "candidates", "ability", "work", "team",
    "join", "responsibilities", "qualifications", "preferred", "plus", "good",
    "knowledge", "understanding", "years", "year", "job", "position", "company",
    "skills", "must", "etc", "including", "related", "field", "degree",
}
_EMAIL_RE = re.compile(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", re.I)
_PHONE_RE = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
_NUMBER_RE = re.compile(r"\b\d+(\.\d+)?%?\b")
_BULLET_RE = re.compile(r"(^|\n)\s*[-•*▪◦]\s+")


class ResumeIntelligenceEngine:
    def __init__(self) -> None:
        self._library = load_resume_skill_library()
        self._catalog = load_skill_catalog()
        # precompile one boundary-aware regex per canonical skill
        self._patterns: dict[str, re.Pattern] = {}
        for canonical, aliases in self._library.items():
            phrases = sorted({canonical.lower(), *[a.lower() for a in aliases]}, key=len, reverse=True)
            alt = "|".join(re.escape(p) for p in phrases)
            self._patterns[canonical] = re.compile(
                rf"(?<![a-z0-9+#]){alt}(?![a-z0-9+#])", re.I
            )

    # -- extraction ----------------------------------------------------------
    def extract_skills(self, text: str) -> list[str]:
        found = [c for c, pat in self._patterns.items() if pat.search(text)]
        return found

    def extract_keywords(self, resume: str, jd: str, top_n: int = 15) -> list[str]:
        """Keywords most distinctive to the JD (TF-IDF over [resume, jd]).

        Unigrams only — single, clean tokens make far better keyword chips and
        coverage signals than noisy bigrams ("analysis build").
        """
        try:
            vec = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 1),
                token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z+#./-]{2,}\b",
                max_features=400,
            )
            matrix = vec.fit_transform([resume or " ", jd or " "])
        except ValueError:
            return []
        terms = vec.get_feature_names_out()
        jd_row = matrix[1].toarray()[0]
        ranked = sorted(
            ((terms[i], jd_row[i]) for i in range(len(terms)) if jd_row[i] > 0),
            key=lambda kv: kv[1],
            reverse=True,
        )
        keywords: list[str] = []
        for term, _ in ranked:
            t = term.strip()
            if len(t) < 3 or t.isdigit() or t in _JD_STOPWORDS:
                continue
            keywords.append(t)
            if len(keywords) >= top_n:
                break
        return keywords

    # -- similarity ----------------------------------------------------------
    def _semantic_similarity(self, resume: str, jd: str) -> float:
        try:
            vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            matrix = vec.fit_transform([resume, jd])
        except ValueError:
            return 0.0
        sim = cosine_similarity(matrix[0], matrix[1])[0][0]
        return float(max(0.0, min(1.0, sim)))

    # -- scoring helpers -----------------------------------------------------
    def _weight(self, skill: str) -> int:
        return self._catalog.get(skill, DEFAULT_SKILL_META)["weight"]

    def _ats_score(self, resume: str, keyword_coverage: float) -> tuple[int, list[str]]:
        text = resume or ""
        lower = text.lower()
        words = re.findall(r"\b\w+\b", text)
        word_count = len(words)
        checks: list[str] = []
        score = 0.0

        if _EMAIL_RE.search(text) or _PHONE_RE.search(text):
            score += 10
        else:
            checks.append("Add clear contact details (email and phone).")

        sections = sum(1 for s in _SECTION_HINTS if s in lower)
        score += min(15, sections * 4)
        if sections < 3:
            checks.append("Use standard section headers (Summary, Experience, Skills, Education).")

        if _BULLET_RE.search(text):
            score += 10
        else:
            checks.append("Use bullet points so ATS parsers can segment your experience.")

        numbers = len(_NUMBER_RE.findall(text))
        score += min(15, numbers * 3)
        if numbers < 2:
            checks.append("Quantify achievements with concrete metrics (%, ₹, counts).")

        verbs = sum(1 for v in _ACTION_VERBS if re.search(rf"\b{v}\b", lower))
        score += min(10, verbs * 2)
        if verbs < 3:
            checks.append("Start bullets with strong action verbs (Built, Led, Improved…).")

        if 200 <= word_count <= 900:
            score += 10
        else:
            checks.append(
                "Aim for ~1 page (200–900 words); "
                + ("expand thin sections." if word_count < 200 else "trim verbose sections.")
            )

        # keyword coverage is the heaviest ATS lever
        score += round(30 * keyword_coverage)

        return int(max(0, min(100, round(score)))), checks

    # -- suggestions ---------------------------------------------------------
    def _improvements(
        self,
        missing_skills: list[str],
        missing_keywords: list[str],
        ats_checks: list[str],
        match_score: int,
    ) -> list[str]:
        tips: list[str] = []
        if missing_skills:
            tips.append(
                "Add evidence of these in-demand skills the role expects: "
                + ", ".join(missing_skills[:5]) + "."
            )
        if missing_keywords:
            tips.append(
                "Mirror the job description's language — weave in keywords like "
                + ", ".join(missing_keywords[:6]) + "."
            )
        if match_score < 60:
            tips.append(
                "Re-order your resume so the most relevant experience for THIS role appears first."
            )
        tips.extend(ats_checks)
        if not tips:
            tips.append("Strong alignment — tailor the summary line to the exact job title and you're set.")
        return tips

    def _rewrites(self, missing_skills: list[str], matched_skills: list[str], jd_keywords: list[str]) -> list[dict]:
        rewrites: list[dict] = []
        focus_kw = ", ".join(jd_keywords[:3]) if jd_keywords else "the target role"
        anchor = ", ".join(matched_skills[:3]) if matched_skills else "your core strengths"
        rewrites.append(
            {
                "focus": "Professional summary",
                "example": (
                    f"Results-driven professional with hands-on experience in {anchor}, "
                    f"targeting roles centred on {focus_kw}. Proven record of delivering measurable impact."
                ),
            }
        )
        for skill in missing_skills[:3]:
            rewrites.append(
                {
                    "focus": f"Bullet showcasing {skill}",
                    "example": (
                        f"Used {skill} to <build/automate/analyze> <what>, "
                        f"improving <metric> by <X>% (replace with a real, quantified result)."
                    ),
                }
            )
        rewrites.append(
            {
                "focus": "Impact rewrite pattern",
                "example": "<Action verb> <what you did> using <tools/skills>, resulting in <quantified outcome>.",
            }
        )
        return rewrites

    # -- public API ----------------------------------------------------------
    def analyze(self, resume_text: str, job_description: str) -> dict:
        resume = (resume_text or "").strip()
        jd = (job_description or "").strip()

        resume_skills = self.extract_skills(resume)
        jd_skills = self.extract_skills(jd)
        matched_skills = [s for s in jd_skills if s in resume_skills]
        missing_skills = [s for s in jd_skills if s not in resume_skills]
        # prioritise missing skills by importance weight
        missing_skills_ranked = sorted(missing_skills, key=lambda s: -self._weight(s))
        missing_skills_detail = [
            {
                "skill": s,
                "weight": self._weight(s),
                "priority": importance_band(self._weight(s)),
            }
            for s in missing_skills_ranked
        ]

        keywords = self.extract_keywords(resume, jd)
        resume_lower = resume.lower()
        matched_keywords = [k for k in keywords if k in resume_lower]
        missing_keywords = [k for k in keywords if k not in resume_lower]

        skill_overlap = len(matched_skills) / max(1, len(jd_skills))
        keyword_coverage = len(matched_keywords) / max(1, len(keywords))
        semantic = self._semantic_similarity(resume, jd) if resume and jd else 0.0
        semantic_norm = min(1.0, semantic / 0.5)

        match_score = int(
            round(100 * (0.45 * skill_overlap + 0.30 * keyword_coverage + 0.25 * semantic_norm))
        )
        match_score = max(0, min(100, match_score))

        ats_score, ats_checks = self._ats_score(resume, keyword_coverage)

        job_readiness = int(
            round(0.45 * match_score + 0.25 * ats_score + 0.30 * (skill_overlap * 100))
        )
        job_readiness = max(0, min(100, job_readiness))

        return {
            "match_score": match_score,
            "ats_score": ats_score,
            "semantic_similarity": round(semantic * 100),
            "skill_match_pct": round(skill_overlap * 100),
            "keyword_coverage_pct": round(keyword_coverage * 100),
            "resume_skills": sorted(resume_skills),
            "jd_skills": sorted(jd_skills),
            "matched_skills": sorted(matched_skills),
            "missing_skills": missing_skills_detail,
            "jd_keywords": keywords,
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "improvement_suggestions": self._improvements(
                missing_skills_ranked, missing_keywords, ats_checks, match_score
            ),
            "rewrite_suggestions": self._rewrites(missing_skills_ranked, matched_skills, keywords),
            "job_readiness_score": job_readiness,
            "job_readiness_level": readiness_level(job_readiness),
        }
