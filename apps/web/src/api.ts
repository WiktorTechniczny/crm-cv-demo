import type {
  AdminUser,
  AuditLog,
  AuthConfig,
  AuthResponse,
  Candidate,
  CandidateListResponse,
  CandidateDocumentUpload,
  CandidateFilterOptions,
  CandidateNote,
  DataQualityReport,
  DailySyncSummary,
  JobCvReport,
  JobListResponse,
  PortalConnection,
  PortalProbeResult,
  SyncRun
} from "./types.js";
import {
  demoAddNote,
  demoAdminUsers,
  demoAudit,
  demoAuthConfig,
  demoCandidates,
  demoDailySyncSummary,
  demoDataQuality,
  demoDocumentUpload,
  demoFilterOptions,
  demoJobs,
  demoLogin,
  demoManagerReport,
  demoMe,
  demoNotes,
  demoPortalConnections,
  demoProbe,
  demoStartSync,
  demoSyncRuns,
  demoUpdateApplication
} from "./demoData.js";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const AUTH_TOKEN_KEY = "amg_token";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

export function getToken() {
  if (DEMO_MODE) return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? "preview-token";
  localStorage.removeItem(AUTH_TOKEN_KEY);
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (DEMO_MODE) {
    void email;
    void password;
    return demoLogin();
  }
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, false);
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  if (DEMO_MODE) {
    void name;
    void email;
    void password;
    return demoLogin();
  }
  return api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  }, false);
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (DEMO_MODE) return demoAuthConfig;
  const response = await api<{ data: AuthConfig }>("/api/auth/config", {}, false);
  return response.data;
}

export async function fetchMe() {
  if (DEMO_MODE) return demoMe();
  return api<{ user: AuthResponse["user"] }>("/api/auth/me");
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (DEMO_MODE) return demoAdminUsers();
  const response = await api<{ data: AdminUser[] }>("/api/auth/users");
  return response.data;
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<AdminUser> {
  if (DEMO_MODE) {
    return {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      role: data.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownedApplications: 0,
      auditLogs: 0,
      notes: 0
    };
  }
  const response = await api<{ data: AdminUser }>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return response.data;
}

export async function updateAdminUser(userId: string, data: { name?: string; role?: string }): Promise<AdminUser> {
  if (DEMO_MODE) {
    const existing = demoAdminUsers().find((user) => user.id === userId) ?? demoAdminUsers()[0];
    return { ...existing, ...data, updatedAt: new Date().toISOString() };
  }
  const response = await api<{ data: AdminUser }>(`/api/auth/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  return response.data;
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<{ ok: boolean }> {
  if (DEMO_MODE) {
    void userId;
    void password;
    return { ok: true };
  }
  const response = await api<{ data: { ok: boolean } }>(`/api/auth/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password })
  });
  return response.data;
}

export async function fetchCandidates(
  filters: Record<string, string>,
  options: { page?: number; pageSize?: number } = {}
): Promise<CandidateListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize ?? 100));
  if (DEMO_MODE) return demoCandidates(Object.fromEntries(params.entries()), options);
  return api<CandidateListResponse>(`/api/candidates?${params}`);
}

export async function exportCandidatesCsv(filters: Record<string, string>, applicationIds: string[] = []): Promise<Blob> {
  return exportCandidatesPackage(filters, "csv", applicationIds);
}

export async function exportCandidatesXlsx(filters: Record<string, string>, applicationIds: string[] = []): Promise<Blob> {
  return exportCandidatesPackage(filters, "xlsx", applicationIds);
}

