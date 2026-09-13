"""
Skillence — Phase 2: Synthetic dataset generation.

Generates two balanced, *logically consistent* datasets:
    data/train_500.csv   (500 rows)
    data/test_200.csv    (200 rows)

Each row is built from a per-career "profile" so that education, skills and
interests are coherent with the target career (no random nonsense). A small
amount of realistic noise (extra/optional skills, secondary interests) is added
so the model has to learn rather than memorize.

Columns:
    education, skills, interests, experience, passout_year,
    career_preference, target_career

`skills` and `interests` are stored as ';'-separated strings.
"""

import json
import random
import sys
from pathlib import Path

import pandas as pd

try:  # ensure ✓ / arrows print on Windows cp1252 consoles
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[2]
APP_DATA = ROOT / "backend" / "app" / "data"
OUT_DIR = ROOT / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CURRENT_YEAR = 2026
SEED = 42

# --- vocabularies (kept in sync with backend/app/ml/constants.py) -----------
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
PREFERENCES = [
    "High Salary", "Remote Job", "Fast Growth", "Job Security",
    "Government", "Abroad Opportunity", "Startup Culture",
]

# core skills per career (also used by the skill-gap engine at serve time)
CAREER_SKILLS = json.loads((APP_DATA / "career_skills.json").read_text())

# Plausible education distribution per career (weighted choices).
CAREER_EDUCATION = {
    "Data Analyst":          {"BCA": 4, "BTech": 4, "BSc": 3, "MCA": 2, "12th PCM": 1, "BCom": 1},
    "Business Analyst":      {"BBA": 4, "MBA": 3, "BCom": 3, "BTech": 2, "BCA": 1},
    "AI Engineer":           {"BTech": 5, "MTech": 4, "MCA": 2, "BSc": 1},
    "ML Engineer":           {"BTech": 5, "MTech": 4, "MCA": 2, "BSc": 1},
    "Software Engineer":     {"BTech": 5, "BCA": 3, "MCA": 3, "BSc": 1},
    "Financial Analyst":     {"BCom": 5, "MBA": 3, "MCom": 2, "BBA": 2},
    "Product Manager":       {"MBA": 4, "BTech": 3, "BBA": 2, "BCA": 1},
    "Marketing Analyst":     {"BBA": 4, "MBA": 3, "BCom": 2, "BA": 2},
    "Cybersecurity Analyst": {"BTech": 5, "BCA": 3, "MCA": 2, "BSc": 1},
    "Data Scientist":        {"BTech": 4, "MTech": 3, "BSc": 2, "MCA": 2},
    "Investment Analyst":    {"BCom": 4, "MBA": 4, "MCom": 2, "BBA": 1},
    "Cloud Engineer":        {"BTech": 5, "MCA": 3, "BCA": 2, "BSc": 1},
    "UI/UX Designer":        {"BA": 3, "BSc": 2, "BCA": 2, "Other": 2, "BTech": 1},
    "Sales Manager":         {"BBA": 4, "MBA": 3, "BCom": 2, "BA": 2},
    "Operations Analyst":    {"BBA": 3, "BCom": 3, "MBA": 2, "BTech": 2},
    "Digital Marketer":      {"BBA": 3, "BA": 3, "BCom": 2, "Other": 2, "MBA": 1},
    "Research Analyst":      {"BSc": 3, "BA": 3, "MCom": 2, "MBA": 1, "BCom": 1},
    "Teacher":               {"BA": 4, "BSc": 3, "BCom": 2, "12th PCB": 1, "MCom": 1},
    "HR Analyst":            {"BBA": 4, "MBA": 3, "BA": 2, "BCom": 1},
    "Management Consultant": {"MBA": 5, "BTech": 3, "BBA": 2, "BCom": 1},
}

# Primary interests that genuinely point toward each career.
CAREER_INTERESTS = {
    "Data Analyst":          ["Data", "AI", "Business"],
    "Business Analyst":      ["Business", "Data", "Consulting"],
    "AI Engineer":           ["AI", "Coding", "Data"],
    "ML Engineer":           ["AI", "Coding", "Data"],
    "Software Engineer":     ["Coding", "AI", "Startup"],
    "Financial Analyst":     ["Finance", "Data", "Business"],
    "Product Manager":       ["Product Management", "Business", "Startup"],
    "Marketing Analyst":     ["Marketing", "Data", "Business"],
    "Cybersecurity Analyst": ["Cybersecurity", "Coding", "Data"],
    "Data Scientist":        ["Data", "AI", "Research"],
    "Investment Analyst":    ["Finance", "Trading", "Data"],
    "Cloud Engineer":        ["Coding", "Cybersecurity", "Startup"],
    "UI/UX Designer":        ["Design", "Product Management", "Startup"],
    "Sales Manager":         ["Business", "Management", "Startup"],
    "Operations Analyst":    ["Business", "Data", "Management"],
    "Digital Marketer":      ["Marketing", "Design", "Startup"],
    "Research Analyst":      ["Research", "Data", "Healthcare"],
    "Teacher":               ["Teaching", "Research", "Healthcare"],
    "HR Analyst":            ["Management", "Business", "Data"],
    "Management Consultant": ["Consulting", "Business", "Management"],
}

