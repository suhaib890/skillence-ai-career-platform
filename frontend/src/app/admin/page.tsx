"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  Briefcase,
  ClipboardList,
  FileText,
  Mic,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner, StatCard, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Overview = {
  total_users: number;
  total_assessments: number;
  total_recommendations: number;
  total_resume_analyses: number;
  total_interview_sessions: number;
  total_transition_plans: number;
  todays_users: number;
  weekly_new: number;
  weekly_growth: number;
  monthly_new: number;
  monthly_growth: number;
  active_users: number;
};

type Analytics = { user_growth: { date: string; total: number }[] };
type Notifications = { notifications: { label: string; user: string; created_at: string | null; type: string }[] };

export default function AdminDashboard() {
  const { data: ov, loading } = useAdminData<Overview>(() => api.admin.overview() as Promise<Overview>);
  const { data: an } = useAdminData<Analytics>(() => api.admin.analytics() as Promise<Analytics>);
  const { data: notif } = useAdminData<Notifications>(() => api.admin.notifications() as Promise<Notifications>);

  if (loading || !ov) return <Spinner label="Loading dashboard…" />;

  const cards = [
    { label: "Total Users", value: ov.total_users, tone: "brand", icon: <Users className="h-5 w-5" /> },
    { label: "Assessments", value: ov.total_assessments, tone: "violet", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Career Recommendations", value: ov.total_recommendations, tone: "cyan", icon: <Target className="h-5 w-5" /> },
    { label: "Resume Analyses", value: ov.total_resume_analyses, tone: "success", icon: <FileText className="h-5 w-5" /> },
    { label: "Interview Sessions", value: ov.total_interview_sessions, tone: "warning", icon: <Mic className="h-5 w-5" /> },
    { label: "Transition Plans", value: ov.total_transition_plans, tone: "brand", icon: <Briefcase className="h-5 w-5" /> },
  ] as const;

  return (
    <div>
      <SectionTitle title="Admin Dashboard" subtitle="Platform health and growth at a glance." />

      {/* growth row */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Today's Users" value={ov.todays_users} tone="brand" icon={<UserPlus className="h-5 w-5" />} index={0} />
        <StatCard label="Weekly Growth" value={`${ov.weekly_new}`} sub="new this week" delta={ov.weekly_growth} tone="success" icon={<TrendingUp className="h-5 w-5" />} index={1} />
        <StatCard label="Monthly Growth" value={`${ov.monthly_new}`} sub="new this month" delta={ov.monthly_growth} tone="violet" icon={<Activity className="h-5 w-5" />} index={2} />
      </div>

      {/* overview cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} icon={c.icon} index={i} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* growth chart */}
        <Panel title="User growth" subtitle="Cumulative users (last 30 days)" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={an?.user_growth ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(d) => String(d).slice(5)} minTickGap={24} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* notifications */}
        <Panel
          title="Notifications"
          subtitle="Recent platform activity"
          action={<Bell className="h-4 w-4 text-brand-500" />}
        >
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {(notif?.notifications ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-ink-400">No recent activity.</p>
            )}
            {(notif?.notifications ?? []).map((n, i) => (
              <div key={i} className="glass-soft flex items-start gap-3 p-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-600">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{n.label}</p>
                  <p className="truncate text-xs text-ink-400">
                    {n.user} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin/analytics" className="text-sm font-medium text-brand-700 hover:underline">View full analytics →</Link>
        <Link href="/admin/crm" className="text-sm font-medium text-brand-700 hover:underline">Open CRM →</Link>
      </div>
    </div>
  );
}
