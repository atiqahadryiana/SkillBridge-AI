export type ProviderSearch = {
  keyword?: string;
  location?: string;
  minSalary?: number;
  page: number;
  limit: number;
};

export type NormalizedExternalJob = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  state?: string;
  country: string;
  workArrangement?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryText?: string;
  descriptionSnippet: string;
  externalUrl: string;
  postedAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  sourceStatus: "LIVE" | "CACHED" | "STALE" | "DEMO";
  isDemo: boolean;
};

export type ProviderStatus = {
  id: string;
  name: string;
  enabled: boolean;
  authorizationStatus: "AUTHORIZED" | "PENDING" | "DISABLED" | "SUSPENDED";
  message: string;
};

export type ProviderResult = {
  jobs: NormalizedExternalJob[];
  total: number;
  cacheHit?: boolean;
};

export interface JobProvider<TRaw = unknown> {
  readonly id: string;
  readonly name: string;
  searchJobs(input: ProviderSearch): Promise<ProviderResult>;
  normalizeJob(raw: TRaw): NormalizedExternalJob;
  validateJob(job: NormalizedExternalJob): boolean;
  getSourceStatus(): ProviderStatus;
  checkAvailability(): Promise<boolean>;
}
