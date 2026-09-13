"""AI Skill Gap Analyzer — the core readiness engine.

For a given career and a user's owned skills (with optional proficiency
levels) it computes a proficiency-aware Career Readiness Score, splits skills
into present vs missing, prioritises the gaps, estimates learning time, and
generates a personalised learning roadmap.

This is the heart of the skill-gap module; the market / roadmap engines stay
focused on their own concerns and this one composes everything readiness.
"""

from __future__ import annotations

from ..ml.constants import (
    DEFAULT_PROFICIENCY,
    DEFAULT_SKILL_META,
    PROFICIENCY_MULTIPLIER,
    importance_band,
    load_career_skills,
    load_skill_catalog,
    readiness_level,
)


def _weeks_label(weeks: int) -> str:
    if weeks <= 0:
        return "Ready now"
    return f"{weeks} Week" if weeks == 1 else f"{weeks} Weeks"


class SkillGapAnalyzer:
    """Proficiency-aware readiness + gap analysis for a single career."""

    def __init__(self) -> None:
        self._required = load_career_skills()
        self._catalog = load_skill_catalog()

    # -- reference accessors -------------------------------------------------
    def _meta(self, skill: str) -> dict:
        return self._catalog.get(skill, DEFAULT_SKILL_META)

    def required(self, career: str) -> list[str]:
        return self._required.get(career, [])

    def weights(self, career: str) -> dict[str, int]:
        """importance_weight for each required skill of a career."""
        return {s: self._meta(s)["weight"] for s in self.required(career)}

    # -- analysis ------------------------------------------------------------
    def analyze(
        self,
        career: str,
        owned_skills: list[str],
        skill_levels: dict[str, str] | None = None,
    ) -> dict:
        skill_levels = skill_levels or {}
        owned = {s.strip() for s in owned_skills if s and s.strip()}
        required = self.required(career)
        total_weight = sum(self._meta(s)["weight"] for s in required) or 1

        present: list[dict] = []
        missing: list[dict] = []
        matched_weight = 0.0

        for skill in required:
            meta = self._meta(skill)
            weight = meta["weight"]
            band = importance_band(weight)

            if skill in owned:
                level = skill_levels.get(skill, DEFAULT_PROFICIENCY)
                if level not in PROFICIENCY_MULTIPLIER:
                    level = DEFAULT_PROFICIENCY
                mult = PROFICIENCY_MULTIPLIER[level]
                contribution = weight * mult
                matched_weight += contribution
                present.append(
                    {
                        "skill": skill,
                        "weight": weight,
                        "importance": band,
                        "level": level,
                        "proficiency_pct": round(mult * 100),
                        "contribution": round(contribution, 1),
                    }
                )
            else:
                missing.append(
                    {
                        "skill": skill,
                        "weight": weight,
                        "importance": band,
                        "priority": band,  # alias used by the UI
                        "difficulty": meta["difficulty"],
                        "weeks": meta["weeks"],
                        "estimated_time": _weeks_label(meta["weeks"]),
                    }
                )

        readiness = max(0, min(100, round(100 * matched_weight / total_weight)))
        level_label = readiness_level(readiness)

        # prioritise: heaviest (most important) gaps first
        missing.sort(key=lambda m: (-m["weight"], m["skill"]))
        present.sort(key=lambda p: (-p["weight"], p["skill"]))

        total_weeks = sum(m["weeks"] for m in missing)

        return {
            "career": career,
            "readiness_score": readiness,
            "readiness_level": level_label,
            "job_ready": readiness >= 91,
            "present_skills": present,
            "missing_skills": missing,
            "matched_weight": round(matched_weight, 1),
            "total_required_weight": total_weight,
            "estimated_weeks": total_weeks,
            "estimated_time": _weeks_label(total_weeks),
            "learning_roadmap": self._roadmap(career, missing),
        }

    # -- roadmap -------------------------------------------------------------
    def _roadmap(self, career: str, missing: list[dict]) -> list[str]:
        """Dynamic learning path built from the prioritised missing skills."""
        if not missing:
            return [
                "Current state",
                f"Polish your {career} fundamentals",
                "Build a standout portfolio",
                "Apply for jobs",
            ]
        steps = ["Current state"]
        steps += [f"Learn {m['skill']}" for m in missing]
        steps += [
            f"Build a {career} project",
            "Build your portfolio",
            "Apply for jobs",
        ]
        return steps
