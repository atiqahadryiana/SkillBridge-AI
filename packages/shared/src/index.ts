import { z } from "zod";

export const levels = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;
export type Level = (typeof levels)[number];
export const levelValue: Record<Level, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};
const aliases: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  nodejs: "node.js",
  "node js": "node.js",
  powerbi: "power bi",
  ml: "machine learning",
  nlp: "natural language processing",
  "ui ux": "ui/ux design",
  postgres: "postgresql",
};
export const normalizeSkill = (value: string) =>
  aliases[
    value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ")
  ] ?? value.trim().toLowerCase().replace(/\s+/g, " ");
export type MatchSkill = { name: string; level: Level; required?: boolean };
export type WorkPreferences = { arrangements?: string[]; locations?: string[] };
export type MatchInput = {
  candidateSkills: MatchSkill[];
  requiredSkills: MatchSkill[];
  preferredSkills: MatchSkill[];
  candidatePreferences?: WorkPreferences;
  job?: { arrangement?: string; location?: string };
};
export type Criterion = {
  key: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
};
export type MatchResult = {
  score: number;
  category: string;
  matched: string[];
  missing: string[];
  partial: string[];
  criteria: Criterion[];
  explanation: string;
};

export function calculateMatch(input: MatchInput): MatchResult {
  const map = new Map<string, MatchSkill>();
  input.candidateSkills.forEach((s) => {
    const key = normalizeSkill(s.name);
    const old = map.get(key);
    if (!old || levelValue[s.level] > levelValue[old.level]) map.set(key, s);
  });
  const coverage = (skills: MatchSkill[]) =>
    skills.length
      ? (skills.filter((s) => map.has(normalizeSkill(s.name))).length /
          skills.length) *
        100
      : null;
  const req = coverage(input.requiredSkills),
    pref = coverage(input.preferredSkills);
  const overlaps = input.requiredSkills.filter((s) =>
    map.has(normalizeSkill(s.name)),
  );
  const proficiency = overlaps.length
    ? (overlaps.reduce(
        (a, s) =>
          a +
          Math.min(
            1,
            levelValue[map.get(normalizeSkill(s.name))!.level] /
              levelValue[s.level],
          ),
        0,
      ) /
        overlaps.length) *
      100
    : input.requiredSkills.length
      ? 0
      : null;
  let work: number | null = null;
  const checks: boolean[] = [];
  if (
    input.job?.arrangement &&
    input.candidatePreferences?.arrangements?.length
  )
    checks.push(
      input.candidatePreferences.arrangements
        .map((x) => x.toLowerCase())
        .includes(input.job.arrangement.toLowerCase()),
    );
  if (input.job?.location && input.candidatePreferences?.locations?.length)
    checks.push(
      input.candidatePreferences.locations.some((x) =>
        input.job!.location!.toLowerCase().includes(x.toLowerCase()),
      ),
    );
  if (checks.length)
    work = (checks.filter(Boolean).length / checks.length) * 100;
  const raw = [
    ["required", "Required skills", req, 55],
    ["preferred", "Preferred skills", pref, 20],
    ["proficiency", "Proficiency alignment", proficiency, 15],
    ["preference", "Work preferences", work, 10],
  ] as const;
  const applicable = raw.filter((x) => x[2] !== null);
  const total = applicable.reduce((a, x) => a + x[3], 0) || 1;
  const criteria = applicable.map(([key, label, value, base]) => ({
    key,
    label,
    score: Math.round(value!),
    weight: (base / total) * 100,
    contribution: (value! * base) / total,
  }));
  const score = Math.round(criteria.reduce((a, c) => a + c.contribution, 0));
  const matched = input.requiredSkills
    .filter(
      (s) =>
        map.has(normalizeSkill(s.name)) &&
        levelValue[map.get(normalizeSkill(s.name))!.level] >=
          levelValue[s.level],
    )
    .map((s) => s.name);
  const partial = input.requiredSkills
    .filter(
      (s) =>
        map.has(normalizeSkill(s.name)) &&
        levelValue[map.get(normalizeSkill(s.name))!.level] <
          levelValue[s.level],
    )
    .map((s) => s.name);
  const missing = input.requiredSkills
    .filter((s) => !map.has(normalizeSkill(s.name)))
    .map((s) => s.name);
  const category =
    score >= 80
      ? "Strong match"
      : score >= 65
        ? "Good match"
        : score >= 45
          ? "Developing match"
          : "Limited match";
  const strengths = matched.slice(0, 3).join(", ");
  const gaps = [...missing, ...partial].slice(0, 3).join(", ");
  const explanation = `${strengths ? `Your strongest alignment is in ${strengths}.` : "No required skills are currently matched."}${gaps ? ` Building ${gaps} would strengthen your fit.` : " You meet the listed required skills."}`;
  return { score, category, matched, missing, partial, criteria, explanation };
}

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CANDIDATE", "EMPLOYER"]).default("CANDIDATE"),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  level: z.enum(levels),
  evidenceType: z.string().optional(),
  evidenceUrl: z.string().url().optional().or(z.literal("")),
});
export const jobSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(20),
  location: z.string().min(2),
  arrangement: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
  employmentType: z.string().min(2),
  industry: z.string().min(2),
  salary: z.string().optional(),
  requirements: z
    .array(
      z.object({
        name: z.string(),
        level: z.enum(levels),
        required: z.boolean(),
      }),
    )
    .min(1),
});
