export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced";

// ---------- onboarding / users ----------
export interface User {
  id: number;
  uuid: string;
  full_name: string;
  email: string;
  auth_provider: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at?: string | null;
}

export interface UserDashboard {
  user: User;
  assessments: {
    assessment_id: number;
    education: string;
    skills: string[];
    interests: string[];
    experience: number;
    passout_year: number;
    career_preference: string;
    created_at: string | null;
  }[];
  recommendations: {
    recommendation_id: number;
    assessment_id: number;
    top_careers: {
      career: string;
      match_pct: number;
      readiness_score: number;
      salary_range: string;
    }[];
    created_at: string | null;
  }[];
  skill_gap_reports: {
    analysis_id: number;
    assessment_id: number;
    career_name: string;
    readiness_score: number;
    readiness_level: string;
    estimated_weeks: number;
    created_at: string | null;
  }[];
  transition_plans: {
    plan_id: number;
    target_career: string;
    final_readiness: number;
    job_ready: boolean;
    created_at: string | null;
  }[];
  resume_analyses: {
    analysis_id: number;
    match_score: number;
    ats_score: number;
    job_readiness_score: number;
    job_readiness_level: string;
    created_at: string | null;
  }[];
  interviews: {
    session_id: number;
    career: string;
    interview_type: string;
    mode: string;
    overall_score: number | null;
    readiness_level: string | null;
    completed: boolean;
    created_at: string | null;
  }[];
}

export interface AssessmentInput {
  education: string;
  skills: string[];
  skill_levels: Record<string, ProficiencyLevel>;
  interests: string[];
  experience: number;
  passout_year: number;
  career_preference: string;
}

export interface PresentSkill {
  skill: string;
  weight: number;
  importance: string; // High / Medium / Low
  level: string; // Beginner / Intermediate / Advanced
  proficiency_pct: number;
  contribution: number;
}

export interface MissingSkill {
  skill: string;
  weight: number;
  importance: string; // High / Medium / Low
  priority: string; // alias of importance
  difficulty: string; // Easy / Medium / Hard
  weeks: number;
  estimated_time: string;
}

export interface SkillGapAnalysis {
  career: string;
  readiness_score: number;
  readiness_level: string;
  job_ready: boolean;
  present_skills: PresentSkill[];
  missing_skills: MissingSkill[];
  matched_weight: number;
  total_required_weight: number;
  estimated_weeks: number;
  estimated_time: string;
  learning_roadmap: string[];
}

export interface CareerRecommendation {
  career: string;
  match_pct: number;
  why: string;
  market_demand_score: number;
  salary_range: string;
  future_growth_score: number;
  future_growth_label: string;
  required_skills: string[];
  owned_skills: string[];
  missing_skills: string[];
  roadmap: string[];
  // AI Skill Gap Analyzer
  readiness_score: number;
  readiness_level: string;
  job_ready: boolean;
  skill_gap: SkillGapAnalysis;
}

export interface ComparisonRow {
  career: string;
  match_pct: number;
  demand: number;
  growth: number;
  skill_coverage?: number;
  readiness_score?: number;
  readiness_level?: string;
  estimated_weeks?: number;
}

export interface PredictionResponse {
  assessment_id: number | null;
  recommendation_id: number | null;
  top_3: CareerRecommendation[];
  comparison: ComparisonRow[];
}

// ---------- AI Interview Intelligence ----------
export type InterviewMode = "text" | "voice";
export type InterviewType = "HR" | "Technical" | "Behavioral" | "Mock";

export interface InterviewQuestionOut {
  id: number;
  order: number;
  qtype: string;
  text: string;
  difficulty: string;
}

export interface StartInterviewResponse {
  session_id: number;
  career: string;
  interview_type: string;
  mode: string;
  difficulty: string;
  questions_source: string;
  questions: InterviewQuestionOut[];
}

export interface AnswerFeedback {
  question_id: number;
  qtype: string;
  scores: Record<string, number>;
  star: Record<string, number> | null;
  filler_count: number;
  word_count: number;
  strength: string;
  weakness: string;
  suggestion: string;
  missing_concepts: string[];
}

export interface PerAnswer {
  question: string;
  qtype: string;
  answer: string;
  scores: Record<string, number>;
  star: Record<string, number> | null;
  strength: string;
  weakness: string;
  suggestion: string;
  missing_concepts: string[];
}

export interface InterviewScorecard {
  session_id: number;
  career: string;
  interview_type: string;
  mode: string;
  overall_score: number;
  category_scores: Record<string, number>;
  hiring_probability: number;
  readiness_level: string;
  job_ready: boolean;
  missing: string[];
  communication_analysis: { score: number; tip: string };
  star_analysis: Record<string, number> | null;
  improvement_plan: { week: string; focus: string }[];
  ai_summary: string;
  per_answer: PerAnswer[];
}

// ---------- Transition Intelligence ----------
export interface TransitionInput {
  education: string;
  skills: string[];
  skill_levels: Record<string, ProficiencyLevel>;
  interests: string[];
  experience: number;
  passout_year: number;
  current_role: string;
  certifications: string[];
  projects_completed: number;
  target_career: string;
}

export interface TBaseline {
  education: string;
  current_role: string;
  experience: number;
  skills: string[];
  current_readiness: number;
  readiness_level: string;
  strengths: string[];
  weaknesses: string[];
}

export interface TPhase {
  phase: number;
  name: string;
  goal: string;
  skills: string[];
  projects: string[];
  duration_weeks: number;
  milestone: string;
  outcome: string;
}

export interface TProject {
  name: string;
  difficulty: string;
  weeks: number;
  skills: string[];
}

export interface TCertification {
  name: string;
  level: string;
  why: string;
}

export interface TTimeline {
  total_weeks: number;
  total_hours: number;
  months_at_1h: number;
  months_at_2h: number;
  months_at_4h: number;
}

export interface TForecastStep {
  stage: string;
  readiness: number;
}

export interface TForecast {
  steps: TForecastStep[];
  final_readiness: number;
  final_level: string;
  job_ready: boolean;
}

export interface TRisk {
  level: string;
  item: string;
  note: string;
}

export interface TCoach {
  text: string;
  source: string;
  fastest_path: string[];
}

export interface TransitionPlan {
  plan_id: number | null;
  target_career: string;
  baseline: TBaseline;
  skill_gap_mapping: Record<string, string[]>;
  phases: TPhase[];
  timeline: TTimeline;
  recommended_projects: TProject[];
  certifications: TCertification[];
  forecast: TForecast;
  risks: TRisk[];
  ai_coach: TCoach;
  llm_used: boolean;
}

// ---------- Resume Intelligence ----------
export interface MissingSkillLite {
  skill: string;
  weight: number;
  priority: string;
}

export interface RewriteSuggestion {
  focus: string;
  example: string;
}

export interface ResumeAnalysis {
  analysis_id: number | null;
  match_score: number;
  ats_score: number;
  semantic_similarity: number;
  skill_match_pct: number;
  keyword_coverage_pct: number;
  resume_skills: string[];
  jd_skills: string[];
  matched_skills: string[];
  missing_skills: MissingSkillLite[];
  jd_keywords: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  improvement_suggestions: string[];
  rewrite_suggestions: RewriteSuggestion[];
  job_readiness_score: number;
  job_readiness_level: string;
}

export interface CareerDetails {
  career: string;
  market_demand_score: number;
  salary_range: string;
  future_growth_score: number;
  future_growth_label: string;
  required_skills: string[];
}
