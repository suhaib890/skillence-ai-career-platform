"""Lightweight in-memory request/latency metrics for the admin monitoring page.

Process-local and best-effort — fine for an MVP single-process deployment.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Lock

# heavier ML / generation endpoints we surface as "prediction requests"
_PREDICTION_PATHS = (
    "/api/predict-career",
    "/api/skill-gap-analysis",
    "/api/start-interview",
    "/api/generate-transition-plan",
    "/api/resume/analyze",
)


class Metrics:
    def __init__(self) -> None:
        self._lock = Lock()
        self.total_requests = 0
        self.total_errors = 0
        self.prediction_requests = 0
        self.latencies_ms: deque[float] = deque(maxlen=300)
        self.recent: deque[dict] = deque(maxlen=60)  # {t, ms, status}
        self.started_at = time.time()

    def record(self, path: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self.total_requests += 1
            if status_code >= 500:
                self.total_errors += 1
            if any(path.startswith(p) for p in _PREDICTION_PATHS):
                self.prediction_requests += 1
            self.latencies_ms.append(duration_ms)
            self.recent.append({"ms": round(duration_ms, 1), "status": status_code})

    def snapshot(self) -> dict:
        with self._lock:
            lat = list(self.latencies_ms)
            avg = round(sum(lat) / len(lat), 1) if lat else 0.0
            err_rate = round(100 * self.total_errors / self.total_requests, 2) if self.total_requests else 0.0
            return {
                "total_requests": self.total_requests,
                "prediction_requests": self.prediction_requests,
                "total_errors": self.total_errors,
                "error_rate": err_rate,
                "avg_response_ms": avg,
                "uptime_seconds": int(time.time() - self.started_at),
                "latency_series": [r["ms"] for r in self.recent],
            }


metrics = Metrics()
