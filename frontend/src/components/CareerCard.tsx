"use client";

import { motion } from "framer-motion";
import { Clock, Gauge, TrendingUp, Wallet, Target } from "lucide-react";

import { Card, CardBody } from "@/components/ui/Card";
import { MatchRadial } from "@/components/charts/MatchRadial";
import { DemandGauge } from "@/components/charts/DemandGauge";
import { ReadinessRing } from "@/components/charts/ReadinessRing";
import { ReadinessBadge, ReadinessBar } from "@/components/ReadinessBadge";
import { SkillGapPanel } from "@/components/SkillGapPanel";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import type { CareerRecommendation } from "@/lib/types";

const RANK_LABEL = ["Best match", "Strong fit", "Worth exploring"];

export function CareerCard({
  rec,
  rank,
}: {
  rec: CareerRecommendation;
  rank: number;
}) {
  const gap = rec.skill_gap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: rank * 0.08 }}
    >
      <Card className="glow-border hover-lift overflow-hidden shadow-glass hover:shadow-glass-lg">
        <div className="relative flex items-center justify-between gap-4 overflow-hidden border-b border-white/40 px-6 py-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-brand-500/12 via-violet-500/8 to-transparent"
          />
          <div className="relative flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.8)]">
              {rank + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-ink-900">{rec.career}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-ink-400">
                  {RANK_LABEL[rank] ?? "Recommended"}
                </span>
                <ReadinessBadge score={rec.readiness_score} level={rec.readiness_level} />
              </div>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <MatchRadial value={rec.match_pct} />
            <ReadinessRing value={rec.readiness_score} />
          </div>
        </div>

        <CardBody className="grid gap-6 lg:grid-cols-2">
          {/* left column */}
          <div className="space-y-5">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Why this fits you
              </h4>
              <p className="text-sm leading-relaxed text-ink-700">{rec.why}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Wallet className="h-4 w-4" />} label="Salary" value={rec.salary_range} />
              <Stat icon={<Target className="h-4 w-4" />} label="Demand" value={`${rec.market_demand_score}/100`} />
              <Stat icon={<TrendingUp className="h-4 w-4" />} label="Growth" value={rec.future_growth_label} />
            </div>

            {/* career readiness */}
            <div className="glass-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <Gauge className="h-3.5 w-3.5" /> Career readiness
                </h4>
                <span className="text-sm font-bold text-ink-900">{rec.readiness_score}%</span>
              </div>
              <ReadinessBar score={rec.readiness_score} />
              <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                <ReadinessBadge score={rec.readiness_score} level={rec.readiness_level} />
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {gap.estimated_weeks > 0 ? `~${gap.estimated_time} to job ready` : "Job ready now"}
                </span>
              </div>
            </div>

            {/* skill gap */}
            <SkillGapPanel gap={gap} />
          </div>

          {/* right column */}
          <div className="space-y-5">
            <div className="glass-soft p-3">
              <DemandGauge
                demand={rec.market_demand_score}
                growth={rec.future_growth_score}
                match={rec.match_pct}
              />
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Personalised learning roadmap
              </h4>
              <RoadmapTimeline steps={rec.roadmap} />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-soft p-3 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-1 flex items-center gap-1 text-brand-600">{icon}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink-900">{value}</div>
    </div>
  );
}
