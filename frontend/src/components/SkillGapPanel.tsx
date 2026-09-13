"use client";

import { CheckCircle2, Clock, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { priorityTone } from "@/lib/constants";
import type { SkillGapAnalysis } from "@/lib/types";

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: "text-emerald-600",
  Medium: "text-amber-600",
  Hard: "text-rose-600",
};

export function SkillGapPanel({ gap }: { gap: SkillGapAnalysis }) {
  const present = gap.present_skills;
  const missing = gap.missing_skills;

  return (
    <div className="space-y-5">
      {/* present skills */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Existing skills ({present.length})
        </h4>
        {present.length === 0 ? (
          <p className="text-sm text-ink-400">
            None of this role&apos;s core skills yet — your roadmap starts from the top.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {present.map((p) => (
              <Badge key={p.skill} tone="success" title={`${p.level} · contributes ${p.contribution}`}>
                <CheckCircle2 className="h-3 w-3" /> {p.skill}
                <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                  {p.level}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* missing skills — prioritised */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Missing skills ({missing.length})
          </h4>
          {missing.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500">
              <Clock className="h-3.5 w-3.5" /> ~{gap.estimated_time} to job ready
            </span>
          )}
        </div>

        {missing.length === 0 ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" /> All core skills covered 🎉
          </Badge>
        ) : (
          <ul className="space-y-2">
            {missing.map((m) => {
              const tone = priorityTone(m.priority);
              return (
                <li
                  key={m.skill}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${tone.bg}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                    <span className="truncate text-sm font-medium text-ink-800">
                      {m.skill}
                    </span>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${tone.text}`}>
                      {m.priority}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <span className={`font-medium ${DIFFICULTY_TONE[m.difficulty] ?? "text-ink-500"}`}>
                      {m.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-500">
                      <GraduationCap className="h-3.5 w-3.5" /> {m.estimated_time}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
