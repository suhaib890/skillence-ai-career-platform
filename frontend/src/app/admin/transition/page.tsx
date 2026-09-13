"use client";

import { Briefcase, Rocket, Target } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { CHART_COLORS, Panel, SectionTitle, Spinner, StatCard, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Overview = { total_transition_plans: number; total_users: number };
type Analytics = { funnel: { stage: string; count: number }[]; feature_usage: { feature: string; count: number }[] };

export default function TransitionAnalytics() {
  const { data: ov, loading } = useAdminData<Overview>(() => api.admin.overview() as Promise<Overview>);
  const { data: an } = useAdminData<Analytics>(() => api.admin.analytics() as Promise<Analytics>);
  if (loading || !ov) return <Spinner label="Loading transition analytics…" />;

  const jobReady = an?.funnel.find((f) => f.stage === "Job Ready")?.count ?? 0;
  const interview = an?.funnel.find((f) => f.stage === "Interview")?.count ?? 0;

  return (
    <div>
      <SectionTitle title="Transition Intelligence" subtitle="Career-transition planning and job-readiness progression." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Transition plans" value={ov.total_transition_plans} tone="brand" icon={<Briefcase className="h-5 w-5" />} index={0} />
        <StatCard label="Interview-ready users" value={interview} tone="warning" icon={<Target className="h-5 w-5" />} index={1} />
        <StatCard label="Job-ready users" value={jobReady} tone="success" icon={<Rocket className="h-5 w-5" />} index={2} />
      </div>

      <Panel title="Readiness progression funnel" subtitle="How users advance toward job-ready">
        {an ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={an.funnel} layout="vertical" margin={{ left: 40, right: 30 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: "#475569" }} width={120} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {an.funnel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Spinner />}
      </Panel>
    </div>
  );
}
