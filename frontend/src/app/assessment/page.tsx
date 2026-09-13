"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ChipSelect } from "@/components/ChipSelect";
import { ProficiencyPicker } from "@/components/ProficiencyPicker";
import { useSkillence } from "@/store/useSkillence";
import { useAuth } from "@/store/useAuth";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";
import {
  EDUCATION_OPTIONS,
  INTEREST_OPTIONS,
  PREFERENCE_OPTIONS,
  SKILL_OPTIONS,
} from "@/lib/constants";

const STEPS = [
  "Education",
  "Skills",
  "Interests",
  "Experience",
  "Passout year",
  "Preference",
];

export default function AssessmentPage() {
  const router = useRouter();
  const ready = useAuthGuard();
  const user = useAuth((s) => s.user);
  const {
    step,
    assessment,
    next,
    back,
    update,
    toggleArrayValue,
    setSkillLevel,
    setResult,
  } = useSkillence();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = (() => {
    switch (step) {
      case 0:
        return !!assessment.education;
      case 1:
        return assessment.skills.length > 0;
      case 2:
        return assessment.interests.length > 0;
      case 5:
        return !!assessment.career_preference;
      default:
        return true;
    }
  })();

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictCareer(assessment, user?.id);
      setResult(res, assessment);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="container-x py-24 text-center text-ink-400">Loading…</div>;
  }

  return (
    <div className="container-x py-14">
      <div className="mx-auto max-w-2xl">
        {/* progress */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs font-medium text-ink-500">
            <span>
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-600"
              initial={false}
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <Card>
          <CardBody className="min-h-[340px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {step === 0 && (
                  <Step title="What's your education?" hint="Pick your highest / current qualification — or type your own.">
                    <ChipSelect
                      options={EDUCATION_OPTIONS}
                      selected={[assessment.education]}
                      multi={false}
                      allowCustom
                      customPlaceholder="Enter your qualification…"
                      onToggle={(v) => update({ education: v })}
                    />
                  </Step>
                )}

                {step === 1 && (
                  <Step title="Which skills do you have?" hint="Select all that apply — or add your own.">
                    <ChipSelect
                      options={SKILL_OPTIONS}
                      selected={assessment.skills}
                      allowCustom
                      customPlaceholder="Add a skill…"
                      onToggle={(v) => toggleArrayValue("skills", v)}
                    />
                    <ProficiencyPicker
                      skills={assessment.skills}
                      levels={assessment.skill_levels}
                      onChange={setSkillLevel}
                    />
                  </Step>
                )}

                {step === 2 && (
                  <Step title="What are you interested in?" hint="Select all that excite you — or add your own.">
                    <ChipSelect
                      options={INTEREST_OPTIONS}
                      selected={assessment.interests}
                      allowCustom
                      customPlaceholder="Add an interest…"
                      onToggle={(v) => toggleArrayValue("interests", v)}
                    />
                  </Step>
                )}

                {step === 3 && (
                  <Step title="Years of experience?" hint="Total professional / internship experience.">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={assessment.experience}
                        onChange={(e) => update({ experience: Number(e.target.value) })}
                        className="w-full accent-brand-600"
                      />
                      <span className="w-20 rounded-xl bg-brand-50 px-3 py-2 text-center font-semibold text-brand-700">
                        {assessment.experience} yr
                      </span>
                    </div>
                  </Step>
                )}

                {step === 4 && (
                  <Step title="Passout year?" hint="Year you graduated (or expect to).">
                    <input
                      type="number"
                      min={1990}
                      max={2030}
                      value={assessment.passout_year}
                      onChange={(e) => update({ passout_year: Number(e.target.value) })}
                      className="glass-input w-40 rounded-2xl px-4 py-3 text-lg font-semibold text-ink-900"
                    />
                  </Step>
                )}

                {step === 5 && (
                  <Step title="What matters most to you?" hint="Your top career preference — or type your own.">
                    <ChipSelect
                      options={PREFERENCE_OPTIONS}
                      selected={[assessment.career_preference]}
                      multi={false}
                      allowCustom
                      customPlaceholder="Enter a preference…"
                      onToggle={(v) => update({ career_preference: v })}
                    />
                  </Step>
                )}
              </motion.div>
            </AnimatePresence>
          </CardBody>
        </Card>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error} — is the backend running on{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}?
          </p>
        )}

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0 || loading}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canProceed}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>Get my Top 3 careers <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-1 mb-6 text-sm text-ink-500">{hint}</p>
      {children}
    </div>
  );
}
