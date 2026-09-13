"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";
import { CHART_COLORS, Panel, SectionTitle, Spinner, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Data = {
  top_careers: { career: string; count: number }[];
  demand_distribution: { career: string; demand: number }[];
  readiness_distribution: { range: string; count: number }[];
  trend: { date: string; count: number }[];
};

export default function CareerAnalytics() {
  const { data, loading } = useAdminData<Data>(() => api.admin.recommendations() as Promise<Data>);
  if (loading || !data) return <Spinner label="Loading career analytics…" />;

  return (
    <div>
      <SectionTitle title="Career Recommendations" subtitle="What the AI recommends and how ready users are." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top recommended careers">
          {data.top_careers.length === 0 ? <Empty /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_careers} layout="vertical" margin={{ left: 30, right: 24 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="career" tick={{ fontSize: 11, fill: "#475569" }} width={120} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.top_careers.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#94a3b8" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Career demand distribution" subtitle="Avg market demand of recommended careers">
          {data.demand_distribution.length === 0 ? <Empty /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.demand_distribution} layout="vertical" margin={{ left: 30, right: 24 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="career" tick={{ fontSize: 11, fill: "#475569" }} width={120} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="demand" radius={[0, 6, 6, 0]} fill="#06b6d4">
                    <LabelList dataKey="demand" position="right" style={{ fontSize: 11, fill: "#94a3b8" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Readiness score distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.readiness_distribution} margin={{ left: -22, top: 8 }}>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Recommendation trend" subtitle="Recommendations generated (last 30 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -22, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={26} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#rt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const Empty = () => <p className="py-16 text-center text-sm text-ink-400">Not enough data yet.</p>;
