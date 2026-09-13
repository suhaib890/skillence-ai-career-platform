"""Resume Intelligence router — resume vs job-description analysis.

No authentication: analyses are stored anonymously for inspection / history.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..engines import ResumeIntelligenceEngine
from ..models import ResumeAnalysis as ResumeAnalysisRow
from ..schemas import ResumeAnalysis, ResumeAnalyzeRequest

router = APIRouter(prefix="/api/resume", tags=["resume"])

engine = ResumeIntelligenceEngine()


@router.post("/analyze", response_model=ResumeAnalysis)
def analyze_resume(
    payload: ResumeAnalyzeRequest, db: Session = Depends(get_db)
) -> ResumeAnalysis:
    result = engine.analyze(payload.resume_text, payload.job_description)

    row = ResumeAnalysisRow(
        user_id=payload.user_id,
        resume_text=payload.resume_text,
        job_description=payload.job_description,
        match_score=result["match_score"],
        ats_score=result["ats_score"],
        job_readiness_score=result["job_readiness_score"],
        job_readiness_level=result["job_readiness_level"],
        result=result,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    if payload.user_id:
        from ..security import record_activity
        record_activity(db, payload.user_id, "resume", {"analysis_id": row.id})

    return ResumeAnalysis(analysis_id=row.id, **result)


@router.get("/analysis/{analysis_id}", response_model=ResumeAnalysis)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)) -> ResumeAnalysis:
    row = db.get(ResumeAnalysisRow, analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return ResumeAnalysis(analysis_id=row.id, **row.result)


@router.get("/history", response_model=list[dict])
def history(limit: int = 10, db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(ResumeAnalysisRow)
        .order_by(desc(ResumeAnalysisRow.created_at))
        .limit(max(1, min(50, limit)))
        .all()
    )
    return [
        {
            "analysis_id": r.id,
            "match_score": r.match_score,
            "ats_score": r.ats_score,
            "job_readiness_score": r.job_readiness_score,
            "job_readiness_level": r.job_readiness_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
