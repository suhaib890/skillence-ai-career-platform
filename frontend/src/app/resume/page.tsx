"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Lightbulb,
  Loader2,
  PenLine,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { api } from "@/lib/api";
import { priorityTone } from "@/lib/constants";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { ResumeAnalysis } from "@/lib/types";

export default function ResumePage() {
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);

  const canAnalyze = resume.trim().length >= 30 && jd.trim().length >= 30;

  if (!ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeResume(resume, jd, user?.id);
      setResult(res);
      requestAnimationFrame(() =>
        document.getElementById("resume-results")?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x py-14">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> Resume Intelligence
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Match your resume to any job
        </h1>
        <p className="mt-1 text-ink-600">
          Paste your resume and a job description — get a match score, ATS score,
          skill &amp; keyword gaps, and rewrite suggestions.
        </p>
      </div>

      {/* inputs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InputCard
          icon={<FileText className="h-4 w-4" />}
          title="Your resume"
          placeholder="Paste your full resume text here…"
          value={resume}
          onChange={setResume}
        />
        <InputCard
          icon={<ScanLine className="h-4 w-4" />}
          title="Job description"
          placeholder="Paste the target job description here…"
          value={jd}
          onChange={setJd}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} — is the backend running on{" "}
          {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}?
        </p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-ink-400">
          {canAnalyze ? "Ready to analyze" : "Add at least ~30 characters to each box"}
        </span>
        <Button onClick={analyze} disabled={!canAnalyze || loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              Analyze resume <ScanLine className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {result && <Results result={result} />}
    </div>
  );
}

function InputCard({
  icon,
  title,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <span className="text-brand-600">{icon}</span> {title}
          </h2>
          <span className="text-xs text-ink-400">{value.trim().length} chars</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={14}
          className="glass-input w-full resize-y rounded-2xl p-4 text-sm leading-relaxed text-ink-900"
        />
      </CardBody>
    </Card>
  );
}

function Results({ result }: { result: ResumeAnalysis }) {
  return (
    <motion.div
      id="resume-results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 space-y-6"
    >
      {/* score gauges */}
      <Card>
        <CardBody>
          <div className="grid items-center gap-6 sm:grid-cols-3">
            <GaugeBlock value={result.match_score} label="Match" caption="Resume ↔ job fit" />
            <GaugeBlock value={result.ats_score} label="ATS" caption="Parser-friendliness" />
            <GaugeBlock
              value={result.job_readiness_score}
              label="Ready"
              caption={result.job_readiness_level}
              badge={<ReadinessBadge score={result.job_readiness_score} level={result.job_readiness_level} />}
            />
          </div>

          {/* breakdown bars */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Meter label="Skill match" value={result.skill_match_pct} />
            <Meter label="Keyword coverage" value={result.keyword_coverage_pct} />
            <Meter label="Semantic similarity" value={result.semantic_similarity} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* skill match */}
        <Card>
          <CardBody>
            <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />} title="Skill match" />
            <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Matched skills ({result.matched_skills.length})
            </h4>
            {result.matched_skills.length === 0 ? (
              <p className="text-sm text-ink-400">No overlapping skills detected yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((s) => (
                  <Badge key={s} tone="success">
                    <CheckCircle2 className="h-3 w-3" /> {s}
                  </Badge>
                ))}
              </div>
            )}

            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Missing skills ({result.missing_skills.length})
            </h4>
            {result.missing_skills.length === 0 ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> All target skills covered 🎉
              </Badge>
            ) : (
              <ul className="space-y-2">
                {result.missing_skills.map((m) => {
                  const tone = priorityTone(m.priority);
                  return (
                    <li
                      key={m.skill}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${tone.bg}`}
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
                        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                        {m.skill}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${tone.text}`}>
                        {m.priority}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* missing keywords */}
        <Card>
          <CardBody>
            <SectionTitle icon={<AlertCircle className="h-4 w-4" />} title="Keywords" />
            <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Missing keywords ({result.missing_keywords.length})
            </h4>
            {result.missing_keywords.length === 0 ? (
              <p className="text-sm text-ink-400">Great keyword coverage.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((k) => (
                  <Badge key={k} tone="warning">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              In the job description
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.jd_keywords.map((k) => (
                <Badge
                  key={k}
                  tone={result.matched_keywords.includes(k) ? "success" : "neutral"}
                >
                  {k}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* improvement suggestions */}
      <Card>
        <CardBody>
          <SectionTitle icon={<Lightbulb className="h-4 w-4" />} title="Improvement suggestions" />
          <ul className="mt-4 space-y-2.5">
            {result.improvement_suggestions.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* rewrite recommendations */}
      <Card>
        <CardBody>
          <SectionTitle icon={<PenLine className="h-4 w-4" />} title="Resume rewrite recommendations" />
          <div className="mt-4 space-y-3">
            {result.rewrite_suggestions.map((rw, i) => (
              <div key={i} className="glass-soft p-4">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {rw.focus}
                </div>
                <p className="text-sm italic leading-relaxed text-ink-700">
                  “{rw.example}”
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function GaugeBlock({
  value,
  label,
  caption,
  badge,
}: {
  value: number;
  label: string;
  caption: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <ScoreGauge value={value} label={label} />
      <div className="mt-2">{badge ?? <span className="text-xs text-ink-500">{caption}</span>}</div>
      {badge && <span className="mt-1 text-[11px] text-ink-400">{caption}</span>}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-600">{label}</span>
        <span className="font-semibold text-ink-900">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-600 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
      <span className="text-brand-600">{icon}</span> {title}
    </h3>
  );
}
