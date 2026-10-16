import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph } from "docx";
import { app } from "./app.js";

const content = `Aina Rahman\naina@example.com +60123456789 github.com/aina\nProfessional Summary\nData graduate.\nSkills\nPython SQL Communication\nEducation\nBachelor degree 2026\nProjects\n- Built a Python dashboard using SQL.\n- Presented findings to peers.\n- Documented the project outcomes and methods.`;
let candidateCookie = "",
  employerCookie = "";
const createdIds: number[] = [];

beforeAll(async () => {
  const candidate = await request(app)
    .post("/api/auth/login")
    .send({ email: "candidate@skillbridge.demo", password: "Demo123!" });
  const employer = await request(app)
    .post("/api/auth/login")
    .send({ email: "employer@skillbridge.demo", password: "Demo123!" });
  candidateCookie = candidate.headers["set-cookie"][0];
  employerCookie = employer.headers["set-cookie"][0];
});
afterAll(async () => {
  for (const id of createdIds)
    await request(app)
      .delete(`/api/resume/${id}`)
      .set("Cookie", candidateCookie);
});

async function pdfBuffer() {
  return new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument();
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.text(content);
    doc.end();
  });
}
async function docxBuffer() {
  return Packer.toBuffer(
    new Document({
      sections: [
        { children: content.split("\n").map((text) => new Paragraph(text)) },
      ],
    }),
  );
}

describe("resume API", () => {
  it("blocks employers and unauthenticated users", async () => {
    expect((await request(app).get("/api/resume")).status).toBe(401);
    expect(
      (await request(app).get("/api/resume").set("Cookie", employerCookie))
        .status,
    ).toBe(403);
  });
  it("rejects invalid, oversized, corrupt, and textless documents", async () => {
    expect(
      (
        await request(app)
          .post("/api/resume/upload")
          .set("Cookie", candidateCookie)
          .attach("resume", Buffer.from([0, 1, 2, 3]), "malware.exe")
      ).status,
    ).toBe(415);
    expect(
      (
        await request(app)
          .post("/api/resume/upload")
          .set("Cookie", candidateCookie)
          .attach("resume", Buffer.alloc(5 * 1024 * 1024 + 10, 65), "huge.txt")
      ).status,
    ).toBe(413);
    expect(
      (
        await request(app)
          .post("/api/resume/upload")
          .set("Cookie", candidateCookie)
          .attach("resume", Buffer.from("%PDF-broken"), "broken.pdf")
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/resume/upload")
          .set("Cookie", candidateCookie)
          .attach("resume", Buffer.from("short text"), "short.txt")
      ).status,
    ).toBe(422);
  });
  it("uploads real PDF and DOCX documents", async () => {
    const pdf = await request(app)
      .post("/api/resume/upload")
      .set("Cookie", candidateCookie)
      .attach("resume", await pdfBuffer(), "resume.pdf");
    const docx = await request(app)
      .post("/api/resume/upload")
      .set("Cookie", candidateCookie)
      .attach("resume", await docxBuffer(), "resume.docx");
    expect(pdf.status).toBe(201);
    createdIds.push(pdf.body.id);
    expect(pdf.body.extractedText).toContain("Python");
    expect(docx.status).toBe(201);
    createdIds.push(docx.body.id);
    expect(docx.body.extractedText).toContain("Projects");
  });
  it("completes analyze, match, history, ownership, and deletion flow", async () => {
    const uploaded = await request(app)
      .post("/api/resume/upload")
      .set("Cookie", candidateCookie)
      .attach("resume", Buffer.from(content), "resume.txt");
    const id = uploaded.body.id;
    const analysis = await request(app)
      .post(`/api/resume/${id}/analyze`)
      .set("Cookie", candidateCookie)
      .send({});
    expect(analysis.status).toBe(201);
    expect(analysis.body.detectedSkills).toContain("Python");
    const jobs = await request(app).get("/api/jobs");
    const target = jobs.body.find(
      (x: any) => x.title === "Junior Data Analyst",
    );
    const match = await request(app)
      .post(`/api/resume/${id}/job-match`)
      .set("Cookie", candidateCookie)
      .send({ jobId: target.id });
    expect(match.status).toBe(201);
    expect(match.body.missingSkills).toContain("Excel");
    const history = await request(app)
      .get("/api/resume/history")
      .set("Cookie", candidateCookie);
    expect(history.body.some((x: any) => x.resumeId === id)).toBe(true);
    expect(
      (
        await request(app)
          .get(`/api/resume/${id}`)
          .set("Cookie", employerCookie)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .delete(`/api/resume/${id}`)
          .set("Cookie", candidateCookie)
      ).status,
    ).toBe(204);
    expect(
      (
        await request(app)
          .get(`/api/resume/${id}`)
          .set("Cookie", candidateCookie)
      ).status,
    ).toBe(404);
  });
});
