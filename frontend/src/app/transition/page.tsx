"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CalendarClock,
  Compass,
  FileText,
  FolderGit2,
  Loader2,
  Map as MapIcon,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReadinessRing } from "@/components/charts/ReadinessRing";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { useSkillence } from "@/store/useSkillence";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";
import { priorityTone } from "@/lib/constants";
import type { TransitionInput, TransitionPlan } from "@/lib/types";

const DIFFICULTY_TONE: Record<string, "success" | "warning" | "brand"> = {
  Beginner: "success",
  Intermediate: "brand",
  Advanced: "warning",
};
const RISK_TONE: Record<string, { text: string; bg: string; dot: string }> = {
  High: { text: "text-rose-700", bg: "bg-rose-50 border-rose-100", dot: "bg-rose-500" },
  Medium: { text: "text-amber-700", bg: "bg-amber-50 border-amber-100", dot: "bg-amber-500" },
  Low: { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", dot: "bg-emerald-500" },
};

export default function TransitionPage() {
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const { assessment, result } = useSkillence();
  const [careers, setCareers] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [certs, setCerts] = useState("");
  const [projects, setProjects] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<TransitionPlan | null>(null);

  useEffect(() => {
    api.careers().then(setCareers).catch(() => setCareers([]));
  }, []);

  // default target to the user's top recommendation, if any
  useEffect(() => {
    if (!target && result?.top_3?.length) setTarget(result.top_3[0].career);
  }, [result, target]);

  const hasProfile = assessment.skills.length > 0;

  if (!ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  async function generate() {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const input: TransitionInput = {
        education: assessment.education,
        skills: assessment.skills,
        skill_levels: assessment.skill_levels ?? {},
        interests: assessment.interests,
        experience: assessment.experience,
        passout_year: assessment.passout_year,
        current_role: currentRole,
        certifications: certs.split(",").map((c) => c.trim()).filter(Boolean),
        projects_completed: projects,
        target_career: target,
      };
      const p = await api.generateTransitionPlan(input, user?.id);
      setPlan(p);
      requestAnimationFrame(() =>
        document.getElementById("ti-results")?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x py-14">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Compass className="h-3.5 w-3.5" /> Transition Intelligence™
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Your personalized path to a new career
        </h1>
        <p className="mt-1 max-w-2xl text-ink-600">
          Where you are today, what you&apos;re missing, what to learn next, how long it takes,
          what to build, and when you can start applying — in one plan.
        </p>
      </div>

      {/* setup */}
      <Card className="mb-8">
        <CardBody className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Target className="h-4 w-4 text-brand-600" /> Target career
            </h2>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm"
            >
              <option value="">Select a target career…</option>
              {careers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Current role">
                <input
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. Student"
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Projects completed">
                <input
                  type="number"
                  min={0}
                  value={projects}
                  onChange={(e) => setProjects(Math.max(0, Number(e.target.value)))}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <Field label="Certifications (comma-separated)" className="mt-3">
              <input
                value={certs}
                onChange={(e) => setCerts(e.target.value)}
                placeholder="e.g. Google Data Analytics"
                className="w-full glass-input rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Sparkles className="h-4 w-4 text-brand-600" /> Current profile
            </h2>
            {hasProfile ? (
              <div className="glass-soft p-4 text-sm text-ink-700">
                <p><span className="text-ink-400">Education:</span> {assessment.education || "—"}</p>
                <p className="mt-1"><span className="text-ink-400">Experience:</span> {assessment.experience} yr</p>
                <p className="mt-1"><span className="text-ink-400">Skills:</span></p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assessment.skills.map((s) => (
                    <Badge key={s} tone="brand">{s}</Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-400">
                  Pulled from your assessment.{" "}
                  <Link href="/assessment" className="text-brand-600 hover:underline">Edit profile</Link>
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                No profile yet. <Link href="/assessment" className="font-semibold underline">Take the 60-second assessment</Link>{" "}
                so we can read your skills and proficiency — then come back here.
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} — is the backend running on{" "}
          {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}?
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={generate} disabled={!target || loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Building your plan…</>
          ) : (
            <>Generate transition plan <Rocket className="h-4 w-4" /></>
          )}
        </Button>
      </div>

      {plan && <PlanView plan={plan} />}
    </div>
  );
}

function PlanView({ plan }: { plan: TransitionPlan }) {
  const { baseline, skill_gap_mapping, phases, timeline, recommended_projects, certifications, forecast, risks, ai_coach } = plan;

  return (
    <motion.div
      id="ti-results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 space-y-6"
    >
      {/* 1+2: Current state & target */}
      <Section icon={<Compass className="h-4 w-4" />} title={`Where you are → ${plan.target_career}`}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center">
            <ReadinessRing value={baseline.current_readiness} />
            <ReadinessBadge score={baseline.current_readiness} level={baseline.readiness_level} className="mt-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Mini title="Strengths" tone="success" items={baseline.strengths} />
            <Mini title="Weaknesses" tone="warning" items={baseline.weaknesses} />
          </div>
        </div>
      </Section>

      {/* 3: Skill gap analysis */}
      <Section icon={<Target className="h-4 w-4" />} title="Skill gap analysis">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["Critical", "Important", "Optional"] as const).map((tier) => {
            const tone = priorityTone(tier === "Critical" ? "High" : tier === "Important" ? "Medium" : "Low");
            const items = skill_gap_mapping[tier] ?? [];
            return (
              <div key={tier} className={`rounded-2xl border p-4 ${tone.bg}`}>
                <div className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${tone.text}`}>
                  <span className={`h-2 w-2 rounded-full ${tone.dot}`} /> {tier} gaps
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-ink-400">None 🎉</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 4: Timeline */}
      <Section icon={<CalendarClock className="h-4 w-4" />} title="Transition timeline">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat big label="Total" value={`${timeline.total_weeks} wks`} sub={`~${timeline.total_hours} hrs`} />
          <Stat label="At 1 hr/day" value={`${timeline.months_at_1h} mo`} />
          <Stat label="At 2 hrs/day" value={`${timeline.months_at_2h} mo`} />
          <Stat label="At 4 hrs/day" value={`${timeline.months_at_4h} mo`} />
        </div>
      </Section>

      {/* 5: Learning roadmap (phases) */}
      <Section icon={<MapIcon className="h-4 w-4" />} title="Learning roadmap">
        <div className="space-y-4">
          {phases.map((ph) => (
            <div key={ph.phase} className="glass-soft relative p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.8)]">
                    {ph.phase}
                  </span>
                  <div>
                    <h4 className="font-semibold text-ink-900">{ph.name}</h4>
                    <p className="text-xs text-ink-500">{ph.goal}</p>
                  </div>
                </div>
                <Badge tone="brand"><CalendarClock className="h-3 w-3" /> {ph.duration_weeks} weeks</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <KV label="Learn">
                  <div className="flex flex-wrap gap-1.5">
                    {ph.skills.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                  </div>
                </KV>
                <KV label="Milestone"><span className="text-sm text-ink-700">{ph.milestone}</span></KV>
                <KV label="Outcome"><span className="text-sm font-medium text-emerald-700">{ph.outcome}</span></KV>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 6: Projects */}
      <Section icon={<FolderGit2 className="h-4 w-4" />} title="Recommended projects">
        <div className="grid gap-4 sm:grid-cols-2">
          {recommended_projects.map((p) => (
            <div key={p.name} className="glass-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-ink-900">{p.name}</h4>
                <Badge tone={DIFFICULTY_TONE[p.difficulty] ?? "neutral"}>{p.difficulty}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">~{p.weeks} week{p.weeks > 1 ? "s" : ""}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.skills.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 7: Certifications */}
      <Section icon={<Award className="h-4 w-4" />} title="Certifications">
        <div className="grid gap-4 sm:grid-cols-3">
          {certifications.map((c) => (
            <div key={c.name} className="glass-soft p-4">
              <Badge tone={DIFFICULTY_TONE[c.level] ?? "neutral"}>{c.level}</Badge>
              <h4 className="mt-2 font-semibold text-ink-900">{c.name}</h4>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{c.why}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 8: Forecast */}
      <Section icon={<TrendingUp className="h-4 w-4" />} title="Job readiness forecast">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <ForecastChart steps={forecast.steps} />
          <div className="flex flex-col items-center gap-2">
            <ScoreGauge value={forecast.final_readiness} label="Final" />
            <Badge tone={forecast.job_ready ? "success" : "warning"}>
              <Rocket className="h-3 w-3" /> Job ready: {forecast.job_ready ? "YES" : "Almost"}
            </Badge>
          </div>
        </div>
      </Section>

      {/* 9: Risks */}
      <Section icon={<AlertTriangle className="h-4 w-4" />} title="Transition risk analysis">
        <ul className="space-y-2">
          {risks.map((r, i) => {
            const tone = RISK_TONE[r.level] ?? RISK_TONE.Low;
            return (
              <li key={i} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${tone.bg}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <div>
                  <span className={`text-sm font-semibold ${tone.text}`}>{r.level} · {r.item}</span>
                  <p className="text-xs text-ink-500">{r.note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 10: AI coach */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-5 text-white">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <Sparkles className="h-4 w-4" /> AI Coach
            </h3>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium">
              {ai_coach.source === "llm" ? "LLM-personalized" : "Rule-based"}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed">{ai_coach.text}</p>
          {ai_coach.fastest_path.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
              {ai_coach.fastest_path.map((step, i) => (
                <span key={step} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">{step}</span>
                  {i < ai_coach.fastest_path.length - 1 && <span className="opacity-70">→</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        <CardBody className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            Ready to polish your resume for this role? Run it through Resume Intelligence.
          </p>
          <Link href="/resume">
            <Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Resume Intelligence</Button>
          </Link>
        </CardBody>
      </Card>
    </motion.div>
  );
}

/* ---------- small presentational helpers ---------- */
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          <span className="text-brand-600">{icon}</span> {title}
        </h3>
        {children}
      </CardBody>
    </Card>
  );
}

function Mini({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-sm text-ink-400">—</span>
        ) : (
          items.map((s) => <Badge key={s} tone={tone}>{s}</Badge>)
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${big ? "border border-brand-400/30 bg-brand-500/10 backdrop-blur-md" : "glass-soft"}`}>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`font-bold text-ink-900 ${big ? "text-2xl" : "text-lg"}`}>{value}</div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      {children}
    </div>
  );
}