# Preferences that are over-represented for a career (still mixed with others).
CAREER_PREF_BIAS = {
    "AI Engineer": "High Salary", "ML Engineer": "High Salary",
    "Data Scientist": "Fast Growth", "Product Manager": "Fast Growth",
    "Cloud Engineer": "Remote Job", "Cybersecurity Analyst": "High Salary",
    "Software Engineer": "Remote Job", "Management Consultant": "High Salary",
    "Teacher": "Job Security", "HR Analyst": "Job Security",
    "Investment Analyst": "High Salary", "Digital Marketer": "Startup Culture",
    "Financial Analyst": "Job Security", "Research Analyst": "Government",
}

CAREERS = list(CAREER_SKILLS.keys())


def weighted_choice(rng: random.Random, weights: dict) -> str:
    items, w = zip(*weights.items())
    return rng.choices(items, weights=w, k=1)[0]


def make_record(rng: random.Random, career: str) -> dict:
    education = weighted_choice(rng, CAREER_EDUCATION[career])

    # skills: most core skills + a little noise
    core = CAREER_SKILLS[career]
    k_core = rng.randint(max(2, len(core) - 2), len(core))
    skills = set(rng.sample(core, k_core))
    # add 0-2 noise skills from outside the core set
    noise_pool = [s for s in SKILLS_VOCAB if s not in core]
    for _ in range(rng.randint(0, 2)):
        skills.add(rng.choice(noise_pool))

    # interests: 1-2 primary + occasional secondary
    primary = CAREER_INTERESTS[career]
    interests = set(rng.sample(primary, rng.randint(1, min(2, len(primary)))))
    if rng.random() < 0.4:
        interests.add(rng.choice(INTERESTS_VOCAB))

    experience = rng.choices(
        [0, 1, 2, 3, 4, 5, 6, 8], weights=[3, 4, 4, 3, 2, 2, 1, 1], k=1
    )[0]

    # passout year is consistent with experience (+ small career gap sometimes)
    gap = rng.choices([0, 1, 2], weights=[7, 2, 1], k=1)[0]
    passout_year = CURRENT_YEAR - experience - gap
    passout_year = max(2009, min(CURRENT_YEAR, passout_year))

    # career preference: biased toward this career's typical preference
    if career in CAREER_PREF_BIAS and rng.random() < 0.5:
        preference = CAREER_PREF_BIAS[career]
    else:
        preference = rng.choice(PREFERENCES)

    return {
        "education": education,
        "skills": ";".join(sorted(skills)),
        "interests": ";".join(sorted(interests)),
        "experience": experience,
        "passout_year": passout_year,
        "career_preference": preference,
        "target_career": career,
    }


def build_dataset(n_rows: int, seed: int) -> pd.DataFrame:
    rng = random.Random(seed)
    per_class = n_rows // len(CAREERS)
    remainder = n_rows - per_class * len(CAREERS)
    rows = []
    for i, career in enumerate(CAREERS):
        count = per_class + (1 if i < remainder else 0)
        for _ in range(count):
            rows.append(make_record(rng, career))
    rng.shuffle(rows)
    return pd.DataFrame(rows)


def main() -> None:
    train = build_dataset(500, seed=SEED)
    test = build_dataset(200, seed=SEED + 1)

    train_path = OUT_DIR / "train_500.csv"
    test_path = OUT_DIR / "test_200.csv"
    train.to_csv(train_path, index=False)
    test.to_csv(test_path, index=False)

    print(f"✓ wrote {len(train)} rows -> {train_path}")
    print(f"✓ wrote {len(test)} rows -> {test_path}")
    print("\nClass balance (train):")
    print(train["target_career"].value_counts().sort_index().to_string())
    print("\nSample rows:")
    print(train.head(5).to_string(index=False))


if __name__ == "__main__":
    main()
