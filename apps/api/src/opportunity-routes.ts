import { Router } from "express";
import { z } from "zod";
import { Role, type PrismaClient } from "@prisma/client";
import { calculateMatch } from "@skillbridge/shared";
import { analyzeJobAlignment, analyzeReadiness } from "./resume-engine.js";
import { InternalProvider } from "./integrations/providers/internal.provider.js";
import { extractKnownSkills, safeExternalUrl } from "./integrations/services/job-normalizer.service.js";
import { ensureJobSources, joobleProvider, pendingProviders } from "./integrations/services/provider-status.service.js";

type Dependencies = { prisma: PrismaClient; auth: any; asyncRoute: any };
const querySchema = z.object({ keyword: z.string().max(120).optional(), location: z.string().max(100).optional(), source: z.string().max(40).optional(), employmentType: z.string().max(60).optional(), minSalary: z.coerce.number().int().nonnegative().optional(), page: z.coerce.number().int().min(1).max(10).default(1), limit: z.coerce.number().int().min(1).max(20).default(12) });
const statuses = ["INTERESTED", "APPLIED_EXTERNALLY", "INTERVIEW_SCHEDULED", "OFFER_RECEIVED", "NOT_SELECTED"] as const;
const trackerSchema = z.object({ externalJobId: z.number().int().positive(), status: z.enum(statuses), notes: z.string().max(3000).optional(), appliedAt: z.string().datetime().optional() });

