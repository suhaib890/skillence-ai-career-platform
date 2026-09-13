# Skillence — AI-Powered Career Advisory System

> Recommends the **Top 3 best-fit careers** for a user from their education, skills,
> interests, experience, passout year and career preference — with match %, market
> demand, salary range, future growth, skill gap and a personalized roadmap.
>
> **No login required** — the assessment is open and anonymous.

**Measured quality (held-out 200-row test set):** accuracy **90.5%**, macro-F1 **0.90**,
**top-3 accuracy 98.5%** (CatBoost CV 90.0%, XGBoost CV 86.4%).

---

## 1. System Architecture

```
                         ┌──────────────────────────────────────┐
                         │              FRONTEND                 │
                         │  Next.js 14 (App Router) + TS         │
                         │  Tailwind • shadcn-style UI • Framer   │
                         │  Recharts • Zustand (state, persisted) │
                         └───────────────┬──────────────────────┘
                                         │  HTTPS / JSON  (no auth)
                                         ▼
                         ┌──────────────────────────────────────┐
                         │              BACKEND                  │
                         │  FastAPI (Python 3.11+)               │
                         │  ┌────────────────────────────────┐  │
                         │  │   RECOMMENDATION PIPELINE        │  │
                         │  │ preprocess → ensemble model →    │  │
                         │  │ market engine → skill-gap engine │  │
                         │  │ → roadmap engine                 │  │
                         │  └────────────────────────────────┘  │
                         └──────┬─────────────────────┬──────────┘
                                │ SQLAlchemy           │ joblib / native load
                                ▼                      ▼
                  ┌────────────────────┐   ┌────────────────────────┐
                  │  PostgreSQL/SQLite │   │  ML Artifacts (/models)│
                  │  assessments,      │   │  catboost.cbm          │
                  │  recommendations   │   │  xgboost.json          │
                  │  (anonymous)       │   │  preprocessor.joblib   │
                  └────────────────────┘   │  label_encoder.joblib  │
                                           └────────────────────────┘
```

**Request lifecycle:** Client fills the 6-step assessment → `POST /api/predict-career`
→ preprocessor builds the feature matrix → CatBoost + XGBoost produce class
probabilities → ensemble (0.7·CB + 0.3·XGB) + preference boost ranks careers →
top-3 enriched by the market / skill-gap / roadmap engines → result persisted
(anonymously) and returned as JSON → dashboard renders cards & charts.

## 2. ML Pipeline

```
generate_dataset.py ─► data/train_500.csv (500) + data/test_200.csv (200)
        │
        ▼
preprocessing.py (shared train + serve)
   • one-hot education + career_preference
   • binary indicator per skill / per interest (fixed vocab)
   • engineered: skill_count, interest_count, experience, career_gap, years_since_passout
        │
        ▼
train.py ─► CatBoostClassifier ─┐
         ─► XGBClassifier ───────┤► ensemble (0.7·CB + 0.3·XGB) ► top-3 ranked probabilities
evaluate.py ► accuracy • precision • recall • F1 • top-3 accuracy • confusion matrix
```

Two independent multi-class classifiers are tuned (5-fold `GridSearchCV`) on the
same 69-feature matrix. At inference their `predict_proba` outputs are blended
(`FINAL = 0.7·CatBoost + 0.3·XGBoost`), a small preference boost is applied, and
the three highest-scoring careers are returned as match %.

## 3. Database Schema (SQLAlchemy — PostgreSQL or SQLite)

| Table             | Key columns                                                                          |
|-------------------|--------------------------------------------------------------------------------------|
| `assessments`     | id, education, skills(JSON), interests(JSON), experience, passout_year, career_preference, created_at |
| `recommendations` | id, assessment_id→assessments, results(JSON), created_at                             |

JSON columns are portable across PostgreSQL (JSONB) and SQLite. No user/auth
tables — assessments are stored anonymously for analytics/inspection only.

## 4. Backend Architecture

```
backend/
├── requirements.txt
├── .env.example
├── app/
│   ├── main.py            # FastAPI app, CORS, startup table create, routers
│   ├── config.py          # pydantic-settings (env-driven, SQLite fallback)
│   ├── database.py        # engine, SessionLocal, Base, get_db
│   ├── models.py          # ORM: Assessment, Recommendation
│   ├── schemas.py         # Pydantic request/response models
│   ├── services.py        # assembles enriched top-3 from predictor + engines
│   ├── routers/
│   │   └── career.py      # /predict-career /career-details /career-roadmap /careers
│   ├── ml/
│   │   ├── constants.py   # vocabularies, preference affinity, JSON loaders
│   │   ├── preprocessing.py  # FeaturePreprocessor (shared train + serve)
│   │   └── predictor.py      # loads artifacts, ensemble inference (+ heuristic fallback)
│   ├── engines/
│   │   ├── market.py      # demand / salary / growth
│   │   ├── skill_gap.py   # required vs owned skills
│   │   └── roadmap.py     # ordered learning path
│   └── data/              # market_data.json, career_skills.json, roadmaps.json
└── ml/                    # OFFLINE scripts (not imported by the running API)
    ├── generate_dataset.py
    ├── train.py
    └── evaluate.py
```

> **Graceful degradation:** if `/models` is empty, `predictor.py` falls back to a
> transparent skill/interest-overlap heuristic, so the API works end-to-end before
> any model is trained. `GET /health` reports `predictor_mode: ensemble | heuristic`.

## 5. Frontend Architecture

