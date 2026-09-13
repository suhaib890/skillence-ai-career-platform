"""Phase 6 — Skill-gap engine. Compares owned skills vs required skills."""

from __future__ import annotations

from ..ml.constants import load_career_skills


class SkillGapEngine:
    def __init__(self) -> None:
        self._required = load_career_skills()

    def required(self, career: str) -> list[str]:
        return self._required.get(career, [])

    def analyze(self, career: str, owned_skills: list[str]) -> dict:
        owned = {s.strip() for s in owned_skills if s and s.strip()}
        required = self._required.get(career, [])
        owned_required = [s for s in required if s in owned]
        missing = [s for s in required if s not in owned]
        coverage = round(100 * len(owned_required) / len(required)) if required else 0
        return {
            "required_skills": required,
            "owned_skills": owned_required,
            "missing_skills": missing,
            "coverage_pct": coverage,
        }
