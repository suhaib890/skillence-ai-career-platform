"""AI Interview Intelligence™ engine.

Generates interview questions (LLM-first, with a curated bank as fallback),
evaluates each answer, and produces a full scorecard: 8 category scores, an
overall score, hiring probability, job-readiness prediction, communication
analysis, STAR breakdown for behavioral answers, and a 4-week improvement plan.

Question generation prefers the configured LLM; evaluation is deterministic so
scores are stable and instant (no per-answer network calls). An optional LLM
layer adds a coaching summary at the end. Everything degrades gracefully when
no LLM key is configured or the call fails.
"""

from __future__ import annotations

import re

from ..config import settings
from ..llm import generate_json
from ..ml.constants import (
    DEFAULT_SKILL_META,
    load_interview_question_bank,
    load_skill_catalog,
)
from .analyzer import SkillGapAnalyzer

INTERVIEW_TYPES = ("HR", "Technical", "Behavioral", "Mock")
DIFFICULTIES = ("Beginner", "Intermediate", "Advanced")
_DIFF_ORDER = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}

FILLERS = ["umm", "um", "uh", "like", "basically", "you know", "actually", "literally"]
HEDGES = ["maybe", "i think", "i guess", "not sure", "probably", "kind of", "sort of"]
CONNECTORS = ["because", "therefore", "first", "then", "next", "finally",
              "for example", "as a result", "however", "so that", "in order to"]

# STAR cue words for behavioral answers
_STAR_CUES = {
    "situation": ["when", "while", "during", "at my", "in my", "situation", "project", "time when", "faced"],
    "task": ["responsible", "task", "goal", "needed to", "had to", "my role", "objective", "required"],
    "action": ["i ", "we ", "decided", "implemented", "led", "created", "built", "organized",
               "approached", "developed", "coordinated", "analyzed"],
    "result": ["result", "outcome", "resulted", "increased", "reduced", "achieved", "improved",
               "impact", "learned", "%", "delivered"],
}


def _readiness_label(score: int) -> str:
    if score < 40:
        return "Not Ready"
    if score < 65:
        return "Partially Ready"
    if score < 85:
        return "Interview Ready"
    return "Job Ready"


