import type { JobProvider, NormalizedExternalJob, ProviderSearch } from "../types/job-provider.types.js";

export class PendingProvider implements JobProvider {
  constructor(public readonly id: string, public readonly name: string, private baseUrl: string) {}
  async searchJobs(_input: ProviderSearch) { return { jobs: [], total: 0 }; }
  normalizeJob(_raw: unknown): NormalizedExternalJob { throw new Error("Integration pending authorization"); }
  validateJob(_job: NormalizedExternalJob) { return false; }
  getSourceStatus() {
    return { id: this.id, name: this.name, enabled: false, authorizationStatus: "PENDING" as const, message: "Integration Pending — authorized data access has not been confirmed." };
  }
  async checkAvailability() { return false; }
  get url() { return this.baseUrl; }
}
