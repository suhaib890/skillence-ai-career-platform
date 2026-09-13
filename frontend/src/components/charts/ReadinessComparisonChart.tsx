"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { readinessBand } from "@/lib/constants";
import type { ComparisonRow } from "@/lib/types";

export function ReadinessComparisonChart({ rows }: { rows: ComparisonRow[] }) {
  const data = rows.map((r) => ({
    career: r.career.length > 14 ? r.career.slice(0, 13) + "…" : r.career,
    Readiness: r.readiness_score ?? r.skill_coverage ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="career" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          formatter={(v: number) => [`${v}%`, "Readiness"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 40px -12px rgba(15,23,42,0.18)",
          }}
        />
        <Bar dataKey="Readiness" radius={[6, 6, 0, 0]}>
          <LabelList
            dataKey="Readiness"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 12, fontWeight: 600, fill: "#475569" }}
          />
          {data.map((d, i) => (
            <Cell key={i} fill={readinessBand(d.Readiness).ring} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
