"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  ClipboardList,
  Compass,
  FileText,
  Gauge,
  GraduationCap,
  History,
  Mic,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CareerCard } from "@/components/CareerCard";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { ReadinessComparisonChart } from "@/components/charts/ReadinessComparisonChart";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { useSkillence } from "@/store/useSkillence";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";
import type { UserDashboard } from "@/lib/types";

export default function DashboardPage() {
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const { result, lastInput } = useSkillence();
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<UserDashboard | null>(null);
  useEffect(() => setHydrated(true), []);

  // load the user's full activity history (revisitable past results)
  useEffect(() => {
    if (!user) return;
    api.userDashboard(user.id).then(setHistory).catch(() => setHistory(null));
  }, [user, result]);

  if (!hydrated || !ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  if (!result) {
    return (
      <div className="container-x py-14">
        <Card className="mx-auto max-w-lg text-center">
          <CardBody className="py-12">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <ClipboardList className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-semibold">No recommendations yet</h2>
            <p className="mt-2 text-sm text-ink-600">
              Take the quick assessment to unlock your Top 3 careers.
            </p>
            <Link href="/assessment" className="mt-6 inline-block">
              <Button>Start assessment</Button>
            </Link>
          </CardBody>
        </Card>

        {/* returning users can still revisit prior results */}
        <ActivityHistory history={history} />
      </div>
    );
  }

  const topMatch = result.top_3[0];
  const avgReadiness = Math.round(
    result.top_3.reduce((s, r) => s + r.readiness_score, 0) / result.top_3.length,
  );

  return (
    <div className="container-x py-14">
      {/* ---- profile glass card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative mb-6 overflow-hidden shadow-glass">
          <div
            aria-hidden
            className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl"
          />
          <CardBody className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 text-2xl font-bold text-white shadow-[0_12px_28px_-10px_rgba(99,102,241,0.7)]">
                {(user?.full_name ?? "Sk").slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700">
                  <Sparkles className="h-3.5 w-3.5" /> Your AI recommendations
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {user?.full_name ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Your Dashboard"}
                </h1>
                {lastInput && (
                  <p className="mt-1 text-sm text-ink-500">
                    {lastInput.education} · {lastInput.skills.length} skills ·{" "}
                    {lastInput.interests.length} interests · {lastInput.experience} yr exp
                  </p>
                )}
              </div>
            </div>
            <Link href="/assessment">
              <Button variant="glass" size="sm">Retake assessment</Button>
            </Link>
          </CardBody>
        </Card>
      </motion.div>

      {/* ---- metrics grid ---- */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Top match" value={`${topMatch.match_pct}%`} sub={topMatch.career} tone="brand" icon={<Target className="h-4 w-4" />} />
        <Metric label="Avg. readiness" value={`${avgReadiness}%`} sub="across top 3" tone="violet" icon={<Gauge className="h-4 w-4" />} />
        <Metric label="Skills logged" value={String(lastInput?.skills.length ?? 0)} sub={`${lastInput?.interests.length ?? 0} interests`} tone="cyan" icon={<GraduationCap className="h-4 w-4" />} />
        <Metric label="Careers analyzed" value={String(result.top_3.length)} sub="best-fit paths" tone="success" icon={<Compass className="h-4 w-4" />} />
      </div>

      {/* readiness summary strip */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {result.top_3.map((rec) => (
          <Card key={rec.career} className="hover-lift shadow-glass-sm hover:shadow-glass">
            <CardBody className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {rec.career}
                </p>
                <div className="mt-1.5">
                  <ReadinessBadge score={rec.readiness_score} level={rec.readiness_level} />
                </div>
                <p className="mt-1.5 text-xs text-ink-400">
                  {rec.skill_gap.estimated_weeks > 0
                    ? `~${rec.skill_gap.estimated_time} to job ready`
                    : "Job ready now"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-ink-900">
                  {rec.readiness_score}%
                </div>
                <div className="text-[10px] uppercase tracking-wide text-ink-400">
                  ready
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* comparison charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Career readiness
            </h2>
            <ReadinessComparisonChart rows={result.comparison} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Match · demand · growth
            </h2>
            <ComparisonChart rows={result.comparison} />
          </CardBody>
        </Card>
      </div>

      {/* cards */}
      <div className="space-y-6">
        {result.top_3.map((rec, i) => (
          <CareerCard key={rec.career} rec={rec} rank={i} />
        ))}
      </div>

      {/* full activity history */}
      <ActivityHistory history={history} />
    </div>
  );
}

const METRIC_TONE: Record<string, string> = {
  brand: "from-brand-500/15 to-violet-500/10 text-brand-600",
  violet: "from-violet-500/15 to-brand-500/10 text-violet-600",
  cyan: "from-cyan-500/15 to-brand-500/10 text-cyan-600",
  success: "from-success-500/15 to-cyan-500/10 text-success-600",
};

function Metric({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof METRIC_TONE;
  icon: React.ReactNode;
}) {
  return (
    <Card className="hover-lift shadow-glass-sm hover:shadow-glass">
      <CardBody className="p-5">
        <span
          className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-white/60 ${METRIC_TONE[tone]}`}
        >
          {icon}
        </span>
        <div className="text-2xl font-bold text-ink-900">{value}</div>
        <div className="text-xs font-medium text-ink-500">{label}</div>
        <div className="mt-0.5 truncate text-[11px] text-ink-400">{sub}</div>
      </CardBody>
    </Card>
  );
}

/** Past results across every Skillence feature, linked to the user. */
function ActivityHistory({ history }: { history: UserDashboard | null }) {
  if (!history) return null;

  const {
    assessments,
    recommendations,
    skill_gap_reports,
    transition_plans,
    resume_analyses,
    interviews,
  } = history;

  const isEmpty =
    !assessments.length &&
    !recommendations.length &&
    !skill_gap_reports.length &&
    !transition_plans.length &&
    !resume_analyses.length &&
    !interviews.length;

  if (isEmpty) return null;

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center gap-2">
        <History className="h-5 w-5 text-brand-600" />
        <h2 className="text-xl font-bold tracking-tight">Your activity</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Past assessments */}
        <HistoryCard
          icon={<GraduationCap className="h-4 w-4" />}
          title="Past assessments"
          count={assessments.length}
        >
          {assessments.slice(0, 6).map((a) => (
            <Row
              key={a.assessment_id}
              left={`${a.education || "Assessment"} · ${a.skills.length} skills`}
              right={fmtDate(a.created_at)}
            />
          ))}
        </HistoryCard>

        {/* Career recommendations */}
        <HistoryCard
          icon={<Target className="h-4 w-4" />}
          title="Career recommendations"
          count={recommendations.length}
        >
          {recommendations.slice(0, 6).map((r) => (
            <Row
              key={r.recommendation_id}
              left={
                r.top_careers
                  .slice(0, 3)
                  .map((c) => c.career)
                  .join(", ") || "—"
              }
              right={fmtDate(r.created_at)}
            />
          ))}
        </HistoryCard>

        {/* Skill gap reports */}
        <HistoryCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="Skill gap reports"
          count={skill_gap_reports.length}
        >
          {skill_gap_reports.slice(0, 6).map((s) => (
            <Row
              key={s.analysis_id}
              left={`${s.career_name} · ${s.readiness_level}`}
              right={`${s.readiness_score}%`}
            />
          ))}
        </HistoryCard>

        {/* Transition roadmaps */}
        <HistoryCard
          icon={<Compass className="h-4 w-4" />}
          title="Transition roadmaps"
          count={transition_plans.length}
        >
          {transition_plans.slice(0, 6).map((p) => (
            <Row
              key={p.plan_id}
              left={`→ ${p.target_career}`}
              right={`${p.final_readiness}% ${p.job_ready ? "· ready" : ""}`}
            />
          ))}
        </HistoryCard>

        {/* Resume analyses */}
        <HistoryCard
          icon={<FileText className="h-4 w-4" />}
          title="Resume analysis history"
          count={resume_analyses.length}
        >
          {resume_analyses.slice(0, 6).map((r) => (
            <Row
              key={r.analysis_id}
              left={`Match ${r.match_score}% · ATS ${r.ats_score}%`}
              right={fmtDate(r.created_at)}
            />
          ))}
        </HistoryCard>

        {/* Interview history */}
        <HistoryCard
          icon={<Mic className="h-4 w-4" />}
          title="Interview history"
          count={interviews.length}
        >
          {interviews.slice(0, 6).map((i) => (
            <Row
              key={i.session_id}
              left={`${i.career} · ${i.interview_type}`}
              right={
                i.completed && i.overall_score != null
                  ? `${i.overall_score}%`
                  : "in progress"
              }
            />
          ))}
        </HistoryCard>
      </div>
    </section>
  );
}

function HistoryCard({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <span className="text-brand-600">{icon}</span>
            {title}
          </h3>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
            {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="text-sm text-ink-400">Nothing yet.</p>
        ) : (
          <div className="divide-y divide-ink-100">{children}</div>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 truncate text-ink-700">{left}</span>
      <span className="shrink-0 text-xs font-medium text-ink-400">{right}</span>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
