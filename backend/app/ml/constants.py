"""Shared vocabularies & domain constants (used by training and serving)."""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

EDUCATION_VOCAB = [
    "10th", "12th PCM", "12th PCB", "12th Commerce", "BCA", "BTech", "BCom",
    "BBA", "BA", "BSc", "MBA", "MCA", "MTech", "MCom", "Dropout", "Other",
]

SKILLS_VOCAB = [
    "Excel", "Communication", "Leadership", "Public Speaking", "Python", "SQL",
    "Java", "Problem Solving", "Critical Thinking", "Finance", "Marketing",
    "Canva", "Design", "Video Editing", "Statistics", "AI/ML", "Data Analysis",
    "Teaching", "Writing", "Sales", "Power BI", "Tableau", "Machine Learning",
    "Cloud", "Cybersecurity",
]

INTERESTS_VOCAB = [
    "AI", "Data", "Finance", "Business", "Coding", "Marketing", "Cybersecurity",
    "Research", "Management", "Consulting", "Teaching", "Healthcare", "Startup",
    "Trading", "Product Management", "Design",
]

PREFERENCE_VOCAB = [
    "High Salary", "Remote Job", "Fast Growth", "Job Security",
    "Government", "Abroad Opportunity", "Startup Culture",
]

CURRENT_YEAR = 2026

# ---------------------------------------------------------------------------
# Skill-gap / readiness domain constants (AI Skill Gap Analyzer)
# ---------------------------------------------------------------------------
PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced"]

# Fraction of a skill's importance weight credited at each proficiency level.
# Mirrors the spec example (Python weight 25 → 10 / 18 / 25).
PROFICIENCY_MULTIPLIER = {"Beginner": 0.4, "Intermediate": 0.72, "Advanced": 1.0}
DEFAULT_PROFICIENCY = "Intermediate"

# Readiness bands: (low, high, label). job_ready == "Job Ready" band.
READINESS_BANDS = [
    (0, 40, "Beginner"),
    (41, 70, "Developing"),
    (71, 90, "Nearly Job Ready"),
    (91, 100, "Job Ready"),
]

# Fallback metadata for any skill not present in skill_catalog.json.
DEFAULT_SKILL_META = {"weight": 12, "difficulty": "Medium", "weeks": 3}

# Careers a preference nudges toward (multiplicative boost at ranking time).
PREFERENCE_AFFINITY = {
    "High Salary":        ["AI Engineer", "ML Engineer", "Data Scientist", "Product Manager",
                           "Management Consultant", "Investment Analyst", "Cybersecurity Analyst"],
    "Remote Job":         ["Software Engineer", "Cloud Engineer", "Data Analyst",
                           "Digital Marketer", "UI/UX Designer"],
    "Fast Growth":        ["AI Engineer", "ML Engineer", "Data Scientist", "Product Manager",
                           "Cloud Engineer", "Cybersecurity Analyst"],
    "Job Security":       ["Teacher", "HR Analyst", "Financial Analyst",
                           "Operations Analyst", "Research Analyst"],
    "Government":         ["Research Analyst", "Teacher", "Operations Analyst", "HR Analyst"],
    "Abroad Opportunity": ["Software Engineer", "Data Scientist", "ML Engineer",
                           "Cloud Engineer", "AI Engineer"],
    "Startup Culture":    ["Product Manager", "Software Engineer", "Digital Marketer",
                           "UI/UX Designer", "Data Analyst"],
}


def load_career_skills() -> dict[str, list[str]]:
    return json.loads((DATA_DIR / "career_skills.json").read_text(encoding="utf-8"))


def load_market_data() -> dict[str, dict]:
    return json.loads((DATA_DIR / "market_data.json").read_text(encoding="utf-8"))


def load_roadmaps() -> dict[str, list[str]]:
    return json.loads((DATA_DIR / "roadmaps.json").read_text(encoding="utf-8"))


def load_skill_catalog() -> dict[str, dict]:
    """Per-skill importance weight, difficulty and estimated learning time."""
    return json.loads((DATA_DIR / "skill_catalog.json").read_text(encoding="utf-8"))


def load_resume_skill_library() -> dict[str, list[str]]:
    """Canonical skill -> alias phrases, for resume / JD skill extraction."""
    return json.loads((DATA_DIR / "resume_skill_library.json").read_text(encoding="utf-8"))


def load_career_projects() -> dict[str, list[dict]]:
    """Recommended portfolio projects per career (name, difficulty, weeks, skills)."""
    return json.loads((DATA_DIR / "career_projects.json").read_text(encoding="utf-8"))


def load_career_certifications() -> dict[str, list[dict]]:
    """Recommended certifications per career (name, level, why)."""
    return json.loads((DATA_DIR / "career_certifications.json").read_text(encoding="utf-8"))


def load_interview_question_bank() -> dict:
    """HR / behavioral / per-career technical questions (LLM fallback bank)."""
    return json.loads((DATA_DIR / "interview_question_bank.json").read_text(encoding="utf-8"))


def readiness_level(score: float) -> str:
    """Map a 0–100 readiness score to its band label."""
    for low, high, label in READINESS_BANDS:
        if low <= score <= high:
            return label
    return "Job Ready" if score > 100 else "Beginner"


def importance_band(weight: int) -> str:
    """Bucket a skill's importance weight into a priority band."""
    if weight >= 18:
        return "High"
    if weight >= 13:
        return "Medium"
    return "Low"


CAREERS = list(load_career_skills().keys())
