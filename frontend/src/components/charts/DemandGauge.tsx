"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export function DemandGauge({
  demand,
  growth,
  match,
}: {
  demand: number;
  growth: number;
  match: number;
}) {
  const data = [
    { metric: "Demand", value: demand },
    { metric: "Growth", value: growth },
    { metric: "Match", value: match },
    { metric: "Outlook", value: Math.round((demand + growth) / 2) },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#475569" }} />
        <Radar dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
