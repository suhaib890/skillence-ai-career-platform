"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  AssessmentInput,
  PredictionResponse,
  ProficiencyLevel,
} from "@/lib/types";

const CURRENT_YEAR = 2026;

const emptyAssessment: AssessmentInput = {
  education: "",
  skills: [],
  skill_levels: {},
  interests: [],
  experience: 0,
  passout_year: CURRENT_YEAR - 1,
  career_preference: "",
};

interface SkillenceState {
  // wizard
  step: number;
  assessment: AssessmentInput;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  update: (patch: Partial<AssessmentInput>) => void;
  toggleArrayValue: (key: "skills" | "interests", value: string) => void;
  setSkillLevel: (skill: string, level: ProficiencyLevel) => void;
  resetAssessment: () => void;

  // result
  result: PredictionResponse | null;
  lastInput: AssessmentInput | null;
  setResult: (result: PredictionResponse, input: AssessmentInput) => void;
}

export const useSkillence = create<SkillenceState>()(
  persist(
    (set, get) => ({
      step: 0,
      assessment: emptyAssessment,
      setStep: (step) => set({ step }),
      next: () => set({ step: Math.min(get().step + 1, 5) }),
      back: () => set({ step: Math.max(get().step - 1, 0) }),
      update: (patch) => set({ assessment: { ...get().assessment, ...patch } }),
      toggleArrayValue: (key, value) => {
        const a = get().assessment;
        const current = a[key];
        const exists = current.includes(value);
        const nextArr = exists
          ? current.filter((v) => v !== value)
          : [...current, value];

        // keep skill_levels in sync with the skills list
        let skill_levels = a.skill_levels ?? {};
        if (key === "skills") {
          skill_levels = { ...(a.skill_levels ?? {}) };
          if (exists) {
            delete skill_levels[value];
          } else {
            skill_levels[value] = "Intermediate";
          }
        }
        set({ assessment: { ...a, [key]: nextArr, skill_levels } });
      },
      setSkillLevel: (skill, level) =>
        set({
          assessment: {
            ...get().assessment,
            skill_levels: { ...(get().assessment.skill_levels ?? {}), [skill]: level },
          },
        }),
      resetAssessment: () => set({ assessment: emptyAssessment, step: 0 }),

      result: null,
      lastInput: null,
      setResult: (result, input) => set({ result, lastInput: input }),
    }),
    {
      name: "skillence-store",
      // backfill any fields added after a user's store was first persisted
      // (e.g. skill_levels) so older localStorage shapes can't crash the app.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SkillenceState>;
        return {
          ...current,
          ...p,
          assessment: { ...emptyAssessment, ...(p.assessment ?? {}) },
        };
      },
    },
  ),
);
