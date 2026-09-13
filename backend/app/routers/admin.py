"""Admin Portal API — analytics, CRM, user management and monitoring.

EVERY route here depends on `require_admin`, so the entire surface is gated by a
verified, signed token whose subject has role == 'admin'. There is no way to
reach this data without backend authorization.
"""

from __future__ import annotations

import csv
import io
import os
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..metrics import metrics
from ..models import (
    AdminLog,
    Assessment,
    CrmStage,
    Interview,
    InterviewFeedback,
    InterviewScore,
    InterviewSession,
    Recommendation,
    ResumeAnalysis,
    TransitionPlan,
    User,
    UserActivity,
)
from ..security import CRM_STAGES, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def _log(db: Session, admin: User, action: str, target_type: str = "", target_id=None, detail=None):
    db.add(AdminLog(admin_id=admin.id, action=action, target_type=target_type,
                    target_id=target_id, detail=detail or {}))
    db.commit()


def _count(db: Session, model) -> int:
    return db.query(func.count(model.id)).scalar() or 0


def _capability_sets(db: Session):
    def ids(model):
        return {r[0] for r in db.query(model.user_id).filter(model.user_id.isnot(None)).distinct()}

    a = ids(Assessment)
    rec = ids(Recommendation)
    res = ids(ResumeAnalysis)
    itv = ids(Interview)
    jr = {r[0] for r in db.query(TransitionPlan.user_id)
          .filter(TransitionPlan.job_ready.is_(True), TransitionPlan.user_id.isnot(None)).distinct()}
    jr |= {r[0] for r in db.query(Interview.user_id)
           .join(InterviewSession, InterviewSession.interview_id == Interview.id)
           .filter(InterviewSession.overall_score >= 80, Interview.user_id.isnot(None)).distinct()}
    return {"assessment": a, "reco": rec, "resume": res, "interview": itv, "job_ready": jr}


def _stage_for(uid: int, caps: dict, overrides: dict[int, str]) -> str:
    if uid in overrides:
        return overrides[uid]
    if uid in caps["job_ready"]:
        return "Job Ready"
    if uid in caps["interview"]:
        return "Interview Ready"
    if uid in caps["resume"]:
        return "Resume Optimized"
    if uid in caps["reco"]:
        return "Career Recommended"
    if uid in caps["assessment"]:
        return "Assessment Completed"
    return "New User"


def _bucket_by_day(dates: list[datetime], days: int) -> list[dict]:
    today = datetime.utcnow().date()
    start = today - timedelta(days=days - 1)
    counts = {start + timedelta(days=i): 0 for i in range(days)}
    for d in dates:
        if d and d.date() >= start:
            counts[d.date()] = counts.get(d.date(), 0) + 1
    return [{"date": k.isoformat(), "count": v} for k, v in sorted(counts.items())]


def _latest_per_user(rows, key="user_id"):
    """Given rows ordered newest-first, keep the first row seen per user_id."""
    seen: dict[int, object] = {}
    for r in rows:
        uid = getattr(r, key)
        if uid is not None and uid not in seen:
            seen[uid] = r
    return seen


# --------------------------------------------------------------------------- #
# overview
# --------------------------------------------------------------------------- #
@router.get("/overview")
def overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_ago = now - timedelta(days=7)
    two_weeks = now - timedelta(days=14)
    month_ago = now - timedelta(days=30)
    two_months = now - timedelta(days=60)

    def users_between(a, b=None):
        q = db.query(func.count(User.id)).filter(User.created_at >= a)
        if b:
            q = q.filter(User.created_at < b)
        return q.scalar() or 0

    this_week = users_between(week_ago)
    prev_week = users_between(two_weeks, week_ago)
    this_month = users_between(month_ago)
    prev_month = users_between(two_months, month_ago)

    def growth(cur, prev):
        if prev == 0:
            return 100.0 if cur else 0.0
        return round((cur - prev) / prev * 100, 1)

    return {
        "total_users": _count(db, User),
        "total_assessments": _count(db, Assessment),
        "total_recommendations": _count(db, Recommendation),
        "total_resume_analyses": _count(db, ResumeAnalysis),
        "total_interview_sessions": _count(db, Interview),
        "total_transition_plans": _count(db, TransitionPlan),
        "todays_users": db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar() or 0,
        "weekly_new": this_week,
        "weekly_growth": growth(this_week, prev_week),
        "monthly_new": this_month,
        "monthly_growth": growth(this_month, prev_month),
        "admins": db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0,
        "active_users": db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0,
    }


