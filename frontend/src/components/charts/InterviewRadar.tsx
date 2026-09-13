"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

const SHORT: Record<string, string> = {
  "Communication": "Comm.",
  "Technical Knowledge": "Technical",
  "Problem Solving": "Problem",
  "Confidence": "Confidence",
  "Clarity": "Clarity",
  "Vocabulary": "Vocab.",
  "Structure": "Structure",
  "Behavioral Responses": "Behavioral",
};

export function InterviewRadar({ scores }: { scores: Record<string, number> }) {
  const data = Object.entries(scores).map(([metric, value]) => ({
    metric: SHORT[metric] ?? metric,
    value,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="74%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#475569" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
