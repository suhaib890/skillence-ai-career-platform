"use client";

import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Server,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Panel, SectionTitle, Spinner, StatCard, tooltipStyle, useAdminData } from "@/components/admin/AdminUI";

type Data = {
  total_requests: number;
  prediction_requests: number;
  total_errors: number;
  error_rate: number;
  avg_response_ms: number;
  uptime_seconds: number;
  latency_series: number[];
  db_healthy: boolean;
  predictor_mode: string;
  storage_mb: number;
  rows: Record<string, number>;
};

export default function MonitoringPage() {
  const { data, loading } = useAdminData<Data>(() => api.admin.monitoring() as Promise<Data>);
  if (loading || !data) return <Spinner label="Loading system metrics…" />;

  const uptime = `${Math.floor(data.uptime_seconds / 3600)}h ${Math.floor((data.uptime_seconds % 3600) / 60)}m`;
  const series = data.latency_series.map((ms, i) => ({ i, ms }));

  return (
    <div>
      <SectionTitle title="System Monitoring" subtitle="Live platform health and resource usage." />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="API requests" value={data.total_requests} tone="brand" icon={<Activity className="h-5 w-5" />} index={0} />
        <StatCard label="Prediction requests" value={data.prediction_requests} tone="violet" icon={<Cpu className="h-5 w-5" />} index={1} />
        <StatCard label="Avg response" value={`${data.avg_response_ms} ms`} tone="cyan" icon={<Gauge className="h-5 w-5" />} index={2} />
        <StatCard
          label="Error rate"
          value={`${data.error_rate}%`}
          sub={`${data.total_errors} errors`}
          tone={data.error_rate > 2 ? "danger" : "success"}
          icon={<AlertTriangle className="h-5 w-5" />}
          index={3}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Response latency" subtitle="Recent requests (ms)" className="lg:col-span-2">
          <div className="h-56">
            {series.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-ink-400">No traffic yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: -28, right: 8, top: 8 }}>
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={36} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="ms" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Health icon={<Database className="h-4 w-4" />} label="Database" ok={data.db_healthy} value={data.db_healthy ? "Healthy" : "Down"} />
          <Health icon={<Server className="h-4 w-4" />} label="ML Predictor" ok value={data.predictor_mode} />
          <Health icon={<HardDrive className="h-4 w-4" />} label="Storage" ok value={`${data.storage_mb} MB`} />
          <Health icon={<Activity className="h-4 w-4" />} label="Uptime" ok value={uptime} />
        </div>
      </div>

      <Panel title="Database rows" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(data.rows).map(([k, v]) => (
            <div key={k} className="glass-soft p-3 text-center">
              <div className="text-xl font-bold text-ink-900">{v}</div>
              <div className="text-[11px] capitalize text-ink-400">{k.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Health({ icon, label, ok, value }: { icon: React.ReactNode; label: string; ok: boolean; value: string }) {
  return (
    <div className="glass-card flex items-center justify-between p-4 shadow-glass-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-600">{icon}</span>
        <span className="text-sm font-medium text-ink-700">{label}</span>
      </div>
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        ok ? "bg-success-500/14 text-success-700" : "bg-danger-500/12 text-danger-700",
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-success-500" : "bg-danger-500")} />
        {value}
      </span>
    </div>
  );
}
