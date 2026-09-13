"use client";

import { Mic, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner, StatCard, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Data = {
  total_interviews: number;
  completed: number;
  avg_overall: number;
  category_scores: { category: string; score: number }[];
  common_weaknesses: { text: string; count: number }[];
  hardest_questions: { question: string; avg: number }[];
  easiest_questions: { question: string; avg: number }[];
  score_distribution: { range: string; count: number }[];
};

export default function InterviewAnalytics() {
  const { data, loading } = useAdminData<Data>(() => api.admin.interviews() as Promise<Data>);
  if (loading || !data) return <Spinner label="Loading interview analytics…" />;

  return (
    <div>
      <SectionTitle title="Interview Intelligence" subtitle="Mock-interview performance across the platform." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total interviews" value={data.total_interviews} tone="brand" icon={<Mic className="h-5 w-5" />} index={0} />
        <StatCard label="Completed" value={data.completed} tone="cyan" index={1} />
        <StatCard label="Avg overall score" value={`${data.avg_overall}%`} tone="success" index={2} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Average scores by dimension" subtitle="Communication · Technical · Confidence …">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.category_scores} outerRadius={100}>
                <PolarGrid stroke="rgba(148,163,184,0.3)" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#475569" }} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Score distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.score_distribution} margin={{ left: -22, top: 8 }}>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Most common weaknesses">
          <RankList items={data.common_weaknesses.map((w) => ({ name: w.text, value: w.count }))} suffix="×" />
        </Panel>

        <div className="grid gap-5">
          <Panel title="Hardest questions" subtitle="Lowest average answer score" action={<ThumbsDown className="h-4 w-4 text-danger-500" />}>
            <RankList items={data.hardest_questions.map((q) => ({ name: q.question, value: q.avg }))} suffix="%" />
          </Panel>
          <Panel title="Most successful questions" subtitle="Highest average answer score" action={<ThumbsUp className="h-4 w-4 text-success-500" />}>
            <RankList items={data.easiest_questions.map((q) => ({ name: q.question, value: q.avg }))} suffix="%" />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RankList({ items, suffix }: { items: { name: string; value: number }[]; suffix: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-400">Not enough data yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="glass-soft flex items-center justify-between gap-3 px-3 py-2">
          <span className="truncate text-sm text-ink-700">{it.name}</span>
          <span className="shrink-0 text-xs font-semibold text-brand-700">{it.value}{suffix}</span>
        </li>
      ))}
    </ul>
  );
}