```
frontend/src
├── app/
│   ├── page.tsx               # Landing (hero, floating cards, scroll animations)
│   ├── assessment/page.tsx    # 6-step wizard
│   ├── dashboard/page.tsx     # Top-3 recommendations + comparison chart
│   ├── explorer/page.tsx      # Career explorer (all 20 careers)
│   └── profile/page.tsx       # Profile dashboard (from last assessment)
├── components/                # ui/ primitives + charts/ (Recharts) + feature components
├── store/useSkillence.ts      # Zustand store (wizard state + persisted result)
└── lib/                       # api client, types, constants, utils
```

State lives in a single **persisted Zustand** store (wizard answers + last result),
so the dashboard and profile survive refreshes without a backend session.

## 6. Recommendation Logic

1. **Encode** user input into the engineered feature matrix (identical code at train/serve).
2. **Predict** class probabilities with CatBoost and XGBoost.
3. **Ensemble:** `score[c] = 0.7·P_cb[c] + 0.3·P_xgb[c]`.
4. **Preference boost:** ×1.12 to careers aligned with the user's stated preference.
5. **Rank** → top 3 → scale to a clean 40–99 match % band relative to the best fit.
6. **Enrich** each with market score, salary range, growth, skill gap and roadmap.

## 7. Folder Structure (root)

```
skillence/
├── README.md
├── backend/   # FastAPI service + offline ML scripts (see §4)
├── data/      # generated CSVs: train_500.csv, test_200.csv
├── models/    # trained artifacts: *.cbm / *.json / *.joblib / meta.json / evaluation.json
└── frontend/  # Next.js app (see §5)
```

## 8. API Flow

| Method | Path                          | Auth | Purpose                                  |
|--------|-------------------------------|------|------------------------------------------|
| GET    | `/health`                     | —    | Liveness + predictor mode                |
| POST   | `/api/predict-career`         | —    | Run pipeline → top-3 recommendations     |
| GET    | `/api/career-details/{name}`  | —    | Market + required-skills info for a career |
| GET    | `/api/career-roadmap/{name}`  | —    | Roadmap steps for a career               |
| GET    | `/api/careers`                | —    | List all supported careers               |

**`POST /api/predict-career` — request:**
```json
{
  "education": "BCA",
  "skills": ["Excel", "Python", "SQL", "Data Analysis"],
  "interests": ["Data", "AI"],
  "experience": 1,
  "passout_year": 2024,
  "career_preference": "High Salary"
}
```
**response (truncated):**
```json
{
  "assessment_id": 1,
  "recommendation_id": 1,
  "top_3": [
    {
      "career": "Data Analyst",
      "match_pct": 99.0,
      "why": "Your skills in Excel, SQL, Data Analysis map directly onto what Data Analysts do; ...",
      "market_demand_score": 90,
      "salary_range": "₹5–15 LPA",
      "future_growth_score": 85,
      "future_growth_label": "High",
      "required_skills": ["Excel", "SQL", "Power BI", "Statistics", "Data Analysis", "Python"],
      "owned_skills": ["Excel", "SQL", "Data Analysis", "Python"],
      "missing_skills": ["Power BI", "Statistics"],
      "roadmap": ["Excel", "SQL", "Power BI / Tableau", "Python", "Statistics", "Portfolio Projects", "Job Ready"]
    }
  ],
  "comparison": [{ "career": "Data Analyst", "match_pct": 99.0, "demand": 90, "growth": 85, "skill_coverage": 67 }]
}
```

## 9. Training Strategy

- **Data:** 500 synthetic training rows + 200 separate test rows, generated from
  weighted education→skill→interest→career rules so combinations stay realistic and
  classes stay perfectly balanced (25/class train, 10/class test).
- **Models:** CatBoost & XGBoost multi-class classifiers.
- **Tuning:** small grids, **5-fold stratified `GridSearchCV`** for stability.
- **Metrics:** accuracy, macro precision/recall/F1, **top-3 accuracy**, confusion
  matrix, feature importance (all written to `models/meta.json` + `models/evaluation.json`).
- **Serving:** artifacts saved to `/models`, loaded once at FastAPI startup.

---

## 10. Run Instructions

### Prerequisites
- Python 3.11+, Node 18+. PostgreSQL optional (SQLite is the zero-setup default).

### A. Generate data + train models
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
python ml/generate_dataset.py     # → data/train_500.csv & data/test_200.csv
python ml/train.py                # → models/* + prints metrics
python ml/evaluate.py             # evaluates on the 200-row test set
```

### B. Run the backend
```bash
copy .env.example .env            # optional; defaults to SQLite if DATABASE_URL unset
uvicorn app.main:app --reload --port 8000
# docs: http://localhost:8000/docs   ·   health: http://localhost:8000/health
```

### C. Run the frontend
```bash
cd frontend
npm install
copy .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                          # http://localhost:3000
```

---

### Design system
Light, premium SaaS aesthetic — indigo/slate palette, generous whitespace, soft
shadows, rounded-3xl cards, no neon. Framer Motion for scroll/entry animations,
Recharts for all graphs (radial match gauges, comparison bars, radar outlook).

### Production notes
- Pinned to the latest patched **Next.js 14.2.x**. Remaining `npm audit` advisories are
  DoS-class issues fixed only in **Next.js 16** (a breaking major) — plan that upgrade
  before public deployment.
- Use Alembic for real DB migrations (startup `create_all` is for dev convenience).
- Set a real `DATABASE_URL` (PostgreSQL) and restrict `CORS_ORIGINS` in production.