# --------------------------------------------------------------------------- #
# analytics
# --------------------------------------------------------------------------- #
@router.get("/analytics")
def analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    user_dates = [r[0] for r in db.query(User.created_at).all()]
    daily = _bucket_by_day(user_dates, 30)

    # cumulative growth
    running = 0
    base = (db.query(func.count(User.id)).filter(User.created_at < (datetime.utcnow() - timedelta(days=29))).scalar() or 0)
    growth_series = []
    running = base
    for d in daily:
        running += d["count"]
        growth_series.append({"date": d["date"], "total": running})

    # monthly signups (last 12 months)
    months: dict[str, int] = {}
    now = datetime.utcnow()
    for i in range(11, -1, -1):
        m = (now.replace(day=1) - timedelta(days=30 * i))
        months[m.strftime("%Y-%m")] = 0
    for d in user_dates:
        if d:
            key = d.strftime("%Y-%m")
            if key in months:
                months[key] += 1
    monthly = [{"month": k, "count": v} for k, v in months.items()]

    # feature usage
    usage = [
        {"feature": "Assessments", "count": _count(db, Assessment)},
        {"feature": "Recommendations", "count": _count(db, Recommendation)},
        {"feature": "Resume", "count": _count(db, ResumeAnalysis)},
        {"feature": "Interview", "count": _count(db, Interview)},
        {"feature": "Transition", "count": _count(db, TransitionPlan)},
    ]

    # most recommended careers (from recommendation result payloads)
    career_counter: Counter = Counter()
    for (results,) in db.query(Recommendation.results).all():
        for item in (results or []):
            if item.get("career"):
                career_counter[item["career"]] += 1
    top_careers = [{"career": c, "count": n} for c, n in career_counter.most_common(10)]

    # skills / interests / education from assessments
    skill_counter: Counter = Counter()
    interest_counter: Counter = Counter()
    edu_counter: Counter = Counter()
    for skills, interests, edu in db.query(Assessment.skills, Assessment.interests, Assessment.education).all():
        skill_counter.update([s for s in (skills or []) if s])
        interest_counter.update([i for i in (interests or []) if i])
        if edu:
            edu_counter[edu] += 1

    # conversion funnel
    caps = _capability_sets(db)
    total_users = _count(db, User)
    funnel = [
        {"stage": "Signed Up", "count": total_users},
        {"stage": "Assessment", "count": len(caps["assessment"])},
        {"stage": "Recommendation", "count": len(caps["reco"])},
        {"stage": "Resume", "count": len(caps["resume"])},
        {"stage": "Interview", "count": len(caps["interview"])},
        {"stage": "Job Ready", "count": len(caps["job_ready"])},
    ]

    return {
        "daily_signups": daily,
        "user_growth": growth_series,
        "monthly_signups": monthly,
        "feature_usage": usage,
        "top_careers": top_careers,
        "top_skills": [{"name": k, "count": v} for k, v in skill_counter.most_common(10)],
        "top_interests": [{"name": k, "count": v} for k, v in interest_counter.most_common(10)],
        "top_education": [{"name": k, "count": v} for k, v in edu_counter.most_common(8)],
        "funnel": funnel,
    }


