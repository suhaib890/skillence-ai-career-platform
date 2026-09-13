"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TForecastStep } from "@/lib/types";

export function ForecastChart({ steps }: { steps: TForecastStep[] }) {
  const data = steps.map((s) => ({
    stage: s.stage.replace("After ", ""),
    Readiness: s.readiness,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 20, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="readyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "Readiness"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 40px -12px rgba(15,23,42,0.18)",
          }}
        />
        <Area
          type="monotone"
          dataKey="Readiness"
          stroke="#4f46e5"
          strokeWidth={2.5}
          fill="url(#readyGrad)"
          dot={{ r: 4, fill: "#4f46e5" }}
        >
          <LabelList
            dataKey="Readiness"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 12, fontWeight: 600, fill: "#4f46e5" }}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
