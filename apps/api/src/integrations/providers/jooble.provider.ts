import { deduplicateJobs } from "../services/job-deduplication.service.js";
import { parseSalary, safeExternalUrl, validateNormalizedJob } from "../services/job-normalizer.service.js";
import type { JobProvider, NormalizedExternalJob, ProviderSearch } from "../types/job-provider.types.js";

export type JoobleRawJob = {
  id?: string | number; title?: string; company?: string; location?: string;
  snippet?: string; salary?: string; type?: string; link?: string; updated?: string;
};

type CacheEntry = { expires: number; value: { jobs: NormalizedExternalJob[]; total: number } };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<{ jobs: NormalizedExternalJob[]; total: number }>>();

export class JoobleProvider implements JobProvider<JoobleRawJob> {
  readonly id = "jooble";
  readonly name = "Jooble Malaysia";
  private enabled = process.env.JOOBLE_API_ENABLED === "true";
  private key = process.env.JOOBLE_API_KEY || "";
  private quota = Math.max(1, Number(process.env.JOOBLE_REQUEST_BUDGET || 450));
  private requests = 0;
  private suspended = false;

  getSourceStatus() {
    const configured = this.enabled && Boolean(this.key) && !this.suspended;
    return {
      id: this.id,
      name: this.name,
      enabled: configured,
      authorizationStatus: (this.suspended ? "SUSPENDED" : configured ? "AUTHORIZED" : this.enabled ? "DISABLED" : "PENDING") as "AUTHORIZED" | "PENDING" | "DISABLED" | "SUSPENDED",
      message: this.suspended ? "Suspended after quota or rate-limit response." : configured ? "Authorized Malaysia API connector is available." : "Integration requires a Malaysia-specific API key and explicit enablement.",
    };
  }

  async checkAvailability() { return this.getSourceStatus().enabled; }

  async searchJobs(input: ProviderSearch) {
    if (!this.enabled || !this.key) throw Object.assign(new Error("Jooble is not configured."), { status: 503, code: "PROVIDER_NOT_CONFIGURED" });
    if (this.suspended || this.requests >= this.quota) throw Object.assign(new Error("Jooble request budget is exhausted."), { status: 429, code: "PROVIDER_QUOTA_EXHAUSTED" });
    const bounded = { ...input, page: Math.min(10, Math.max(1, input.page)), limit: Math.min(20, Math.max(1, input.limit)) };
    const cacheKey = JSON.stringify(bounded);
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return { ...hit.value, cacheHit: true };
    const pending = inFlight.get(cacheKey);
    if (pending) return { ...(await pending), cacheHit: true };
    const request = this.fetchWithRetry(bounded).finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, request);
    const value = await request;
    const ttl = Math.max(5, Number(process.env.JOB_CACHE_TTL_MINUTES || 60));
    cache.set(cacheKey, { value, expires: Date.now() + ttl * 60_000 });
    return value;
  }

  private async fetchWithRetry(input: ProviderSearch) {
    let last: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.requests++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        const response = await fetch(`https://my.jooble.org/api/${encodeURIComponent(this.key)}`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ keywords: input.keyword || "graduate", location: input.location || "Malaysia", salary: input.minSalary, page: input.page, ResultOnPage: input.limit, companysearch: false }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (response.status === 403) throw Object.assign(new Error("Jooble rejected the API key."), { status: 502, code: "PROVIDER_AUTH_FAILED" });
        if (response.status === 429) { this.suspended = true; throw Object.assign(new Error("Jooble rate limit reached; connector suspended."), { status: 429, code: "PROVIDER_QUOTA_EXHAUSTED" }); }
        if (!response.ok) throw new Error(`Jooble temporary error (${response.status}).`);
        const data = (await response.json()) as { totalCount?: number; jobs?: JoobleRawJob[] };
        const jobs = deduplicateJobs((data.jobs || []).map((job) => this.normalizeJob(job)).filter((job) => this.validateJob(job)));
        return { jobs, total: Number(data.totalCount || jobs.length) };
      } catch (error) {
        last = error as Error;
        if ((error as any).code || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
      }
    }
    throw last || new Error("Jooble request failed.");
  }

  normalizeJob(raw: JoobleRawJob): NormalizedExternalJob {
    const updatedAt = raw.updated && !Number.isNaN(Date.parse(raw.updated)) ? new Date(raw.updated) : undefined;
    return {
      externalId: String(raw.id || safeExternalUrl(raw.link || "") || ""),
      title: String(raw.title || "").trim(), company: String(raw.company || "").trim(),
      location: String(raw.location || "").trim(), country: "Malaysia",
      employmentType: raw.type?.trim() || undefined,
      descriptionSnippet: String(raw.snippet || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500),
      externalUrl: safeExternalUrl(raw.link || "") || "", updatedAt,
      ...parseSalary(raw.salary), sourceStatus: "LIVE", isDemo: false,
    };
  }
  validateJob(job: NormalizedExternalJob) { return validateNormalizedJob(job); }
}
