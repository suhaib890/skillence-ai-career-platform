"""Phase 7 — Roadmap engine. Ordered learning path per career."""

from __future__ import annotations

from ..ml.constants import load_roadmaps


class RoadmapEngine:
    def __init__(self) -> None:
        self._roadmaps = load_roadmaps()

    def get(self, career: str) -> list[str]:
        return self._roadmaps.get(career, ["Foundations", "Core Skills", "Projects", "Job Ready"])
