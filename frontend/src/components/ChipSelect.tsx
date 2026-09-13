"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChipSelect({
  options,
  selected,
  onToggle,
  multi = true,
  allowCustom = false,
  customPlaceholder = "Add your own…",
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
}) {
  const [custom, setCustom] = useState("");

  // Show any manually-entered values that aren't part of the preset options.
  const extras = selected.filter((v) => v && !options.includes(v));
  const allOptions = [...options, ...extras];

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (!selected.includes(value)) onToggle(value);
    setCustom("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {allOptions.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                active
                  ? "border-transparent bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.7)] -translate-y-0.5"
                  : "border-white/70 bg-white/50 text-ink-700 backdrop-blur-md hover:bg-white/75 hover:text-brand-700 hover:-translate-y-0.5",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={customPlaceholder}
            className="glass-input flex-1 rounded-2xl px-4 py-2.5 text-sm text-ink-900"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="inline-flex items-center gap-1 rounded-2xl border border-brand-400/30 bg-brand-500/10 px-4 py-2.5 text-sm font-semibold text-brand-700 backdrop-blur-md transition-colors hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
    </div>
  );
}
