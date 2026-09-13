"use client";

import { cn } from "@/lib/utils";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import type { ProficiencyLevel } from "@/lib/types";

export function ProficiencyPicker({
  skills,
  levels,
  onChange,
}: {
  skills: string[];
  levels?: Record<string, ProficiencyLevel>;
  onChange: (skill: string, level: ProficiencyLevel) => void;
}) {
  if (skills.length === 0) return null;
  const safeLevels = levels ?? {};

  return (
    <div className="glass-soft mt-6 p-4">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
        How strong are you at each?
      </h4>
      <p className="mb-3 text-xs text-ink-400">
        Proficiency tunes your Career Readiness Score.
      </p>
      <div className="space-y-2.5">
        {skills.map((skill) => {
          const level = safeLevels[skill] ?? "Intermediate";
          return (
            <div
              key={skill}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/55 px-3 py-2 backdrop-blur-md"
            >
              <span className="truncate text-sm font-medium text-ink-800">
                {skill}
              </span>
              <div className="flex shrink-0 rounded-lg border border-white/70 bg-white/40 p-0.5">
                {PROFICIENCY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChange(skill, lvl)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      level === lvl
                        ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-glass-sm"
                        : "text-ink-500 hover:text-brand-700",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
