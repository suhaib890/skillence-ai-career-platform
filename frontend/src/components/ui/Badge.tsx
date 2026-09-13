import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "cyan" | "violet";

const tones: Record<Tone, string> = {
  brand: "bg-brand-500/10 text-brand-700 border-brand-400/30",
  violet: "bg-violet-500/10 text-violet-700 border-violet-400/30",
  cyan: "bg-cyan-500/10 text-cyan-700 border-cyan-400/30",
  neutral: "bg-white/55 text-ink-700 border-white/70",
  success: "bg-success-500/10 text-success-700 border-success-500/25",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/25",
  danger: "bg-danger-500/10 text-danger-700 border-danger-500/25",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-md",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
