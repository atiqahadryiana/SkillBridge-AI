import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { screeningEvidenceSchema, type ScreeningCriterion } from "@skillbridge/shared";
import { sealScreening } from "../src/screening-private.js";

const prisma = new PrismaClient();
async function main() {
  const employer = await prisma.employer.findFirst({ where: { user: { email: "employer@skillbridge.demo" } } });
  if (!employer) throw new Error("Demo employer missing. Set up base demo accounts first with npm run db:setup (resets demo data).");
  const title = "Demo: Junior Data Analyst screening";
  if (await prisma.job.findFirst({ where: { employerId: employer.id, title } })) {
    console.log("Screening demo already exists; leaving all reviews unchanged."); return;
  }
  const criteria: ScreeningCriterion[] = [
    { kind: "degree", value: "BSc Computer Science", mode: "KNOCKOUT", weight: 10 },
    { kind: "experience", value: "1", mode: "KNOCKOUT", weight: 10 },
    { kind: "authorization", value: "required", mode: "KNOCKOUT", weight: 10 },
    { kind: "requiredSkills", value: "Python, SQL", mode: "SCORED", weight: 40 },
    { kind: "niceSkills", value: "Power BI", mode: "SCORED", weight: 10 },
    { kind: "salary", value: "3000-5000", mode: "SCORED", weight: 20 },
    { kind: "notice", value: "30", mode: "SCORED", weight: 10 },
  ];
  const full = screeningEvidenceSchema.parse({ degrees: ["BSc Computer Science"], skills: ["Python", "SQL", "Power BI"], experienceYears: 2, authorized: true, location: "Kuala Lumpur", salaryExpectation: 4200, noticeDays: 14 });
  const samples = [
    { name: "Demo candidate A", evidence: full },
    { name: "Demo candidate B", evidence: { ...full, skills: ["SQL"], authorized: null, noticeDays: null } },
    { name: "Demo candidate C", evidence: { ...full, experienceYears: 0, salaryExpectation: 6000 } },
  ];
  // Prepare encryption before any writes so a missing key cannot leave a partial demo.
  const payloads = samples.map((sample) => sealScreening({ ...sample, email: "", consent: true, notes: "Fictional sample for testing only.", overrideReason: "", history: [] }));
  await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({ data: { employerId: employer.id, title, description: "Fictional demonstration role. Analyze datasets using Python, SQL and Power BI.", location: "Kuala Lumpur", industry: "Technology", arrangement: "HYBRID", employmentType: "FULL_TIME", published: false, screeningCriteria: JSON.stringify(criteria) } });
    for (const payload of payloads) await tx.screeningCandidate.create({ data: { jobId: job.id, payload, isDemo: true } });
  });
  console.log("Added fictional screening job and three candidates: Shortlist, Maybe, Reject (advisory). Existing data was preserved.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
