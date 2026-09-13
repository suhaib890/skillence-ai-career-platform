"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCog,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner } from "@/components/admin/AdminUI";

type Row = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  recommended_career: string | null;
  created_at: string | null;
};
type Resp = { rows: Row[]; total: number; page: number; page_size: number };

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.users({ q, page, page_size: 12 }).then((d) => setData(d as Resp)).finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(id: number, body: { role?: string; is_active?: boolean }) {
    setBusy(id);
    try { await api.admin.updateUser(id, body); load(); } finally { setBusy(null); }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Delete ${name}? This permanently removes the user and all their data.`)) return;
    setBusy(id);
    try { await api.admin.deleteUser(id); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusy(null); }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div>
      <SectionTitle title="User Management" subtitle="View, search, promote, deactivate or remove users." />
      <Panel>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search users…"
            className="glass-input w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>

        {loading && !data ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/50 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Joined</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-white/30 hover:bg-white/40">
                    <td className="px-3 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {u.full_name}
                      </Link>
                      <div className="text-xs text-ink-400">{u.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        u.role === "admin" ? "bg-violet-500/14 text-violet-700" : "bg-ink-500/10 text-ink-600",
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        u.is_active ? "bg-success-500/14 text-success-700" : "bg-danger-500/12 text-danger-700",
                      )}>
                        {u.is_active ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/users/${u.id}`} title="View" className="rounded-lg p-2 text-ink-500 hover:bg-white/60 hover:text-brand-700">
                          <UserCog className="h-4 w-4" />
                        </Link>
                        <button
                          disabled={busy === u.id}
                          title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                          onClick={() => patch(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                          className="rounded-lg p-2 text-ink-500 hover:bg-white/60 hover:text-violet-700 disabled:opacity-40"
                        >
                          {u.role === "admin" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>
                        <button
                          disabled={busy === u.id}
                          title={u.is_active ? "Deactivate" : "Reactivate"}
                          onClick={() => patch(u.id, { is_active: !u.is_active })}
                          className="rounded-lg p-2 text-ink-500 hover:bg-white/60 hover:text-warning-700 disabled:opacity-40"
                        >
                          {u.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <button
                          disabled={busy === u.id || u.role === "admin"}
                          title={u.role === "admin" ? "Admins can't be deleted" : "Delete"}
                          onClick={() => remove(u.id, u.full_name)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-danger-500/10 hover:text-danger-700 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.rows.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-ink-400">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>{data?.total ?? 0} users</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 disabled:opacity-40">Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
