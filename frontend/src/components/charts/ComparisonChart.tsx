"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ComparisonRow } from "@/lib/types";

export function ComparisonChart({ rows }: { rows: ComparisonRow[] }) {
  const data = rows.map((r) => ({
    career: r.career.length > 14 ? r.career.slice(0, 13) + "…" : r.career,
    Match: r.match_pct,
    Demand: r.demand,
    Growth: r.growth,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={6} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="career" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 40px -12px rgba(15,23,42,0.18)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="Match" fill="#4f46e5" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Demand" fill="#818cf8" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Growth" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