export function createOpportunityRouter({ prisma, auth, asyncRoute }: Dependencies) {
  const router = Router();
  const internal = new InternalProvider(prisma);
  const candidateFor = (userId: number) => prisma.candidate.findUniqueOrThrow({ where: { userId } });
  const includeExternal = { source: true, skills: { include: { skill: true } } } as const;

  async function persistJooble(jobs: Awaited<ReturnType<typeof joobleProvider.searchJobs>>["jobs"]) {
    const source = await prisma.jobSource.findUniqueOrThrow({ where: { name: joobleProvider.name } });
    const taxonomy = await prisma.skill.findMany();
    for (const job of jobs) {
      const stored = await prisma.externalJob.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: job.externalId } },
        update: { ...job, lastCheckedAt: new Date(), listingStatus: "ACTIVE" },
        create: { ...job, sourceId: source.id },
      });
      const skills = extractKnownSkills(`${job.title} ${job.descriptionSnippet}`, taxonomy);
      for (const skill of skills) await prisma.externalJobSkill.upsert({
        where: { externalJobId_skillId: { externalJobId: stored.id, skillId: skill.id } },
        update: { extractionConfidence: 0.55, extractionMethod: "taxonomy-keyword", requirementType: "UNVERIFIED" },
        create: { externalJobId: stored.id, skillId: skill.id, extractionConfidence: 0.55, extractionMethod: "taxonomy-keyword", requirementType: "UNVERIFIED" },
      });
    }
  }

  const serializeExternal = (job: any) => ({ ...job, kind: "EXTERNAL", id: `external:${job.id}`, numericId: job.id, source: job.source.name, sourceType: job.source.providerType, requiredSkills: job.skills.map((x: any) => x.skill.name), skillsVerified: false, isSaved: Boolean(job.savedBy?.length) });
  const serializeInternal = (job: any) => ({ id: `internal:${job.id}`, numericId: job.id, kind: "INTERNAL", source: "SkillBridge AI", sourceType: "internal", title: job.title, company: job.employer.companyName, location: job.location, workArrangement: job.arrangement, employmentType: job.employmentType, industry: job.industry, salaryText: job.salary, descriptionSnippet: job.description.slice(0, 500), externalUrl: null, postedAt: job.createdAt, updatedAt: job.createdAt, requiredSkills: job.skills.filter((x: any) => x.required).map((x: any) => x.skill.name), preferredSkills: job.skills.filter((x: any) => !x.required).map((x: any) => x.skill.name), skillsVerified: true, sourceStatus: "INTERNAL", isDemo: true });

  router.use(auth([Role.CANDIDATE]));
  router.get("/", asyncRoute(async (req: any, res: any) => {
    const input = querySchema.parse(req.query);
    await ensureJobSources(prisma);
    const notices: string[] = [];
    const internalResult = !input.source || input.source === "internal" ? await internal.searchJobs(input) : { jobs: [], total: 0 };
    if (input.source && !["internal", "jooble"].includes(input.source)) notices.push("That source is not enabled. It remains an Integration Pending connector.");
    if (!input.source || input.source === "jooble") {
      if (await joobleProvider.checkAvailability()) {
        try { const live = await joobleProvider.searchJobs(input); await persistJooble(live.jobs); if ("cacheHit" in live && live.cacheHit) notices.push("Jooble results served from the provider cache."); }
        catch (error) { notices.push((error as Error).message); }
      } else notices.push("Jooble live search is unavailable until a Malaysia API key is configured and enabled.");
    }
    const candidate = await candidateFor(req.user.id);
    const externalWhere: any = {
      listingStatus: "ACTIVE",
      source: { isEnabled: true, ...(input.source === "jooble" ? { providerType: "jooble" } : {}) },
      ...(input.source === "internal" || (input.source && input.source !== "jooble") ? { id: -1 } : {}),
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ...(input.keyword ? [{ OR: [{ title: { contains: input.keyword } }, { company: { contains: input.keyword } }, { descriptionSnippet: { contains: input.keyword } }] }] : []),
        ...(input.location ? [{ location: { contains: input.location } }] : []),
        ...(input.employmentType ? [{ employmentType: { contains: input.employmentType } }] : []),
        ...(input.minSalary ? [{ OR: [{ salaryMax: { gte: input.minSalary } }, { salaryMin: { gte: input.minSalary } }] }] : []),
      ],
    };
    const external = await prisma.externalJob.findMany({ where: externalWhere, include: { ...includeExternal, savedBy: { where: { candidateId: candidate.id }, select: { id: true } } }, orderBy: [{ updatedAt: "desc" }, { lastCheckedAt: "desc" }], take: input.limit });
    const jobs = [...internalResult.jobs.map(serializeInternal), ...external.map(serializeExternal)];
    res.json({ jobs, page: input.page, limit: input.limit, total: internalResult.total + external.length, notices, sources: [internal.getSourceStatus(), joobleProvider.getSourceStatus()], plannedSources: pendingProviders.map((p) => p.getSourceStatus()) });
  }));

  router.get("/recommended", asyncRoute(async (req: any, res: any) => {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: req.user.id }, include: { skills: { include: { skill: true } } } });
    const jobs = await prisma.externalJob.findMany({ where: { listingStatus: "ACTIVE" }, include: includeExternal, take: 50, orderBy: { lastCheckedAt: "desc" } });
    const result = jobs.map((job) => {
      const names = job.skills.map((x) => x.skill.name);
      if (names.length < 2) return { job: serializeExternal(job), match: null, explanation: "Insufficient job details for a reliable match." };
      const match = calculateMatch({ candidateSkills: candidate.skills.map((x) => ({ name: x.skill.name, level: x.level })), requiredSkills: names.map((name) => ({ name, level: "BEGINNER" as const })), preferredSkills: [], candidatePreferences: { arrangements: candidate.arrangements.split(",").filter(Boolean), locations: candidate.preferredLocations.split(",").filter(Boolean) }, job: { arrangement: job.workArrangement || "", location: job.location } });
      return { job: serializeExternal(job), match, explanation: "Based on unverified skills extracted from the available listing snippet." };
    }).sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1));
    res.json(result);
  }));

  router.get("/saved", asyncRoute(async (req: any, res: any) => {
    const candidate = await candidateFor(req.user.id);
    const rows = await prisma.savedExternalJob.findMany({ where: { candidateId: candidate.id }, include: { externalJob: { include: includeExternal } }, orderBy: { createdAt: "desc" } });
    res.json(rows.map((row) => ({ ...row, job: serializeExternal(row.externalJob) })));
  }));

  router.get("/:id", asyncRoute(async (req: any, res: any) => {
    const id = Number(req.params.id.replace(/^external:/, ""));
    const job = await prisma.externalJob.findUnique({ where: { id }, include: includeExternal });
    if (!job) return res.status(404).json({ error: "External opportunity not found" });
    res.json(serializeExternal(job));
  }));

  router.post("/:id/match", asyncRoute(async (req: any, res: any) => {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: req.user.id }, include: { skills: { include: { skill: true } } } });
    const job = await prisma.externalJob.findUnique({ where: { id: +req.params.id }, include: includeExternal });
    if (!job) return res.status(404).json({ error: "External opportunity not found" });
    const names = job.skills.map((x) => x.skill.name);
    if (names.length < 2) return res.status(422).json({ error: "Insufficient job details for a reliable match.", requiresDescription: true });
    const match = calculateMatch({ candidateSkills: candidate.skills.map((x) => ({ name: x.skill.name, level: x.level })), requiredSkills: names.map((name) => ({ name, level: "BEGINNER" as const })), preferredSkills: [] });
    await prisma.externalJobMatch.create({ data: { candidateId: candidate.id, externalJobId: job.id, score: match.score, scoreBreakdown: JSON.stringify(match), algorithmVersion: "profile-match-1.0" } });
    res.status(201).json({ ...match, confidence: "LIMITED", disclosure: "Requirements were extracted from a provider snippet and remain unverified." });
  }));

  router.post("/:id/resume-check", asyncRoute(async (req: any, res: any) => {
    const candidate = await candidateFor(req.user.id);
    const job = await prisma.externalJob.findUnique({ where: { id: +req.params.id }, include: includeExternal });
    if (!job) return res.status(404).json({ error: "External opportunity not found" });
    const resume = await prisma.resume.findFirst({ where: { candidateId: candidate.id }, orderBy: { uploadedAt: "desc" } });
    if (!resume) return res.status(409).json({ error: "Upload a resume before checking alignment." });
    const taxonomy = await prisma.skill.findMany({ select: { name: true, aliases: true } });
    const names = job.skills.map((x) => x.skill.name);
    if (names.length < 2) return res.status(422).json({ error: "Insufficient job details for a reliable match. Paste a job description you are authorized to use in the Resume Matcher.", requiresDescription: true });
    const readiness = analyzeReadiness(resume.extractedText, taxonomy);
    const alignment = analyzeJobAlignment({ text: resume.extractedText, required: names, preferred: [], jobText: `${job.title} ${job.descriptionSnippet}`, taxonomy, jobTitle: job.title });
    res.status(201).json({ atsReadiness: readiness, jobAlignment: alignment, disclosure: "These are independent advisory metrics. Extracted listing skills are unverified." });
  }));

  router.post("/:id/save", asyncRoute(async (req: any, res: any) => {
    const candidate = await candidateFor(req.user.id);
    const row = await prisma.savedExternalJob.upsert({ where: { candidateId_externalJobId: { candidateId: candidate.id, externalJobId: +req.params.id } }, update: {}, create: { candidateId: candidate.id, externalJobId: +req.params.id } });
    res.status(201).json(row);
  }));
  router.delete("/:id/save", asyncRoute(async (req: any, res: any) => {
    const candidate = await candidateFor(req.user.id);
    await prisma.savedExternalJob.deleteMany({ where: { candidateId: candidate.id, externalJobId: +req.params.id } });
    res.status(204).end();
  }));
  return router;
}

