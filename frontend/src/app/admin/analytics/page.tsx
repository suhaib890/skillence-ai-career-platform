"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";
import { CHART_COLORS, Panel, SectionTitle, Spinner, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Analytics = {
  daily_signups: { date: string; count: number }[];
  user_growth: { date: string; total: number }[];
  monthly_signups: { month: string; count: number }[];
  feature_usage: { feature: string; count: number }[];
  top_careers: { career: string; count: number }[];
  top_skills: { name: string; count: number }[];
  top_interests: { name: string; count: number }[];
  top_education: { name: string; count: number }[];
  funnel: { stage: string; count: number }[];
};

export default function AnalyticsPage() {
  const { data, loading } = useAdminData<Analytics>(() => api.admin.analytics() as Promise<Analytics>);
  if (loading || !data) return <Spinner label="Loading analytics…" />;

  const funnelData = data.funnel.map((f, i) => ({ ...f, fill: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div>
      <SectionTitle title="Analytics" subtitle="Growth, engagement and platform usage." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Daily signups" subtitle="Last 30 days">
          <Chart>
            <AreaChart data={data.daily_signups} margin={{ left: -22, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="ds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={ax} minTickGap={26} />
              <YAxis allowDecimals={false} tick={ax} width={28} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#ds)" />
            </AreaChart>
          </Chart>
        </Panel>

        <Panel title="Cumulative user growth" subtitle="Running total">
          <Chart>
            <LineChart data={data.user_growth} margin={{ left: -22, right: 8, top: 8 }}>
              <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={ax} minTickGap={26} />
              <YAxis allowDecimals={false} tick={ax} width={28} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            </LineChart>
          </Chart>
        </Panel>

        <Panel title="Monthly signups" subtitle="Last 12 months">
          <Chart>
            <BarChart data={data.monthly_signups} margin={{ left: -22, right: 8, top: 8 }}>
              <XAxis dataKey="month" tickFormatter={(m) => String(m).slice(2)} tick={ax} minTickGap={8} />
              <YAxis allowDecimals={false} tick={ax} width={28} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#06b6d4" />
            </BarChart>
          </Chart>
        </Panel>

        <Panel title="Feature usage" subtitle="Total interactions per module">
          <Chart>
            <PieChart>
              <Tooltip {...tooltipStyle} />
              <Pie data={data.feature_usage} dataKey="count" nameKey="feature" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {data.feature_usage.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
                <LabelList dataKey="feature" position="outside" style={{ fontSize: 11, fill: "#475569" }} />
              </Pie>
            </PieChart>
          </Chart>
        </Panel>

        <Panel title="Conversion funnel" subtitle="Signup → Job Ready" className="lg:col-span-2">
          <Chart height={260}>
            <FunnelChart>
              <Tooltip {...tooltipStyle} />
              <Funnel dataKey="count" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#334155" stroke="none" dataKey="stage" style={{ fontSize: 12, fontWeight: 600 }} />
                <LabelList position="left" fill="#6366f1" stroke="none" dataKey="count" style={{ fontSize: 12, fontWeight: 700 }} />
              </Funnel>
            </FunnelChart>
          </Chart>
        </Panel>

        <RankBar title="Most recommended careers" data={data.top_careers.map((c) => ({ name: c.career, count: c.count }))} color="#6366f1" />
        <RankBar title="Most common skills" data={data.top_skills} color="#8b5cf6" />
        <RankBar title="Most common interests" data={data.top_interests} color="#06b6d4" />
        <RankBar title="Top education backgrounds" data={data.top_education} color="#10b981" />
      </div>
    </div>
  );
}

const ax = { fontSize: 11, fill: "#94a3b8" } as const;

function Chart({ children, height = 240 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function RankBar({ title, data, color }: { title: string; data: { name: string; count: number }[]; color: string }) {
  return (
    <Panel title={title}>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-400">Not enough data yet.</p>
      ) : (
        <Chart>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={110} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={color}>
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#94a3b8" }} />
            </Bar>
          </BarChart>
        </Chart>
      )}
    </Panel>
  );
}