# --------------------------------------------------------------------------- #
# CRM — rows, export, pipeline
# --------------------------------------------------------------------------- #
def _build_rows(db: Session) -> list[dict]:
    users = db.query(User).all()
    caps = _capability_sets(db)
    overrides = {cs.user_id: cs.stage for cs in db.query(CrmStage).all()}

    last_active = {
        uid: ts for uid, ts in db.query(
            UserActivity.user_id, func.max(UserActivity.created_at)
        ).group_by(UserActivity.user_id).all()
    }
    latest_assess = _latest_per_user(
        db.query(Assessment).order_by(desc(Assessment.created_at)).all()
    )
    latest_reco = _latest_per_user(
        db.query(Recommendation).order_by(desc(Recommendation.created_at)).all()
    )

    rows = []
    for u in users:
        a = latest_assess.get(u.id)
        rec = latest_reco.get(u.id)
        top = (rec.results[0] if rec and rec.results else None)
        rows.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "status": u.status,
            "education": a.education if a else "",
            "skills": (a.skills if a else []) or [],
            "interests": (a.interests if a else []) or [],
            "created_at": _iso(u.created_at),
            "last_active": _iso(last_active.get(u.id) or u.last_login or u.created_at),
            "assessment_status": "Completed" if u.id in caps["assessment"] else "Not started",
            "readiness_score": (top.get("readiness_score") if top else None),
            "recommended_career": (top.get("career") if top else None),
            "stage": _stage_for(u.id, caps, overrides),
        })
    return rows


def _filter_sort(rows, q, stage, sort, order):
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in r["full_name"].lower() or ql in r["email"].lower()]
    if stage and stage != "all":
        rows = [r for r in rows if r["stage"] == stage]
    reverse = order != "asc"
    keyfn = {
        "name": lambda r: r["full_name"].lower(),
        "email": lambda r: r["email"].lower(),
        "readiness": lambda r: r["readiness_score"] or -1,
        "created": lambda r: r["created_at"] or "",
        "active": lambda r: r["last_active"] or "",
    }.get(sort, lambda r: r["created_at"] or "")
    return sorted(rows, key=keyfn, reverse=reverse)