export function createExternalApplicationRouter({ prisma, auth, asyncRoute }: Dependencies) {
  const router = Router();
  router.use(auth([Role.CANDIDATE]));
  router.get("/", asyncRoute(async (req: any, res: any) => {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: req.user.id } });
    res.json(await prisma.externalApplicationTracker.findMany({ where: { candidateId: candidate.id }, include: { externalJob: { include: { source: true } } }, orderBy: { updatedAt: "desc" } }));
  }));
  router.post("/", asyncRoute(async (req: any, res: any) => {
    const input = trackerSchema.parse(req.body); const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: req.user.id } });
    const row = await prisma.externalApplicationTracker.upsert({ where: { candidateId_externalJobId: { candidateId: candidate.id, externalJobId: input.externalJobId } }, update: { status: input.status, notes: input.notes, appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined }, create: { candidateId: candidate.id, externalJobId: input.externalJobId, status: input.status, notes: input.notes, appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined } });
    res.status(201).json(row);
  }));
  router.patch("/:id", asyncRoute(async (req: any, res: any) => {
    const input = trackerSchema.omit({ externalJobId: true }).partial().parse(req.body); const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: req.user.id } });
    const existing = await prisma.externalApplicationTracker.findFirst({ where: { id: +req.params.id, candidateId: candidate.id } });
    if (!existing) return res.status(404).json({ error: "Tracked application not found" });
    res.json(await prisma.externalApplicationTracker.update({ where: { id: existing.id }, data: { ...input, appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined } }));
  }));
  return router;
}

export function createJobSourceAdminRouter({ prisma, auth, asyncRoute }: Dependencies) {
  const router = Router(); router.use(auth([Role.ADMIN]));
  router.get("/job-sources", asyncRoute(async (_req: any, res: any) => { await ensureJobSources(prisma); res.json(await prisma.jobSource.findMany({ orderBy: { name: "asc" } })); }));
  router.patch("/job-sources/:id", asyncRoute(async (req: any, res: any) => {
    const input = z.object({ isEnabled: z.boolean().optional() }).parse(req.body); const source = await prisma.jobSource.findUnique({ where: { id: +req.params.id } });
    if (!source) return res.status(404).json({ error: "Source not found" });
    if (source.authorizationStatus !== "AUTHORIZED" && input.isEnabled) return res.status(409).json({ error: "Provider cannot be enabled until authorization is confirmed." });
    res.json(await prisma.jobSource.update({ where: { id: source.id }, data: input }));
  }));
  router.post("/job-sources/:id/sync", asyncRoute(async (req: any, res: any) => {
    const source = await prisma.jobSource.findUnique({ where: { id: +req.params.id } });
    if (!source || source.providerType !== "jooble" || !source.isEnabled) return res.status(409).json({ error: "Only an enabled, authorized Jooble connector can synchronize." });
    res.status(202).json({ status: "ON_DEMAND_ONLY", message: "Jooble uses cached on-demand searches to conserve the provider request budget." });
  }));
  router.get("/job-sync-logs", asyncRoute(async (_req: any, res: any) => res.json(await prisma.jobSyncLog.findMany({ include: { source: true }, orderBy: { startedAt: "desc" }, take: 100 }))));
  return router;
}
