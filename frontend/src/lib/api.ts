import type {
  AnswerFeedback,
  AssessmentInput,
  CareerDetails,
  InterviewScorecard,
  PredictionResponse,
  ResumeAnalysis,
  SkillGapAnalysis,
  StartInterviewResponse,
  TransitionInput,
  TransitionPlan,
  User,
  UserDashboard,
} from "./types";

interface StartInterviewParams {
  career: string;
  interview_type: string;
  mode: string;
  difficulty: string;
  skills: string[];
  experience: number;
}

interface SubmitAnswerParams {
  session_id: number;
  question_id: number;
  answer_text: string;
  mode: string;
  time_seconds?: number;
  filler_count?: number;
}

interface ReadinessRow {
  career: string;
  match_pct: number;
  readiness_score: number;
  readiness_level: string;
  estimated_weeks: number;
}

import { getToken } from "@/store/useAuth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return res.json() as Promise<T>;
}

export const API_BASE = API_URL;

/** Authenticated admin GET that returns parsed JSON (token attached automatically). */
function adminGet<T = unknown>(path: string): Promise<T> {
  return request<T>(`/api/admin${path}`);
}

export const api = {
  // ---------- onboarding / users ----------
  createUser: (full_name: string, email: string) =>
    request<User>("/api/users/create", {
      method: "POST",
      body: JSON.stringify({ full_name, email }),
    }),

  getUser: (userId: number) => request<User>(`/api/users/${userId}`),

  userDashboard: (userId: number) =>
    request<UserDashboard>(`/api/users/${userId}/dashboard`),

  predictCareer: (payload: AssessmentInput, userId?: number | null) =>
    request<PredictionResponse>("/api/predict-career", {
      method: "POST",
      body: JSON.stringify({ ...payload, user_id: userId ?? null }),
    }),

  careerDetails: (career: string) =>
    request<CareerDetails>(`/api/career-details/${encodeURIComponent(career)}`),

  careerRoadmap: (career: string) =>
    request<{ career: string; roadmap: string[] }>(
      `/api/career-roadmap/${encodeURIComponent(career)}`,
    ),

  careers: () => request<string[]>("/api/careers"),

  // AI Skill Gap Analyzer
  skillGapAnalysis: (assessment: AssessmentInput, career?: string) =>
    request<SkillGapAnalysis[]>("/api/skill-gap-analysis", {
      method: "POST",
      body: JSON.stringify({ assessment, career }),
    }),

  careerReadiness: (assessment: AssessmentInput, career?: string) =>
    request<{ rows: ReadinessRow[] }>("/api/career-readiness", {
      method: "POST",
      body: JSON.stringify({ assessment, career }),
    }),

  personalRoadmap: (assessment: AssessmentInput, career: string) =>
    request<{ career: string; roadmap: string[] }>("/api/career-roadmap", {
      method: "POST",
      body: JSON.stringify({ assessment, career }),
    }),

  // Resume Intelligence
  analyzeResume: (
    resume_text: string,
    job_description: string,
    userId?: number | null,
  ) =>
    request<ResumeAnalysis>("/api/resume/analyze", {
      method: "POST",
      body: JSON.stringify({ resume_text, job_description, user_id: userId ?? null }),
    }),

  // Transition Intelligence
  generateTransitionPlan: (input: TransitionInput, userId?: number | null) =>
    request<TransitionPlan>("/api/generate-transition-plan", {
      method: "POST",
      body: JSON.stringify({ ...input, user_id: userId ?? null }),
    }),

  // AI Interview Intelligence
  startInterview: (params: StartInterviewParams, userId?: number | null) =>
    request<StartInterviewResponse>("/api/start-interview", {
      method: "POST",
      body: JSON.stringify({ ...params, user_id: userId ?? null }),
    }),

  submitAnswer: (params: SubmitAnswerParams) =>
    request<AnswerFeedback>("/api/submit-answer", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  submitVoiceAnswer: (params: SubmitAnswerParams) =>
    request<AnswerFeedback>("/api/submit-voice-answer", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  interviewResults: (sessionId: number) =>
    request<InterviewScorecard>(`/api/interview-results/${sessionId}`),

  // ---------- auth ----------
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // ---------- admin (token attached automatically) ----------
  admin: {
    overview: () => adminGet("/overview"),
    analytics: () => adminGet("/analytics"),
    crm: (params: Record<string, string | number> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      return adminGet(`/crm${qs ? `?${qs}` : ""}`);
    },
    crmPipeline: () => adminGet("/crm/pipeline"),
    setStage: (userId: number, stage: string) =>
      request(`/api/admin/crm/${userId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      }),
    users: (params: Record<string, string | number> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      return adminGet(`/users${qs ? `?${qs}` : ""}`);
    },
    userDetail: (id: number) => adminGet(`/users/${id}`),
    updateUser: (id: number, patch: { role?: string; is_active?: boolean }) =>
      request(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    deleteUser: (id: number) =>
      request(`/api/admin/users/${id}`, { method: "DELETE" }),
    interviews: () => adminGet("/interviews"),
    resumes: () => adminGet("/resumes"),
    recommendations: () => adminGet("/recommendations"),
    monitoring: () => adminGet("/monitoring"),
    notifications: () => adminGet("/notifications"),
    logs: () => adminGet("/logs"),
    /** CSV export needs the auth header, so fetch as a blob and trigger download. */
    exportCsv: async (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_URL}/api/admin/crm/export${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "skillence_crm.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  },
};
