"""Transition Intelligence™ router.

Generates and persists personalized current→target transition plans, and serves
the roadmap, forecast and recommended projects. No authentication — plans are
stored anonymously for inspection.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..engines import transition_engine
from ..engines.transition import TransitionEngine
from ..models import (
    RecommendedProject,
    TransitionForecast,
    TransitionMilestone,
    TransitionPhase,
)
from ..models import TransitionPlan as TransitionPlanRow
from ..schemas import TransitionInput, TransitionPlan

router = APIRouter(prefix="/api", tags=["transition"])

# reuse the singleton engine (loads data once)
engine: TransitionEngine = transition_engine


def _persist(db: Session, profile: dict, result: dict, user_id: int | None = None) -> int:
    row = TransitionPlanRow(
        user_id=user_id,
        target_career=result["target_career"],
        profile=profile,
        result=result,
        final_readiness=result["forecast"]["final_readiness"],
        job_ready=result["forecast"]["job_ready"],
        llm_used=result["llm_used"],
    )
    db.add(row)
    db.flush()  # assign row.id

    for ph in result["phases"]:
        db.add(TransitionPhase(
            plan_id=row.id, phase_order=ph["phase"], name=ph["name"], goal=ph["goal"],
            skills=ph["skills"], duration_weeks=ph["duration_weeks"], outcome=ph["outcome"],
        ))
        db.add(TransitionMilestone(plan_id=row.id, phase_order=ph["phase"], label=ph["milestone"]))
    for step in result["forecast"]["steps"]:
        db.add(TransitionForecast(plan_id=row.id, stage=step["stage"], readiness=step["readiness"]))
    for pr in result["recommended_projects"]:
        db.add(RecommendedProject(
            plan_id=row.id, name=pr["name"], difficulty=pr["difficulty"],
            weeks=pr["weeks"], skills=pr["skills"],
        ))

    db.commit()
    return row.id


@router.post("/generate-transition-plan", response_model=TransitionPlan)
def generate_transition_plan(
    payload: TransitionInput, db: Session = Depends(get_db)
) -> TransitionPlan:
    profile = payload.model_dump()
    target = profile.pop("target_career")
    # user_id is an onboarding link, not a profile feature — keep it out of the engine
    user_id = profile.pop("user_id", None)
    result = engine.generate(profile, target)
    plan_id = _persist(db, profile, result, user_id=user_id)
    if user_id:
        from ..security import record_activity
        record_activity(db, user_id, "transition", {"plan_id": plan_id, "target": target})
    return TransitionPlan(plan_id=plan_id, **result)


def _load(db: Session, plan_id: int) -> dict:
    row = db.get(TransitionPlanRow, plan_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Transition plan not found")
    return row.result


@router.get("/transition-roadmap/{plan_id}")
def transition_roadmap(plan_id: int, db: Session = Depends(get_db)) -> dict:
    result = _load(db, plan_id)
    return {
        "target_career": result["target_career"],
        "phases": result["phases"],
        "timeline": result["timeline"],
    }


@router.get("/transition-forecast/{plan_id}")
def transition_forecast(plan_id: int, db: Session = Depends(get_db)) -> dict:
    result = _load(db, plan_id)
    return result["forecast"]


@router.get("/recommended-projects/{career}")
def recommended_projects(career: str) -> dict:
    return {"career": career, "projects": engine._projects_for(career)}
