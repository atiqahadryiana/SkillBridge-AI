import { normalizeSkill } from "@skillbridge/shared";
import type { NormalizedExternalJob } from "../types/job-provider.types.js";

export function safeExternalUrl(value: string, allowedHosts?: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname))
      return null;
    if (allowedHosts?.length && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validateNormalizedJob(job: NormalizedExternalJob) {
  return Boolean(
    job.externalId && job.title.trim() && job.company.trim() &&
      job.location.trim() && job.descriptionSnippet.trim() &&
      safeExternalUrl(job.externalUrl),
  );
}

export function extractKnownSkills(
  text: string,
  taxonomy: { id: number; name: string; aliases: string }[],
) {
  const haystack = ` ${normalizeSkill(text)} `;
  return taxonomy.filter((skill) =>
    [skill.name, ...skill.aliases.split(",")]
      .filter(Boolean)
      .some((term) => haystack.includes(normalizeSkill(term))),
  );
}

export function parseSalary(value?: string) {
  if (!value) return {};
  const nums = (value.match(/[\d,.]+/g) || [])
    .map((x) => Number(x.replace(/,/g, "")))
    .filter(Number.isFinite);
  const currency = /\b(MYR|RM)\b/i.test(value) ? "MYR" : undefined;
  return {
    salaryText: value.slice(0, 120),
    salaryMin: nums[0],
    salaryMax: nums.length > 1 ? nums[1] : undefined,
    salaryCurrency: currency,
  };
}
