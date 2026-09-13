"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  LineChart,
  Map,
  Target,
  ArrowRight,
  TrendingUp,
  Gauge,
  Compass,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TiltCard } from "@/components/ui/TiltCard";

// WebGL orb — client-only (no SSR), loaded lazily as an ambient background
const Orb = dynamic(() => import("@/components/Orb"), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: Brain,
    title: "Ensemble AI",
    desc: "A CatBoost + XGBoost blend ranks the careers that genuinely fit your profile.",
  },
  {
    icon: LineChart,
    title: "Market Intelligence",
    desc: "Live-style demand scores, salary ranges and future-growth signals for every path.",
  },
  {
    icon: Target,
    title: "Skill Gap Analysis",
    desc: "See exactly which skills you already have and which ones to learn next.",
  },
  {
    icon: Map,
    title: "Personalized Roadmap",
    desc: "A step-by-step learning path from where you are to job-ready.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* ambient WebGL orb background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -right-24 top-1/2 h-[560px] w-[560px] -translate-y-1/2 opacity-70 sm:h-[680px] sm:w-[680px] lg:right-[1%] lg:opacity-80">
            <Orb hue={0} hoverIntensity={0.3} rotateOnHover forceHoverState backgroundColor="#f8fafc" />
          </div>
        </div>

        <div className="container-x relative z-10 grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="flex flex-col justify-center"
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <Badge tone="brand" className="mb-6 w-fit px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" /> AI-powered career intelligence
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]"
            >
              <span className="heading-gradient">Find The Career</span>
              <br />
              <span className="text-gradient">That Fits You</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-6 max-w-md text-lg leading-relaxed text-ink-600"
            >
              AI-powered career intelligence built to help you discover
              opportunities, close skill gaps, and accelerate your professional
              growth.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Link href="/onboarding">
                <Button size="lg">
                  Start Assessment <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/explorer">
                <Button size="lg" variant="glass">
                  Explore Careers
                </Button>
              </Link>
            </motion.div>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-10 flex items-center gap-7 text-sm text-ink-500"
            >
              <span><strong className="text-ink-900">20</strong> career paths</span>
              <span className="h-4 w-px bg-ink-200" />
              <span><strong className="text-ink-900">90%</strong> test accuracy</span>
              <span className="h-4 w-px bg-ink-200" />
              <span><strong className="text-ink-900">98%</strong> top-3 accuracy</span>
            </motion.div>
          </motion.div>

          <FloatingDashboard />
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="container-x py-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to choose with confidence
          </h2>
          <p className="mt-3 text-ink-600">
            Not just a prediction — a full picture of each recommended path.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} transition={{ duration: 0.5 }}>
              <Card className="glow-border hover-lift h-full shadow-glass hover:shadow-glass-lg">
                <CardBody>
                  <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-violet-500/15 text-brand-600 ring-1 ring-white/60">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-ink-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.desc}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="container-x py-16">
        <Card className="overflow-hidden !rounded-4xl">
          <div className="relative bg-gradient-to-br from-ink-900/95 to-brand-900/90">
            <div
              aria-hidden
              className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl"
            />
            <div className="relative grid gap-8 p-10 text-white lg:grid-cols-3 lg:p-12">
              {[
                { n: "01", t: "Tell us about you", d: "A quick 6-step assessment: education, skills, interests, experience and goals." },
                { n: "02", t: "AI does the matching", d: "Our ensemble model scores all 20 careers and ranks your best three." },
                { n: "03", t: "Get your roadmap", d: "Match %, salary, demand, missing skills and a step-by-step plan." },
              ].map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                >
                  <div className="text-4xl font-bold text-transparent [background:linear-gradient(120deg,#a5b4fc,#c4b5fd)] bg-clip-text">
                    {s.n}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-100/75">{s.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-x pb-24 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="glow-border mx-auto max-w-3xl !rounded-4xl text-center shadow-glass-lg">
            <CardBody className="py-14">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your dream job starts with one assessment.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-ink-600">
                Discover your top 3 best-fit careers — with the data to back them up.
              </p>
              <Link href="/onboarding" className="mt-8 inline-block">
                <Button size="lg">
                  Get my Top 3 careers <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}

/* ---------------- Floating glass dashboard mock ---------------- */
function FloatingDashboard() {
  const demand = [42, 58, 51, 70, 64, 82, 90];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto h-full min-h-[460px] w-full max-w-md [perspective:1200px]"
    >
      <TiltCard max={6}>
        <Card className="shadow-glass-lg">
          <CardBody className="space-y-5">
            {/* Career match score */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Career match score
                </p>
                <p className="mt-1 text-2xl font-bold text-ink-900">Data Analyst</p>
              </div>
              <MatchRing value={94} />
            </div>

            {/* Skill gap + readiness meters */}
            <div className="grid grid-cols-2 gap-3">
              <Meter label="Skill gap score" value={67} tone="violet" icon={<Target className="h-3.5 w-3.5" />} />
              <Meter label="Readiness meter" value={78} tone="cyan" icon={<Gauge className="h-3.5 w-3.5" />} />
            </div>

            {/* Market demand graph */}
            <div className="glass-soft p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-600" /> Market demand
                </span>
                <Badge tone="success" className="px-2 py-0.5">+18% YoY</Badge>
              </div>
              <div className="flex h-20 items-end gap-1.5">
                {demand.map((v, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${v}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.07, ease: "easeOut" }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-brand-500/70 to-violet-400/80"
                  />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </TiltCard>

      {/* floating side chips */}
      <motion.div
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-5 -left-5 w-44"
      >
        <Card variant="soft" className="!rounded-2xl shadow-glass">
          <div className="flex items-center gap-2 p-4 text-success-600">
            <TrendingUp className="h-4 w-4" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Salary range</p>
              <p className="text-base font-bold text-ink-900">₹5–15 LPA</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-4 top-6 w-40"
      >
        <Card variant="soft" className="!rounded-2xl shadow-glass">
          <div className="flex items-center gap-2 p-4 text-brand-600">
            <Compass className="h-4 w-4" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">AI Engineer</p>
              <p className="text-base font-bold text-ink-900">79% fit</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function MatchRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="6" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none" stroke="url(#matchGrad)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="matchGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-sm font-bold text-ink-900">{value}%</span>
    </div>
  );
}

function Meter({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "violet" | "cyan";
  icon: React.ReactNode;
}) {
  const bar =
    tone === "violet"
      ? "from-violet-500 to-brand-500"
      : "from-cyan-500 to-brand-500";
  const text = tone === "violet" ? "text-violet-600" : "text-cyan-600";
  return (
    <div className="glass-soft p-3">
      <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium ${text}`}>
        {icon}
        <span className="text-ink-500">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold text-ink-900">{value}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`h-full rounded-full bg-gradient-to-r ${bar}`}
        />
      </div>
    </div>
  );
}
