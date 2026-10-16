import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, prisma } from "./app.js";
import { JoobleProvider } from "./integrations/providers/jooble.provider.js";
import { deduplicateJobs } from "./integrations/services/job-deduplication.service.js";
import { safeExternalUrl } from "./integrations/services/job-normalizer.service.js";

describe("job provider services", () => {
  it("normalizes Jooble fields without inventing missing salary or dates", () => {
    const provider = new JoobleProvider();
    const job = provider.normalizeJob({ id: 7, title: "Graduate Engineer", company: "Example Berhad", location: "Penang", snippet: "Build APIs with TypeScript", link: "https://my.jooble.org/jdp/7" });
    expect(job.salaryMin).toBeUndefined();
    expect(job.updatedAt).toBeUndefined();
    expect(job.isDemo).toBe(false);
    expect(provider.validateJob(job)).toBe(true);
  });

  it("rejects unsafe URLs and removes conservative duplicates", () => {
    expect(safeExternalUrl("http://127.0.0.1/admin")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    const base = { externalId: "1", title: "Analyst", company: "Acme", location: "KL", country: "Malaysia", descriptionSnippet: "SQL analyst vacancy", externalUrl: "https://example.com/jobs/1", sourceStatus: "LIVE" as const, isDemo: false };
    expect(deduplicateJobs([base, { ...base, externalId: "2" }])).toHaveLength(1);
  });

  it("reports provider authentication and quota errors", async () => {
    process.env.JOOBLE_API_ENABLED = "true";
    process.env.JOOBLE_API_KEY = "test-key";
    process.env.JOOBLE_REQUEST_BUDGET = "5";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403, ok: false }));
    await expect(new JoobleProvider().searchJobs({ page: 1, limit: 5 })).rejects.toMatchObject({ code: "PROVIDER_AUTH_FAILED" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 429, ok: false }));
    await expect(new JoobleProvider().searchJobs({ keyword: "quota", page: 1, limit: 5 })).rejects.toMatchObject({ code: "PROVIDER_QUOTA_EXHAUSTED" });
    vi.unstubAllGlobals();
    delete process.env.JOOBLE_API_ENABLED;
    delete process.env.JOOBLE_API_KEY;
    delete process.env.JOOBLE_REQUEST_BUDGET;
  });

  it("handles empty provider results", async () => {
    process.env.JOOBLE_API_ENABLED = "true";
    process.env.JOOBLE_API_KEY = "test-key-empty";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ totalCount: 0, jobs: [] }) }));
    const result = await new JoobleProvider().searchJobs({ keyword: "empty", page: 1, limit: 5 });
    expect(result).toEqual({ jobs: [], total: 0 });
    vi.unstubAllGlobals();
    delete process.env.JOOBLE_API_ENABLED;
    delete process.env.JOOBLE_API_KEY;
  });
});

describe("opportunity API", () => {
  let cookie = "";
  let externalJobId = 0;
  beforeAll(async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "candidate@skillbridge.demo", password: "Demo123!" });
    cookie = login.headers["set-cookie"][0];
    const source = await prisma.jobSource.upsert({ where: { name: "Test Authorized Feed" }, update: {}, create: { name: "Test Authorized Feed", providerType: "test", baseUrl: "https://example.com", isEnabled: true, authorizationStatus: "AUTHORIZED" } });
    const job = await prisma.externalJob.create({ data: { sourceId: source.id, externalId: `test-${Date.now()}`, title: "Test Data Analyst", company: "Test Company", location: "Kuala Lumpur", descriptionSnippet: "Python and SQL role details supplied by an authorized test feed.", externalUrl: "https://example.com/jobs/test", sourceStatus: "LIVE" } });
    externalJobId = job.id;
    for (const normalized of ["python", "sql"]) {
      const skill = await prisma.skill.findUniqueOrThrow({ where: { normalized } });
      await prisma.externalJobSkill.create({ data: { externalJobId, skillId: skill.id, requirementType: "UNVERIFIED", extractionConfidence: 0.55, extractionMethod: "test" } });
    }
  });
  afterAll(async () => {
    await prisma.externalJob.delete({ where: { id: externalJobId } }).catch(() => undefined);
    await prisma.jobSource.delete({ where: { name: "Test Authorized Feed" } }).catch(() => undefined);
  });

  it("protects opportunity search and persists saved jobs", async () => {
    expect((await request(app).get("/api/opportunities")).status).toBe(401);
    const saved = await request(app).post(`/api/opportunities/${externalJobId}/save`).set("Cookie", cookie).send({});
    expect(saved.status).toBe(201);
    const list = await request(app).get("/api/opportunities/saved").set("Cookie", cookie);
    expect(list.body.some((x: any) => x.job.numericId === externalJobId)).toBe(true);
  });

  it("generates an explainable advisory match", async () => {
    const response = await request(app).post(`/api/opportunities/${externalJobId}/match`).set("Cookie", cookie).send({});
    expect(response.status).toBe(201);
    expect(response.body.score).toBeTypeOf("number");
    expect(response.body.disclosure).toContain("unverified");
  });

  it("creates and updates a candidate-owned application tracker row", async () => {
    const created = await request(app).post("/api/external-applications").set("Cookie", cookie).send({ externalJobId, status: "INTERESTED", notes: "Review requirements" });
    expect(created.status).toBe(201);
    const updated = await request(app).patch(`/api/external-applications/${created.body.id}`).set("Cookie", cookie).send({ status: "APPLIED_EXTERNALLY" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("APPLIED_EXTERNALLY");
  });
});
