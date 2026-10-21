import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { extractPdfText } from "./pdf-text.js";
import mammoth from "mammoth";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { screeningCriteriaSchema, screeningEvidenceSchema, screenCandidate } from "@skillbridge/shared";
import { openScreening, sealScreening } from "./screening-private.js";

const candidateSchema = z.object({
  name: z.string().trim().min(1).max(120), email: z.union([z.string().email().max(254), z.literal("")]).default(""),
  evidence: screeningEvidenceSchema, consent: z.literal(true),
}).strict();
type PrivateCandidate = z.infer<typeof candidateSchema> & { notes: string; overrideReason: string; history: { at: string; action: string }[] };
const jobSchema = z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().min(20).max(20000),
  location: z.string().trim().min(1).max(160), criteria: screeningCriteriaSchema }).strict();
const companySchema = z.object({ companyName: z.string().trim().min(2).max(160), industry: z.string().trim().min(2).max(120),
  companySize: z.enum(["1–10", "11–50", "51–200", "201–500", "501+"]),
  logoUrl: z.union([z.literal(""), z.string().url().max(2000).refine((v) => v.startsWith("https://"), "Logo must use HTTPS")]),
}).strict();
const id = z.coerce.number().int().positive();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
export const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};

export function createScreeningRouter({ prisma, auth, asyncRoute }: { prisma: PrismaClient; auth: any; asyncRoute: any }) {
  const router = Router();
  router.use(auth(["EMPLOYER"]));
  router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  const employerFor = (userId: number) => prisma.employer.findUniqueOrThrow({ where: { userId } });
  async function ownedJob(jobId: unknown, userId: number) {
    const employer = await employerFor(userId);
    const job = await prisma.job.findFirst({ where: { id: id.parse(jobId), employerId: employer.id } });
    if (!job) throw Object.assign(new Error("Job not found"), { status: 404 });
    return job;
  }
  async function ownedCandidate(candidateId: unknown, userId: number) {
    const employer = await employerFor(userId);
    const row = await prisma.screeningCandidate.findFirst({ where: { id: id.parse(candidateId), job: { employerId: employer.id } }, include: { job: true } });
    if (!row) throw Object.assign(new Error("Candidate not found"), { status: 404 });
    return row;
  }
  function present(row: any, criteria: string, detail = false) {
    const data = openScreening<PrivateCandidate>(row.payload);
    const result = screenCandidate(JSON.parse(criteria), data.evidence);
    return { id: row.id, jobId: row.jobId, name: data.name, email: data.email, stage: row.stage,
      override: row.override, status: row.override || result.recommendation, isDemo: row.isDemo,
      createdAt: row.createdAt, updatedAt: row.updatedAt, result,
      ...(detail ? { evidence: data.evidence, notes: data.notes, overrideReason: data.overrideReason, history: data.history } : {}) };
  }
  router.get("/company", asyncRoute(async (req: any, res: any) => res.json(await employerFor(req.user.id))));
  router.put("/company", asyncRoute(async (req: any, res: any) => {
    const data = companySchema.parse(req.body);
    res.json(await prisma.employer.update({ where: { userId: req.user.id }, data }));
  }));
  router.get("/jobs", asyncRoute(async (req: any, res: any) => {
    const employer = await employerFor(req.user.id);
    res.json(await prisma.job.findMany({ where: { employerId: employer.id }, include: { _count: { select: { screeningCandidates: true } } }, orderBy: { createdAt: "desc" } }));
  }));
  router.post("/jobs", asyncRoute(async (req: any, res: any) => {
    const data = jobSchema.parse(req.body), employer = await employerFor(req.user.id);
    res.status(201).json(await prisma.job.create({ data: { employerId: employer.id, title: data.title, description: data.description,
      location: data.location, industry: employer.industry, arrangement: "ONSITE", employmentType: "FULL_TIME", published: false,
      screeningCriteria: JSON.stringify(data.criteria) } }));
  }));
  router.get("/jobs/:jobId", asyncRoute(async (req: any, res: any) => {
    const job = await ownedJob(req.params.jobId, req.user.id);
    res.json({ ...job, criteria: job.screeningCriteria ? JSON.parse(job.screeningCriteria) : [] });
  }));
  router.put("/jobs/:jobId", asyncRoute(async (req: any, res: any) => {
    const job = await ownedJob(req.params.jobId, req.user.id), data = jobSchema.parse(req.body);
    res.json(await prisma.job.update({ where: { id: job.id }, data: { title: data.title, description: data.description, location: data.location, screeningCriteria: JSON.stringify(data.criteria) } }));
  }));
  router.post("/jobs/:jobId/candidates", asyncRoute(async (req: any, res: any) => {
    const job = await ownedJob(req.params.jobId, req.user.id);
    if (!job.screeningCriteria) return res.status(409).json({ error: "Set screening criteria first" });
    const data = candidateSchema.parse(req.body);
    const row = await prisma.screeningCandidate.create({ data: { jobId: job.id, payload: sealScreening({ ...data, notes: "", overrideReason: "", history: [] }) } });
    res.status(201).json(present(row, job.screeningCriteria));
  }));
  router.get("/jobs/:jobId/candidates", asyncRoute(async (req: any, res: any) => {
    const job = await ownedJob(req.params.jobId, req.user.id);
    const rows = await prisma.screeningCandidate.findMany({ where: { jobId: job.id } });
    res.json(job.screeningCriteria ? rows.map((row) => present(row, job.screeningCriteria!)).sort((a,b) => (b.result.score ?? -1) - (a.result.score ?? -1) || a.id-b.id) : []);
  }));
  router.get("/jobs/:jobId/shortlist.csv", asyncRoute(async (req: any, res: any) => {
    const job = await ownedJob(req.params.jobId, req.user.id);
    const rows = await prisma.screeningCandidate.findMany({ where: { jobId: job.id } });
    const candidates = job.screeningCriteria ? rows.map((r) => present(r, job.screeningCriteria!)).filter((r) => r.status === "Shortlist").sort((a,b) => (b.result.score ?? -1)-(a.result.score ?? -1)) : [];
    const csv = [["Name", "Email", "Score", "Status", "Stage", "Decision source"], ...candidates.map((c) => [c.name, c.email, c.result.score, c.status, c.stage, c.override ? "Employer override" : "Advisory suggestion"])].map((r) => r.map(csvCell).join(",")).join("\r\n");
    res.type("text/csv").set("Content-Disposition", `attachment; filename="shortlist-${job.id}.csv"`).send(csv);
  }));
  router.get("/candidates/:candidateId", asyncRoute(async (req: any, res: any) => {
    const row = await ownedCandidate(req.params.candidateId, req.user.id);
    res.json({ ...present(row, row.job.screeningCriteria!, true), jobTitle: row.job.title });
  }));
  router.patch("/candidates/:candidateId", asyncRoute(async (req: any, res: any) => {
    const row = await ownedCandidate(req.params.candidateId, req.user.id);
    const changes = z.object({ notes: z.string().max(5000).optional(), override: z.enum(["Shortlist", "Maybe", "Reject"]).nullable().optional(),
      overrideReason: z.string().trim().max(1000).optional(), stage: z.enum(["REVIEW", "PHONE_SCREEN", "INTERVIEW", "CLOSED"]).optional(), evidence: screeningEvidenceSchema.optional(),
    }).strict().parse(req.body);
    if (changes.override && !changes.overrideReason) return res.status(400).json({ error: "Give a reason for the employer decision" });
    const data = openScreening<PrivateCandidate>(row.payload);
    if (changes.notes !== undefined) data.notes = changes.notes;
    if (changes.override !== undefined) data.overrideReason = changes.override ? changes.overrideReason! : "";
    if (changes.evidence) data.evidence = changes.evidence;
    data.history.push({ at: new Date().toISOString(), action: `Employer updated: ${Object.keys(changes).join(", ")}${changes.override !== undefined ? `; decision ${changes.override || "reset to advisory"}` : ""}${changes.stage ? `; stage ${changes.stage}` : ""}` });
    const updated = await prisma.screeningCandidate.update({ where: { id: row.id }, data: { payload: sealScreening(data), override: changes.override, stage: changes.stage } });
    res.json(present(updated, row.job.screeningCriteria!, true));
  }));
  router.delete("/candidates/:candidateId", asyncRoute(async (req: any, res: any) => {
    const row = await ownedCandidate(req.params.candidateId, req.user.id);
    await prisma.screeningCandidate.delete({ where: { id: row.id } });
    res.status(204).end();
  }));
  // Parse locally, retain no binary or full resume. Review extracted fields before saving/scoring.
  router.post("/parse-resume", rateLimit({ windowMs: 60000, limit: 15 }), upload.single("resume"), asyncRoute(async (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: "Choose a PDF, DOCX or TXT resume (maximum 4 MB)" });
    const b: Buffer = req.file.buffer;
    let text = "";
    try {
      if (b.subarray(0,5).toString() === "%PDF-") text = await extractPdfText(b);
      else if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4) text = (await mammoth.extractRawText({ buffer: b })).value;
      else if (req.file.originalname.toLowerCase().endsWith(".txt") && !b.includes(0)) text = b.toString("utf8");
      else return res.status(415).json({ error: "Unsupported document contents" });
    } catch { return res.status(422).json({ error: "Cannot parse this document. Use a text-based resume." }); }
    if (text.length > 200000 || text.split(/\s+/).length < 20) return res.status(422).json({ error: "Document is too large or has insufficient readable text" });
    const evidence = screeningEvidenceSchema.parse({});
    let section = "";
    for (const line of text.split(/\r?\n/).map((s) => s.trim())) {
      const heading = /^(skills|technical skills|education|qualifications|certifications|experience|work history|summary|personal details|contact|references)\s*:?\s*$/i.exec(line);
      if (heading) { section = heading[1].toLowerCase(); continue; }
      // Only explicitly labeled professional sections feed suggested evidence.
      if (["skills", "technical skills"].includes(section)) evidence.skills.push(...line.split(/[,;|•]/).map((s) => s.trim()).filter(Boolean));
      if (["education", "qualifications"].includes(section)) evidence.degrees.push(line);
      if (section === "certifications") evidence.certifications.push(line);
    }
    for (const key of ["skills", "degrees", "certifications"] as const) evidence[key] = evidence[key].filter((v) => v && v.length <= 160).slice(0,60);
    res.json({ evidence, message: "Extracted suggestions are unverified. Review each field before saving. Practical details must be supplied explicitly." });
  }));
  router.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Maximum file size is 4 MB" : "Upload one resume" });
    if (err?.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  });
  return router;
}
