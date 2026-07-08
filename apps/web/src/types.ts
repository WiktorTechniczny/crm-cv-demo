import type { CandidateListItem } from "@amg/shared";

export type Candidate = CandidateListItem;

export interface CandidateListMeta {
  total: number;
  returned: number;
  limit: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sourceCounts: Record<string, number>;
  newCount: number;
  rawColumns: string[];
}

export interface CandidateListResponse {
  data: Candidate[];
  meta: CandidateListMeta;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminUser extends User {
  createdAt: string;
  updatedAt: string;
  ownedApplications: number;
  auditLogs: number;
  notes: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthConfig {
  allowPublicRegistration: boolean;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  entityType?: string;
  entityId?: string;
  fieldName: string;
  previousValue: string | null;
  nextValue: string | null;
  createdAt: string;
}

export interface CandidateNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface CandidateDocumentUpload {
  id: string;
  fileName: string;
  mimeType: string | null;
  storageKey: string | null;
  checksum: string | null;
  extractedChars: number;
  extractedEmail?: string;
  extractedPhone?: string;
  aiNote?: string;
  keywords?: string[];
}

export interface CandidateFilterOptions {
  companies: Array<{ id: string; name: string }>;
  companyFilters: Array<{ id: string; name: string }>;
  jobs: Array<{
    id: string;
    title: string;
    city: string | null;
    source: string;
    portalJobId: string | null;
    sourceFile: string | null;
    sourceSheet: string | null;
    listingTitles: string[];
    companyName: string | null;
  }>;
  jobTitles: Array<{ value: string; label: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  statuses: string[];
  stages: string[];
  cities: string[];
  voivodeships: string[];
}

export interface SyncRun {
  id: string;
  connectionId: string | null;
  connectionName?: string | null;
  source: string;
  status: string;
  imported: number;
  updated: number;
  failed: number;
  message: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
}

export interface DailySyncSummary {
  generatedAt: string;
  window: {
    start: string;
    endExclusive: string;
    lookbackDays: number;
  };
  totals: {
    applications: number;
    withOpenableCv: number;
    withoutOpenableCv: number;
    withReadableText: number;
    withAiNote: number;
    openableWithoutAiNote: number;
  };
  bySourceCompany: Array<{
    source: string;
    companyName: string;
    count: number;
  }>;
  bySource: Array<{
    source: string;
    label: string;
    count: number;
  }>;
  sources: Array<{
    source: string;
    status: string;
    imported: number;
    updated: number;
    failed: number;
    message: string | null;
    finishedAt: string | null;
    createdAt: string | null;
  }>;
  toast: {
    kind: "success" | "warning" | "error" | "info";
    title: string;
    body: string;
  };
}

export interface PortalConnection {
  id: string;
  source: "PRACUJ" | "OLX";
  name: string;
  companyName: string | null;
  accountEmail: string | null;
  panelSyncEnabled: boolean;
  panelProfileDir: string | null;
  panelLastImportedAt: string | null;
  panelLastStatus: string | null;
  apiUrl: string | null;
  jobsApiUrl: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  hasWebhookSecret: boolean;
  enabled: boolean;
  lastCursor: string | null;
  jobsLastCursor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalProbeSample {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  companyName: string | null;
  jobTitle: string | null;
  status: string | null;
  stage: string | null;
  appliedAt: string | null;
  sourceExternalId: string | null;
  portalJobId: string | null;
  documentName: string | null;
  hasDocumentUrl: boolean;
  rawFieldKeys: string[];
  missing: string[];
}

export interface PortalProbeResult {
  connectionId: string;
  source: "PRACUJ" | "OLX";
  adapterName: string;
  jobsSeen: number;
  jobSampleCount: number;
  jobSamples: Array<{
    portalJobId: string | null;
    title: string | null;
    city: string | null;
    companyName: string | null;
    url: string | null;
    rawFieldKeys: string[];
    missing: string[];
  }>;
  applicationsSeen: number;
  sampleCount: number;
  nextCursor: string | null;
  quality: {
    readyForImport: boolean;
    samplesChecked: number;
    samplesWithExternalId: number;
    samplesWithPortalJobId: number;
    samplesWithDocumentUrl: number;
    samplesWithContact: number;
    warnings: string[];
  };
  samples: PortalProbeSample[];
}

export interface DataQualityGroup {
  key: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  phone: string | null;
  source: string;
  sourceExternalId: string | null;
  jobId: string | null;
  jobTitle: string | null;
  companyName: string | null;
  count: number;
  latestAppliedAt: string | null;
  applicationIds: string[];
}

export interface MultiApplicationCandidate {
  candidateId: string;
  candidateName: string;
  email: string | null;
  phone: string | null;
  applicationCount: number;
  distinctJobs: number;
  distinctSources: number;
  latestAppliedAt: string | null;
  jobs: string[];
}

export interface SharedContactGroup {
  key: string;
  type: "email" | "phone";
  value: string;
  candidateCount: number;
  applicationCount: number;
  candidateNames: string[];
}

export interface DataQualityReport {
  totals: {
    applications: number;
    candidates: number;
    applicationsWithoutJob: number;
    applicationsWithoutSourceExternalId: number;
    suspectedDuplicateGroups: number;
    multiApplicationCandidates: number;
    sharedContactGroups: number;
  };
  suspectedDuplicateApplications: DataQualityGroup[];
  multiApplicationCandidates: MultiApplicationCandidate[];
  sharedContactCandidates: SharedContactGroup[];
}

export interface JobCvReport {
  generatedAt: string;
  jobTitle: string;
  totalCv: number;
  uniqueCv: number;
  duplicateCvSkipped: number;
  renewableEnergyUniqueCv: number;
  renewableEnergyShare: number;
  bySource: Array<{ label: string; count: number }>;
  byCompany: Array<{ label: string; count: number }>;
  summary: string;
  methodology: string[];
}

export interface JobSummary {
  id: string;
  title: string;
  city: string | null;
  source: string;
  portalJobId: string | null;
  url: string | null;
  sourceFile: string | null;
  sourceSheet: string | null;
  listingTitles: string[];
  companyName: string | null;
  applicationsCount: number;
  latestApplicationAt: string | null;
  latestApplications: Array<{
    id: string;
    candidateId: string;
    candidateName: string;
    candidateCity: string | null;
    status: string | null;
    stage: string | null;
    appliedAt: string;
  }>;
  statusCounts: Record<string, number>;
  stageCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface JobListMeta {
  totalApplications: number;
  unassignedApplications: number;
}

export interface JobListResponse {
  data: JobSummary[];
  meta: JobListMeta;
}
