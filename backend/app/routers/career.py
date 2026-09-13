"""Career router — prediction, skill-gap analysis, readiness & roadmap.

No authentication: assessments + recommendations + readiness scores are stored
anonymously for inspection.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..engines import MarketEngine, RoadmapEngine, SkillGapAnalyzer, SkillGapEngine
from ..models import Assessment, CareerReadinessScore, Recommendation
from ..schemas import (
    AssessmentIn,
    CareerDetails,
    CareerReadinessResponse,
    CareerRoadmap,
    PredictionResponse,
    ReadinessRow,
    SkillGapAnalysis,
    SkillGapRequest,
)
from ..services import analyze_career, build_recommendations

router = APIRouter(prefix="/api", tags=["career"])

market = MarketEngine()
skill_gap = SkillGapEngine()
roadmap = RoadmapEngine()
analyzer = SkillGapAnalyzer()


def _persist_readiness(db: Session, assessment_id: int, top_3: list[dict]) -> None:
    for rec in top_3:
        gap = rec["skill_gap"]
        db.add(
            CareerReadinessScore(
                assessment_id=assessment_id,
                career_name=rec["career"],
                readiness_score=gap["readiness_score"],
                readiness_level=gap["readiness_level"],
                matched_weight=gap["matched_weight"],
                total_weight=gap["total_required_weight"],
                estimated_weeks=gap["estimated_weeks"],
            )
        )


@router.post("/predict-career", response_model=PredictionResponse)
def predict_career(
    payload: AssessmentIn, db: Session = Depends(get_db)
) -> PredictionResponse:
    result = build_recommendations(payload.model_dump())

    # persist, linked to the onboarded user when a user_id is supplied
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    db.flush()
    rec = Recommendation(
        assessment_id=assessment.id,
        user_id=payload.user_id,
        results=result["top_3"],
    )
    db.add(rec)
    _persist_readiness(db, assessment.id, result["top_3"])
    db.commit()
    db.refresh(assessment)
    db.refresh(rec)

    if payload.user_id:
        from ..security import record_activity
        record_activity(db, payload.user_id, "assessment", {"assessment_id": assessment.id})

    return PredictionResponse(
        assessment_id=assessment.id,
        recommendation_id=rec.id,
        top_3=result["top_3"],
        comparison=result["comparison"],
    )


@router.post("/skill-gap-analysis", response_model=list[SkillGapAnalysis])
def skill_gap_analysis(req: SkillGapRequest) -> list[SkillGapAnalysis]:
    """Readiness + gap analysis for one career, or for the user's Top-3."""
    payload = req.assessment.model_dump()
    if req.career:
        careers = [req.career]
    else:
        careers = [rec["career"] for rec in build_recommendations(payload)["top_3"]]
    return [SkillGapAnalysis(**analyze_career(c, payload)) for c in careers]


@router.post("/career-readiness", response_model=CareerReadinessResponse)
def career_readiness(req: SkillGapRequest) -> CareerReadinessResponse:
    """Readiness comparison across the user's Top-3 (or a single career)."""
    payload = req.assessment.model_dump()
    result = build_recommendations(payload)
    rows: list[ReadinessRow] = []
    for rec in result["top_3"]:
        if req.career and rec["career"] != req.career:
            continue
        gap = rec["skill_gap"]
        rows.append(
            ReadinessRow(
                career=rec["career"],
                match_pct=rec["match_pct"],
                readiness_score=gap["readiness_score"],
                readiness_level=gap["readiness_level"],
                estimated_weeks=gap["estimated_weeks"],
            )
        )
    return CareerReadinessResponse(rows=rows)


@router.post("/career-roadmap", response_model=CareerRoadmap)
def career_roadmap_dynamic(req: SkillGapRequest) -> CareerRoadmap:
    """Personalised roadmap built from the user's missing skills."""
    if not req.career:
        raise HTTPException(status_code=422, detail="`career` is required")
    gap = analyze_career(req.career, req.assessment.model_dump())
    return CareerRoadmap(career=req.career, roadmap=gap["learning_roadmap"])


@router.get("/career-details/{career}", response_model=CareerDetails)
def career_details(career: str) -> CareerDetails:
    if career not in market.all():
        raise HTTPException(status_code=404, detail="Unknown career")
    m = market.get(career)
    return CareerDetails(
        career=career,
        market_demand_score=m["demand_score"],
        salary_range=m["salary_range"],
        future_growth_score=m["growth_score"],
        future_growth_label=m["growth_label"],
        required_skills=skill_gap.required(career),
    )


@router.get("/career-roadmap/{career}", response_model=CareerRoadmap)
def career_roadmap(career: str) -> CareerRoadmap:
    """Canonical (non-personalised) roadmap for a career."""
    return CareerRoadmap(career=career, roadmap=roadmap.get(career))


@router.get("/careers", response_model=list[str])
def list_careers() -> list[str]:
    return list(market.all().keys())
