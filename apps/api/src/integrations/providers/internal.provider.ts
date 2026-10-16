import type { PrismaClient } from "@prisma/client";

export class InternalProvider {
  readonly id = "internal";
  readonly name = "SkillBridge AI";
  constructor(private prisma: PrismaClient) {}
  getSourceStatus() { return { id: this.id, name: this.name, enabled: true, authorizationStatus: "AUTHORIZED" as const, message: "First-party employer postings." }; }
  async checkAvailability() { return true; }
  async searchJobs(input: { keyword?: string; location?: string; page: number; limit: number }) {
    const where = {
      published: true,
      AND: [
        input.keyword ? { OR: [{ title: { contains: input.keyword } }, { description: { contains: input.keyword } }, { industry: { contains: input.keyword } }] } : {},
        input.location ? { location: { contains: input.location } } : {},
      ],
    };
    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({ where, include: { employer: true, skills: { include: { skill: true } } }, skip: (input.page - 1) * input.limit, take: input.limit, orderBy: { createdAt: "desc" } }),
      this.prisma.job.count({ where }),
    ]);
    return { jobs, total };
  }
}
