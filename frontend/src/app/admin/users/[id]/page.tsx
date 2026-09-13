"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  Download,
  FileText,
  Mic,
  Shield,
  Target,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Panel, Spinner } from "@/components/admin/AdminUI";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.userDetail(id).then(setData).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Loading profile…" />;
  if (err || !data) return <p className="text-ink-500">{err ?? "Not found"}</p>;

  const u = data.user;

  async function patch(body: { role?: string; is_active?: boolean }) {
    await api.admin.updateUser(id, body);
    load();
  }
  async function remove() {
    if (!confirm(`Delete ${u.full_name}? This is permanent.`)) return;
    try { await api.admin.deleteUser(id); router.push("/admin/users"); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `user_${id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      {/* header */}
      <Panel className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-xl font-bold text-white shadow-glass-sm">
              {u.full_name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-bold text-ink-900">{u.full_name}</h1>
              <p className="text-sm text-ink-500">{u.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Tag tone={u.role === "admin" ? "violet" : "ink"}>{u.role}</Tag>
                <Tag tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Deactivated"}</Tag>
                <Tag tone="brand">{u.stage}</Tag>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Action onClick={() => patch({ role: u.role === "admin" ? "user" : "admin" })} icon={<Shield className="h-4 w-4" />}>
              {u.role === "admin" ? "Demote" : "Make admin"}
            </Action>
            <Action onClick={() => patch({ is_active: !u.is_active })} icon={u.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}>
              {u.is_active ? "Deactivate" : "Reactivate"}
            </Action>
            <Action onClick={exportJson} icon={<Download className="h-4 w-4" />}>Export</Action>
            {u.role !== "admin" && (
              <Action onClick={remove} icon={<Trash2 className="h-4 w-4" />} danger>Delete</Action>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Joined" value={u.created_at ? new Date(u.created_at).toLocaleString() : "—"} />
          <Info label="Last login" value={u.last_login ? new Date(u.last_login).toLocaleString() : "—"} />
          <Info label="Auth provider" value={u.auth_provider} />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Assessment History" icon={<ClipboardList className="h-4 w-4" />} count={data.assessments.length}>
          {data.assessments.map((a: any) => (
            <Item key={a.id} title={`${a.education || "Assessment"} · ${a.skills.length} skills`} sub={`${a.career_preference} · ${a.experience} yr · ${date(a.created_at)}`} />
          ))}
        </Section>

        <Section title="Career Recommendations" icon={<Target className="h-4 w-4" />} count={data.recommendations.length}>
          {data.recommendations.map((r: any) => (
            <Item key={r.id} title={(r.careers || []).map((c: any) => c.career).slice(0, 3).join(", ") || "—"} sub={date(r.created_at)} />
          ))}
        </Section>

        <Section title="Skill Gap Reports" icon={<Target className="h-4 w-4" />} count={data.skill_gap_reports.length}>
          {data.skill_gap_reports.map((r: any) => (
            <Item key={r.id} title={(r.careers || []).map((c: any) => `${c.career} (${c.readiness_score}%)`).slice(0, 2).join(", ")} sub={date(r.created_at)} />
          ))}
        </Section>

        <Section title="Transition Plans" icon={<Compass className="h-4 w-4" />} count={data.transition_plans.length}>
          {data.transition_plans.map((p: any) => (
            <Item key={p.id} title={`→ ${p.target_career}`} sub={`${p.final_readiness}% ${p.job_ready ? "· job ready" : ""} · ${date(p.created_at)}`} />
          ))}
        </Section>

        <Section title="Resume Analyses" icon={<FileText className="h-4 w-4" />} count={data.resume_analyses.length}>
          {data.resume_analyses.map((r: any) => (
            <Item key={r.id} title={`Match ${r.match_score}% · ATS ${r.ats_score}%`} sub={`${r.job_readiness_level} · ${date(r.created_at)}`} />
          ))}
        </Section>

        <Section title="Interview Results" icon={<Mic className="h-4 w-4" />} count={data.interviews.length}>
          {data.interviews.map((it: any) => (
            <Item key={it.id} title={`${it.career} · ${it.interview_type}`} sub={`${it.overall_score != null ? it.overall_score + "%" : it.status} · ${date(it.created_at)}`} />
          ))}
        </Section>
      </div>

      {/* activity timeline */}
      <Panel title="Activity Timeline" className="mt-5" subtitle={`${data.activity.length} recent events`}>
        {data.activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No activity recorded.</p>
        ) : (
          <ol className="relative space-y-3 pl-6">
            <span aria-hidden className="absolute bottom-2 left-[9px] top-2 w-px bg-gradient-to-b from-brand-400/60 to-cyan-400/40" />
            {data.activity.map((ev: any, i: number) => (
              <li key={i} className="relative">
                <span className="absolute -left-6 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 ring-2 ring-white/70">
                  <Clock className="h-2.5 w-2.5 text-white" />
                </span>
                <div className="text-sm font-medium text-ink-800">{label(ev.event)}</div>
                <div className="text-xs text-ink-400">{date(ev.created_at, true)}</div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

const date = (s: string | null, time = false) =>
  s ? (time ? new Date(s).toLocaleString() : new Date(s).toLocaleDateString()) : "—";

const label = (e: string) =>
  ({ signup: "Signed up", assessment: "Completed assessment", resume: "Analyzed resume",
     interview: "Started interview", interview_completed: "Completed interview",
     transition: "Generated transition plan", login: "Logged in" } as Record<string, string>)[e] ?? e;

function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-500/14 text-violet-700",
    brand: "bg-brand-500/12 text-brand-700",
    success: "bg-success-500/14 text-success-700",
    danger: "bg-danger-500/12 text-danger-700",
    ink: "bg-ink-500/10 text-ink-600",
  };
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

function Action({ onClick, icon, children, danger }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
        danger
          ? "border-danger-500/30 bg-danger-500/10 text-danger-700 hover:bg-danger-500/20"
          : "border-white/60 bg-white/50 text-ink-700 hover:bg-white/75",
      )}
    >
      {icon} {children}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft p-3">
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="truncate font-medium text-ink-800">{value}</div>
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <Panel
      title={title}
      action={<span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-ink-500">{count}</span>}
    >
      <span className="sr-only">{icon}</span>
      <div className="space-y-2">
        {count === 0 ? <p className="py-4 text-sm text-ink-400">Nothing yet.</p> : children}
      </div>
    </Panel>
  );
}

function Item({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="glass-soft p-3">
      <div className="truncate text-sm font-medium text-ink-800">{title}</div>
      <div className="truncate text-xs text-ink-400">{sub}</div>
    </div>
  );
}