async function exportCandidatesPackage(filters: Record<string, string>, exportFormat: "csv" | "xlsx", applicationIds: string[] = []): Promise<Blob> {
  if (DEMO_MODE) {
    void filters;
    void applicationIds;
    return new Blob([`Publiczny ${exportFormat.toUpperCase()} export - neutralne dane testowe.`], {
      type: "application/zip"
    });
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (applicationIds.length > 0) {
    params.set("applicationIds", applicationIds.join(","));
  }
  params.set("exportFormat", exportFormat);
  const headers = new Headers();
  if (getToken()) {
    headers.set("authorization", `Bearer ${getToken()}`);
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE}/api/exports/candidate-documents.zip${query ? `?${query}` : ""}`, { headers });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(await errorMessage(response));
  }
  return response.blob();
}

export async function createManualCandidate(data: {
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  companyId?: string;
  companyName?: string;
  jobId?: string;
  jobTitle?: string;
  status?: string;
  stage?: string;
  ownerId?: string;
  aiNote?: string;
}): Promise<Candidate> {
  if (DEMO_MODE) {
    const created = demoCandidates({}, { page: 1, pageSize: 1 }).data[0];
    return {
      ...created,
      id: `cand-${Date.now()}`,
      applicationId: `app-${Date.now()}`,
      fullName: data.fullName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      city: data.city ?? null,
      companyId: data.companyId ?? null,
      companyName: data.companyName ?? null,
      jobId: data.jobId ?? null,
      jobTitle: data.jobTitle ?? null,
      status: data.status ?? "Nowy",
      stage: data.stage ?? "Nowy",
      ownerId: data.ownerId ?? "user-admin",
      aiNote: data.aiNote ?? null,
      documents: [],
      rawFields: {
        Firma: data.companyName ?? "Firma testowa",
        Stanowisko: data.jobTitle ?? "Rekord reczny",
        Zrodlo: "Manual"
      },
      customFields: {}
    };
  }
  const response = await api<{ data: Candidate }>("/api/candidates/manual", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return response.data;
}

export async function fetchCandidateFilters(): Promise<CandidateFilterOptions> {
  if (DEMO_MODE) return demoFilterOptions();
  const response = await api<{ data: CandidateFilterOptions }>("/api/candidate-filters");
  return response.data;
}

export async function fetchJobs(): Promise<JobListResponse> {
  if (DEMO_MODE) return demoJobs();
  return api<JobListResponse>("/api/jobs");
}

export async function fetchDataQuality(): Promise<DataQualityReport> {
  if (DEMO_MODE) return demoDataQuality();
  const response = await api<{ data: DataQualityReport }>("/api/data-quality");
  return response.data;
}

export async function fetchManagerOperationalReport(): Promise<JobCvReport> {
  if (DEMO_MODE) return demoManagerReport;
  const response = await api<{ data: JobCvReport }>("/api/reports/manager-operacyjny");
  return response.data;
}

export async function updateApplication(applicationId: string, data: Record<string, unknown>) {
  if (DEMO_MODE) return demoUpdateApplication(applicationId, data);
  return api(`/api/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function fetchAudit(applicationId: string): Promise<AuditLog[]> {
  if (DEMO_MODE) return demoAudit(applicationId);
  const response = await api<{ data: AuditLog[] }>(`/api/applications/${applicationId}/audit`);
  return response.data;
}

export async function fetchRecentAuditLogs(): Promise<AuditLog[]> {
  if (DEMO_MODE) return demoAudit();
  const response = await api<{ data: AuditLog[] }>("/api/audit-logs/recent");
  return response.data;
}

export async function fetchNotes(applicationId: string): Promise<CandidateNote[]> {
  if (DEMO_MODE) return demoNotes(applicationId);
  const response = await api<{ data: CandidateNote[] }>(`/api/applications/${applicationId}/notes`);
  return response.data;
}

export async function addNote(applicationId: string, body: string): Promise<CandidateNote> {
  if (DEMO_MODE) return demoAddNote(applicationId, body);
  const response = await api<{ data: CandidateNote }>(`/api/applications/${applicationId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
  return response.data;
}

export async function uploadApplicationDocument(applicationId: string, file: File): Promise<CandidateDocumentUpload> {
  if (DEMO_MODE) {
    void applicationId;
    return demoDocumentUpload(file);
  }
  const body = new FormData();
  body.set("file", file);
  const headers = new Headers();
  if (getToken()) {
    headers.set("authorization", `Bearer ${getToken()}`);
  }
  const response = await fetch(`${API_BASE}/api/applications/${applicationId}/documents`, {
    method: "POST",
    headers,
    body
  });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(await errorMessage(response));
  }
  const parsed = await response.json() as { data: CandidateDocumentUpload };
  return parsed.data;
}

export async function downloadProtectedFile(path: string): Promise<Blob> {
  if (DEMO_MODE) {
    void path;
    return new Blob(["Publiczny plik CV - neutralne dane testowe."], { type: "application/pdf" });
  }
  const headers = new Headers();
  if (getToken()) {
    headers.set("authorization", `Bearer ${getToken()}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(await errorMessage(response));
  }
  return response.blob();
}

export async function importCsv(fileName: string, content: string) {
  if (DEMO_MODE) {
    return { data: { ok: true, fileName, imported: content.split(/\r?\n/).filter(Boolean).length } };
  }
  return api("/api/imports/csv", {
    method: "POST",
    body: JSON.stringify({ fileName, content })
  });
}

export async function importBlacklistCsv(fileName: string, content: string) {
  if (DEMO_MODE) {
    return { data: { ok: true, fileName, imported: content.split(/\r?\n/).filter(Boolean).length } };
  }
  return api("/api/imports/blacklist", {
    method: "POST",
    body: JSON.stringify({ fileName, content })
  });
}

export async function fetchSyncRuns(): Promise<SyncRun[]> {
  if (DEMO_MODE) return demoSyncRuns();
  const response = await api<{ data: SyncRun[] }>("/api/sync-runs");
  return response.data;
}

export async function fetchDailySyncSummary(): Promise<DailySyncSummary> {
  if (DEMO_MODE) return demoDailySyncSummary;
  const response = await api<{ data: DailySyncSummary }>("/api/sync-runs/daily-summary");
  return response.data;
}

export async function fetchPortalConnections(): Promise<PortalConnection[]> {
  if (DEMO_MODE) return demoPortalConnections();
  const response = await api<{ data: PortalConnection[] }>("/api/portal-connections");
  return response.data;
}

export async function savePortalConnection(
  id: string | null,
  data: {
    source?: "PRACUJ" | "OLX";
    name?: string;
    companyName?: string | null;
    accountEmail?: string | null;
    panelSyncEnabled?: boolean;
    panelProfileDir?: string | null;
    panelLastStatus?: string | null;
    apiUrl?: string | null;
    jobsApiUrl?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    webhookSecret?: string | null;
    enabled?: boolean;
    lastCursor?: string | null;
    jobsLastCursor?: string | null;
  }
): Promise<PortalConnection> {
  if (DEMO_MODE) {
    return {
      ...demoPortalConnections()[0],
      id: id ?? `conn-${Date.now()}`,
      source: data.source ?? "OLX",
      name: data.name ?? "Konto rekrutacyjne",
      companyName: data.companyName ?? "Firma testowa",
      accountEmail: data.accountEmail ?? "kontakt@example.test",
      enabled: data.enabled ?? true,
      updatedAt: new Date().toISOString()
    };
  }
  const response = await api<{ data: PortalConnection }>(
    id ? `/api/portal-connections/${id}` : "/api/portal-connections",
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data)
    }
  );
  return response.data;
}

