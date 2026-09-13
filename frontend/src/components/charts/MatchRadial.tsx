"use client";

import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export function MatchRadial({ value }: { value: number }) {
  const data = [{ name: "match", value }];
  return (
    <div className="relative h-28 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={20}
            fill="#4f46e5"
            background={{ fill: "#eef2ff" }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-ink-900">{value}%</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">
            match
          </div>
        </div>
      </div>
    </div>
  );
}
