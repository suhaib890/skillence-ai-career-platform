"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  Brain,
  Code2,
  Compass,
  FileText,
  GitBranch,
  Linkedin,
  Mic,
  Palette,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";

/* ----------------------------------------------------------------- data */
const FOUNDERS = [
  {
    name: "AUJ KHAN",
    role: "ML Engineer + Backend",
    icon: Brain,
    bio: "Building intelligent career intelligence systems using machine learning, recommendation engines, NLP, and scalable backend architectures.",
    specialties: ["Machine Learning", "AI Systems", "Recommendation Engines", "Career Intelligence", "FastAPI", "Data Pipelines"],
    stack: ["Python", "FastAPI", "SQL", "CatBoost", "XGBoost", "TensorFlow"],
    linkedin: "https://www.linkedin.com/in/auj-khan-b423b4198/",
    glow: "rgba(99,102,241,0.45)",
  },
  {
    name: "WAZID ANSARI",
    role: "Full-Stack + Integrations",
    icon: Code2,
    bio: "Designs and develops robust full-stack systems, API integrations, scalable architectures, and platform infrastructure powering Skillence.",
    specialties: ["Full Stack Development", "API Integrations", "System Design", "Platform Engineering", "Backend Systems"],
    stack: ["Node.js", "React", "Docker", "MongoDB", "Next.js"],
    linkedin: "https://www.linkedin.com/in/wazid-ansari?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
    glow: "rgba(56,189,248,0.45)",
  },
  {
    name: "SUHAIB ASHRAF",
    role: "Frontend + Design",
    icon: Palette,
    bio: "Crafts modern user experiences, premium interfaces, animations, and visual systems that make AI career intelligence accessible and intuitive.",
    specialties: ["UI/UX Design", "Frontend Development", "Design Systems", "Product Design", "User Experience"],
    stack: ["React", "Figma", "Tailwind", "TypeScript", "Framer Motion"],
    linkedin: "https://www.linkedin.com/in/suhaib-ashraf01/",
    glow: "rgba(168,85,247,0.45)",
  },
];

const MODULES = [
  { name: "Career Intelligence", icon: Compass, desc: "Top-3 best-fit careers from an ML ensemble.", href: "/dashboard" },
  { name: "Skill Gap Analysis", icon: Target, desc: "Proficiency-aware readiness scoring.", href: "/dashboard" },
  { name: "Transition Intelligence", icon: GitBranch, desc: "A personalized current → target roadmap.", href: "/transition" },
  { name: "Resume Intelligence", icon: FileText, desc: "ATS + match scoring against any JD.", href: "/resume" },
  { name: "AI Interview Intelligence", icon: Mic, desc: "Voice & text mock interviews with scorecards.", href: "/interview" },
];

const STATS = [
  { to: 5, suffix: "", label: "AI Intelligence Engines" },
  { to: 20, suffix: "+", label: "Career Paths Mapped" },
  { to: 8, suffix: "", label: "Interview Score Dimensions" },
  { to: 100, suffix: "%", label: "Personalized Guidance" },
];

// deterministic particle layout (no Math.random → no hydration mismatch)
const PARTICLES = [
  { left: "8%", top: "18%", size: 6, delay: 0, dur: 7 },
  { left: "22%", top: "70%", size: 4, delay: 1.2, dur: 8 },
  { left: "38%", top: "30%", size: 8, delay: 0.6, dur: 6.5 },
  { left: "52%", top: "62%", size: 5, delay: 2.1, dur: 9 },
  { left: "67%", top: "20%", size: 7, delay: 0.3, dur: 7.5 },
  { left: "78%", top: "55%", size: 4, delay: 1.7, dur: 8.5 },
  { left: "90%", top: "32%", size: 6, delay: 0.9, dur: 7 },
  { left: "15%", top: "45%", size: 3, delay: 2.4, dur: 6 },
  { left: "60%", top: "82%", size: 5, delay: 1.1, dur: 8 },
  { left: "84%", top: "78%", size: 4, delay: 0.5, dur: 9.5 },
];

