"""SQLAlchemy ORM models. JSON columns work on both PostgreSQL and SQLite.

No authentication: assessments and their recommendations are stored anonymously
so prior runs can be inspected, but no user accounts are required.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """Onboarding user (MVP: name + email, no password).

    `auth_provider` defaults to "email" so future providers (Google, LinkedIn,
    GitHub, OTP) slot in without any schema change — every record stays linked
    by user_id regardless of how the user authenticated.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="email")
    # role-based access control: "user" | "admin"
    role: Mapped[str] = mapped_column(String(16), default="user", index=True)
    # account lifecycle
    status: Mapped[str] = mapped_column(String(16), default="active")
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    education: Mapped[str] = mapped_column(String(64))
    skills: Mapped[list] = mapped_column(JSON, default=list)
    skill_levels: Mapped[dict] = mapped_column(JSON, default=dict)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    experience: Mapped[int] = mapped_column(Integer, default=0)
    passout_year: Mapped[int] = mapped_column(Integer)
    career_preference: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    recommendation: Mapped["Recommendation"] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", uselist=False
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    results: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="recommendation")


# ---------------------------------------------------------------------------
# AI Skill Gap Analyzer — reference tables (seeded from JSON) + computed scores
# ---------------------------------------------------------------------------
class CareerSkill(Base):
    """Required skills per career (reference data)."""

    __tablename__ = "career_skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    career_name: Mapped[str] = mapped_column(String(96), index=True)
    required_skill: Mapped[str] = mapped_column(String(96))


class CareerSkillWeight(Base):
    """Importance weight, difficulty and learning time per (career, skill)."""

    __tablename__ = "career_skill_weights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    career_name: Mapped[str] = mapped_column(String(96), index=True)
    skill: Mapped[str] = mapped_column(String(96))
    importance_weight: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[str] = mapped_column(String(16), default="Medium")
    estimated_weeks: Mapped[int] = mapped_column(Integer, default=3)


class CareerLearningRoadmap(Base):
    """Ordered canonical learning roadmap per career (reference data)."""

    __tablename__ = "career_learning_roadmaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    career_name: Mapped[str] = mapped_column(String(96), index=True)
    step_order: Mapped[int] = mapped_column(Integer, default=0)
    step_label: Mapped[str] = mapped_column(String(128))


class CareerReadinessScore(Base):
    """Computed readiness for a career, tied to the assessment that produced it."""

    __tablename__ = "career_readiness_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), index=True
    )
    career_name: Mapped[str] = mapped_column(String(96), index=True)
    readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    readiness_level: Mapped[str] = mapped_column(String(32), default="Beginner")
    matched_weight: Mapped[float] = mapped_column(Float, default=0.0)
    total_weight: Mapped[int] = mapped_column(Integer, default=0)
    estimated_weeks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Resume Intelligence — stored resume vs JD analyses
# ---------------------------------------------------------------------------
class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resume_text: Mapped[str] = mapped_column(String, default="")
    job_description: Mapped[str] = mapped_column(String, default="")
    match_score: Mapped[int] = mapped_column(Integer, default=0)
    ats_score: Mapped[int] = mapped_column(Integer, default=0)
    job_readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    job_readiness_level: Mapped[str] = mapped_column(String(32), default="Beginner")
    # full analysis payload (skills, keywords, suggestions, rewrites)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Transition Intelligence — plans + normalized phases / milestones / forecasts
