export const EDUCATION_OPTIONS = [
  "10th", "12th PCM", "12th PCB", "12th Commerce", "BCA", "BTech", "BCom",
  "BBA", "BA", "BSc", "MBA", "MCA", "MTech", "MCom", "Dropout", "Other",
];

export const SKILL_OPTIONS = [
  "Excel", "Communication", "Leadership", "Public Speaking", "Python", "SQL",
  "Java", "Problem Solving", "Critical Thinking", "Finance", "Marketing",
  "Canva", "Design", "Video Editing", "Statistics", "AI/ML", "Data Analysis",
  "Teaching", "Writing", "Sales", "Power BI", "Tableau", "Machine Learning",
  "Cloud", "Cybersecurity",
];

export const INTEREST_OPTIONS = [
  "AI", "Data", "Finance", "Business", "Coding", "Marketing", "Cybersecurity",
  "Research", "Management", "Consulting", "Teaching", "Healthcare", "Startup",
  "Trading", "Product Management", "Design",
];

export const PREFERENCE_OPTIONS = [
  "High Salary", "Remote Job", "Fast Growth", "Job Security",
  "Government", "Abroad Opportunity", "Startup Culture",
];

export const PROFICIENCY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

/** Map a 0–100 readiness score to its band label + tailwind tones. */
export function readinessBand(score: number): {
  label: string;
  text: string;
  bg: string;
  ring: string;
} {
  if (score >= 91)
    return { label: "Job Ready", text: "text-emerald-700", bg: "bg-emerald-50", ring: "#10b981" };
  if (score >= 71)
    return { label: "Nearly Job Ready", text: "text-teal-700", bg: "bg-teal-50", ring: "#14b8a6" };
  if (score >= 41)
    return { label: "Developing", text: "text-amber-700", bg: "bg-amber-50", ring: "#f59e0b" };
  return { label: "Beginner", text: "text-rose-700", bg: "bg-rose-50", ring: "#f43f5e" };
}

/** Tailwind tones for a missing-skill priority band. */
export function priorityTone(priority: string): { text: string; bg: string; dot: string } {
  switch (priority) {
    case "High":
      return { text: "text-rose-700", bg: "bg-rose-50 border-rose-100", dot: "bg-rose-500" };
    case "Medium":
      return { text: "text-amber-700", bg: "bg-amber-50 border-amber-100", dot: "bg-amber-500" };
    default:
      return { text: "text-sky-700", bg: "bg-sky-50 border-sky-100", dot: "bg-sky-500" };
  }
}