/* ----------------------------------------------------------------- page */
export default function AboutPage() {
  return (
    <div className="relative overflow-hidden bg-[#070712] text-white">
      {/* ambient gradients + particles */}
      <Backdrop />

      {/* HERO / HEADER */}
      <section className="relative z-10 px-5 pb-10 pt-24 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-200 backdrop-blur-xl"
          >
            <Sparkles className="h-3.5 w-3.5" /> About Skillence
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="bg-gradient-to-br from-white via-white to-brand-300 bg-clip-text text-4xl font-bold leading-[1.1] tracking-tight text-transparent sm:text-6xl"
          >
            The Minds Behind Skillence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            We build AI-powered career intelligence systems that help students and professionals
            discover the right career path, close skill gaps, and accelerate growth through
            personalized AI guidance.
          </motion.p>
        </div>
      </section>

      {/* TEAM */}
      <section className="relative z-10 px-5 py-16 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3"
        >
          {FOUNDERS.map((f) => (
            <FounderCard key={f.name} founder={f} />
          ))}
        </motion.div>
      </section>

      {/* MISSION + STATS */}
      <section className="relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Our Mission
            </p>
            <h2 className="mx-auto max-w-3xl bg-gradient-to-br from-white to-white/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Building the Future of Career Intelligence
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/60">
              Skillence is creating an AI-powered ecosystem that helps users understand their
              strengths, identify skill gaps, transition into new careers, optimize resumes,
              prepare for interviews, and become job-ready through personalized intelligence systems.
            </p>
          </Reveal>

          {/* animated numeric stats */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-xl transition-colors hover:border-brand-400/40">
                  <div className="bg-gradient-to-br from-white to-brand-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                    <Counter to={s.to} suffix={s.suffix} />
                  </div>
                  <p className="mt-2 text-xs text-white/55">{s.label}</p>
                  <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ boxShadow: "0 0 40px -8px rgba(99,102,241,0.35) inset" }} />
                </div>
              </Reveal>
            ))}
          </div>

          {/* module metric cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.07}>
                <Link href={m.href} className="group block h-full">
                  <div className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400/40 hover:bg-white/[0.07]">
                    <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-brand-700/20 text-brand-200 ring-1 ring-white/10">
                      <m.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">{m.desc}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 py-24 sm:px-8">
        <Reveal className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-600/30 via-white/[0.04] to-indigo-600/20 p-10 text-center backdrop-blur-xl sm:p-14">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-500/30 blur-[80px]" />
            <h2 className="relative bg-gradient-to-br from-white to-brand-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Join the Future of Career Growth
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/60">
              Discover your best-fit careers, close your skill gaps, and become job-ready —
              all powered by personalized AI.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.03]"
              >
                Explore Skillence
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:border-brand-400/50 hover:bg-white/10"
              >
                <Rocket className="h-4 w-4" /> Start Career Assessment
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------- pieces */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="absolute right-[-10rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-12rem] left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-purple-600/10 blur-[120px]" />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-brand-300/40"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -22, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function FounderCard({ founder }: { founder: (typeof FOUNDERS)[number] }) {
  const Icon = founder.icon;
  // tilt + mouse-follow glow
  const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, ${founder.glow}, transparent 55%)`;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 12);
    rx.set(-(py - 0.5) * 12);
    gx.set(px * 100);
    gy.set(py * 100);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 36 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className="group relative rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_30px_80px_-30px_rgba(99,102,241,0.5)] will-change-transform"
    >
      {/* hover glow border + mouse-follow sheen */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 ring-1 ring-inset ring-brand-400/40 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        {/* avatar */}
        <div className="mb-5 flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/40 to-indigo-700/30 text-brand-100 ring-1 ring-white/15">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">{founder.name}</h3>
            <p className="text-sm text-brand-300">{founder.role}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-white/60">{founder.bio}</p>

        <Divider label="Specialties" />
        <div className="flex flex-wrap gap-1.5">
          {founder.specialties.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
              {s}
            </span>
          ))}
        </div>

        <Divider label="Tech Stack" />
        <div className="flex flex-wrap gap-1.5">
          {founder.stack.map((t) => (
            <span key={t} className="rounded-md bg-brand-500/10 px-2 py-1 font-mono text-[11px] text-brand-200 ring-1 ring-brand-400/20">
              {t}
            </span>
          ))}
        </div>

        <a
          href={founder.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-brand-400/50 hover:bg-brand-500/20"
        >
          <Linkedin className="h-4 w-4" /> Connect on LinkedIn
        </a>
      </div>
    </motion.div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let startTs = 0;
    const dur = 1400;
    const tick = (t: number) => {
      if (!startTs) startTs = t;
      const p = Math.min(1, (t - startTs) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}