# ---------------------------------------------------------------------------
class TransitionPlan(Base):
    __tablename__ = "transition_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_career: Mapped[str] = mapped_column(String(96), index=True)
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    final_readiness: Mapped[int] = mapped_column(Integer, default=0)
    job_ready: Mapped[bool] = mapped_column(default=False)
    llm_used: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    phases: Mapped[list["TransitionPhase"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    milestones: Mapped[list["TransitionMilestone"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    forecasts: Mapped[list["TransitionForecast"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    projects: Mapped[list["RecommendedProject"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class TransitionPhase(Base):
    __tablename__ = "transition_phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("transition_plans.id", ondelete="CASCADE"), index=True)
    phase_order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(64))
    goal: Mapped[str] = mapped_column(String(256), default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    duration_weeks: Mapped[int] = mapped_column(Integer, default=0)
    outcome: Mapped[str] = mapped_column(String(256), default="")

    plan: Mapped["TransitionPlan"] = relationship(back_populates="phases")


class TransitionMilestone(Base):
    __tablename__ = "transition_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("transition_plans.id", ondelete="CASCADE"), index=True)
    phase_order: Mapped[int] = mapped_column(Integer, default=0)
    label: Mapped[str] = mapped_column(String(256))

    plan: Mapped["TransitionPlan"] = relationship(back_populates="milestones")


class TransitionForecast(Base):
    __tablename__ = "transition_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("transition_plans.id", ondelete="CASCADE"), index=True)
    stage: Mapped[str] = mapped_column(String(64))
    readiness: Mapped[int] = mapped_column(Integer, default=0)

    plan: Mapped["TransitionPlan"] = relationship(back_populates="forecasts")


class RecommendedProject(Base):
    __tablename__ = "recommended_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("transition_plans.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    difficulty: Mapped[str] = mapped_column(String(24), default="Beginner")
    weeks: Mapped[int] = mapped_column(Integer, default=1)
    skills: Mapped[list] = mapped_column(JSON, default=list)

    plan: Mapped["TransitionPlan"] = relationship(back_populates="projects")


# ---------------------------------------------------------------------------
# AI Interview Intelligence — interviews, sessions, questions, answers, scores
# ---------------------------------------------------------------------------
class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    career: Mapped[str] = mapped_column(String(96), index=True)
    interview_type: Mapped[str] = mapped_column(String(24), default="Mock")
    mode: Mapped[str] = mapped_column(String(16), default="text")
    difficulty: Mapped[str] = mapped_column(String(24), default="Intermediate")
    status: Mapped[str] = mapped_column(String(16), default="in_progress")
    questions_source: Mapped[str] = mapped_column(String(8), default="bank")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["InterviewSession"] = relationship(
        back_populates="interview", cascade="all, delete-orphan", uselist=False
    )
    questions: Mapped[list["InterviewQuestion"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )
    answers: Mapped[list["InterviewAnswer"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )
    scores: Mapped[list["InterviewScore"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )
    feedback: Mapped[list["InterviewFeedback"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    readiness_level: Mapped[str] = mapped_column(String(32), default="")
    hiring_probability: Mapped[int] = mapped_column(Integer, default=0)
    result: Mapped[dict] = mapped_column(JSON, default=dict)

    interview: Mapped["Interview"] = relationship(back_populates="session")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    qtype: Mapped[str] = mapped_column(String(16), default="Technical")
    text: Mapped[str] = mapped_column(String, default="")
    difficulty: Mapped[str] = mapped_column(String(24), default="Intermediate")
    concepts: Mapped[list] = mapped_column(JSON, default=list)

    interview: Mapped["Interview"] = relationship(back_populates="questions")


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("interview_questions.id", ondelete="CASCADE"), index=True)
    answer_text: Mapped[str] = mapped_column(String, default="")
    mode: Mapped[str] = mapped_column(String(16), default="text")
    time_seconds: Mapped[int] = mapped_column(Integer, default=0)
    filler_count: Mapped[int] = mapped_column(Integer, default=0)
    evaluation: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    interview: Mapped["Interview"] = relationship(back_populates="answers")


class InterviewScore(Base):
    __tablename__ = "interview_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(48))
    score: Mapped[int] = mapped_column(Integer, default=0)

    interview: Mapped["Interview"] = relationship(back_populates="scores")


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(Integer, default=0)
    strength: Mapped[str] = mapped_column(String, default="")
    weakness: Mapped[str] = mapped_column(String, default="")
    suggestion: Mapped[str] = mapped_column(String, default="")

    interview: Mapped["Interview"] = relationship(back_populates="feedback")


# ---------------------------------------------------------------------------
# Admin Portal — audit logs, CRM pipeline, activity timeline, system metrics
# ---------------------------------------------------------------------------
class AdminLog(Base):
    """Audit trail of privileged actions performed by admins."""

    __tablename__ = "admin_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(32), default="")
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CrmStage(Base):
    """Lead-pipeline stage per user (manual override of the derived stage)."""

    __tablename__ = "crm_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    stage: Mapped[str] = mapped_column(String(32), default="New User")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserActivity(Base):
    """Activity timeline feeding 'last active', funnels and the timeline view."""

    __tablename__ = "user_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    event: Mapped[str] = mapped_column(String(48), index=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SystemMetric(Base):
    """Time-series of system metrics for the monitoring page."""

    __tablename__ = "system_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    metric: Mapped[str] = mapped_column(String(48), index=True)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
