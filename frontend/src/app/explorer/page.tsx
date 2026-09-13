"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Wallet, Layers } from "lucide-react";

import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { DemandGauge } from "@/components/charts/DemandGauge";
import { api } from "@/lib/api";
import type { CareerDetails } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ExplorerPage() {
  const [careers, setCareers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<CareerDetails | null>(null);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .careers()
      .then((c) => {
        setCareers(c);
        if (c.length) select(c[0]);
      })
      .catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function select(career: string) {
    setSelected(career);
    try {
      const [d, r] = await Promise.all([
        api.careerDetails(career),
        api.careerRoadmap(career),
      ]);
      setDetails(d);
      setRoadmap(r.roadmap);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    }
  }

  const filtered = careers.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="container-x py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Career Explorer</h1>
        <p className="mt-1 text-ink-600">
          Browse all 20 careers — demand, salary, required skills and roadmap.
        </p>
      </div>

      {err && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {err} — make sure the backend is running.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* list */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search careers…"
              className="glass-input w-full rounded-2xl py-2.5 pl-10 pr-4 text-sm text-ink-900"
            />
          </div>
          <div className="grid max-h-[560px] gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
            {filtered.map((c) => (
              <button
                key={c}
                onClick={() => select(c)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left text-sm font-medium backdrop-blur-md transition-all duration-300",
                  selected === c
                    ? "border-brand-400/40 bg-brand-500/12 text-brand-700 shadow-glass-sm"
                    : "border-white/60 bg-white/45 text-ink-700 hover:bg-white/70 hover:-translate-y-0.5",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* detail */}
        <div>
          {details ? (
            <motion.div
              key={details.career}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-ink-900">
                        {details.career}
                      </h2>
                      <Badge tone="brand" className="mt-2">
                        {details.future_growth_label} growth
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Metric icon={<Wallet className="h-4 w-4" />} label="Salary" value={details.salary_range} />
                    <Metric icon={<TrendingUp className="h-4 w-4" />} label="Demand" value={`${details.market_demand_score}/100`} />
                    <Metric icon={<Layers className="h-4 w-4" />} label="Growth" value={`${details.future_growth_score}/100`} />
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Required skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {details.required_skills.map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>
                      <div className="glass-soft mt-5 p-2">
                        <DemandGauge
                          demand={details.market_demand_score}
                          growth={details.future_growth_score}
                          match={Math.round(
                            (details.market_demand_score + details.future_growth_score) / 2,
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Learning roadmap
                      </h3>
                      <RoadmapTimeline steps={roadmap} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ) : (
            <Card>
              <CardBody className="py-16 text-center text-ink-400">
                Select a career to see details.
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-soft p-3">
      <div className="mb-1 text-brand-600">{icon}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-sm font-semibold text-ink-900">{value}</div>
    </div>
  );
}
