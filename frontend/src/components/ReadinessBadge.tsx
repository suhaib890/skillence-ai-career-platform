"use client";

import { CheckCircle2, Rocket, Sprout, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { readinessBand } from "@/lib/constants";

const ICONS: Record<string, React.ReactNode> = {
  "Job Ready": <CheckCircle2 className="h-3.5 w-3.5" />,
  "Nearly Job Ready": <Rocket className="h-3.5 w-3.5" />,
  Developing: <TrendingUp className="h-3.5 w-3.5" />,
  Beginner: <Sprout className="h-3.5 w-3.5" />,
};

export function ReadinessBadge({
  score,
  level,
  className,
}: {
  score: number;
  /** Optional explicit label; otherwise derived from the score band. */
  level?: string;
  className?: string;
}) {
  const band = readinessBand(score);
  const label = level ?? band.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        band.bg,
        band.text,
        className,
      )}
    >
      {ICONS[label] ?? ICONS[band.label]}
      {label}
    </span>
  );
}

export function ReadinessBar({ score }: { score: number }) {
  const band = readinessBand(score);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: band.ring }}
      />
    </div>
  );
}