@router.get("/crm")
def crm(
    q: str | None = None,
    stage: str | None = None,
    sort: str = "created",
    order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    rows = _filter_sort(_build_rows(db), q, stage, sort, order)
    total = len(rows)
    start = (page - 1) * page_size
    return {
        "rows": rows[start:start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "stages": CRM_STAGES,
    }


@router.get("/crm/export")
def crm_export(
    q: str | None = None,
    stage: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    rows = _filter_sort(_build_rows(db), q, stage, "created", "desc")
    buf = io.StringIO()
    cols = ["id", "full_name", "email", "education", "skills", "interests",
            "created_at", "last_active", "assessment_status", "readiness_score",
            "recommended_career", "stage"]
    w = csv.writer(buf)
    w.writerow(cols)
    for r in rows:
        w.writerow([
            r["id"], r["full_name"], r["email"], r["education"],
            "; ".join(r["skills"]), "; ".join(r["interests"]),
            r["created_at"], r["last_active"], r["assessment_status"],
            r["readiness_score"], r["recommended_career"], r["stage"],
        ])
    _log(db, admin, "export_crm", "crm", None, {"rows": len(rows)})
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillence_crm.csv"},
    )


@router.get("/crm/pipeline")
def crm_pipeline(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    rows = _build_rows(db)
    columns = {s: [] for s in CRM_STAGES}
    for r in rows:
        columns.setdefault(r["stage"], []).append({
            "id": r["id"], "full_name": r["full_name"], "email": r["email"],
            "recommended_career": r["recommended_career"], "readiness_score": r["readiness_score"],
        })
    return {"stages": CRM_STAGES, "columns": columns}


@router.patch("/crm/{user_id}/stage")
def set_stage(user_id: int, body: dict, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    stage = (body or {}).get("stage")
    if stage not in CRM_STAGES:
        raise HTTPException(status_code=422, detail="Invalid stage")
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    row = db.query(CrmStage).filter(CrmStage.user_id == user_id).first()
    if row is None:
        row = CrmStage(user_id=user_id, stage=stage)
        db.add(row)
    else:
        row.stage = stage
    db.commit()
    _log(db, admin, "set_stage", "user", user_id, {"stage": stage})
    return {"user_id": user_id, "stage": stage}


# --------------------------------------------------------------------------- #
# user management
# --------------------------------------------------------------------------- #
@router.get("/users")
def list_users(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    rows = _filter_sort(_build_rows(db), q, None, "created", "desc")
    total = len(rows)
    start = (page - 1) * page_size
    return {"rows": rows[start:start + page_size], "total": total, "page": page, "page_size": page_size}


@router.get("/users/{user_id}")
def user_detail(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    assessments = db.query(Assessment).filter(Assessment.user_id == user_id).order_by(desc(Assessment.created_at)).all()
    recos = db.query(Recommendation).filter(Recommendation.user_id == user_id).order_by(desc(Recommendation.created_at)).all()
    resumes = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user_id).order_by(desc(ResumeAnalysis.created_at)).all()
    plans = db.query(TransitionPlan).filter(TransitionPlan.user_id == user_id).order_by(desc(TransitionPlan.created_at)).all()
    interviews = db.query(Interview).filter(Interview.user_id == user_id).order_by(desc(Interview.created_at)).all()
    activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).order_by(desc(UserActivity.created_at)).limit(50).all()
    override = db.query(CrmStage).filter(CrmStage.user_id == user_id).first()
    caps = _capability_sets(db)

    return {
        "user": {
            "id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role,
            "status": u.status, "is_active": u.is_active, "auth_provider": u.auth_provider,
            "created_at": _iso(u.created_at), "last_login": _iso(u.last_login),
            "stage": _stage_for(u.id, caps, {u.id: override.stage} if override else {}),
        },
        "assessments": [{
            "id": a.id, "education": a.education, "skills": a.skills or [], "interests": a.interests or [],
            "experience": a.experience, "passout_year": a.passout_year,
            "career_preference": a.career_preference, "created_at": _iso(a.created_at),
        } for a in assessments],
        "recommendations": [{
            "id": r.id, "created_at": _iso(r.created_at),
            "careers": [{"career": it.get("career"), "match_pct": it.get("match_pct"),
                         "readiness_score": it.get("readiness_score")} for it in (r.results or [])],
        } for r in recos],
        "skill_gap_reports": [{
            "id": r.id, "created_at": _iso(r.created_at),
            "careers": [{"career": it.get("career"), "readiness_score": it.get("readiness_score"),
                         "readiness_level": it.get("readiness_level"),
                         "missing": [m.get("skill") for m in (it.get("skill_gap", {}) or {}).get("missing_skills", [])][:6]}
                        for it in (r.results or [])],
        } for r in recos],
        "transition_plans": [{
            "id": p.id, "target_career": p.target_career, "final_readiness": p.final_readiness,
            "job_ready": p.job_ready, "created_at": _iso(p.created_at),
        } for p in plans],
        "resume_analyses": [{
            "id": r.id, "match_score": r.match_score, "ats_score": r.ats_score,
            "job_readiness_level": r.job_readiness_level, "created_at": _iso(r.created_at),
        } for r in resumes],
        "interviews": [{
            "id": it.id, "career": it.career, "interview_type": it.interview_type,
            "status": it.status,
            "overall_score": it.session.overall_score if it.session else None,
            "readiness_level": it.session.readiness_level if it.session else None,
            "created_at": _iso(it.created_at),
        } for it in interviews],
        "activity": [{"event": ev.event, "meta": ev.meta or {}, "created_at": _iso(ev.created_at)} for ev in activity],
    }


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: dict, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    changed = {}
    if "role" in body and body["role"] in ("user", "admin"):
        u.role = body["role"]
        changed["role"] = body["role"]
    if "is_active" in body:
        u.is_active = bool(body["is_active"])
        u.status = "active" if u.is_active else "deactivated"
        changed["is_active"] = u.is_active
    db.commit()
    db.refresh(u)
    _log(db, admin, "update_user", "user", user_id, changed)
    return {"id": u.id, "role": u.role, "is_active": u.is_active, "status": u.status}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    if u.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if u.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin account")
    db.delete(u)
    db.commit()
    _log(db, admin, "delete_user", "user", user_id, {"email": u.email})
    return {"deleted": user_id}


# --------------------------------------------------------------------------- #
# feature analytics: interviews / resumes / careers
# --------------------------------------------------------------------------- #
@router.get("/interviews")
def interview_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    completed = db.query(InterviewSession).filter(InterviewSession.overall_score > 0).all()
    avg_overall = round(sum(s.overall_score for s in completed) / len(completed), 1) if completed else 0

    cat_rows = db.query(InterviewScore.category, func.avg(InterviewScore.score)).group_by(InterviewScore.category).all()
    categories = [{"category": c, "score": round(v or 0, 1)} for c, v in cat_rows]

    weak = Counter()
    for (w,) in db.query(InterviewFeedback.weakness).all():
        if w and w.strip():
            weak[w.strip()] += 1

    # per-question success (avg of evaluation scores) — needs question text
    from ..models import InterviewAnswer, InterviewQuestion
    q_scores: dict[str, list[float]] = {}
    rows = (db.query(InterviewQuestion.text, InterviewAnswer.evaluation)
            .join(InterviewAnswer, InterviewAnswer.question_id == InterviewQuestion.id).all())
    for text, ev in rows:
        scores = list((ev or {}).get("scores", {}).values())
        if scores:
            q_scores.setdefault(text, []).append(sum(scores) / len(scores))
    q_avg = [{"question": t[:80], "avg": round(sum(v) / len(v), 1)} for t, v in q_scores.items() if v]
    q_avg.sort(key=lambda x: x["avg"])

    return {
        "total_interviews": _count(db, Interview),
        "completed": len(completed),
        "avg_overall": avg_overall,
        "category_scores": categories,
        "common_weaknesses": [{"text": k, "count": v} for k, v in weak.most_common(8)],
        "hardest_questions": q_avg[:6],
        "easiest_questions": list(reversed(q_avg[-6:])),
        "score_distribution": _histogram([s.overall_score for s in completed]),
    }


@router.get("/resumes")
def resume_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    rows = db.query(ResumeAnalysis).all()
    n = len(rows)
    avg_ats = round(sum(r.ats_score for r in rows) / n, 1) if n else 0
    avg_match = round(sum(r.match_score for r in rows) / n, 1) if n else 0

    missing_skills = Counter()
    missing_keywords = Counter()
    weaknesses = Counter()
    for r in rows:
        res = r.result or {}
        for m in res.get("missing_skills", []):
            name = m.get("skill") if isinstance(m, dict) else m
            if name:
                missing_skills[name] += 1
        for k in res.get("missing_keywords", []):
            if k:
                missing_keywords[k] += 1
        for s in res.get("improvement_suggestions", []):
            if s:
                weaknesses[s] += 1

    return {
        "total": n,
        "avg_ats": avg_ats,
        "avg_match": avg_match,
        "ats_distribution": _histogram([r.ats_score for r in rows]),
        "match_distribution": _histogram([r.match_score for r in rows]),
        "missing_skills": [{"name": k, "count": v} for k, v in missing_skills.most_common(10)],
        "missing_keywords": [{"name": k, "count": v} for k, v in missing_keywords.most_common(10)],
        "common_weaknesses": [{"text": k, "count": v} for k, v in weaknesses.most_common(8)],
    }


@router.get("/recommendations")
def career_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    career_counter = Counter()
    demand: dict[str, list[float]] = {}
    readiness_all: list[float] = []
    for (results,) in db.query(Recommendation.results).all():
        for it in (results or []):
            c = it.get("career")
            if not c:
                continue
            career_counter[c] += 1
            if it.get("market_demand_score") is not None:
                demand.setdefault(c, []).append(it["market_demand_score"])
            if it.get("readiness_score") is not None:
                readiness_all.append(it["readiness_score"])

    top = career_counter.most_common(10)
    demand_dist = [{"career": c, "demand": round(sum(demand.get(c, [0])) / max(1, len(demand.get(c, [1]))), 0)}
                   for c, _ in top]

    # recommendations per day (success trend proxy)
    rec_dates = [r[0] for r in db.query(Recommendation.created_at).all()]
    trend = _bucket_by_day(rec_dates, 30)

    return {
        "top_careers": [{"career": c, "count": n} for c, n in top],
        "demand_distribution": demand_dist,
        "readiness_distribution": _histogram(readiness_all),
        "trend": trend,
    }


def _histogram(values: list[float]) -> list[dict]:
    labels = ["0–20", "21–40", "41–60", "61–80", "81–100"]
    counts = [0, 0, 0, 0, 0]
    for v in values:
        idx = 0 if v <= 20 else 1 if v <= 40 else 2 if v <= 60 else 3 if v <= 80 else 4
        counts[idx] += 1
    return [{"range": labels[i], "count": counts[i]} for i in range(5)]


# --------------------------------------------------------------------------- #
# monitoring + notifications
# --------------------------------------------------------------------------- #
@router.get("/monitoring")
def monitoring(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    snap = metrics.snapshot()

    # db health
    from sqlalchemy import text
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # storage usage (sqlite file or working dir)
    storage_mb = 0.0
    try:
        url = settings.DATABASE_URL
        if url.startswith("sqlite"):
            path = url.split("///")[-1]
            if os.path.exists(path):
                storage_mb = round(os.path.getsize(path) / (1024 * 1024), 2)
    except Exception:
        pass

    from ..ml.predictor import predictor
    return {
        **snap,
        "db_healthy": db_ok,
        "predictor_mode": predictor.mode,
        "storage_mb": storage_mb,
        "rows": {
            "users": _count(db, User),
            "assessments": _count(db, Assessment),
            "recommendations": _count(db, Recommendation),
            "resume_analyses": _count(db, ResumeAnalysis),
            "interviews": _count(db, Interview),
            "transition_plans": _count(db, TransitionPlan),
        },
    }


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    EVENT_LABEL = {
        "signup": "New user signup",
        "assessment": "New assessment completed",
        "resume": "Resume analysis completed",
        "interview": "Interview started",
        "interview_completed": "Interview completed",
        "transition": "Transition plan created",
        "login": "User logged in",
    }
    rows = (db.query(UserActivity, User)
            .outerjoin(User, User.id == UserActivity.user_id)
            .order_by(desc(UserActivity.created_at)).limit(25).all())
    items = []
    for ev, u in rows:
        items.append({
            "type": ev.event,
            "label": EVENT_LABEL.get(ev.event, ev.event),
            "user": u.full_name if u else "Anonymous",
            "email": u.email if u else None,
            "created_at": _iso(ev.created_at),
        })
    return {"notifications": items, "unread": len(items)}


@router.get("/logs")
def admin_logs(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    rows = db.query(AdminLog).order_by(desc(AdminLog.created_at)).limit(50).all()
    return {"logs": [{
        "id": r.id, "admin_id": r.admin_id, "action": r.action,
        "target_type": r.target_type, "target_id": r.target_id,
        "detail": r.detail or {}, "created_at": _iso(r.created_at),
    } for r in rows]}
