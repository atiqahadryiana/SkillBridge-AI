import { Router } from "express";
import multer from "multer";
import { extractPdfText } from "./pdf-text.js";
import mammoth from "mammoth";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Level, Role, type PrismaClient } from "@prisma/client";
import { normalizeSkill } from "@skillbridge/shared";
import {
  analyzeJobAlignment,
  analyzeReadiness,
  cleanResumeText,
} from "./resume-engine.js";
type Dependencies = { prisma: PrismaClient; auth: any; asyncRoute: any };
const maxSize = Number(process.env.MAX_RESUME_SIZE_BYTES || 5 * 1024 * 1024);
const storageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../storage/resumes",
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSize, files: 1 },
});
const limiter = rateLimit({ windowMs: 60_000, limit: 20 });
const json = <T>(value: string): T => JSON.parse(value) as T;

export function createResumeRouter({ prisma, auth, asyncRoute }: Dependencies) {
  const router = Router();
  async function candidateFor(userId: number) {
    return prisma.candidate.findUniqueOrThrow({ where: { userId } });
  }
  async function ownedResume(id: number, userId: number) {
    const candidate = await candidateFor(userId);
    const resume = await prisma.resume.findFirst({
      where: { id, candidateId: candidate.id },
    });
    if (!resume)
      throw Object.assign(new Error("Resume not found"), { status: 404 });
    return { candidate, resume };
  }

  function actualType(buffer: Buffer) {
    if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    )
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const sample = buffer.subarray(0, 512).toString("utf8");
    if (!sample.includes("\0") && /[a-zA-Z]{4}/.test(sample))
      return "text/plain";
    return null;
  }

  async function extractText(buffer: Buffer, mimeType: string) {
    if (mimeType === "application/pdf")
      return cleanResumeText(await extractPdfText(buffer));
    if (mimeType.includes("wordprocessingml"))
      return cleanResumeText((await mammoth.extractRawText({ buffer })).value);
    return cleanResumeText(buffer.toString("utf8"));
  }

  const serializeResume = (resume: any) => ({
    ...resume,
    extractedText: resume.extractedText.slice(0, 5000),
  });
  const serializeAnalysis = (a: any) => ({
    ...a,
    readinessBreakdown: json(a.readinessBreakdown),
    extractedSections: json(a.extractedSections),
    detectedSkills: json(a.detectedSkills),
    parsingIssues: json(a.parsingIssues),
    recommendations: json(a.recommendations),
  });
  const serializeMatch = (m: any) => ({
    ...m,
    scoreBreakdown: json(m.scoreBreakdown),
    matchedSkills: json(m.matchedSkills),
    missingSkills: json(m.missingSkills),
    recommendations: json(m.recommendations),
  });

  router.use(auth([Role.CANDIDATE]));
  router.get(
    "/",
    asyncRoute(async (req: any, res: any) => {
      const candidate = await candidateFor(req.user.id);
      const resumes = await prisma.resume.findMany({
        where: { candidateId: candidate.id },
        include: {
          analyses: { orderBy: { analyzedAt: "desc" }, take: 1 },
          jobMatches: { orderBy: { analyzedAt: "desc" }, take: 1 },
        },
        orderBy: { uploadedAt: "desc" },
      });
      res.json(
        resumes.map((r) => ({
          ...serializeResume(r),
          analyses: r.analyses.map(serializeAnalysis),
          jobMatches: r.jobMatches.map(serializeMatch),
        })),
      );
    }),
  );

  router.post(
    "/upload",
    limiter,
    upload.single("resume"),
    asyncRoute(async (req: any, res: any) => {
      if (!req.file)
        return res
          .status(400)
          .json({ error: "Choose a PDF, DOCX, or TXT resume." });
      const mimeType = actualType(req.file.buffer);
      if (!mimeType)
        return res.status(415).json({
          error:
            "The file contents are not a supported PDF, DOCX, or text document.",
        });
      let text = "";
      try {
        text = await extractText(req.file.buffer, mimeType);
      } catch {
        return res.status(422).json({
          error:
            "This document appears malformed or could not be safely parsed.",
        });
      }
      if (text.split(/\s+/).filter(Boolean).length < 20)
        return res.status(422).json({
          error:
            "We couldn't extract enough text from this resume. Please upload a text-based PDF or DOCX file.",
        });
      const candidate = await candidateFor(req.user.id);
      await mkdir(storageDir, { recursive: true });
      const storageKey = `${candidate.id}-${randomUUID()}`;
      await writeFile(path.join(storageDir, storageKey), req.file.buffer, {
        flag: "wx",
        mode: 0o600,
      });
      const resume = await prisma.resume.create({
        data: {
          candidateId: candidate.id,
          originalFilename: path.basename(req.file.originalname).slice(0, 180),
          mimeType,
          storageKey,
          fileSize: req.file.size,
          extractedText: text,
          parsingStatus: "PARSED",
        },
      });
      res.status(201).json(serializeResume(resume));
    }),
  );

  router.get(
    "/history",
    asyncRoute(async (req: any, res: any) => {
      const candidate = await candidateFor(req.user.id);
      const rows = await prisma.resumeAnalysis.findMany({
        where: { candidateId: candidate.id },
        include: {
          resume: { select: { originalFilename: true, uploadedAt: true } },
        },
        orderBy: { analyzedAt: "desc" },
      });
      const matches = await prisma.resumeJobMatch.findMany({
        where: { candidateId: candidate.id },
        orderBy: { analyzedAt: "desc" },
      });
      res.json(
        rows.map((row) => ({
          ...serializeAnalysis(row),
          jobMatch: matches.find((m) => m.resumeId === row.resumeId)
            ? serializeMatch(matches.find((m) => m.resumeId === row.resumeId))
            : null,
        })),
      );
    }),
  );

  router.get(
    "/:id",
    asyncRoute(async (req: any, res: any) =>
      res.json(
        serializeResume(
          (await ownedResume(+req.params.id, req.user.id)).resume,
        ),
      ),
    ),
  );
  router.delete(
    "/:id",
    asyncRoute(async (req: any, res: any) => {
      const { resume } = await ownedResume(+req.params.id, req.user.id);
      await prisma.resume.delete({ where: { id: resume.id } });
      await unlink(path.join(storageDir, resume.storageKey)).catch(
        () => undefined,
      );
      res.status(204).end();
    }),
  );

  router.post(
    "/:id/analyze",
    limiter,
    asyncRoute(async (req: any, res: any) => {
      const { candidate, resume } = await ownedResume(
        +req.params.id,
        req.user.id,
      );
      const taxonomy = await prisma.skill.findMany({
        select: { name: true, aliases: true },
      });
      const result = analyzeReadiness(resume.extractedText, taxonomy);
      const analysis = await prisma.resumeAnalysis.create({
        data: {
          resumeId: resume.id,
          candidateId: candidate.id,
          readinessScore: result.score,
          readinessBreakdown: JSON.stringify(result.breakdown),
          extractedSections: JSON.stringify(result.sections),
          detectedSkills: JSON.stringify(result.skills),
          parsingIssues: JSON.stringify(result.issues),
          recommendations: JSON.stringify(result.recommendations),
          algorithmVersion: "ats-readiness-1.0",
          suggestions: {
            create: result.recommendations.map((r) => ({
              category: r.category,
              priority: r.priority,
              suggestedText: r.suggestedText,
              explanation: r.explanation,
            })),
          },
        },
        include: { suggestions: true },
      });
      res.status(201).json(serializeAnalysis(analysis));
    }),
  );

  router.get(
    "/:id/analysis",
    asyncRoute(async (req: any, res: any) => {
      const { resume } = await ownedResume(+req.params.id, req.user.id);
      const analyses = await prisma.resumeAnalysis.findMany({
        where: { resumeId: resume.id },
        include: { suggestions: true },
        orderBy: { analyzedAt: "desc" },
      });
      res.json(analyses.map(serializeAnalysis));
    }),
  );

  router.post(
    "/:id/job-match",
    limiter,
    asyncRoute(async (req: any, res: any) => {
      const input = z
        .object({
          jobId: z.number().int().positive().optional(),
          manualJobDescription: z.string().min(30).max(30_000).optional(),
          jobTitle: z.string().max(120).optional(),
        })
        .refine(
          (v) => v.jobId || v.manualJobDescription,
          "Select a job or paste a job description.",
        )
        .parse(req.body);
      const { candidate, resume } = await ownedResume(
        +req.params.id,
        req.user.id,
      );
      const taxonomy = await prisma.skill.findMany({
        select: { name: true, aliases: true },
      });
      let required: string[] = [],
        preferred: string[] = [],
        jobText = input.manualJobDescription || "",
        jobTitle = input.jobTitle || "Pasted job description";
      if (input.jobId) {
        const job = await prisma.job.findUnique({
          where: { id: input.jobId },
          include: { skills: { include: { skill: true } } },
        });
        if (!job) return res.status(404).json({ error: "Job not found" });
        required = job.skills
          .filter((x) => x.required)
          .map((x) => x.skill.name);
        preferred = job.skills
          .filter((x) => !x.required)
          .map((x) => x.skill.name);
        jobText = `${job.title}\n${job.description}\n${[...required, ...preferred].join(" ")}`;
        jobTitle = job.title;
      } else {
        const detected = extractSkillsFromText(jobText, taxonomy);
        required = detected;
      }
      const educationRequired =
        /\b(degree|diploma|bachelor|master|certification)\b/i.test(jobText);
      const result = analyzeJobAlignment({
        text: resume.extractedText,
        required,
        preferred,
        jobText,
        taxonomy,
        educationRequired,
        jobTitle,
      });
      const match = await prisma.resumeJobMatch.create({
        data: {
          resumeId: resume.id,
          candidateId: candidate.id,
          jobId: input.jobId,
          manualJobDescription: input.manualJobDescription,
          jobTitle,
          jobAlignmentScore: result.score,
          scoreBreakdown: JSON.stringify(result.breakdown),
          matchedSkills: JSON.stringify({
            required: result.matchedRequired,
            preferred: result.matchedPreferred,
            supported: result.supported,
            unclear: result.unclear,
          }),
          missingSkills: JSON.stringify(result.missing),
          recommendations: JSON.stringify(result.recommendations),
          algorithmVersion: "resume-job-match-1.0",
        },
      });
      res.status(201).json(serializeMatch(match));
    }),
  );

  router.get(
    "/:id/job-matches",
    asyncRoute(async (req: any, res: any) => {
      const { resume } = await ownedResume(+req.params.id, req.user.id);
      res.json(
        (
          await prisma.resumeJobMatch.findMany({
            where: { resumeId: resume.id },
            orderBy: { analyzedAt: "desc" },
          })
        ).map(serializeMatch),
      );
    }),
  );

  router.get(
    "/:id/suggestions",
    asyncRoute(async (req: any, res: any) => {
      const { candidate, resume } = await ownedResume(
        +req.params.id,
        req.user.id,
      );
      res.json(
        await prisma.resumeSuggestion.findMany({
          where: {
            analysis: { resumeId: resume.id, candidateId: candidate.id },
          },
          orderBy: { id: "desc" },
        }),
      );
    }),
  );

  router.patch(
    "/suggestions/:id",
    asyncRoute(async (req: any, res: any) => {
      const input = z
        .object({
          status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
          suggestedText: z.string().max(3000).optional(),
        })
        .parse(req.body);
      const candidate = await candidateFor(req.user.id);
      const existing = await prisma.resumeSuggestion.findFirst({
        where: { id: +req.params.id, analysis: { candidateId: candidate.id } },
      });
      if (!existing)
        return res.status(404).json({ error: "Suggestion not found" });
      res.json(
        await prisma.resumeSuggestion.update({
          where: { id: existing.id },
          data: input,
        }),
      );
    }),
  );

  router.post(
    "/:id/import-skills",
    asyncRoute(async (req: any, res: any) => {
      const input = z
        .object({ skills: z.array(z.string()).max(100) })
        .parse(req.body);
      const { candidate, resume } = await ownedResume(
        +req.params.id,
        req.user.id,
      );
      const analysis = await prisma.resumeAnalysis.findFirst({
        where: { resumeId: resume.id },
        orderBy: { analyzedAt: "desc" },
      });
      const allowed = new Set(
        analysis
          ? json<string[]>(analysis.detectedSkills).map(normalizeSkill)
          : [],
      );
      const selected = input.skills.filter((s) =>
        allowed.has(normalizeSkill(s)),
      );
      for (const name of selected) {
        const skill = await prisma.skill.findUnique({
          where: { normalized: normalizeSkill(name) },
        });
        if (skill)
          await prisma.candidateSkill.upsert({
            where: {
              candidateId_skillId: {
                candidateId: candidate.id,
                skillId: skill.id,
              },
            },
            update: {},
            create: {
              candidateId: candidate.id,
              skillId: skill.id,
              level: Level.BEGINNER,
              evidenceType: "Resume mention — unverified",
            },
          });
      }
      res.json({ imported: selected.length });
    }),
  );

  function extractSkillsFromText(
    text: string,
    taxonomy: { name: string; aliases: string }[],
  ) {
    const lower = text.toLowerCase();
    return taxonomy
      .filter((s) =>
        [s.name, ...s.aliases.split(",")]
          .filter(Boolean)
          .some((term) => lower.includes(term.toLowerCase())),
      )
      .map((s) => s.name);
  }

  router.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({
        error: `Resume exceeds the ${Math.round(maxSize / 1024 / 1024)} MB limit.`,
      });
    if (err?.name === "ZodError")
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.issues });
    if (err?.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Resume processing failed safely." });
  });

  return router;
}
