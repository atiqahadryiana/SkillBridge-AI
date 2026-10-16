import type { PrismaClient } from "@prisma/client";
import { JoobleProvider } from "../providers/jooble.provider.js";
import { PendingProvider } from "../providers/pending.provider.js";

export const joobleProvider = new JoobleProvider();
export const pendingProviders = [
  new PendingProvider("jobstreet", "JobStreet Malaysia", "https://www.jobstreet.com.my"),
  new PendingProvider("maukerja", "Maukerja", "https://www.maukerja.my"),
  new PendingProvider("graduan", "GRADUAN", "https://graduan.com"),
  new PendingProvider("myfuturejobs", "MYFutureJobs", "https://www.myfuturejobs.gov.my"),
  new PendingProvider("employer-feed", "Authorized employer feeds", ""),
];

export async function ensureJobSources(prisma: PrismaClient) {
  const statuses = [joobleProvider.getSourceStatus(), ...pendingProviders.map((p) => p.getSourceStatus())];
  for (const status of statuses) {
    const pending = pendingProviders.find((p) => p.id === status.id);
    await prisma.jobSource.upsert({
      where: { name: status.name },
      update: { providerType: status.id, isEnabled: status.enabled, authorizationStatus: status.authorizationStatus },
      create: { name: status.name, providerType: status.id, baseUrl: pending?.url || (status.id === "jooble" ? "https://my.jooble.org" : null), isEnabled: status.enabled, authorizationStatus: status.authorizationStatus },
    });
  }
  return statuses;
}
