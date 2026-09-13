"""Seed the skill-gap reference tables from the JSON data files.

Idempotent: only populates a table when it is empty, so it is safe to run on
every startup. The engines still read the JSON files directly at runtime (fast,
no DB round-trips); these tables make the same reference data queryable and
satisfy the persisted-data requirements of the analyzer module.
"""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .ml.constants import (
    DEFAULT_SKILL_META,
    load_career_skills,
    load_roadmaps,
    load_skill_catalog,
)
from .models import CareerLearningRoadmap, CareerSkill, CareerSkillWeight


# columns added after their tables were first created: (table, column, ddl)
_MIGRATIONS = [
    ("assessments", "skill_levels", "ALTER TABLE assessments ADD COLUMN skill_levels JSON DEFAULT '{}'"),
    ("assessments", "user_id", "ALTER TABLE assessments ADD COLUMN user_id INTEGER"),
    ("recommendations", "user_id", "ALTER TABLE recommendations ADD COLUMN user_id INTEGER"),
    ("resume_analyses", "user_id", "ALTER TABLE resume_analyses ADD COLUMN user_id INTEGER"),
    ("transition_plans", "user_id", "ALTER TABLE transition_plans ADD COLUMN user_id INTEGER"),
    ("interviews", "user_id", "ALTER TABLE interviews ADD COLUMN user_id INTEGER"),
    # admin portal: role-based access + account lifecycle
    ("users", "role", "ALTER TABLE users ADD COLUMN role VARCHAR(16) DEFAULT 'user'"),
    ("users", "status", "ALTER TABLE users ADD COLUMN status VARCHAR(16) DEFAULT 'active'"),
    ("users", "is_active", "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"),
    ("users", "last_login", "ALTER TABLE users ADD COLUMN last_login TIMESTAMP"),
]


def ensure_schema(engine: Engine) -> None:
    """Add columns introduced after a DB was first created (lightweight migration).

    create_all() never alters existing tables, so columns added later (e.g.
    user_id linkage) won't appear on a pre-existing DB. This adds any missing
    ones. Safe and idempotent across SQLite/PostgreSQL.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, ddl in _MIGRATIONS:
            if table not in existing_tables:
                continue  # fresh table; create_all built it with the column
            cols = {c["name"] for c in inspector.get_columns(table)}
            if column not in cols:
                conn.execute(text(ddl))


def seed_reference_data(db: Session) -> None:
    if db.query(CareerSkill.id).first() is not None:
        return  # already seeded

    career_skills = load_career_skills()
    catalog = load_skill_catalog()
    roadmaps = load_roadmaps()

    for career, skills in career_skills.items():
        for skill in skills:
            meta = catalog.get(skill, DEFAULT_SKILL_META)
            db.add(CareerSkill(career_name=career, required_skill=skill))
            db.add(
                CareerSkillWeight(
                    career_name=career,
                    skill=skill,
                    importance_weight=meta["weight"],
                    difficulty=meta["difficulty"],
                    estimated_weeks=meta["weeks"],
                )
            )

    for career, steps in roadmaps.items():
        for i, step in enumerate(steps):
            db.add(
                CareerLearningRoadmap(
                    career_name=career, step_order=i, step_label=step
                )
            )

    db.commit()