export async function probePortalConnection(connectionId: string): Promise<PortalProbeResult> {
  if (DEMO_MODE) return demoProbe(connectionId);
  const response = await api<{ data: PortalProbeResult }>(`/api/portal-connections/${connectionId}/probe`, {
    method: "POST",
    body: JSON.stringify({})
  });
  return response.data;
}

export async function startSync(connectionId: string): Promise<SyncRun> {
  if (DEMO_MODE) return demoStartSync(connectionId);
  const response = await api<{ data: SyncRun }>(`/api/sync-runs/${connectionId}/start`, {
    method: "POST",
    body: JSON.stringify({})
  });
  return response.data;
}

export async function startEnabledSyncs(): Promise<{
  checked: number;
  success: number;
  failed: number;
  runs: SyncRun[];
}> {
  if (DEMO_MODE) {
    const runs = demoPortalConnections().map((connection) => demoStartSync(connection.id));
    return { checked: runs.length, success: runs.length, failed: 0, runs };
  }
  const response = await api<{ data: { checked: number; success: number; failed: number; runs: SyncRun[] } }>("/api/sync-runs/start-enabled", {
    method: "POST",
    body: JSON.stringify({})
  });
  return response.data;
}

async function api<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (auth && getToken()) {
    headers.set("authorization", `Bearer ${getToken()}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(await errorMessage(response));
  }
  return response.json() as Promise<T>;
}

async function errorMessage(response: Response) {
  const text = await response.text();
  let message = text;
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    message = parsed.message || parsed.error || text;
  } catch {
    // API can return plain text for some infrastructure errors.
  }
  return translateError(message, response.status);
}

function translateError(message: string, status: number) {
  const normalized = message.toLocaleLowerCase("pl-PL");
  if (status === 401 || normalized.includes("invalid login credentials")) {
    return "Nieprawidłowy email lub hasło.";
  }
  if (status === 409 || normalized.includes("unique") || normalized.includes("already")) {
    return "Konto z tym adresem email już istnieje.";
  }
  if (normalized.includes("password") && normalized.includes("8")) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }
  if (normalized.includes("email")) {
    return "Podaj poprawny adres email.";
  }
  if (normalized.includes("failed to fetch")) {
    return "Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.";
  }
  return message || `Błąd API ${status}`;
}
