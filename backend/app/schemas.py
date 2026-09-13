"""Pydantic request/response schemas."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# A pragmatic email check (no external `email-validator` dependency required).
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------- onboarding / users ----------
class UserCreate(BaseModel):
    """MVP onboarding payload — name + email, no password.

    `email` is normalised (trimmed + lower-cased) and format-validated so the
    backend can use it as the natural key for auto-logging-in returning users.
    """

    full_name: str = Field(min_length=1, max_length=120, examples=["Auj Khan"])
    email: str = Field(examples=["auj@example.com"])

    @field_validator("full_name")
    @classmethod
    def _clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name is required")
        return v

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    full_name: str
    email: str
    auth_provider: str
    role: str = "user"
    is_active: bool = True
    created_at: datetime | None = None


class LoginRequest(BaseModel):
    email: str = Field(examples=["khanauj60@gmail.com"])
    password: str = Field(default="", examples=["••••••••"])


class AuthResponse(BaseModel):
    """Returned by login — the session token plus the resolved user."""

    token: str
    user: UserOut


class UserDashboard(BaseModel):
    """Everything a returning user can revisit, linked by user_id."""

    user: UserOut
    assessments: list[dict]
    recommendations: list[dict]
    skill_gap_reports: list[dict]
    transition_plans: list[dict]
    resume_analyses: list[dict]
    interviews: list[dict]


# ---------- assessment / prediction ----------
class AssessmentIn(BaseModel):
    education: str = Field(examples=["BCA"])
    skills: list[str] = Field(default_factory=list, examples=[["Excel", "Python", "SQL"]])
    interests: list[str] = Field(default_factory=list, examples=[["Data", "AI"]])
    experience: int = Field(default=0, ge=0, le=50, examples=[1])
    passout_year: int = Field(examples=[2024], ge=1990, le=2030)
    career_preference: str = Field(examples=["High Salary"])
    # optional per-skill proficiency: {"Python": "Advanced", "SQL": "Beginner"}
    skill_levels: dict[str, str] = Field(
        default_factory=dict, examples=[{"Python": "Advanced", "Excel": "Intermediate"}]
    )
    # set once the user has onboarded; links the stored assessment to the user
    user_id: int | None = Field(default=None, examples=[1])


class RoadmapStep(BaseModel):
    order: int
    label: str


# ---------- skill gap / readiness ----------
class PresentSkill(BaseModel):
    skill: str
    weight: int
    importance: str  # High / Medium / Low
    level: str  # Beginner / Intermediate / Advanced
    proficiency_pct: int
    contribution: float


class MissingSkill(BaseModel):
    skill: str
    weight: int
    importance: str  # High / Medium / Low
    priority: str  # alias of importance, for UI clarity
    difficulty: str  # Easy / Medium / Hard
    weeks: int
    estimated_time: str


class SkillGapAnalysis(BaseModel):
    career: str
    readiness_score: int
    readiness_level: str
    job_ready: bool
    present_skills: list[PresentSkill]
    missing_skills: list[MissingSkill]
    matched_weight: float
    total_required_weight: int
    estimated_weeks: int
    estimated_time: str
    learning_roadmap: list[str]


class CareerRecommendation(BaseModel):
    career: str
    match_pct: float
    why: str
    market_demand_score: int
    salary_range: str
    future_growth_score: int
    future_growth_label: str
    required_skills: list[str]
    owned_skills: list[str]
    missing_skills: list[str]
    roadmap: list[str]
    # AI Skill Gap Analyzer
    readiness_score: int
    readiness_level: str
    job_ready: bool
    skill_gap: SkillGapAnalysis


class ReadinessRow(BaseModel):
    career: str
    match_pct: float
    readiness_score: int
    readiness_level: str
    estimated_weeks: int


class PredictionResponse(BaseModel):
    assessment_id: int | None = None
    recommendation_id: int | None = None
    top_3: list[CareerRecommendation]
    comparison: list[dict]  # lightweight rows for the comparison chart


class CareerDetails(BaseModel):
    career: str
    market_demand_score: int
    salary_range: str
    future_growth_score: int
    future_growth_label: str
    required_skills: list[str]


class CareerRoadmap(BaseModel):
    career: str
    roadmap: list[str]


# ---------- ai interview intelligence ----------
class StartInterviewRequest(BaseModel):
    career: str = Field(examples=["Data Analyst"])
    interview_type: str = Field(default="Mock", examples=["Mock"])  # HR | Technical | Behavioral | Mock
    mode: str = Field(default="text", examples=["text"])  # text | voice
    difficulty: str = Field(default="Intermediate", examples=["Intermediate"])
    skills: list[str] = Field(default_factory=list)
    experience: int = Field(default=0, ge=0, le=50)
    user_id: int | None = Field(default=None, examples=[1])


class InterviewQuestionOut(BaseModel):
    id: int
    order: int
    qtype: str
    text: str
    difficulty: str


class StartInterviewResponse(BaseModel):
    session_id: int
    career: str
    interview_type: str
    mode: str
    difficulty: str
    questions_source: str  # llm | bank
    questions: list[InterviewQuestionOut]


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer_text: str = Field(default="")
    mode: str = Field(default="text")  # text | voice
    time_seconds: int | None = None
    filler_count: int | None = None  # client-measured (voice mode)


class AnswerFeedback(BaseModel):
    question_id: int
    qtype: str
    scores: dict[str, int]
    star: dict[str, int] | None = None
    filler_count: int
    word_count: int
    strength: str
    weakness: str
    suggestion: str
    missing_concepts: list[str]


class InterviewScorecard(BaseModel):
    session_id: int
    career: str
    interview_type: str
    mode: str
    overall_score: int
    category_scores: dict[str, int]
    hiring_probability: int
    readiness_level: str
    job_ready: bool
    missing: list[str]
    communication_analysis: dict
    star_analysis: dict[str, int] | None = None
    improvement_plan: list[dict]
    ai_summary: str
    per_answer: list[dict]


class InterviewHistoryItem(BaseModel):
    session_id: int
    career: str
    interview_type: str
    mode: str
    overall_score: int | None
    readiness_level: str | None
    hiring_probability: int | None
    completed: bool
    created_at: str | None


# ---------- transition intelligence ----------
class TransitionInput(BaseModel):
    education: str = Field(default="", examples=["BCA"])
    skills: list[str] = Field(default_factory=list, examples=[["Excel", "Python"]])
    skill_levels: dict[str, str] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)
    experience: int = Field(default=0, ge=0, le=50)
    passout_year: int = Field(default=2024, ge=1990, le=2035)
    current_role: str = Field(default="", examples=["Student"])
    certifications: list[str] = Field(default_factory=list)
    projects_completed: int = Field(default=0, ge=0, le=100)
    target_career: str = Field(examples=["Data Analyst"])
    user_id: int | None = Field(default=None, examples=[1])


class TBaseline(BaseModel):
    education: str
    current_role: str
    experience: int
    skills: list[str]
    current_readiness: int
    readiness_level: str
    strengths: list[str]
    weaknesses: list[str]


class TPhase(BaseModel):
    phase: int
    name: str
    goal: str
    skills: list[str]
    projects: list[str]
    duration_weeks: int
    milestone: str
    outcome: str


class TProject(BaseModel):
    name: str
    difficulty: str
    weeks: int
    skills: list[str]


class TCertification(BaseModel):
    name: str
    level: str
    why: str


class TTimeline(BaseModel):
    total_weeks: int
    total_hours: int
    months_at_1h: float
    months_at_2h: float
    months_at_4h: float


class TForecastStep(BaseModel):
    stage: str
    readiness: int


class TForecast(BaseModel):
    steps: list[TForecastStep]
    final_readiness: int
    final_level: str
    job_ready: bool


class TRisk(BaseModel):
    level: str
    item: str
    note: str


class TCoach(BaseModel):
    text: str
    source: str
    fastest_path: list[str]


class TransitionPlan(BaseModel):
    plan_id: int | None = None
    target_career: str
    baseline: TBaseline
    skill_gap_mapping: dict[str, list[str]]
    phases: list[TPhase]
    timeline: TTimeline
    recommended_projects: list[TProject]
    certifications: list[TCertification]
    forecast: TForecast
    risks: list[TRisk]
    ai_coach: TCoach
    llm_used: bool


# ---------- resume intelligence ----------
class ResumeAnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=30, examples=["John Doe\nData analyst with 2 years…"])
    job_description: str = Field(min_length=30, examples=["We are hiring a Data Analyst…"])
    user_id: int | None = Field(default=None, examples=[1])


class MissingSkillLite(BaseModel):
    skill: str
    weight: int
    priority: str


class RewriteSuggestion(BaseModel):
    focus: str
    example: str


class ResumeAnalysis(BaseModel):
    analysis_id: int | None = None
    match_score: int
    ats_score: int
    semantic_similarity: int
    skill_match_pct: int
    keyword_coverage_pct: int
    resume_skills: list[str]
    jd_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[MissingSkillLite]
    jd_keywords: list[str]
    matched_keywords: list[str]
    missing_keywords: list[str]
    improvement_suggestions: list[str]
    rewrite_suggestions: list[RewriteSuggestion]
    job_readiness_score: int
    job_readiness_level: str


# ---------- skill-gap endpoint requests ----------
class SkillGapRequest(BaseModel):
    """Analyze readiness for the user's profile against one or all top careers."""

    assessment: AssessmentIn
    career: str | None = Field(
        default=None,
        description="If omitted, analyse the user's Top-3 recommended careers.",
    )


class CareerReadinessResponse(BaseModel):
    rows: list[ReadinessRow]
