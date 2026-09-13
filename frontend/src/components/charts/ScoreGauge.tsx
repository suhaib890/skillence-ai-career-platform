"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/** Color a 0–100 score green→amber→rose. */
function scoreColor(value: number): string {
  if (value >= 75) return "#10b981";
  if (value >= 50) return "#f59e0b";
  return "#f43f5e";
}

export function ScoreGauge({
  value,
  label,
  size = "h-32 w-32",
}: {
  value: number;
  label: string;
  size?: string;
}) {
  const data = [{ name: label, value }];
  const color = scoreColor(value);
  return (
    <div className={`relative ${size}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="74%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={20}
            fill={color}
            background={{ fill: "#eef2ff" }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-ink-900">{value}</div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
