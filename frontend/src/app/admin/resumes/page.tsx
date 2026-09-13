"use client";

import { FileText, Gauge, ScanLine } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner, StatCard, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Data = {
  total: number;
  avg_ats: number;
  avg_match: number;
  ats_distribution: { range: string; count: number }[];
  match_distribution: { range: string; count: number }[];
  missing_skills: { name: string; count: number }[];
  missing_keywords: { name: string; count: number }[];
  common_weaknesses: { text: string; count: number }[];
};

export default function ResumeAnalytics() {
  const { data, loading } = useAdminData<Data>(() => api.admin.resumes() as Promise<Data>);
  if (loading || !data) return <Spinner label="Loading resume analytics…" />;

  return (
    <div>
      <SectionTitle title="Resume Intelligence" subtitle="ATS performance and the gaps holding candidates back." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Resumes analyzed" value={data.total} tone="brand" icon={<FileText className="h-5 w-5" />} index={0} />
        <StatCard label="Avg ATS score" value={`${data.avg_ats}%`} tone="cyan" icon={<ScanLine className="h-5 w-5" />} index={1} />
        <StatCard label="Avg match score" value={`${data.avg_match}%`} tone="violet" icon={<Gauge className="h-5 w-5" />} index={2} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="ATS score distribution">
          <Dist data={data.ats_distribution} color="#06b6d4" />
        </Panel>
        <Panel title="Match score distribution">
          <Dist data={data.match_distribution} color="#8b5cf6" />
        </Panel>
        <Panel title="Most missing skills">
          <RankList items={data.missing_skills} />
        </Panel>
        <Panel title="Most missing keywords">
          <RankList items={data.missing_keywords} />
        </Panel>
        <Panel title="Most common resume weaknesses" className="lg:col-span-2">
          <RankList items={data.common_weaknesses.map((w) => ({ name: w.text, count: w.count }))} />
        </Panel>
      </div>
    </div>
  );
}

function Dist({ data, color }: { data: { range: string; count: number }[]; color: string }) {
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -22, top: 8 }}>
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankList({ items }: { items: { name: string; count: number }[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-400">Not enough data yet.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="glass-soft px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="truncate text-sm text-ink-700">{it.name}</span>
            <span className="shrink-0 text-xs font-semibold text-brand-700">{it.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100/70">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-600" style={{ width: `${(it.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
