import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createResumeRouter } from "./resume-routes.js";
import {
  createExternalApplicationRouter,
  createJobSourceAdminRouter,
  createOpportunityRouter,
} from "./opportunity-routes.js";
import { PrismaClient, Role } from "@prisma/client";
import {
  calculateMatch,
  jobSchema,
  loginSchema,
  normalizeSkill,
  registerSchema,
  skillSchema,
} from "@skillbridge/shared";
export const prisma = new PrismaClient();
const secret = process.env.SESSION_SECRET || "dev-secret";
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: Role };
    }
  }
}
export const asyncRoute = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const auth = (roles?: Role[]) =>
  asyncRoute(async (req: any, res: any, next: any) => {
    const token = req.cookies.sb_session;
    if (!token)
      return res.status(401).json({ error: "Authentication required" });
    try {
      req.user = jwt.verify(token, secret);
      if (roles && !roles.includes(req.user.role))
        return res.status(403).json({ error: "Insufficient permission" });
      next();
    } catch {
      return res.status(401).json({ error: "Invalid session" });
    }
  });
async function ensureSkill(name: string, category = "General") {
  const normalized = normalizeSkill(name);
  return prisma.skill.upsert({
    where: { normalized },
    update: {},
    create: { name, normalized, category },
  });
}
export const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.get("/api/health", (_q, r) => r.json({ ok: true }));
app.post(
  "/api/auth/register",
  rateLimit({ windowMs: 60000, limit: 10 }),
  asyncRoute(async (req: any, res: any) => {
    const data = registerSchema.parse(req.body);
    if (
      await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      })
    )
      return res.status(409).json({ error: "Email already registered" });
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        candidate: data.role === "CANDIDATE" ? { create: {} } : undefined,
        employer:
          data.role === "EMPLOYER"
            ? {
                create: {
                  companyName: `${data.name}'s company`,
                  industry: "Technology",
                  description: "Fictional demonstration employer",
                },
              }
            : undefined,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    res.cookie(
      "sb_session",
      jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: "7d" }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 604800000,
      },
    );
    res.status(201).json(user);
  }),
);
app.post(
  "/api/auth/login",
  rateLimit({ windowMs: 60000, limit: 10 }),
  asyncRoute(async (req: any, res: any) => {
    const data = loginSchema.parse(req.body);
    const u = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!u || !(await bcrypt.compare(data.password, u.passwordHash)))
      return res.status(401).json({ error: "Invalid email or password" });
    res.cookie(
      "sb_session",
      jwt.sign({ id: u.id, role: u.role }, secret, { expiresIn: "7d" }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 604800000,
      },
    );
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
  }),
);
app.post("/api/auth/logout", (_q, r) => {
  r.clearCookie("sb_session");
  r.status(204).end();
});
app.get(
  "/api/auth/me",
  auth(),
  asyncRoute(async (req: any, res: any) =>
    res.json(
      await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true },
      }),
    ),
  ),
);
app.get(
  "/api/jobs",
  asyncRoute(async (req: any, res: any) => {
    const q = String(req.query.q || "");
    res.json(
      await prisma.job.findMany({
        where: {
          published: true,
          OR: q
            ? [
                { title: { contains: q } },
                { location: { contains: q } },
                { industry: { contains: q } },
              ]
            : undefined,
        },
        include: {
          employer: { select: { companyName: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
app.get(
  "/api/jobs/:id",
  asyncRoute(async (req: any, res: any) => {
    const j = await prisma.job.findUnique({
      where: { id: +req.params.id },
      include: {
        employer: { select: { companyName: true } },
        skills: { include: { skill: true } },
      },
    });
    if (!j) return res.status(404).json({ error: "Job not found" });
    res.json(j);
  }),
);
app.get(
  "/api/candidate/profile",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) =>
    res.json(
      await prisma.candidate.findUnique({
        where: { userId: req.user.id },
        include: { skills: { include: { skill: true } } },
      }),
    ),
  ),
);
app.patch(
  "/api/candidate/profile",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const allowed = [
      "headline",
      "location",
      "bio",
      "discoverable",
      "preferredRoles",
      "preferredLocations",
      "arrangements",
    ];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );
    res.json(
      await prisma.candidate.update({ where: { userId: req.user.id }, data }),
    );
  }),
);
app.post(
  "/api/candidate/skills",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const data = skillSchema.parse(req.body),
      candidate = await prisma.candidate.findUniqueOrThrow({
        where: { userId: req.user.id },
      }),
      skill = await ensureSkill(data.name, data.category);
    res.status(201).json(
      await prisma.candidateSkill.upsert({
        where: {
          candidateId_skillId: {
            candidateId: candidate.id,
            skillId: skill.id,
          },
        },
        update: {
          level: data.level,
          evidenceType: data.evidenceType,
          evidenceUrl: data.evidenceUrl,
        },
        create: {
          candidateId: candidate.id,
          skillId: skill.id,
          level: data.level,
          evidenceType: data.evidenceType,
          evidenceUrl: data.evidenceUrl,
        },
        include: { skill: true },
      }),
    );
  }),
);
app.delete(
  "/api/candidate/skills/:id",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const c = await prisma.candidate.findUniqueOrThrow({
      where: { userId: req.user.id },
    });
    await prisma.candidateSkill.deleteMany({
      where: { id: +req.params.id, candidateId: c.id },
    });
    res.status(204).end();
  }),
);
app.get(
  "/api/candidate/matches",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const c = await prisma.candidate.findUniqueOrThrow({
        where: { userId: req.user.id },
        include: { skills: { include: { skill: true } } },
      }),
      jobs = await prisma.job.findMany({
        where: { published: true },
        include: { employer: true, skills: { include: { skill: true } } },
      });
    res.json(
      jobs
        .map((job) => ({
          job,
          match: calculateMatch({
            candidateSkills: c.skills.map((x) => ({
              name: x.skill.name,
              level: x.level,
            })),
            requiredSkills: job.skills
              .filter((x) => x.required)
              .map((x) => ({ name: x.skill.name, level: x.level })),
            preferredSkills: job.skills
              .filter((x) => !x.required)
              .map((x) => ({ name: x.skill.name, level: x.level })),
            candidatePreferences: {
              arrangements: c.arrangements.split(",").filter(Boolean),
              locations: c.preferredLocations.split(",").filter(Boolean),
            },
            job: { arrangement: job.arrangement, location: job.location },
          }),
        }))
        .sort((a, b) => b.match.score - a.match.score),
    );
  }),
);
app.post(
  "/api/jobs/:id/apply",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const c = await prisma.candidate.findUniqueOrThrow({
      where: { userId: req.user.id },
    });
    try {
      res.status(201).json(
        await prisma.application.create({
          data: {
            candidateId: c.id,
            jobId: +req.params.id,
            coverNote: req.body.coverNote,
          },
        }),
      );
    } catch {
      return res
        .status(409)
        .json({ error: "You already applied to this role" });
    }
  }),
);
app.get(
  "/api/candidate/applications",
  auth(["CANDIDATE"]),
  asyncRoute(async (req: any, res: any) => {
    const c = await prisma.candidate.findUniqueOrThrow({
      where: { userId: req.user.id },
    });
    res.json(
      await prisma.application.findMany({
        where: { candidateId: c.id },
        include: { job: { include: { employer: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
app.post(
  "/api/employer/jobs",
  auth(["EMPLOYER"]),
  asyncRoute(async (req: any, res: any) => {
    const data = jobSchema.parse(req.body),
      e = await prisma.employer.findUniqueOrThrow({
        where: { userId: req.user.id },
      }),
      job = await prisma.job.create({
        data: {
          employerId: e.id,
          title: data.title,
          description: data.description,
          location: data.location,
          arrangement: data.arrangement,
          employmentType: data.employmentType,
          industry: data.industry,
          salary: data.salary,
        },
      });
    for (const r of data.requirements) {
      const s = await ensureSkill(r.name);
      await prisma.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: s.id,
          level: r.level,
          required: r.required,
        },
      });
    }
    res.status(201).json(job);
  }),
);
app.get(
  "/api/employer/dashboard",
  auth(["EMPLOYER"]),
  asyncRoute(async (req: any, res: any) => {
    const e = await prisma.employer.findUniqueOrThrow({
      where: { userId: req.user.id },
    });
    const jobs = await prisma.job.findMany({
      where: { employerId: e.id },
      include: {
        skills: { include: { skill: true } },
        applications: {
          include: {
            candidate: {
              include: { user: true, skills: { include: { skill: true } } },
            },
          },
        },
      },
    });
    res.json({
      jobs,
      applications: jobs.flatMap((j) =>
        j.applications.map((a) => ({ ...a, jobTitle: j.title })),
      ),
    });
  }),
);
app.get(
  "/api/impact",
  asyncRoute(async (_q: any, res: any) => {
    const [profiles, matches, learning, applications] = await Promise.all([
      prisma.candidate.count(),
      prisma.candidate
        .count()
        .then(async (c) => c * (await prisma.job.count())),
      prisma.learningProgress.count(),
      prisma.application.count(),
    ]);
    res.json({ profiles, matches, learning, applications, demo: true });
  }),
);
app.use("/api/resume", createResumeRouter({ prisma, auth, asyncRoute }));
app.use(
  "/api/opportunities",
  createOpportunityRouter({ prisma, auth, asyncRoute }),
);
app.use(
  "/api/external-applications",
  createExternalApplicationRouter({ prisma, auth, asyncRoute }),
);
app.use(
  "/api/admin",
  createJobSourceAdminRouter({ prisma, auth, asyncRoute }),
);
app.use((err: any, _q: any, res: any, _n: any) => {
  if (err?.name === "ZodError")
    return res
      .status(400)
      .json({ error: "Validation failed", details: err.issues });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});
