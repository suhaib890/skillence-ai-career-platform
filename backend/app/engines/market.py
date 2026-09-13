"""Phase 5 — Market hype engine. Demand / salary / growth per career."""

from __future__ import annotations

from ..ml.constants import load_market_data

_DEFAULT = {"demand_score": 70, "salary_range": "₹4–10 LPA", "growth_score": 65, "growth_label": "Moderate"}


class MarketEngine:
    def __init__(self) -> None:
        self._data = load_market_data()

    def get(self, career: str) -> dict:
        return self._data.get(career, _DEFAULT)

    def all(self) -> dict[str, dict]:
        return self._data
