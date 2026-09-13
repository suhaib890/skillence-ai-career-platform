"""Recommendation assembly — ties the predictor and the engines together.

The AI Skill Gap Analyzer is integrated here: every recommended career is
returned with a proficiency-aware readiness analysis (score, present/missing
skills, prioritisation, learning time, dynamic roadmap), so the dashboard gets
recommendations and readiness in a single call.
"""

from __future__ import annotations

import uuid as uuid_lib

from sqlalchemy.orm import Session

from .engines import MarketEngine, RoadmapEngine, SkillGapAnalyzer
from .ml.predictor import predictor
from .models import User

market = MarketEngine()
roadmap = RoadmapEngine()
analyzer = SkillGapAnalyzer()


# ---------------------------------------------------------------------------
# Onboarding (MVP dummy auth) — get-or-create keyed by email.
# ---------------------------------------------------------------------------
def get_or_create_user(db: Session, full_name: str, email: str) -> tuple[User, bool]:
    """Return (user, created).

    Email is the natural key, so a returning user with the same email is
    auto-logged-in (their profile + history load) rather than duplicated. The
    `auth_provider` column stays "email" for now, so future providers (Google,
    LinkedIn, GitHub, OTP) can be added without any schema change.
    """
    email = email.strip().lower()
    full_name = full_name.strip()

    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        # keep the display name fresh if they re-onboard with a new spelling
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            db.commit()
            db.refresh(user)
        return user, False

    user = User(
        uuid=str(uuid_lib.uuid4()),
        full_name=full_name,
        email=email,
        auth_provider="email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True


def ensure_admin_user(db: Session, email: str, full_name: str = "Skillence Admin") -> User:
    """Get-or-create the user for `email` and guarantee role == 'admin'."""
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            uuid=str(uuid_lib.uuid4()),
            full_name=full_name,
            email=email,
            auth_provider="email",
            role="admin",
            is_active=True,
            status="active",
        )
        db.add(user)
    else:
        user.role = "admin"
        user.is_active = True
        user.status = "active"
    db.commit()
    db.refresh(user)
    return user


def _why(career: str, owned_required: list[str], market_info: dict, preference: str) -> str:
    bits: list[str] = []
    if owned_required:
        shown = ", ".join(owned_required[:3])
        bits.append(f"your skills in {shown} map directly onto what {career}s do")
    else:
        bits.append(f"your profile aligns with the {career} track")
    bits.append(
        f"the role shows {market_info['growth_label'].lower()} future growth "
        f"and a market demand of {market_info['demand_score']}/100"
    )
    if preference:
        bits.append(f"it also fits your preference for “{preference}”")
    sentence = "; ".join(bits)
    return sentence[0].upper() + sentence[1:] + "."


def analyze_career(career: str, payload: dict) -> dict:
    """Full skill-gap / readiness analysis for one career + user profile."""
    return analyzer.analyze(
        career,
        payload.get("skills", []),
        payload.get("skill_levels", {}),
    )


def build_recommendations(payload: dict, top_k: int = 3) -> dict:
    ranked = predictor.predict(payload, top_k=top_k)
    preference = payload.get("career_preference", "")

    top: list[dict] = []
    comparison: list[dict] = []
    for career, match_pct in ranked:
        m = market.get(career)
        gap = analyze_career(career, payload)
        owned_names = [p["skill"] for p in gap["present_skills"]]
        missing_names = [m_["skill"] for m_ in gap["missing_skills"]]

        top.append(
            {
                "career": career,
                "match_pct": match_pct,
                "why": _why(career, owned_names, m, preference),
                "market_demand_score": m["demand_score"],
                "salary_range": m["salary_range"],
                "future_growth_score": m["growth_score"],
                "future_growth_label": m["growth_label"],
                "required_skills": analyzer.required(career),
                "owned_skills": owned_names,
                "missing_skills": missing_names,
                # dynamic, missing-skill-driven roadmap
                "roadmap": gap["learning_roadmap"],
                # AI Skill Gap Analyzer
                "readiness_score": gap["readiness_score"],
                "readiness_level": gap["readiness_level"],
                "job_ready": gap["job_ready"],
                "skill_gap": gap,
            }
        )
        comparison.append(
            {
                "career": career,
                "match_pct": match_pct,
                "demand": m["demand_score"],
                "growth": m["growth_score"],
                "skill_coverage": gap["readiness_score"],
                "readiness_score": gap["readiness_score"],
                "readiness_level": gap["readiness_level"],
                "estimated_weeks": gap["estimated_weeks"],
            }
        )

    return {"top_3": top, "comparison": comparison, "mode": predictor.mode}
