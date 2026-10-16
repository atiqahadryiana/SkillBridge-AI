import { normalizeSkill } from "@skillbridge/shared";

export const ATS_VERSION = "ats-readiness-1.0";
export const JOB_MATCH_VERSION = "resume-job-match-1.0";

export type SectionMap = Record<string, string>;
export type TaxonomySkill = { name: string; aliases?: string };

const headings: Record<string, string[]> = {
  summary: [
    "summary",
    "professional summary",
    "career objective",
    "objective",
    "personal statement",
    "profile",
  ],
  skills: [
    "skills",
    "technical skills",
    "core competencies",
    "competencies",
    "professional skills",
  ],
  experience: [
    "experience",
    "work experience",
    "employment",
    "internship",
    "internships",
  ],
  education: ["education", "academic background", "qualifications"],
  projects: ["projects", "academic projects", "personal projects", "portfolio"],
  certifications: [
    "certifications",
    "certificates",
    "professional development",
  ],
};

export function cleanResumeText(input: string) {
  return input
    .replace(/\0/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function detectSections(text: string): SectionMap {
  const lines = cleanResumeText(text).split("\n");
  const result: SectionMap = { contact: [] as unknown as string };
  let current = "contact";
  const buckets: Record<string, string[]> = { contact: [] };
  for (const raw of lines) {
    const line = raw.trim();
    const normalized = line.toLowerCase().replace(/[:|]/g, "").trim();
    const found = Object.entries(headings).find(([, variants]) =>
      variants.includes(normalized),
    );
    if (found) {
      current = found[0];
      buckets[current] ??= [];
    } else if (line) ((buckets[current] ??= []), buckets[current].push(line));
  }
  for (const [key, value] of Object.entries(buckets))
    result[key] = value.join("\n");
  return result;
}

export function extractSkills(text: string, taxonomy: TaxonomySkill[]) {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9#+./]+/g, " ")} `;
  return taxonomy
    .filter((skill) => {
      const terms = [skill.name, ...(skill.aliases || "").split(",")].filter(
        Boolean,
      );
      return terms.some((term) => {
        const needle = term
          .toLowerCase()
          .replace(/[^a-z0-9#+./]+/g, " ")
          .trim();
        return (
          needle.length > 1 &&
          new RegExp(
            `(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`,
            "i",
          ).test(haystack)
        );
      });
    })
    .map((skill) => skill.name);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const hasEmail = (text: string) =>
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text);
const hasPhone = (text: string) =>
  /(?:\+?6?0?1\d)[\s-]?\d{3,4}[\s-]?\d{4}/.test(text);
const hasUrl = (text: string) =>
  /(?:https?:\/\/|linkedin\.com|github\.com|www\.)/i.test(text);

export function analyzeReadiness(text: string, taxonomy: TaxonomySkill[]) {
  const clean = cleanResumeText(text);
  const sections = detectSections(clean);
  const skills = extractSkills(clean, taxonomy);
  const words = clean.split(/\s+/).filter(Boolean);
  const recognized = Object.keys(sections).filter(
    (key) => key !== "contact" && sections[key],
  );
  const evidenceText = [
    sections.experience,
    sections.projects,
    sections.certifications,
  ]
    .filter(Boolean)
    .join(" ");
  const bulletCount = (clean.match(/(?:^|\n)\s*[•*-]\s+/g) || []).length;
  const dateCount = (clean.match(/\b(?:19|20)\d{2}\b/g) || []).length;
  const repeated = repeatedLineRatio(clean);

  const parseability = clamp(
    words.length >= 180
      ? 100
      : words.length >= 80
        ? 80
        : words.length >= 30
          ? 55
          : 20,
  );
  const coreSections = ["skills", "education"];
  const structureHits =
    coreSections.filter((s) => sections[s]).length +
    (sections.experience || sections.projects ? 1 : 0) +
    (sections.summary ? 1 : 0);
  const structure = (structureHits / 4) * 100;
  const contact =
    ([hasEmail(clean), hasPhone(clean), hasUrl(clean)].filter(Boolean).length /
      3) *
    100;
  const evidence = clamp(
    (skills.length >= 6 ? 45 : skills.length * 7) +
      (evidenceText.length >= 250 ? 35 : evidenceText.length >= 80 ? 22 : 5) +
      (bulletCount >= 3 ? 20 : bulletCount * 5),
  );
  const clarity = clamp(
    100 -
      repeated * 100 -
      (clean.includes("\t\t") ? 10 : 0) -
      (dateCount === 1 ? 10 : 0),
  );
  const breakdown = [
    {
      key: "parseability",
      label: "Text extraction and parseability",
      score: Math.round(parseability),
      weight: 30,
    },
    {
      key: "structure",
      label: "Resume section structure",
      score: Math.round(structure),
      weight: 25,
    },
    {
      key: "contact",
      label: "Contact and professional information",
      score: Math.round(contact),
      weight: 15,
    },
    {
      key: "evidence",
      label: "Skills and experience evidence",
      score: Math.round(evidence),
      weight: 20,
    },
    {
      key: "clarity",
      label: "Content clarity and consistency",
      score: Math.round(clarity),
      weight: 10,
    },
  ].map((item) => ({
    ...item,
    contribution: Math.round(item.score * item.weight) / 100,
  }));
  const score = Math.round(
    breakdown.reduce((sum, item) => sum + item.contribution, 0),
  );
  const issues: string[] = [];
  if (words.length < 80)
    issues.push("The extracted document contains limited readable text.");
  if (!sections.skills)
    issues.push("No clearly labeled skills section was recognized.");
  if (!sections.education)
    issues.push("No clearly labeled education section was recognized.");
  if (!sections.experience && !sections.projects)
    issues.push("No experience or projects section was recognized.");
  if (!hasEmail(clean)) issues.push("No parseable email address was found.");
  if (repeated > 0.15)
    issues.push("Several lines appear repeatedly in the extracted text.");
  const recommendations = buildReadinessRecommendations({
    sections,
    skills,
    issues,
    bulletCount,
    hasUrl: hasUrl(clean),
  });
  return {
    score,
    category:
      score >= 85
        ? "Strong readiness"
        : score >= 70
          ? "Good readiness"
          : score >= 50
            ? "Needs improvement"
            : "Significant improvements suggested",
    breakdown,
    sections,
    skills,
    issues,
    recommendations,
  };
}

function repeatedLineRatio(text: string) {
  const lines = text
    .split("\n")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.length > 15);
  if (!lines.length) return 0;
  return 1 - new Set(lines).size / lines.length;
}

function buildReadinessRecommendations(input: {
  sections: SectionMap;
  skills: string[];
  issues: string[];
  bulletCount: number;
  hasUrl: boolean;
}) {
  const recs: {
    category: string;
    priority: string;
    explanation: string;
    suggestedText?: string;
  }[] = [];
  if (!input.sections.skills)
    recs.push({
      category: "Structure",
      priority: "HIGH",
      explanation:
        "A conventional “Skills” heading helps parsers and recruiters locate competencies.",
      suggestedText:
        "Add a Skills section containing only abilities you genuinely possess.",
    });
  if (!input.sections.experience && !input.sections.projects)
    recs.push({
      category: "Evidence",
      priority: "HIGH",
      explanation:
        "The parser found no experience or project evidence. Projects are valid evidence for fresh graduates.",
      suggestedText:
        "Add a Projects or Experience section describing your real contribution and tools used.",
    });
  if (input.bulletCount < 3)
    recs.push({
      category: "Clarity",
      priority: "MEDIUM",
      explanation:
        "Long paragraphs are harder to scan than concise evidence statements.",
      suggestedText:
        "Use short bullets that begin with an action and preserve the facts already present.",
    });
  if (!input.hasUrl)
    recs.push({
      category: "Contact",
      priority: "OPTIONAL",
      explanation:
        "A relevant portfolio, LinkedIn, or GitHub link can make supporting work easier to review.",
      suggestedText:
        "Add a professional link only if it is current and relevant.",
    });
  if (!recs.length)
    recs.push({
      category: "Review",
      priority: "OPTIONAL",
      explanation:
        "The document has the major ATS-readable elements. Review it for factual accuracy and role relevance before applying.",
    });
  return recs;
}

export function analyzeJobAlignment(args: {
  text: string;
  required: string[];
  preferred: string[];
  jobText: string;
  taxonomy: TaxonomySkill[];
  educationRequired?: boolean;
  jobTitle?: string;
}) {
  const resumeSkills = extractSkills(args.text, args.taxonomy);
  const normalizedResume = new Set(resumeSkills.map(normalizeSkill));
  const matchedRequired = args.required.filter((s) =>
    normalizedResume.has(normalizeSkill(s)),
  );
  const matchedPreferred = args.preferred.filter((s) =>
    normalizedResume.has(normalizeSkill(s)),
  );
  const missing = [...args.required, ...args.preferred].filter(
    (s) => !normalizedResume.has(normalizeSkill(s)),
  );
  const sections = detectSections(args.text);
  const evidenceSource =
    `${sections.experience || ""} ${sections.projects || ""}`.toLowerCase();
  const supported = [...matchedRequired, ...matchedPreferred].filter((s) =>
    evidenceSource.includes(s.toLowerCase()),
  );
  const responsibilities = keywordRelevance(args.text, args.jobText);
  const criteria: {
    key: string;
    label: string;
    score: number;
    baseWeight: number;
  }[] = [
    {
      key: "required",
      label: "Required skills alignment",
      score: ratio(matchedRequired.length, args.required.length),
      baseWeight: 40,
    },
    {
      key: "preferred",
      label: "Preferred skills alignment",
      score: ratio(matchedPreferred.length, args.preferred.length),
      baseWeight: 15,
    },
    {
      key: "evidence",
      label: "Experience and project evidence",
      score: ratio(
        supported.length,
        Math.max(1, matchedRequired.length + matchedPreferred.length),
      ),
      baseWeight: 20,
    },
    {
      key: "relevance",
      label: "Responsibilities relevance",
      score: responsibilities,
      baseWeight: 15,
    },
  ];
  if (args.educationRequired)
    criteria.push({
      key: "education",
      label: "Education or certification requirements",
      score: sections.education || sections.certifications ? 100 : 0,
      baseWeight: 10,
    });
  const applicable = criteria.filter(
    (c) =>
      !(c.key === "preferred" && args.preferred.length === 0) &&
      !(c.key === "required" && args.required.length === 0),
  );
  const totalWeight = applicable.reduce((sum, c) => sum + c.baseWeight, 0);
  const breakdown = applicable.map((c) => ({
    ...c,
    weight: (c.baseWeight / totalWeight) * 100,
    contribution: (c.score * c.baseWeight) / totalWeight,
  }));
  const score = Math.round(
    breakdown.reduce((sum, c) => sum + c.contribution, 0),
  );
  const recommendations = missing
    .slice(0, 5)
    .map((skill, index) => ({
      priority: index < args.required.length ? "HIGH" : "MEDIUM",
      explanation: `The role references ${skill}, but it was not recognized in this resume. If you genuinely have this capability, document where you used it; otherwise consider it a development opportunity.`,
    }));
  if (!supported.length && matchedRequired.length)
    recommendations.unshift({
      priority: "HIGH",
      explanation:
        "Some requested skills are listed, but the parser did not find them in project or experience evidence. Connect genuine skills to specific work.",
    });
  return {
    score,
    breakdown,
    resumeSkills,
    matchedRequired,
    matchedPreferred,
    supported,
    missing,
    unclear: matchedRequired.filter((s) => !supported.includes(s)),
    recommendations,
  };
}

function keywordRelevance(resume: string, job: string) {
  const stop = new Set([
    "and",
    "the",
    "with",
    "for",
    "that",
    "this",
    "from",
    "your",
    "will",
    "are",
    "our",
    "you",
    "into",
    "using",
    "have",
    "has",
    "job",
    "role",
  ]);
  const words = Array.from(
    new Set(job.toLowerCase().match(/[a-z][a-z+#.]{3,}/g) || []),
  ).filter((w) => !stop.has(w));
  if (!words.length) return 0;
  const haystack = resume.toLowerCase();
  return clamp(
    (words.filter((word) => haystack.includes(word)).length /
      Math.min(words.length, 30)) *
      100,
  );
}
const ratio = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const clamp = (value: number) => Math.max(0, Math.min(100, value));
