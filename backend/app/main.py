"""Skillence FastAPI application entry point."""

from __future__ import annotations

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .metrics import metrics
from .routers import admin, auth, career, interview, resume, transition, users
from .seed import ensure_schema, seed_reference_data

app = FastAPI(
    title="Skillence API",
    description="AI-powered career advisory system — top-3 career recommendations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _track_metrics(request: Request, call_next):
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        if request.url.path.startswith("/api"):
            metrics.record(request.url.path, status_code, (time.perf_counter() - start) * 1000)


@app.on_event("startup")
def on_startup() -> None:
    # create tables (use Alembic for real migrations in production)
    Base.metadata.create_all(bind=engine)
    # add columns introduced after the DB was first created
    ensure_schema(engine)
    # seed skill-gap reference data (idempotent)
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()


@app.get("/health", tags=["meta"])
def health() -> dict:
    from .ml.predictor import predictor

    return {"status": "ok", "predictor_mode": predictor.mode}


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(career.router)
app.include_router(resume.router)
app.include_router(transition.router)
app.include_router(interview.router)
