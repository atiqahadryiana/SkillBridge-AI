import type { NormalizedExternalJob } from "../types/job-provider.types.js";

const key = (job: NormalizedExternalJob) =>
  `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, " ").trim();

export function deduplicateJobs(jobs: NormalizedExternalJob[]) {
  const external = new Set<string>();
  const urls = new Set<string>();
  const conservative = new Set<string>();
  return jobs.filter((job) => {
    const id = job.externalId.trim();
    const url = job.externalUrl.replace(/[?#].*$/, "");
    const signature = key(job);
    if (external.has(id) || urls.has(url) || conservative.has(signature)) return false;
    external.add(id);
    urls.add(url);
    conservative.add(signature);
    return true;
  });
}
