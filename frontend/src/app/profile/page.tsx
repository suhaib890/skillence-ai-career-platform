"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Calendar, Compass, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSkillence } from "@/store/useSkillence";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function ProfilePage() {
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const { lastInput, result } = useSkillence();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated || !ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  if (!lastInput) {
    return (
      <div className="container-x py-24">
        <Card className="mx-auto max-w-lg text-center">
          <CardBody className="py-12">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <UserRound className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-semibold">No profile yet</h2>
            <p className="mt-2 text-sm text-ink-600">
              Complete an assessment and your profile will appear here.
            </p>
            <Link href="/assessment" className="mt-6 inline-block">
              <Button>Start assessment</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const topMatch = result?.top_3?.[0];
  const avgMatch = result
    ? Math.round(
        result.top_3.reduce((s, r) => s + r.match_pct, 0) / result.top_3.length,
      )
    : 0;

  return (
    <div className="container-x py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 text-2xl font-bold text-white shadow-[0_14px_32px_-10px_rgba(99,102,241,0.7)]">
            {(user?.full_name ?? lastInput.education).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user?.full_name ?? "Your Profile"}
            </h1>
            <p className="text-sm text-ink-500">
              {user?.email ?? "Snapshot from your latest assessment"}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* summary metrics */}
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Top match
            </h3>
            <div className="mt-2 text-2xl font-bold text-ink-900">
              {topMatch?.career ?? "—"}
            </div>
            <div className="mt-1 text-sm text-brand-600">
              {topMatch ? `${topMatch.match_pct}% fit` : "Run assessment"}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Avg. top-3 match
            </h3>
            <div className="mt-2 text-2xl font-bold text-ink-900">{avgMatch}%</div>
            <div className="mt-1 text-sm text-ink-500">across recommendations</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Skills logged
            </h3>
            <div className="mt-2 text-2xl font-bold text-ink-900">
              {lastInput.skills.length}
            </div>
            <div className="mt-1 text-sm text-ink-500">
              {lastInput.interests.length} interests
            </div>
          </CardBody>
        </Card>
      </div>

      {/* profile details */}
      <Card className="mt-6">
        <CardBody className="grid gap-6 sm:grid-cols-2">
          <Detail icon={<GraduationCap className="h-4 w-4" />} label="Education" value={lastInput.education} />
          <Detail icon={<Briefcase className="h-4 w-4" />} label="Experience" value={`${lastInput.experience} years`} />
          <Detail icon={<Calendar className="h-4 w-4" />} label="Passout year" value={String(lastInput.passout_year)} />
          <Detail icon={<Compass className="h-4 w-4" />} label="Preference" value={lastInput.career_preference} />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {lastInput.skills.map((s) => (
                <Badge key={s} tone="brand">{s}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {lastInput.interests.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Link href="/dashboard">
          <Button variant="outline">View full recommendations</Button>
        </Link>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
        <div className="font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  );
}
