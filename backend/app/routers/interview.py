"""AI Interview Intelligence™ router.

Drives a practice interview: generate questions (LLM-first), accept text/voice
answers, score each, and produce a full scorecard. Sessions are stored
anonymously so users can track improvement over time.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..engines import interview_engine
from ..models import (
    Interview,
    InterviewAnswer,
    InterviewFeedback,
    InterviewQuestion,
    InterviewScore,
    InterviewSession,
)
from ..schemas import (
    AnswerFeedback,
    InterviewHistoryItem,
    InterviewQuestionOut,
    InterviewScorecard,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
)

router = APIRouter(prefix="/api", tags=["interview"])
engine = interview_engine


@router.post("/start-interview", response_model=StartInterviewResponse)
def start_interview(payload: StartInterviewRequest, db: Session = Depends(get_db)) -> StartInterviewResponse:
    profile = {"skills": payload.skills, "experience": payload.experience}
    questions, source = engine.generate_questions(
        payload.career, payload.interview_type, payload.difficulty, profile
    )
    if not questions:
        raise HTTPException(status_code=422, detail="Could not generate questions")

    interview = Interview(
        user_id=payload.user_id,
        career=payload.career,
        interview_type=payload.interview_type,
        mode=payload.mode,
        difficulty=payload.difficulty,
        status="in_progress",
        questions_source=source,
    )
    db.add(interview)
    db.flush()
    db.add(InterviewSession(interview_id=interview.id))

    q_rows: list[InterviewQuestion] = []
    for q in questions:
        row = InterviewQuestion(
            interview_id=interview.id, order=q["order"], qtype=q["qtype"],
            text=q["text"], difficulty=q["difficulty"], concepts=q.get("concepts", []),
        )
        db.add(row)
        q_rows.append(row)
    db.commit()
    for r in q_rows:
        db.refresh(r)

    if payload.user_id:
        from ..security import record_activity
        record_activity(db, payload.user_id, "interview", {"interview_id": interview.id, "career": payload.career})

    return StartInterviewResponse(
        session_id=interview.id,
        career=interview.career,
        interview_type=interview.interview_type,
        mode=interview.mode,
        difficulty=interview.difficulty,
        questions_source=source,
        questions=[
            InterviewQuestionOut(id=r.id, order=r.order, qtype=r.qtype, text=r.text, difficulty=r.difficulty)
            for r in sorted(q_rows, key=lambda x: x.order)
        ],
    )


def _record_answer(payload: SubmitAnswerRequest, mode: str, db: Session) -> AnswerFeedback:
    question = db.get(InterviewQuestion, payload.question_id)
    if question is None or question.interview_id != payload.session_id:
        raise HTTPException(status_code=404, detail="Question not found for this session")

    q = {"qtype": question.qtype, "concepts": question.concepts or []}
    ev = engine.evaluate_answer(q, payload.answer_text, filler_override=payload.filler_count)

    db.add(InterviewAnswer(
        interview_id=payload.session_id, question_id=payload.question_id,
        answer_text=payload.answer_text, mode=mode,
        time_seconds=payload.time_seconds or 0, filler_count=ev["filler_count"],
        evaluation=ev,
    ))
    db.add(InterviewFeedback(
        interview_id=payload.session_id, question_id=payload.question_id,
        strength=ev["strength"], weakness=ev["weakness"], suggestion=ev["suggestion"],
    ))
    db.commit()

    return AnswerFeedback(
        question_id=payload.question_id, qtype=ev["qtype"], scores=ev["scores"],
        star=ev["star"], filler_count=ev["filler_count"], word_count=ev["word_count"],
        strength=ev["strength"], weakness=ev["weakness"], suggestion=ev["suggestion"],
        missing_concepts=ev["missing_concepts"],
    )


@router.post("/submit-answer", response_model=AnswerFeedback)
def submit_answer(payload: SubmitAnswerRequest, db: Session = Depends(get_db)) -> AnswerFeedback:
    return _record_answer(payload, mode="text", db=db)


@router.post("/submit-voice-answer", response_model=AnswerFeedback)
def submit_voice_answer(payload: SubmitAnswerRequest, db: Session = Depends(get_db)) -> AnswerFeedback:
    # voice answers arrive as a transcript; client may pass measured filler_count/timing
    return _record_answer(payload, mode="voice", db=db)


def _build_scorecard(interview: Interview, db: Session) -> dict:
    questions = {q.id: q for q in interview.questions}
    answers = sorted(interview.answers, key=lambda a: questions.get(a.question_id).order
                     if questions.get(a.question_id) else 0)
    evals = [a.evaluation for a in answers if a.evaluation]
    card = engine.score_interview(interview.interview_type, evals)

    per_answer = []
    for a in answers:
        q = questions.get(a.question_id)
        ev = a.evaluation or {}
        per_answer.append({
            "question": q.text if q else "",
            "qtype": q.qtype if q else ev.get("qtype", ""),
            "answer": a.answer_text,
            "scores": ev.get("scores", {}),
            "star": ev.get("star"),
            "strength": ev.get("strength", ""),
            "weakness": ev.get("weakness", ""),
            "suggestion": ev.get("suggestion", ""),
            "missing_concepts": ev.get("missing_concepts", []),
        })

    # persist scores + session summary (idempotent: clear prior scores)
    db.query(InterviewScore).filter(InterviewScore.interview_id == interview.id).delete()
    for cat, val in card["category_scores"].items():
        db.add(InterviewScore(interview_id=interview.id, category=cat, score=val))
    db.add(InterviewScore(interview_id=interview.id, category="Overall", score=card["overall_score"]))

    full = {**card, "session_id": interview.id, "career": interview.career,
            "mode": interview.mode, "per_answer": per_answer}

    sess = interview.session
    if sess:
        from sqlalchemy import func as _f
        sess.completed_at = _f.now()
        sess.overall_score = card["overall_score"]
        sess.readiness_level = card["readiness_level"]
        sess.hiring_probability = card["hiring_probability"]
        sess.result = full
    interview.status = "completed"
    db.commit()

    if interview.user_id:
        from ..security import record_activity
        record_activity(db, interview.user_id, "interview_completed",
                        {"interview_id": interview.id, "score": card["overall_score"]})
    return full


def _results(session_id: int, db: Session) -> dict:
    interview = db.get(Interview, session_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    if not interview.answers:
        raise HTTPException(status_code=400, detail="No answers submitted yet")
    return _build_scorecard(interview, db)


@router.get("/interview-results/{session_id}", response_model=InterviewScorecard)
def interview_results(session_id: int, db: Session = Depends(get_db)) -> InterviewScorecard:
    return InterviewScorecard(**_results(session_id, db))


@router.get("/interview-scorecard/{session_id}", response_model=InterviewScorecard)
def interview_scorecard(session_id: int, db: Session = Depends(get_db)) -> InterviewScorecard:
    return InterviewScorecard(**_results(session_id, db))


@router.get("/interview-history", response_model=list[InterviewHistoryItem])
def interview_history(limit: int = 20, db: Session = Depends(get_db)) -> list[InterviewHistoryItem]:
    rows = (
        db.query(Interview).order_by(desc(Interview.created_at)).limit(max(1, min(100, limit))).all()
    )
    out: list[InterviewHistoryItem] = []
    for it in rows:
        sess = it.session
        completed = it.status == "completed"
        out.append(InterviewHistoryItem(
            session_id=it.id, career=it.career, interview_type=it.interview_type, mode=it.mode,
            overall_score=sess.overall_score if (sess and completed) else None,
            readiness_level=sess.readiness_level if (sess and completed) else None,
            hiring_probability=sess.hiring_probability if (sess and completed) else None,
            completed=completed,
            created_at=it.created_at.isoformat() if it.created_at else None,
        ))
    return out
