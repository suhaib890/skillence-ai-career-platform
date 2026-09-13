"""Transition Intelligence™ engine.

Builds a personalized current→target career transition plan covering all ten
steps of the module: baseline analysis, skill-gap mapping, a phased roadmap,
timeline estimation, project & certification recommendations, a job-readiness
forecast, risk analysis and AI-coach guidance.

It is fully deterministic (always works offline) and reuses the Skill Gap
Analyzer so readiness numbers stay consistent across the app. An optional LLM
layer enriches the AI-coach narrative when a key is configured; on any failure
the deterministic coach text is used instead.
"""

from __future__ import annotations

from ..config import settings
from ..llm import generate_json
from ..ml.constants import (
    DEFAULT_SKILL_META,
    load_career_certifications,
    load_career_projects,
    load_skill_catalog,
    readiness_level,
)
from .analyzer import SkillGapAnalyzer

# study hours assumed per curriculum-week (drives the timeline engine)
HOURS_PER_WEEK = 24

# importance band -> transition gap tier
_TIER = {"High": "Critical", "Medium": "Important", "Low": "Optional"}


class TransitionEngine:
    def __init__(self) -> None:
        self.analyzer = SkillGapAnalyzer()
        self._catalog = load_skill_catalog()
        self._projects = load_career_projects()
        self._certs = load_career_certifications()

    # -- helpers -------------------------------------------------------------
    def _meta(self, skill: str) -> dict:
        return self._catalog.get(skill, DEFAULT_SKILL_META)

    def _projects_for(self, career: str) -> list[dict]:
        if career in self._projects:
            return self._projects[career]
        # generic fallback derived from the career's required skills
        req = self.analyzer.required(career)
        return [
            {"name": f"{career} Starter Project", "difficulty": "Beginner", "weeks": 1, "skills": req[:2]},
            {"name": f"{career} Portfolio Project", "difficulty": "Intermediate", "weeks": 2, "skills": req[:3]},
            {"name": f"{career} Capstone Project", "difficulty": "Advanced", "weeks": 3, "skills": req[:4]},
        ]

    def _certs_for(self, career: str) -> list[dict]:
        if career in self._certs:
            return self._certs[career]
        return [
            {"name": f"Foundational {career} course", "level": "Beginner",
             "why": "Establishes the core vocabulary and skills for the role."},
            {"name": f"Professional {career} certificate", "level": "Intermediate",
             "why": "Validates job-ready competence to recruiters."},
        ]

    # -- step 1: baseline ----------------------------------------------------
    def _baseline(self, target: str, gap: dict, profile: dict) -> dict:
        present = [p["skill"] for p in gap["present_skills"]]
        strengths: list[str] = list(present[:4])
        analytical = {"Python", "Statistics", "Data Analysis", "Problem Solving", "Critical Thinking"}
        if analytical & set(present):
            strengths.append("Analytical thinking")
        if profile.get("experience", 0) >= 2:
            strengths.append(f"{profile['experience']} yrs experience")

        weaknesses = [m["skill"] for m in gap["missing_skills"][:4]]
        if not profile.get("projects_completed"):
            weaknesses.append("Portfolio projects")

        return {
            "education": profile.get("education", ""),
            "current_role": profile.get("current_role", ""),
            "experience": profile.get("experience", 0),
            "skills": present,
            "current_readiness": gap["readiness_score"],
            "readiness_level": gap["readiness_level"],
            "strengths": strengths,
            "weaknesses": weaknesses,
        }

    # -- step 2: skill-gap mapping ------------------------------------------
    def _gap_mapping(self, gap: dict) -> dict:
        buckets: dict[str, list[str]] = {"Critical": [], "Important": [], "Optional": []}
        for m in gap["missing_skills"]:
            buckets[_TIER.get(m["importance"], "Optional")].append(m["skill"])
        return buckets

    # -- step 3 + 5: roadmap phases (with project milestones) ---------------
    def _phases(self, target: str, gap: dict, profile: dict) -> list[dict]:
        # learning skills sorted by tier then difficulty (easy first)
        diff_rank = {"Easy": 0, "Medium": 1, "Hard": 2}
        tier_rank = {"Critical": 0, "Important": 1, "Optional": 2}
        learn = sorted(
            gap["missing_skills"],
            key=lambda m: (tier_rank[_TIER.get(m["importance"], "Optional")],
                           diff_rank.get(m["difficulty"], 1)),
        )
        skill_names = [m["skill"] for m in learn]
        projects = self._projects_for(target)

        phases: list[dict] = []
        if skill_names:
            half = max(1, (len(skill_names) + 1) // 2)
            foundation = skill_names[:half]
            core = skill_names[half:]

            f_weeks = sum(self._meta(s)["weeks"] for s in foundation)
            phases.append({
                "phase": len(phases) + 1,
                "name": "Foundation",
                "goal": f"Acquire the core building blocks for {target}",
                "skills": foundation,
                "projects": [projects[0]["name"]] if projects else [],
                "duration_weeks": f_weeks,
                "milestone": projects[0]["name"] if projects else "Foundational project",
                "outcome": f"Core {target} fundamentals acquired",
            })

            if core:
                c_weeks = sum(self._meta(s)["weeks"] for s in core)
                proj = projects[1] if len(projects) > 1 else (projects[0] if projects else None)
                phases.append({
                    "phase": len(phases) + 1,
                    "name": "Applied & Portfolio",
                    "goal": f"Apply skills on a portfolio-grade {target} project",
                    "skills": core,
                    "projects": [proj["name"]] if proj else [],
                    "duration_weeks": c_weeks,
                    "milestone": proj["name"] if proj else "Portfolio project",
                    "outcome": "Portfolio-ready project shipped",
                })

        # final job-readiness phase (always present)
        phases.append({
            "phase": len(phases) + 1,
            "name": "Job Readiness",
            "goal": "Convert skills into offers",
            "skills": ["Interview Preparation", "Resume Optimization"],
            "projects": [projects[-1]["name"]] if projects else [],
            "duration_weeks": 2,
            "milestone": "Polished resume + mock interviews cleared",
            "outcome": "Ready to apply with confidence",
        })
        return phases

    # -- step 4: timeline ----------------------------------------------------
    def _timeline(self, phases: list[dict]) -> dict:
        total_weeks = sum(p["duration_weeks"] for p in phases)
        total_hours = total_weeks * HOURS_PER_WEEK

        def months_at(hours_per_day: int) -> float:
            days = total_hours / hours_per_day
            return round(days / 30, 1)

        return {
            "total_weeks": total_weeks,
            "total_hours": total_hours,
            "months_at_1h": months_at(1),
            "months_at_2h": months_at(2),
            "months_at_4h": months_at(4),
        }

    # -- step 7: readiness forecast -----------------------------------------
    def _forecast(self, target: str, profile: dict, phases: list[dict]) -> dict:
        owned = list(profile.get("skills", []))
        levels = dict(profile.get("skill_levels", {}))
        steps = [{"stage": "Current", "readiness": self.analyzer.analyze(target, owned, levels)["readiness_score"]}]

        for p in phases:
            if p["name"] == "Job Readiness":
                # not skill-graded by the analyzer; portfolio + resume polish bump
                prev = steps[-1]["readiness"]
                boosted = min(100, prev + 8)
                steps.append({"stage": f"After {p['name']}", "readiness": boosted})
                continue
            for s in p["skills"]:
                if s not in owned:
                    owned.append(s)
                levels[s] = "Advanced"
            score = self.analyzer.analyze(target, owned, levels)["readiness_score"]
            score = max(score, steps[-1]["readiness"])  # monotonic
            steps.append({"stage": f"After {p['name']}", "readiness": score})

        final = steps[-1]["readiness"]
        return {
            "steps": steps,
            "final_readiness": final,
            "final_level": readiness_level(final),
            "job_ready": final >= 80,
        }

    # -- step 8: risk analysis ----------------------------------------------
    def _risks(self, mapping: dict, baseline: dict, profile: dict) -> list[dict]:
        risks: list[dict] = []
        for skill in mapping["Critical"][:3]:
            risks.append({"level": "High", "item": f"{skill} not yet acquired",
                          "note": "Core requirement — missing it blocks most applications."})
        if not profile.get("projects_completed"):
            risks.append({"level": "Medium", "item": "No portfolio projects",
                          "note": "Recruiters expect 2–3 projects; build them during the roadmap."})
        for skill in mapping["Important"][:2]:
            risks.append({"level": "Medium", "item": f"{skill} gap",
                          "note": "Important for stronger interviews and on-the-job performance."})
        for s in baseline["strengths"][:2]:
            risks.append({"level": "Low", "item": f"Strong {s}",
                          "note": "An asset you can lean on while you close gaps."})
        return risks

    # -- step 9: AI coach ----------------------------------------------------
    def _coach_path(self, mapping: dict) -> list[str]:
        path = mapping["Critical"] + mapping["Important"]
        path += ["Portfolio Projects", "Resume Optimization"]
        return path

    def _coach_rules(self, target: str, baseline: dict, mapping: dict, timeline: dict) -> str:
        path = " → ".join(self._coach_path(mapping)) or "Portfolio Projects → Resume Optimization"
        return (
            f"You already possess {baseline['current_readiness']}% of what it takes to become a {target}. "
            f"Your fastest path is: {path}. "
            f"Estimated transition time: {timeline['total_weeks']} weeks "
            f"(~{timeline['months_at_2h']} months at 2 hrs/day). "
            f"Start with {(self._coach_path(mapping) or ['a portfolio project'])[0]} this week and keep a steady pace."
        )

    def _coach_llm(self, target: str, baseline: dict, mapping: dict, timeline: dict) -> str | None:
        system = (
            "You are an expert career-transition coach. Respond with ONLY a JSON object "
            'of the form {"coach": "<2-4 sentence motivational, specific, actionable message>"}.'
        )
        prompt = (
            f"Target career: {target}\n"
            f"Current readiness: {baseline['current_readiness']}%\n"
            f"Strengths: {', '.join(baseline['strengths']) or 'none yet'}\n"
            f"Critical gaps: {', '.join(mapping['Critical']) or 'none'}\n"
            f"Important gaps: {', '.join(mapping['Important']) or 'none'}\n"
            f"Estimated time: {timeline['total_weeks']} weeks (~{timeline['months_at_2h']} months at 2h/day)\n"
            "Write encouraging, concrete coaching that names the fastest skill order."
        )
        data = generate_json(system, prompt)
        if isinstance(data, dict) and isinstance(data.get("coach"), str) and data["coach"].strip():
            return data["coach"].strip()
        return None

    # -- public --------------------------------------------------------------
    def generate(self, profile: dict, target: str) -> dict:
        owned = profile.get("skills", [])
        levels = profile.get("skill_levels", {})
        gap = self.analyzer.analyze(target, owned, levels)

        baseline = self._baseline(target, gap, profile)
        mapping = self._gap_mapping(gap)
        phases = self._phases(target, gap, profile)
        timeline = self._timeline(phases)
        forecast = self._forecast(target, profile, phases)
        risks = self._risks(mapping, baseline, profile)

        coach_rules = self._coach_rules(target, baseline, mapping, timeline)
        coach_text = coach_rules
        coach_source = "rules"
        if settings.llm_enabled:
            llm_text = self._coach_llm(target, baseline, mapping, timeline)
            if llm_text:
                coach_text, coach_source = llm_text, "llm"

        return {
            "target_career": target,
            "baseline": baseline,
            "skill_gap_mapping": mapping,
            "phases": phases,
            "timeline": timeline,
            "recommended_projects": self._projects_for(target),
            "certifications": self._certs_for(target),
            "forecast": forecast,
            "risks": risks,
            "ai_coach": {"text": coach_text, "source": coach_source, "fastest_path": self._coach_path(mapping)},
            "llm_used": coach_source == "llm",
        }


transition_engine = TransitionEngine()
