import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, prisma } from "./app.js";
import { csvCell } from "./screening-routes.js";
import { sealScreening, openScreening } from "./screening-private.js";
import { screeningEvidenceSchema } from "@skillbridge/shared";

let owner: any, outsider: any, cookie: string, otherCookie: string, jobId: number, candidateId: number;
const criteria = [{ kind: "requiredSkills", value: "Python", mode: "SCORED", weight: 10 }];
const candidate = { name: "=HYPERLINK(unsafe)", email: "sample@example.test", consent: true, evidence: screeningEvidenceSchema.parse({ skills: ["Python"] }) };
beforeAll(async () => {
  const stamp = `${Date.now()}-${Math.random()}`;
  owner = await prisma.user.create({ data: { name: "Screening test", email: `screen-${stamp}@example.test`, passwordHash: "unused", role: "EMPLOYER", employer: { create: { companyName: "Test only", industry: "Technology", description: "Test" } } } });
  outsider = await prisma.user.create({ data: { name: "Other test", email: `other-${stamp}@example.test`, passwordHash: "unused", role: "EMPLOYER", employer: { create: { companyName: "Other", industry: "Technology", description: "Test" } } } });
  cookie = `sb_session=${jwt.sign({ id: owner.id, role: owner.role }, process.env.SESSION_SECRET!)}`;
  otherCookie = `sb_session=${jwt.sign({ id: outsider.id, role: outsider.role }, process.env.SESSION_SECRET!)}`;
});
afterAll(async () => {
  for (const user of [owner, outsider]) if (user) {
    const employer = await prisma.employer.findUnique({ where: { userId: user.id } });
    if (employer) await prisma.job.deleteMany({ where: { employerId: employer.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
const prefix = "/api/employer/screening";
describe.sequential("Employer screening API", () => {
  it("requires employer authentication", async () => {
    expect((await request(app).get(`${prefix}/jobs`)).status).toBe(401);
    const candidateCookie = `sb_session=${jwt.sign({ id: owner.id, role: "CANDIDATE" }, process.env.SESSION_SECRET!)}`;
    expect((await request(app).get(`${prefix}/jobs`).set("Cookie", candidateCookie)).status).toBe(403);
  });
  it("saves company profile and validates URLs", async () => {
    const data = { companyName: "Test Company", industry: "Technology", companySize: "11–50", logoUrl: "https://example.test/logo.png" };
    expect((await request(app).put(`${prefix}/company`).set("Cookie",cookie).send(data)).status).toBe(200);
    expect((await request(app).put(`${prefix}/company`).set("Cookie",cookie).send({ ...data, logoUrl: "javascript:alert(1)" })).status).toBe(400);
  });
  it("creates job criteria and protects ownership", async () => {
    const response = await request(app).post(`${prefix}/jobs`).set("Cookie",cookie).send({ title: "Test Analyst", description: "Analyze data with Python for this test role.", location: "KL", criteria });
    expect(response.status).toBe(201); jobId = response.body.id;
    expect((await request(app).get(`${prefix}/jobs/${jobId}`).set("Cookie",otherCookie)).status).toBe(404);
    expect((await request(app).put(`${prefix}/jobs/${jobId}`).set("Cookie",otherCookie).send({})).status).toBe(404);
  });
  it("stores encrypted candidate data and scores it", async () => {
    const response = await request(app).post(`${prefix}/jobs/${jobId}/candidates`).set("Cookie",cookie).send(candidate);
    expect(response.status).toBe(201); candidateId = response.body.id;
    expect(response.body.result.score).toBe(100); expect(response.body.status).toBe("Shortlist");
    const saved = await prisma.screeningCandidate.findUniqueOrThrow({ where: { id: candidateId } });
    expect(saved.payload).not.toContain(candidate.name); expect(saved.payload).not.toContain(candidate.email);
    expect((await request(app).post(`${prefix}/jobs/${jobId}/candidates`).set("Cookie",cookie).send({ ...candidate, consent: false })).status).toBe(400);
  });
  it("enforces tenant boundaries on detail, updates, export and deletion", async () => {
    expect((await request(app).get(`${prefix}/candidates/${candidateId}`).set("Cookie",otherCookie)).status).toBe(404);
    expect((await request(app).patch(`${prefix}/candidates/${candidateId}`).set("Cookie",otherCookie).send({ notes: "bad" })).status).toBe(404);
    expect((await request(app).delete(`${prefix}/candidates/${candidateId}`).set("Cookie",otherCookie)).status).toBe(404);
    expect((await request(app).get(`${prefix}/jobs/${jobId}/shortlist.csv`).set("Cookie",otherCookie)).status).toBe(404);
  });
  it("exports CSV safely and records human overrides and stages", async () => {
    const csv = await request(app).get(`${prefix}/jobs/${jobId}/shortlist.csv`).set("Cookie",cookie);
    expect(csv.status).toBe(200); expect(csv.text).toContain("'=HYPERLINK"); expect(csv.headers["cache-control"]).toBe("no-store");
    expect((await request(app).patch(`${prefix}/candidates/${candidateId}`).set("Cookie",cookie).send({ override: "Reject" })).status).toBe(400);
    const updated = await request(app).patch(`${prefix}/candidates/${candidateId}`).set("Cookie",cookie).send({ override: "Maybe", overrideReason: "Need interview evidence", notes: "Call next week", stage: "PHONE_SCREEN" });
    expect(updated.status).toBe(200); expect(updated.body.status).toBe("Maybe"); expect(updated.body.result.recommendation).toBe("Shortlist"); expect(updated.body.history).toHaveLength(1);
    expect((await request(app).get(`${prefix}/jobs/${jobId}/shortlist.csv`).set("Cookie",cookie)).text).not.toContain("HYPERLINK");
  });
  it("recomputes suggestions when evidence changes and preserves overrides", async () => {
    const response = await request(app).patch(`${prefix}/candidates/${candidateId}`).set("Cookie",cookie).send({ evidence: screeningEvidenceSchema.parse({}) });
    expect(response.status).toBe(200); expect(response.body.result.score).toBe(0); expect(response.body.override).toBe("Maybe");
  });
  it("parses only professional sections and rejects invalid uploads", async () => {
    const contents = "Name: Test Person\nGender: female\nNationality: fictional\nSkills\nPython, SQL\nExperience\nWorked on analytical projects with a team to deliver reports and improve data quality every month.";
    const response = await request(app).post(`${prefix}/parse-resume`).set("Cookie",cookie).attach("resume",Buffer.from(contents),"resume.txt");
    expect(response.status).toBe(200); expect(response.body.evidence.skills).toEqual(["Python","SQL"]); expect(response.body.evidence.authorized).toBeNull();
    expect((await request(app).post(`${prefix}/parse-resume`).set("Cookie",cookie).attach("resume",Buffer.from([0,1,2,3]),"bad.pdf")).status).toBe(415);
    expect((await request(app).post(`${prefix}/parse-resume`).set("Cookie",cookie).attach("resume",Buffer.alloc(4*1024*1024+1),"huge.txt")).status).toBe(400);
  });
  it("deletes all screening payload and review data", async () => {
    expect((await request(app).delete(`${prefix}/candidates/${candidateId}`).set("Cookie",cookie)).status).toBe(204);
    expect(await prisma.screeningCandidate.findUnique({ where: { id: candidateId } })).toBeNull();
    expect((await request(app).get(`${prefix}/candidates/${candidateId}`).set("Cookie",cookie)).status).toBe(404);
  });
  it("authenticates encrypted payloads and escapes CSV edge cases", () => {
    const encrypted = sealScreening({ notes: "private" }); expect(openScreening(encrypted)).toEqual({ notes: "private" });
    const parts = encrypted.split("."); parts[3] = Buffer.from("tampered").toString("base64"); expect(() => openScreening(parts.join("."))).toThrow();
    expect(csvCell('a,"b"')).toBe('"a,""b"""'); expect(csvCell("\t=1+1")).toContain("'");
  });
});
