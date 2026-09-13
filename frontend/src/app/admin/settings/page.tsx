"use client";

import { ScrollText, ShieldCheck, UserCircle } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Panel, SectionTitle, Spinner, useAdminData } from "@/components/admin/AdminUI";

type Logs = { logs: { id: number; action: string; target_type: string; target_id: number | null; detail: any; created_at: string | null }[] };

export default function SettingsPage() {
  const user = useAuth((s) => s.user);
  const { data, loading } = useAdminData<Logs>(() => api.admin.logs() as Promise<Logs>);

  return (
    <div>
      <SectionTitle title="Settings" subtitle="Admin profile, access control and the audit trail." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Admin profile" action={<UserCircle className="h-5 w-5 text-brand-500" />}>
          <div className="space-y-3 text-sm">
            <Field label="Name" value={user?.full_name ?? "—"} />
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Role" value={user?.role ?? "—"} />
          </div>
        </Panel>

        <Panel title="Access control" action={<ShieldCheck className="h-5 w-5 text-success-500" />}>
          <ul className="space-y-2.5 text-sm text-ink-600">
            <li className="flex items-start gap-2"><Dot /> Role-based access enforced on every admin API.</li>
            <li className="flex items-start gap-2"><Dot /> Sessions use signed, expiring bearer tokens.</li>
            <li className="flex items-start gap-2"><Dot /> Admin credentials are stored server-side (env), never in the client.</li>
            <li className="flex items-start gap-2"><Dot /> Deactivated accounts are rejected at the token layer.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Admin activity log" subtitle="Recent privileged actions" className="mt-5" action={<ScrollText className="h-5 w-5 text-violet-500" />}>
        {loading ? (
          <Spinner />
        ) : (data?.logs ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No admin actions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {data!.logs.map((l) => (
              <div key={l.id} className="glass-soft flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-ink-800">{l.action.replace(/_/g, " ")}</span>
                  {l.target_id != null && <span className="text-ink-400"> · {l.target_type} #{l.target_id}</span>}
                  {l.detail && Object.keys(l.detail).length > 0 && (
                    <span className="ml-1 text-xs text-ink-400">({JSON.stringify(l.detail)})</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft flex items-center justify-between px-3 py-2.5">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium capitalize text-ink-800">{value}</span>
    </div>
  );
}

const Dot = () => <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />;
