import { describe, expect, it } from "vitest";
import { screenCandidate, screeningEvidenceSchema, screeningCriteriaSchema, type ScreeningCriterion } from "./index.js";
const skill: ScreeningCriterion = { kind: "requiredSkills", value: "Python, SQL", mode: "SCORED", weight: 40 };
const experience: ScreeningCriterion = { kind: "experience", value: "2", mode: "KNOCKOUT", weight: 1 };
const evidence = (values: Record<string, unknown> = {}) => screeningEvidenceSchema.parse(values);
describe("employer screening", () => {
  it("scores documented terms and exposes missing evidence", () => {
    const result = screenCandidate([skill], evidence({ skills: ["Python"] }));
    expect(result.score).toBe(50); expect(result.recommendation).toBe("Maybe");
    expect(result.checklist[0].missing).toEqual(["SQL"]); expect(result.checklist[0].status).toBe("Partial");
  });
  it("distinguishes unknown experience from explicit zero", () => {
    expect(screenCandidate([experience], evidence()).recommendation).toBe("Maybe");
    const failed = screenCandidate([experience], evidence({ experienceYears: 0 }));
    expect(failed.checklist[0].status).toBe("Fail"); expect(failed.recommendation).toBe("Reject"); expect(failed.score).toBeNull();
  });
  it("does not equate an absent qualification with a confirmed failure", () => {
    expect(screenCandidate([{ ...experience, kind: "degree", value: "BSc" }], evidence()).knockoutFailed).toBe(false);
  });
  it("normalizes weights and aliases", () => {
    const result = screenCandidate([{ ...skill, value: "JavaScript", weight: 3 }, { kind: "notice", value: "30", mode: "SCORED", weight: 1 }], evidence({ skills: ["JS"], noticeDays: 40 }));
    expect(result.score).toBe(75); expect(result.recommendation).toBe("Shortlist");
  });
  it("excludes demographic and identity fields", () => {
    const a = { ...evidence({ skills: ["Python", "SQL"] }), name: "A", age: 21, gender: "female", nationality: "A", photo: "a" };
    const b = { ...a, name: "B", age: 65, gender: "male", nationality: "B", photo: "b" };
    expect(screenCandidate([skill], a)).toEqual(screenCandidate([skill], b));
  });
  it("never infers authorization from nationality", () => {
    const result = screenCandidate([{ ...experience, kind: "authorization", value: "required" }], evidence({ nationality: "Malaysia" }));
    expect(result.checklist[0].status).toBe("Partial");
  });
  it("handles salary and notice boundaries, including zero", () => {
    const criteria: ScreeningCriterion[] = [{ kind: "salary", value: "3000-5000", mode: "SCORED", weight: 1 }, { kind: "notice", value: "0", mode: "SCORED", weight: 1 }];
    expect(screenCandidate(criteria, evidence({ salaryExpectation: 5000, noticeDays: 0 })).score).toBe(100);
    expect(screenCandidate(criteria, evidence({ salaryExpectation: 5001, noticeDays: 1 })).score).toBe(0);
  });
  it("rejects invalid criteria, duplicate kinds and protected terms", () => {
    for (const rows of [[], [skill, skill], [{ ...skill, value: ", ," }], [{ ...skill, weight: 0 }], [{ ...skill, value: "male" }], [{ ...experience, value: "NaN" }], [{ ...skill, kind: "salary", value: "5000-3000" }]]) expect(screeningCriteriaSchema.safeParse(rows).success).toBe(false);
  });
});