class InterviewEngine:
    def __init__(self) -> None:
        self.analyzer = SkillGapAnalyzer()
        self._bank = load_interview_question_bank()
        self._catalog = load_skill_catalog()

    # ====================================================================
    # QUESTION GENERATION (LLM-first)
    # ====================================================================
    def generate_questions(
        self, career: str, interview_type: str, difficulty: str, profile: dict
    ) -> tuple[list[dict], str]:
        itype = interview_type if interview_type in INTERVIEW_TYPES else "Mock"
        diff = difficulty if difficulty in DIFFICULTIES else "Intermediate"

        llm_qs = self._llm_questions(career, itype, diff, profile)
        if llm_qs:
            return llm_qs, "llm"
        return self._bank_questions(career, itype, diff, profile), "bank"

    def _llm_questions(self, career, itype, diff, profile) -> list[dict] | None:
        if not settings.llm_enabled:
            return None
        skills = ", ".join(profile.get("skills", [])) or "general"
        exp = profile.get("experience", 0)
        n = 6 if itype == "Mock" else 5
        mix = (
            "a realistic mix of HR, technical and behavioral questions"
            if itype == "Mock"
            else f"{itype} interview questions"
        )
        system = (
            "You are an expert technical interviewer. Respond with ONLY a JSON object: "
            '{"questions":[{"type":"HR|Technical|Behavioral","text":"...","difficulty":"Beginner|Intermediate|Advanced",'
            '"concepts":["keyword","keyword"]}]}. '
            "concepts are 2-5 lowercase keywords the ideal answer should mention (empty list for HR)."
        )
        prompt = (
            f"Generate {n} {mix} for a candidate interviewing for a {career} role.\n"
            f"Candidate skills: {skills}. Experience: {exp} years. Target difficulty: {diff}.\n"
            "Make technical questions specific to the role. Keep each question one sentence."
        )
        data = generate_json(system, prompt)
        if not isinstance(data, dict):
            return None
        raw = data.get("questions")
        if not isinstance(raw, list) or not raw:
            return None
        out: list[dict] = []
        for i, q in enumerate(raw):
            if not isinstance(q, dict) or not str(q.get("text", "")).strip():
                continue
            qtype = str(q.get("type", "Technical")).title()
            if qtype not in ("Hr", "HR", "Technical", "Behavioral"):
                qtype = "Technical"
            qtype = "HR" if qtype.upper() == "HR" else qtype
            concepts = q.get("concepts") if isinstance(q.get("concepts"), list) else []
            out.append({
                "order": i + 1,
                "qtype": qtype,
                "text": str(q["text"]).strip(),
                "difficulty": q.get("difficulty", diff) if q.get("difficulty") in DIFFICULTIES else diff,
                "concepts": [str(c).lower() for c in concepts][:6],
            })
        return out or None

    # -- deterministic bank fallback ------------------------------------
    def _tech_questions(self, career, diff, profile, limit) -> list[dict]:
        bank = self._bank.get("technical", {})
        items = list(bank.get(career, []))
        if not items:
            # generic templates from the career's top required skills
            req = self.analyzer.required(career) or profile.get("skills", []) or ["your core skill"]
            templates = self._bank.get("technical_generic_templates", [])
            items = []
            for skill in req[:3]:
                for t in templates:
                    items.append({
                        "q": t["q"].format(skill=skill),
                        "difficulty": t["difficulty"],
                        "concepts": [skill.lower()],
                    })
        # prefer questions at/below the chosen difficulty, then fill
        ceil = _DIFF_ORDER[diff]
        in_range = [q for q in items if _DIFF_ORDER.get(q.get("difficulty", "Intermediate"), 1) <= ceil]
        ordered = in_range + [q for q in items if q not in in_range]
        return [
            {"qtype": "Technical", "text": q["q"], "difficulty": q.get("difficulty", diff),
             "concepts": [c.lower() for c in q.get("concepts", [])]}
            for q in ordered[:limit]
        ]

    def _simple(self, qtype, texts, limit) -> list[dict]:
        return [{"qtype": qtype, "text": t, "difficulty": "Intermediate", "concepts": []}
                for t in texts[:limit]]

    def _bank_questions(self, career, itype, diff, profile) -> list[dict]:
        hr = self._bank.get("hr", [])
        beh = self._bank.get("behavioral", [])
        if itype == "HR":
            qs = self._simple("HR", hr, 5)
        elif itype == "Behavioral":
            qs = self._simple("Behavioral", beh, 5)
        elif itype == "Technical":
            qs = self._tech_questions(career, diff, profile, 5)
        else:  # Mock
            qs = (
                self._simple("HR", hr, 2)
                + self._tech_questions(career, diff, profile, 2)
                + self._simple("Behavioral", beh, 2)
            )
        for i, q in enumerate(qs):
            q["order"] = i + 1
        return qs

    # ====================================================================
    # ANSWER EVALUATION (deterministic)
    # ====================================================================
    def _analyze_text(self, answer: str) -> dict:
        text = (answer or "").strip()
        lower = text.lower()
        words = re.findall(r"[a-zA-Z']+", text)
        wc = len(words)
        sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
        sc = max(1, len(sentences))
        filler = sum(len(re.findall(rf"\b{re.escape(f)}\b", lower)) for f in FILLERS)
        hedge = sum(len(re.findall(rf"\b{re.escape(h)}\b", lower)) for h in HEDGES)
        connectors = sum(1 for c in CONNECTORS if c in lower)
        unique_ratio = (len({w.lower() for w in words}) / wc) if wc else 0.0
        return {
            "text": text, "lower": lower, "wc": wc, "sc": sc,
            "filler": filler, "hedge": hedge, "connectors": connectors,
            "unique_ratio": unique_ratio, "avg_sentence_len": wc / sc,
        }

    @staticmethod
    def _length_factor(wc: int) -> float:
        if wc >= 45:
            return 1.0
        if wc >= 25:
            return 0.78
        if wc >= 12:
            return 0.5
        if wc >= 4:
            return 0.28
        return 0.1

    def _star(self, a: dict) -> dict:
        scores = {}
        for comp, cues in _STAR_CUES.items():
            hits = sum(1 for c in cues if c in a["lower"])
            scores[comp] = min(100, 30 + hits * 22) if hits else 22
        # scale down very short answers
        lf = self._length_factor(a["wc"])
        return {k: int(round(v * (0.55 + 0.45 * lf))) for k, v in scores.items()}

    def evaluate_answer(self, question: dict, answer: str, filler_override: int | None = None) -> dict:
        a = self._analyze_text(answer)
        lf = self._length_factor(a["wc"])
        filler = filler_override if filler_override is not None else a["filler"]

        length_score = int(round(100 * lf))
        filler_score = max(0, 100 - filler * 9)
        clarity = 100 - max(0, abs(a["avg_sentence_len"] - 16) - 6) * 4
        clarity = int(round(max(10, clarity) * 0.7 + filler_score * 0.3))
        vocabulary = int(round(min(100, a["unique_ratio"] * 118) * (0.6 + 0.4 * lf)))
        structure = int(round(min(100, 38 + a["sc"] * 12 + a["connectors"] * 11) * (0.6 + 0.4 * lf)))
        confidence = int(round(filler_score * 0.45 + length_score * 0.3 + max(0, 100 - a["hedge"] * 9) * 0.25))
        communication = int(round((clarity + vocabulary + structure + confidence) / 4))

        qtype = question.get("qtype", "Technical")
        concepts = [c.lower() for c in question.get("concepts", [])]
        matched = [c for c in concepts if c in a["lower"]]
        missing = [c for c in concepts if c not in a["lower"]]

        scores = {
            "communication": communication, "clarity": clarity, "vocabulary": vocabulary,
            "structure": structure, "confidence": confidence,
        }

        technical = problem_solving = behavioral = None
        star = None

        if qtype == "Technical":
            if concepts:
                coverage = len(matched) / len(concepts)
                technical = int(round(min(100, coverage * 78 + length_score * 0.22)))
            else:
                technical = int(round(communication * 0.8 + length_score * 0.2))
            problem_solving = int(round(0.4 * structure + 0.3 * technical
                                        + 0.3 * min(100, a["connectors"] * 22 + length_score * 0.5)))
            scores["technical"] = technical
            scores["problem_solving"] = problem_solving
        elif qtype == "Behavioral":
            star = self._star(a)
            behavioral = int(round(sum(star.values()) / 4))
            problem_solving = int(round(0.5 * structure + 0.5 * behavioral))
            scores["behavioral"] = behavioral
            scores["problem_solving"] = problem_solving

        strength, weakness, suggestion = self._feedback(
            qtype, scores, filler, missing, lf, star
        )

        return {
            "qtype": qtype, "scores": scores, "star": star,
            "filler_count": filler, "word_count": a["wc"],
            "matched_concepts": matched, "missing_concepts": missing,
            "strength": strength, "weakness": weakness, "suggestion": suggestion,
        }

    def _feedback(self, qtype, scores, filler, missing, lf, star):
        # strength
        if scores.get("technical", 0) >= 70:
            strength = "Strong grasp of the core technical concepts."
        elif scores["confidence"] >= 75:
            strength = "Confident, fluent delivery."
        elif scores["structure"] >= 70:
            strength = "Well-structured, easy-to-follow response."
        elif lf >= 0.78:
            strength = "Good detail and relevant content."
        else:
            strength = "Clear attempt with relevant points."

        # weakness + suggestion (first matching rule)
        if lf <= 0.28:
            weakness = "Answer was too brief to demonstrate depth."
            suggestion = "Aim for 4–6 sentences: point, reason, and a concrete example."
        elif filler >= 3:
            weakness = "Frequent filler words reduced clarity and confidence."
            suggestion = "Pause instead of saying 'umm/like'; rehearse a concise structure aloud."
        elif qtype == "Technical" and missing:
            weakness = f"Missed key concepts: {', '.join(missing[:3])}."
            suggestion = f"Mention {missing[0]} explicitly, ideally with a real business example."
        elif qtype == "Behavioral" and star:
            weakest = min(star, key=star.get)
            weakness = f"STAR was incomplete — the '{weakest}' part was weak."
            suggestion = f"Clearly state the {weakest} (e.g., quantify the result)."
        elif scores["structure"] < 55:
            weakness = "Response lacked a clear structure."
            suggestion = "Use a structured format: point → reason → example → takeaway."
        else:
            weakness = "Could add more specificity and measurable impact."
            suggestion = "Add a quantified example (numbers, %, outcome)."

        return strength, weakness, suggestion

    # ====================================================================
    # SCORECARD
    # ====================================================================
    @staticmethod
    def _avg(vals: list[int], fallback: int) -> int:
        vals = [v for v in vals if v is not None]
        return int(round(sum(vals) / len(vals))) if vals else fallback

    def score_interview(self, interview_type: str, evals: list[dict]) -> dict:
        if not evals:
            evals = []

        comm = self._avg([e["scores"]["communication"] for e in evals], 0)
        clarity = self._avg([e["scores"]["clarity"] for e in evals], comm)
        vocab = self._avg([e["scores"]["vocabulary"] for e in evals], comm)
        structure = self._avg([e["scores"]["structure"] for e in evals], comm)
        confidence = self._avg([e["scores"]["confidence"] for e in evals], comm)
        technical = self._avg([e["scores"].get("technical") for e in evals], int(round(comm * 0.8)))
        problem = self._avg([e["scores"].get("problem_solving") for e in evals], int(round(comm * 0.8)))
        behavioral = self._avg([e["scores"].get("behavioral") for e in evals], int(round(comm * 0.85)))

        if interview_type == "Technical":
            overall = 0.4 * technical + 0.2 * problem + 0.25 * comm + 0.15 * confidence
        elif interview_type == "HR":
            overall = 0.5 * comm + 0.25 * confidence + 0.25 * structure
        elif interview_type == "Behavioral":
            overall = 0.45 * behavioral + 0.3 * comm + 0.25 * problem
        else:  # Mock
            overall = (comm + technical + behavioral + confidence + problem) / 5
        overall = int(round(max(0, min(100, overall))))

        hiring_probability = min(96, int(round(overall * 0.9)))
        readiness = _readiness_label(overall)

        categories = {
            "Communication": comm, "Technical Knowledge": technical,
            "Problem Solving": problem, "Confidence": confidence,
            "Clarity": clarity, "Vocabulary": vocab,
            "Structure": structure, "Behavioral Responses": behavioral,
        }

        # aggregate STAR (behavioral answers only)
        star_evals = [e["star"] for e in evals if e.get("star")]
        star = None
        if star_evals:
            star = {k: self._avg([s[k] for s in star_evals], 0)
                    for k in ("situation", "task", "action", "result")}

        # missing concepts across technical answers + weak categories
        missing_concepts: list[str] = []
        for e in evals:
            for c in e.get("missing_concepts", []):
                if c not in missing_concepts:
                    missing_concepts.append(c)
        weak_categories = [k for k, v in categories.items() if v < 60]

        plan = self._improvement_plan(weak_categories, missing_concepts, behavioral, technical)
        comm_tip = (
            "Use concise, structured answers and cut filler words."
            if comm < 75 else "Maintain your clear, structured delivery and keep refining examples."
        )

        summary = self._coach_summary(overall, categories, readiness, missing_concepts)

        return {
            "interview_type": interview_type,
            "overall_score": overall,
            "category_scores": categories,
            "hiring_probability": hiring_probability,
            "readiness_level": readiness,
            "job_ready": overall >= 85,
            "missing": (missing_concepts[:5] + weak_categories)[:6],
            "communication_analysis": {"score": comm, "tip": comm_tip},
            "star_analysis": star,
            "improvement_plan": plan,
            "ai_summary": summary,
        }

    def _improvement_plan(self, weak_categories, missing_concepts, behavioral, technical) -> list[dict]:
        weeks: list[str] = []
        if missing_concepts:
            weeks.append(f"Revise core concepts: {', '.join(missing_concepts[:4])}")
        if technical is not None and technical < 65:
            weeks.append("Technical drills + mock technical questions")
        if behavioral is not None and behavioral < 65:
            weeks.append("Behavioral / STAR-method practice")
        if "Communication" in weak_categories or "Clarity" in weak_categories or "Structure" in weak_categories:
            weeks.append("Communication & structured-answer drills")
        # always finish with mocks; pad to 4 weeks
        defaults = ["Strengthen weakest topics with practice sets", "Record and review practice answers"]
        while len(weeks) < 3:
            weeks.append(defaults[len(weeks) % len(defaults)])
        weeks = weeks[:3] + ["Full mock interviews + resume alignment"]
        labels = ["Week 1", "Week 2", "Week 3", "Week 4"]
        plan = [{"week": labels[i], "focus": weeks[i]} for i in range(4)]
        return plan

    def _coach_summary(self, overall, categories, readiness, missing_concepts) -> str:
        if settings.llm_enabled:
            system = ('Respond with ONLY {"summary":"<2-3 sentence interview coaching>"}.')
            prompt = (
                f"Overall interview score {overall}/100, status {readiness}. "
                f"Category scores: {categories}. Missing concepts: {missing_concepts}. "
                "Give encouraging, specific coaching on what to improve next."
            )
            data = generate_json(system, prompt)
            if isinstance(data, dict) and isinstance(data.get("summary"), str) and data["summary"].strip():
                return data["summary"].strip()
        weakest = min(categories, key=categories.get)
        return (
            f"You scored {overall}/100 — {readiness}. Your strongest signal is solid; "
            f"focus next on {weakest.lower()}"
            + (f" and brushing up {missing_concepts[0]}" if missing_concepts else "")
            + ". Keep practicing with mock interviews to build consistency."
        )


interview_engine = InterviewEngine()
