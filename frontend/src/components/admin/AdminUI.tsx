"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Recharts palette aligned with the Skillence design system. */
export const CHART_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#a78bfa"];

export const tooltipStyle = {
  contentStyle: {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 14,
    boxShadow: "0 8px 32px rgba(31,38,135,0.15)",
    fontSize: 12,
  },
  labelStyle: { color: "#0f172a", fontWeight: 600 },
};

/** Floating glass panel with an optional title + action slot. */
export function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("glass-card p-5 shadow-glass", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const TONE: Record<string, string> = {
  brand: "from-brand-500/15 to-violet-500/10 text-brand-600",
  violet: "from-violet-500/15 to-brand-500/10 text-violet-600",
  cyan: "from-cyan-500/15 to-brand-500/10 text-cyan-600",
  success: "from-success-500/15 to-cyan-500/10 text-success-600",
  warning: "from-warning-500/15 to-brand-500/10 text-warning-600",
  danger: "from-danger-500/15 to-violet-500/10 text-danger-600",
};

export function StatCard({
  label,
  value,
  sub,
  delta,
  tone = "brand",
  icon,
  index = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  tone?: keyof typeof TONE;
  icon?: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass-card hover-lift p-5 shadow-glass-sm hover:shadow-glass"
    >
      <div className="flex items-start justify-between">
        {icon && (
          <span className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-white/60", TONE[tone])}>
            {icon}
          </span>
        )}
        {delta != null && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              delta >= 0 ? "bg-success-500/12 text-success-700" : "bg-danger-500/12 text-danger-700",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-ink-900">{value}</div>
      <div className="text-xs font-medium text-ink-500">{label}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-ink-400">{sub}</div>}
    </motion.div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-ink-400">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}

/** Fetch-on-mount hook with loading/error + reload. */
export function useAdminData<T = unknown>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
