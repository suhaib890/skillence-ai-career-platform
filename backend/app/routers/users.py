"""Onboarding / user router (MVP dummy auth — name + email, no password).

Provides the minimal account surface the rest of Skillence links its data to:

  * POST /api/users/create     — onboard or auto-login (get-or-create by email)
  * GET  /api/users/{id}        — load a profile
  * GET  /api/users/{id}/dashboard — everything the user can revisit

The User model already carries an `auth_provider` column, so OAuth providers
(Google, LinkedIn, GitHub, OTP) can be added later without a schema change.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Assessment,
    CareerReadinessScore,
    Interview,
    Recommendation,
    ResumeAnalysis,
    TransitionPlan,
    User,
)
from ..schemas import UserCreate, UserDashboard, UserOut
from ..security import record_activity
from ..services import get_or_create_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/create", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """Onboard a new user, or auto-login a returning one (same email)."""
    user, created = get_or_create_user(db, payload.full_name, payload.email)
    if created:
        record_activity(db, user.id, "signup", {"email": user.email})
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


@router.get("/{user_id}/dashboard", response_model=UserDashboard)
def user_dashboard(user_id: int, db: Session = Depends(get_db)) -> UserDashboard:
    """Aggregate the user's full history so they can revisit prior results."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # ---- assessments + their recommendations ----
    assessments = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(desc(Assessment.created_at))
        .all()
    )
    assessment_ids = [a.id for a in assessments]

    assessments_out = [
        {
            "assessment_id": a.id,
            "education": a.education,
            "skills": a.skills or [],
            "interests": a.interests or [],
            "experience": a.experience,
            "passout_year": a.passout_year,
            "career_preference": a.career_preference,
            "created_at": _iso(a.created_at),
        }
        for a in assessments
    ]

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.user_id == user_id)
        .order_by(desc(Recommendation.created_at))
        .all()
    )
    recommendations_out = [
        {
            "recommendation_id": r.id,
            "assessment_id": r.assessment_id,
            # store the Top-3 careers compactly for the dashboard
            "top_careers": [
                {
                    "career": item.get("career"),
                    "match_pct": item.get("match_pct"),
                    "readiness_score": item.get("readiness_score"),
                    "salary_range": item.get("salary_range"),
                }
                for item in (r.results or [])
            ],
            "created_at": _iso(r.created_at),
        }
        for r in recs
    ]

    # ---- skill-gap / readiness reports (tied to the user's assessments) ----
    skill_gap_out: list[dict] = []
    if assessment_ids:
        readiness = (
            db.query(CareerReadinessScore)
            .filter(CareerReadinessScore.assessment_id.in_(assessment_ids))
            .order_by(desc(CareerReadinessScore.created_at))
            .all()
        )
        skill_gap_out = [
            {
                "analysis_id": s.id,
                "assessment_id": s.assessment_id,
                "career_name": s.career_name,
                "readiness_score": s.readiness_score,
                "readiness_level": s.readiness_level,
                "estimated_weeks": s.estimated_weeks,
                "created_at": _iso(s.created_at),
            }
            for s in readiness
        ]

    # ---- transition plans ----
    plans = (
        db.query(TransitionPlan)
        .filter(TransitionPlan.user_id == user_id)
        .order_by(desc(TransitionPlan.created_at))
        .all()
    )
    transition_out = [
        {
            "plan_id": p.id,
            "target_career": p.target_career,
            "final_readiness": p.final_readiness,
            "job_ready": p.job_ready,
            "created_at": _iso(p.created_at),
        }
        for p in plans
    ]

    # ---- resume analyses ----
    resumes = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == user_id)
        .order_by(desc(ResumeAnalysis.created_at))
        .all()
    )
    resume_out = [
        {
            "analysis_id": r.id,
            "match_score": r.match_score,
            "ats_score": r.ats_score,
            "job_readiness_score": r.job_readiness_score,
            "job_readiness_level": r.job_readiness_level,
            "created_at": _iso(r.created_at),
        }
        for r in resumes
    ]

    # ---- interview sessions ----
    interviews = (
        db.query(Interview)
        .filter(Interview.user_id == user_id)
        .order_by(desc(Interview.created_at))
        .all()
    )
    interviews_out = []
    for it in interviews:
        sess = it.session
        completed = it.status == "completed"
        interviews_out.append(
            {
                "session_id": it.id,
                "career": it.career,
                "interview_type": it.interview_type,
                "mode": it.mode,
                "overall_score": sess.overall_score if (sess and completed) else None,
                "readiness_level": sess.readiness_level if (sess and completed) else None,
                "completed": completed,
                "created_at": _iso(it.created_at),
            }
        )

    return UserDashboard(
        user=user,
        assessments=assessments_out,
        recommendations=recommendations_out,
        skill_gap_reports=skill_gap_out,
        transition_plans=transition_out,
        resume_analyses=resume_out,
        interviews=interviews_out,
    )
