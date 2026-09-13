"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Download,
  KanbanSquare,
  Search,
  Table2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner } from "@/components/admin/AdminUI";

type Row = {
  id: number;
  full_name: string;
  email: string;
  education: string;
  skills: string[];
  interests: string[];
  created_at: string | null;
  last_active: string | null;
  assessment_status: string;
  readiness_score: number | null;
  recommended_career: string | null;
  stage: string;
};

type CrmResp = { rows: Row[]; total: number; page: number; page_size: number; stages: string[] };

const STAGE_TONE: Record<string, string> = {
  "New User": "bg-ink-500/10 text-ink-600",
  "Assessment Completed": "bg-brand-500/12 text-brand-700",
  "Career Recommended": "bg-violet-500/12 text-violet-700",
  "Resume Optimized": "bg-cyan-500/12 text-cyan-700",
  "Interview Ready": "bg-warning-500/14 text-warning-700",
  "Job Ready": "bg-success-500/14 text-success-700",
};

export default function CrmPage() {
  const [view, setView] = useState<"table" | "pipeline">("table");
  return (
    <div>
      <SectionTitle title="CRM" subtitle="Every user, their journey and pipeline stage." />
      <div className="mb-5 inline-flex rounded-full bg-white/50 p-1 backdrop-blur-md ring-1 ring-white/60">
        <Toggle active={view === "table"} onClick={() => setView("table")} icon={<Table2 className="h-4 w-4" />}>Table</Toggle>
        <Toggle active={view === "pipeline"} onClick={() => setView("pipeline")} icon={<KanbanSquare className="h-4 w-4" />}>Pipeline</Toggle>
      </div>
      {view === "table" ? <CrmTable /> : <Pipeline />}
    </div>
  );
}

function Toggle({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
        active ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-glass-sm" : "text-ink-600 hover:text-ink-900",
      )}
    >
      {icon} {children}
    </button>
  );
}

/* ----------------------------- TABLE ----------------------------- */
function CrmTable() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("created");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmResp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .crm({ q, stage, sort, order, page, page_size: 12 })
      .then((d) => setData(d as CrmResp))
      .finally(() => setLoading(false));
  }, [q, stage, sort, order, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const stages = data?.stages ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <Panel>
      {/* controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search name or email…"
            className="glass-input w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select value={stage} onChange={(e) => { setPage(1); setStage(e.target.value); }} className="glass-input rounded-xl px-3 py-2 text-sm">
          <option value="all">All stages</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="glass-input rounded-xl px-3 py-2 text-sm">
          <option value="created">Joined</option>
          <option value="name">Name</option>
          <option value="readiness">Readiness</option>
          <option value="active">Last active</option>
        </select>
        <button onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))} className="glass-input rounded-xl px-3 py-2 text-sm text-ink-600" title="Toggle order">
          <ArrowDownUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => api.admin.exportCsv({ q, stage })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-glass-sm hover:-translate-y-0.5"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/50 text-xs uppercase tracking-wide text-ink-400">
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Education</th>
                <th className="px-3 py-2.5">Recommended</th>
                <th className="px-3 py-2.5">Readiness</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5">Last active</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/admin/users/${r.id}`)}
                  className="cursor-pointer border-b border-white/30 transition-colors hover:bg-white/40"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink-900">{r.full_name}</div>
                    <div className="text-xs text-ink-400">{r.email}</div>
                  </td>
                  <td className="px-3 py-3 text-ink-600">{r.education || "—"}</td>
                  <td className="px-3 py-3 text-ink-600">{r.recommended_career || "—"}</td>
                  <td className="px-3 py-3">{r.readiness_score != null ? `${r.readiness_score}%` : "—"}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STAGE_TONE[r.stage] ?? "bg-ink-500/10 text-ink-600")}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-ink-400">
                    {r.last_active ? new Date(r.last_active).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-ink-400">No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
        <span>{data?.total ?? 0} users</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 disabled:opacity-40">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------- PIPELINE (kanban + DnD) --------------------------- */
type Card = { id: number; full_name: string; email: string; recommended_career: string | null; readiness_score: number | null };
type Pipe = { stages: string[]; columns: Record<string, Card[]> };

function Pipeline() {
  const [data, setData] = useState<Pipe | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin.crmPipeline().then((d) => setData(d as Pipe));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Spinner label="Loading pipeline…" />;

  async function drop(stage: string) {
    if (dragId == null || !data) return;
    // optimistic move
    const next: Pipe = { stages: data.stages, columns: {} };
    let moved: Card | null = null;
    for (const s of data.stages) {
      next.columns[s] = (data.columns[s] || []).filter((c) => {
        if (c.id === dragId) { moved = c; return false; }
        return true;
      });
    }
    if (moved) next.columns[stage] = [moved, ...(next.columns[stage] || [])];
    setData(next);
    setDragId(null);
    setOverStage(null);
    try {
      await api.admin.setStage(dragId, stage);
    } catch {
      load(); // revert from server on failure
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {data.stages.map((stage) => (
        <div
          key={stage}
          onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
          onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
          onDrop={() => drop(stage)}
          className={cn(
            "w-72 shrink-0 rounded-2xl border p-3 transition-colors",
            overStage === stage ? "border-brand-400/60 bg-brand-500/8" : "border-white/50 bg-white/35",
          )}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-ink-800">{stage}</span>
            <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-ink-500">
              {(data.columns[stage] || []).length}
            </span>
          </div>
          <div className="space-y-2">
            {(data.columns[stage] || []).map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => setDragId(c.id)}
                className="glass-card cursor-grab rounded-xl p-3 shadow-glass-sm active:cursor-grabbing"
              >
                <div className="text-sm font-medium text-ink-900">{c.full_name}</div>
                <div className="truncate text-xs text-ink-400">{c.email}</div>
                {c.recommended_career && (
                  <div className="mt-1.5 inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    {c.recommended_career}{c.readiness_score != null ? ` · ${c.readiness_score}%` : ""}
                  </div>
                )}
              </div>
            ))}
            {(data.columns[stage] || []).length === 0 && (
              <p className="py-6 text-center text-xs text-ink-300">Drop here</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
