"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

import { readinessBand } from "@/lib/constants";

export function ReadinessRing({
  value,
  size = "h-28 w-28",
}: {
  value: number;
  size?: string;
}) {
  const band = readinessBand(value);
  const data = [{ name: "readiness", value }];
  return (
    <div className={`relative ${size}`}>
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
            fill={band.ring}
            background={{ fill: "#eef2ff" }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-ink-900">{value}%</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-400">
            ready
          </div>
        </div>
      </div>
    </div>
  );
}
