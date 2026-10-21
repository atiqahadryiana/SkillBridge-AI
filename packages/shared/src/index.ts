import { z } from "zod";

export const screeningKinds = ["degree", "certifications", "experience", "authorization", "location", "requiredSkills", "niceSkills", "salary", "notice"] as const;
export const screeningLabels: Record<typeof screeningKinds[number], string> = {
  degree: "Required degree", certifications: "Certifications", experience: "Minimum experience (years)",
  authorization: "Work authorization", location: "Work location", requiredSkills: "Required skills",
  niceSkills: "Nice-to-have skills", salary: "Monthly salary range (MYR)", notice: "Maximum notice (days)",
};
export const screeningCriterionSchema = z.object({
  kind: z.enum(screeningKinds), value: z.string().trim().min(1).max(500),
  mode: z.enum(["SCORED", "KNOCKOUT"]), weight: z.number().int().min(1).max(100),
}).strict().superRefine((c, ctx) => {
  if (!c.value.split(",").some((v) => v.trim())) ctx.addIssue({code: "custom", message: "Enter at least one requirement", path: ["value"]});
  if (/\b(age|gender|nationality|race|ethnicity|religion|marital|male|female|citizenship|photo)\b/i.test(c.value))
    ctx.addIssue({code: "custom", message: "Protected characteristics cannot be screening criteria", path: ["value"]});
  if (["experience", "notice"].includes(c.kind) && (!/^\d+(\.\d+)?$/.test(c.value) || Number(c.value) > 1000))
    ctx.addIssue({code: "custom", message: "Enter a non-negative number up to 1000", path: ["value"]});
  if (c.kind === "salary" && (!/^\d+\s*-\s*\d+$/.test(c.value) || Number(c.value.split("-")[0]) > Number(c.value.split("-")[1])))
    ctx.addIssue({code: "custom", message: "Salary must be min-max, for example 3000-5000", path: ["value"]});
  if (c.kind === "authorization" && c.value !== "required")
    ctx.addIssue({code: "custom", message: "Use required; nationality is not a criterion", path: ["value"]});
});
export const screeningCriteriaSchema = z.array(screeningCriterionSchema).min(1).max(9)
  .refine((rows) => new Set(rows.map((r) => r.kind)).size === rows.length, "Use each criterion once");
export type ScreeningCriterion = z.infer<typeof screeningCriterionSchema>;
const evidenceList = z.array(z.string().trim().min(1).max(160)).max(60).default([]);
export const screeningEvidenceSchema = z.object({
  degrees: evidenceList, certifications: evidenceList, skills: evidenceList,
  experienceYears: z.number().min(0).max(100).nullable().default(null),
  authorized: z.boolean().nullable().default(null),
  location: z.string().trim().max(160).default(""),
  salaryExpectation: z.number().min(0).max(1000000).nullable().default(null),
  noticeDays: z.number().int().min(0).max(1000).nullable().default(null),
}).strip();
export type ScreeningEvidence = z.infer<typeof screeningEvidenceSchema>;
export type ScreeningResult = ReturnType<typeof screenCandidate>;
const screeningTerms = (s: string) => [...new Set(s.split(",").map((v) => v.trim()).filter(Boolean))];

/** Only structured job-related evidence enters this function. Identity and resume prose never do. */
export function screenCandidate(criteriaInput: ScreeningCriterion[], evidenceInput: ScreeningEvidence) {
  const criteria = screeningCriteriaSchema.parse(criteriaInput);
  const e = screeningEvidenceSchema.parse(evidenceInput);
  const checklist = criteria.map((c) => {
    let fraction = 0, unknown = false, explanation = "", failed = false;
    let matched: string[] = [], missing: string[] = [];
    if (["degree", "certifications", "requiredSkills", "niceSkills"].includes(c.kind)) {
      const evidence = c.kind === "degree" ? e.degrees : c.kind === "certifications" ? e.certifications : e.skills;
      const terms = screeningTerms(c.value);
      matched = terms.filter((t) => evidence.some((v) => normalizeSkill(v) === normalizeSkill(t)));
      missing = terms.filter((t) => !matched.includes(t));
      fraction = terms.length ? matched.length / terms.length : 0;
      unknown = missing.length > 0;
      explanation = `${matched.length}/${terms.length} terms documented. ${missing.length ? `Not documented: ${missing.join(", ")}. Confirm with candidate; absence is not proof of lacking a qualification.` : "All requested terms documented."}`;
    } else if (c.kind === "location") {
      unknown = !e.location;
      fraction = screeningTerms(c.value).some((v) => v.toLowerCase() === e.location.toLowerCase()) ? 1 : 0;
      failed = !unknown && fraction === 0;
      explanation = unknown ? "Location not supplied." : `Reported location: ${e.location}. Accepted locations: ${c.value}.`;
    } else if (c.kind === "authorization") {
      unknown = e.authorized === null; fraction = e.authorized === true ? 1 : 0; failed = e.authorized === false;
      explanation = unknown ? "Authorization not supplied. Never inferred from nationality." : `Work authorization reported ${e.authorized ? "yes" : "no"}; verification required.`;
    } else {
      const value = c.kind === "experience" ? e.experienceYears : c.kind === "salary" ? e.salaryExpectation : e.noticeDays;
      unknown = value === null;
      const [minSalary, maxSalary] = c.value.split("-").map(Number);
      const meets = value !== null && (c.kind === "experience" ? value >= Number(c.value) : c.kind === "salary" ? value <= maxSalary : value <= Number(c.value));
      fraction = meets ? 1 : 0; failed = !unknown && !meets;
      explanation = unknown ? "Not supplied; confirm with candidate." : `Reported: ${value}. Criterion: ${c.value}.${c.kind === "salary" && value! < minSalary ? " Below advertised minimum; confirm fair offer and expectations." : ""}`;
    }
    return { ...c, label: screeningLabels[c.kind], status: fraction === 1 ? "Pass" as const : failed ? "Fail" as const : "Partial" as const,
      fraction, unknown, explanation, matched, missing };
  });
  const scored = checklist.filter((c) => c.mode === "SCORED");
  const score = scored.length ? Math.round(100 * scored.reduce((n,c) => n + c.fraction * c.weight, 0) / scored.reduce((n,c) => n+c.weight, 0)) : null;
  const knockoutFailed = checklist.some((c) => c.mode === "KNOCKOUT" && c.status === "Fail");
  const needsReview = checklist.some((c) => c.unknown);
  const recommendation = knockoutFailed ? "Reject" : needsReview ? "Maybe" : score === null || score >= 75 ? "Shortlist" : score >= 45 ? "Maybe" : "Reject";
  return { score, recommendation, knockoutFailed, needsReview, checklist, algorithmVersion: "employer-screen-v1" };
}

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
