"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Compass,
  FileText,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChipSelect } from "@/components/ChipSelect";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { InterviewRadar } from "@/components/charts/InterviewRadar";
import { useSkillence } from "@/store/useSkillence";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useSpeech, countFillers } from "@/lib/useSpeech";
import { api } from "@/lib/api";
import { SKILL_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  AnswerFeedback,
  InterviewScorecard,
  StartInterviewResponse,
} from "@/lib/types";

const TYPES = ["HR", "Technical", "Behavioral", "Mock"] as const;
const DIFFS = ["Beginner", "Intermediate", "Advanced"] as const;

const READINESS_TONE: Record<string, string> = {
  "Not Ready": "bg-rose-50 text-rose-700",
  "Partially Ready": "bg-amber-50 text-amber-700",
  "Interview Ready": "bg-teal-50 text-teal-700",
  "Job Ready": "bg-emerald-50 text-emerald-700",
};

export default function InterviewPage() {
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const { assessment, result } = useSkillence();
  const [phase, setPhase] = useState<"setup" | "live" | "results">("setup");
  const [careers, setCareers] = useState<string[]>([]);

  const [career, setCareer] = useState("");
  const [itype, setItype] = useState<(typeof TYPES)[number]>("Mock");
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("Intermediate");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [voiceName, setVoiceName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const [session, setSession] = useState<StartInterviewResponse | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeech();
  const startedAt = useRef<number>(0);
  const prefilled = useRef(false);

  useEffect(() => {
    api.careers().then(setCareers).catch(() => setCareers([]));
  }, []);
  useEffect(() => {
    if (!career && result?.top_3?.length) setCareer(result.top_3[0].career);
  }, [result, career]);
  // prefill skills from the assessment once (editable per interview)
  useEffect(() => {
    if (!prefilled.current && assessment.skills.length) {
      setSkills(assessment.skills);
      prefilled.current = true;
    }
  }, [assessment.skills]);

  function toggleSkill(v: string) {
    setSkills((cur) => (cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v]));
  }
  useEffect(() => {
    if (speech.voices.length && !voiceName) setVoiceName(speech.voices[0].name);
  }, [speech.voices, voiceName]);

  const current = session?.questions[idx];
  const isLast = session ? idx === session.questions.length - 1 : false;

  // voice mode: speak each new question, sync transcript into the answer box
  useEffect(() => {
    if (phase === "live" && mode === "voice" && current && speech.ttsSupported) {
      speech.speak(`${current.text}`, voiceName);
    }
    startedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);
  useEffect(() => {
    if (mode === "voice" && speech.transcript) setAnswer(speech.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  async function start() {
    if (!career) return;
    setLoading(true);
    setError(null);
    try {
      const s = await api.startInterview(
        {
          career,
          interview_type: itype,
          mode,
          difficulty: diff,
          skills,
          experience: assessment.experience,
        },
        user?.id,
      );
      setSession(s);
      setIdx(0);
      setAnswer("");
      setFeedback(null);
      setScorecard(null);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start interview");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!session || !current || !answer.trim()) return;
    setLoading(true);
    setError(null);
    if (speech.listening) speech.stopListening();
    speech.cancelSpeak();
    const time_seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const params = {
        session_id: session.session_id,
        question_id: current.id,
        answer_text: answer.trim(),
        mode,
        time_seconds,
        ...(mode === "voice" ? { filler_count: countFillers(answer) } : {}),
      };
      const fb = mode === "voice" ? await api.submitVoiceAnswer(params) : await api.submitAnswer(params);
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit answer");
    } finally {
      setLoading(false);
    }
  }

  async function next() {
    if (!session) return;
    setFeedback(null);
    setAnswer("");
    speech.setTranscript("");
    if (isLast) {
      setLoading(true);
      try {
        const sc = await api.interviewResults(session.session_id);
        setScorecard(sc);
        setPhase("results");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load results");
      } finally {
        setLoading(false);
      }
    } else {
      setIdx((i) => i + 1);
    }
  }

  function restart() {
    speech.cancelSpeak();
    setPhase("setup");
    setSession(null);
    setScorecard(null);
    setFeedback(null);
    setAnswer("");
  }

  if (!ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  return (
    <div className="container-x py-14">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> AI Interview Intelligence™
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Practice your interview with AI</h1>
        <p className="mt-1 max-w-2xl text-ink-600">
          Realistic HR, technical and behavioral mock interviews — in text or voice — with an
          instant scorecard, STAR analysis and a personalized improvement plan.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {phase === "setup" && (
        <Setup
          careers={careers}
          career={career} setCareer={setCareer}
          itype={itype} setItype={setItype}
          diff={diff} setDiff={setDiff}
          mode={mode} setMode={setMode}
          voiceName={voiceName} setVoiceName={setVoiceName}
          skills={skills} onToggleSkill={toggleSkill}
          speech={speech}
          loading={loading}
          onStart={start}
        />
      )}

      {phase === "live" && session && current && (
        <Live
          session={session} current={current} idx={idx} isLast={isLast}
          mode={mode} answer={answer} setAnswer={setAnswer}
          feedback={feedback} loading={loading} speech={speech} voiceName={voiceName}
          onSubmit={submit} onNext={next}
        />
      )}

      {phase === "results" && scorecard && (
        <Results sc={scorecard} onRestart={restart} />
      )}
    </div>
  );
}

/* ----------------------------- SETUP ----------------------------- */
function Setup(props: any) {
  const { careers, career, setCareer, itype, setItype, diff, setDiff, mode, setMode,
    voiceName, setVoiceName, skills, onToggleSkill, speech, loading, onStart } = props;
  return (
    <Card>
      <CardBody className="space-y-6">
        <Row label="Select role">
          <select
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm"
          >
            <option value="">Choose a target role…</option>
            {careers.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>

        <Row label="Your skills">
          <p className="-mt-1 mb-3 text-xs text-ink-400">
            Personalizes your questions{skills.length ? ` · ${skills.length} selected` : ""}. Add your own too.
          </p>
          <ChipSelect
            options={SKILL_OPTIONS}
            selected={skills}
            onToggle={onToggleSkill}
            allowCustom
            customPlaceholder="Add a skill…"
          />
        </Row>

        <Row label="Interview type">
          <Chips options={TYPES as unknown as string[]} value={itype} onChange={setItype} />
        </Row>
        <Row label="Difficulty">
          <Chips options={DIFFS as unknown as string[]} value={diff} onChange={setDiff} />
        </Row>
        <Row label="Mode">
          <Chips options={["text", "voice"]} value={mode} onChange={setMode} labels={{ text: "Text", voice: "Voice" }} />
        </Row>

        {mode === "voice" && (
          <Row label="Interviewer voice">
            {speech.supported ? (
              <div className="flex items-center gap-3">
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-sm"
                >
                  {speech.voices.map((v: any) => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => speech.speak("Hello, welcome to your interview. Let's begin.", voiceName)}
                >
                  <Volume2 className="h-4 w-4" /> Test
                </Button>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Voice isn&apos;t supported in this browser. Use Chrome or Edge, or switch to Text mode.
              </p>
            )}
          </Row>
        )}

        <div className="flex justify-end">
          <Button onClick={onStart} disabled={!career || loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <>Start interview <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* ----------------------------- LIVE ----------------------------- */
function Live(props: any) {
  const { session, current, idx, isLast, mode, answer, setAnswer, feedback, loading, speech, voiceName, onSubmit, onNext } = props;
  const total = session.questions.length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-ink-500">
        <span>Question {idx + 1} of {total} · {current.qtype} · {current.difficulty}</span>
        <span>{session.questions_source === "llm" ? "LLM-generated" : "Curated"} · {session.career}</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-ink-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-600 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.8)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-ink-900">{current.text}</h2>
              {mode === "voice" && speech.ttsSupported && (
                <button
                  onClick={() => speech.speak(current.text, voiceName)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Replay question
                </button>
              )}
            </div>
          </div>

          {mode === "voice" && !feedback && (
            <VoiceStage listening={speech.listening} speaking={speech.speaking} />
          )}

          {!feedback && (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                placeholder={mode === "voice" ? "Your spoken answer appears here — tap the mic and speak…" : "Type your answer…"}
                className="glass-input w-full resize-y rounded-2xl p-4 text-sm leading-relaxed text-ink-900"
              />
              <div className="flex items-center justify-between">
                {mode === "voice" && speech.supported ? (
                  <Button
                    type="button"
                    variant={speech.listening ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => (speech.listening ? speech.stopListening() : speech.startListening())}
                  >
                    {speech.listening ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
                  </Button>
                ) : <span />}
                <Button onClick={onSubmit} disabled={!answer.trim() || loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Scoring…</> : <>Submit <Send className="h-4 w-4" /></>}
                </Button>
              </div>
            </>
          )}

          {feedback && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.entries(feedback.scores).map(([k, v]) => (
                  <Badge key={k} tone="neutral">{k}: {v as number}</Badge>
                ))}
                {feedback.filler_count > 0 && <Badge tone="warning">fillers: {feedback.filler_count}</Badge>}
              </div>
              <FB tone="success" label="Strength" text={feedback.strength} />
              <FB tone="warning" label="Weakness" text={feedback.weakness} />
              <FB tone="brand" label="Suggestion" text={feedback.suggestion} />
              <div className="flex justify-end">
                <Button onClick={onNext} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Finishing…</> :
                    isLast ? <>See my scorecard <ArrowRight className="h-4 w-4" /></> : <>Next question <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </motion.div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ---------------------------- RESULTS ---------------------------- */
function Results({ sc, onRestart }: { sc: InterviewScorecard; onRestart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card>
        <CardBody>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink-900">Interview Scorecard</h2>
              <p className="text-sm text-ink-500">{sc.career} · {sc.interview_type} · {sc.mode} mode</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRestart}>Practice again</Button>
          </div>

          <div className="grid items-center gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <ScoreGauge value={sc.overall_score} label="Overall" />
              <span className={cn("mt-2 rounded-full px-3 py-1 text-xs font-semibold", READINESS_TONE[sc.readiness_level] ?? "bg-ink-100 text-ink-700")}>
                {sc.readiness_level}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <ScoreGauge value={sc.hiring_probability} label="Hire %" />
              <span className="mt-2 text-xs text-ink-400">Estimated hiring probability</span>
            </div>
            <div>
              <InterviewRadar scores={sc.category_scores} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* category bars */}
      <Card>
        <CardBody>
          <H>Score breakdown</H>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(sc.category_scores).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink-600">{k}</span>
                  <span className="font-semibold text-ink-900">{v}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-600" style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <H>Communication analysis</H>
            <div className="text-3xl font-bold text-ink-900">{sc.communication_analysis.score}<span className="text-base text-ink-400">/100</span></div>
            <p className="mt-2 text-sm text-ink-600">{sc.communication_analysis.tip}</p>
          </CardBody>
        </Card>
        {sc.star_analysis && (
          <Card>
            <CardBody>
              <H>STAR method analysis</H>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(sc.star_analysis).map(([k, v]) => (
                  <div key={k} className="glass-soft p-3">
                    <div className="text-[10px] uppercase tracking-wide text-ink-400">{k}</div>
                    <div className="text-lg font-bold text-ink-900">{v}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* per-answer feedback */}
      <Card>
        <CardBody>
          <H>Question-by-question feedback</H>
          <div className="space-y-3">
            {sc.per_answer.map((pa, i) => (
              <details key={i} className="glass-soft p-4">
                <summary className="cursor-pointer text-sm font-medium text-ink-800">
                  <Badge tone="brand">{pa.qtype}</Badge> <span className="ml-2">{pa.question}</span>
                </summary>
                <div className="mt-3 space-y-2 pl-1">
                  <p className="text-sm text-ink-500"><span className="font-semibold text-ink-700">Your answer:</span> {pa.answer || "—"}</p>
                  <FB tone="success" label="Strength" text={pa.strength} />
                  <FB tone="warning" label="Weakness" text={pa.weakness} />
                  <FB tone="brand" label="Suggestion" text={pa.suggestion} />
                </div>
              </details>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* improvement plan */}
      <Card>
        <CardBody>
          <H icon={<Lightbulb className="h-4 w-4" />}>Personalized improvement plan</H>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sc.improvement_plan.map((p) => (
              <div key={p.week} className="glass-soft p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-brand-700">{p.week}</div>
                <p className="mt-1 text-sm text-ink-700">{p.focus}</p>
              </div>
            ))}
          </div>
          {sc.missing.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Focus areas</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {sc.missing.map((m) => <Badge key={m} tone="warning">{m}</Badge>)}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* AI coach summary + journey */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-500 px-6 py-5 text-white">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> AI Coach
          </h3>
          <p className="text-[15px] leading-relaxed">{sc.ai_summary}</p>
        </div>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">Keep building your job-readiness across Skillence:</p>
          <div className="flex gap-2">
            <Link href="/transition"><Button variant="outline" size="sm"><Compass className="h-4 w-4" /> Transition plan</Button></Link>
            <Link href="/resume"><Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Resume</Button></Link>
            <Link href="/dashboard"><Button variant="outline" size="sm"><Award className="h-4 w-4" /> Careers</Button></Link>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

/* ---- immersive voice stage: floating AI interviewer + glass waveform ---- */
const WAVE = [0.4, 0.7, 0.45, 0.9, 0.6, 1, 0.55, 0.8, 0.5, 0.75, 0.42, 0.66];

function VoiceStage({ listening, speaking }: { listening: boolean; speaking: boolean }) {
  const active = listening || speaking;
  return (
    <div className="glass-soft flex items-center gap-4 p-4">
      {/* floating AI interviewer */}
      <div className="relative shrink-0">
        {active && (
          <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/30" />
        )}
        <motion.span
          animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: "easeInOut" }}
          className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_10px_24px_-8px_rgba(99,102,241,0.8)]"
        >
          <Sparkles className="h-5 w-5" />
        </motion.span>
      </div>

      {/* glass waveform */}
      <div className="flex h-10 flex-1 items-center gap-1">
        {WAVE.map((h, i) => (
          <motion.span
            key={i}
            className="flex-1 rounded-full bg-gradient-to-t from-brand-500/70 to-violet-400/80"
            animate={
              active
                ? { height: [`${h * 28}%`, `${h * 100}%`, `${h * 40}%`] }
                : { height: "18%" }
            }
            transition={{
              duration: 0.9 + (i % 4) * 0.18,
              repeat: active ? Infinity : 0,
              ease: "easeInOut",
              delay: i * 0.05,
            }}
          />
        ))}
      </div>

      <span className="shrink-0 text-xs font-medium text-ink-500">
        {speaking ? "Interviewer speaking…" : listening ? "Listening…" : "Ready"}
      </span>
    </div>
  );
}

/* --------------------------- helpers --------------------------- */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-800">{label}</h3>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange, labels }: { options: string[]; value: string; onChange: (v: any) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
            value === o
              ? "border-transparent bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.7)]"
              : "border-white/70 bg-white/50 text-ink-700 backdrop-blur-md hover:bg-white/75 hover:text-brand-700",
          )}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function FB({ tone, label, text }: { tone: "success" | "warning" | "brand"; label: string; text: string }) {
  const map = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
    brand: "border-brand-100 bg-brand-50 text-brand-800",
  } as const;
  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm", map[tone])}>
      <span className="font-semibold">{label}: </span>{text}
    </div>
  );
}

function H({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
      {icon && <span className="text-brand-600">{icon}</span>} {children}
    </h3>
  );
}
