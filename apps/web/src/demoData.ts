import type {
  AdminUser,
  AuditLog,
  AuthConfig,
  AuthResponse,
  Candidate,
  CandidateDocumentUpload,
  CandidateFilterOptions,
  CandidateListResponse,
  CandidateNote,
  DataQualityReport,
  DailySyncSummary,
  JobCvReport,
  JobListResponse,
  JobSummary,
  PortalConnection,
  PortalProbeResult,
  SyncRun
} from "./types.js";

const now = new Date("2026-07-06T10:30:00.000Z").toISOString();

export const demoAuthConfig: AuthConfig = {
  allowPublicRegistration: false
};

export const demoAuthResponse: AuthResponse = {
  token: "preview-token",
  user: {
    id: "user-admin",
    email: "admin@example.test",
    name: "Administrator",
    role: "ADMIN"
  }
};

const companies = [
  { id: "company-vector", name: "Vector Sales" },
  { id: "company-nova", name: "Nova Contact" },
  { id: "company-north", name: "North Services" },
  { id: "company-delta", name: "Delta Support" },
  { id: "company-sigma", name: "Sigma Office" }
];

const owners = [
  { id: "user-admin", name: "Administrator", email: "admin@example.test" },
  { id: "user-ops", name: "Opiekun CRM", email: "opiekun@example.test" }
];

const rawColumns = [
  "Firma",
  "Stanowisko",
  "Doswiadczenie",
  "Sektor",
  "Zrodlo",
  "Notatka AI"
];

const demoCities = ["Warszawa", "Krakow", "Poznan", "Gdansk", "Lublin", "Wroclaw", "Lodz", "Rzeszow", "Gdynia", "Torun"];
const demoVoivodeships = ["mazowieckie", "malopolskie", "wielkopolskie", "pomorskie", "lubelskie", "dolnoslaskie", "lodzkie", "podkarpackie", "kujawsko-pomorskie"];
const demoNames = [
  "Julia Kaczmarek",
  "Marek Zielinski",
  "Natalia Wrobel",
  "Pawel Lewandowski",
  "Karolina Mazur",
  "Tomasz Kowalczyk",
  "Aleksandra Pieta",
  "Monika Pawlak",
  "Milosz Grabowski",
  "Emilia Wysocka",
  "Dawid Krupa",
  "Zuzanna Ostrowska",
  "Patryk Nowicki",
  "Nadia Krol",
  "Szymon Baran",
  "Klaudia Wieczorek"
];
const demoJobTitles = [
  "Lider zespolu obslugi klienta",
  "Specjalista ds. sprzedazy",
  "Konsultantka klienta",
  "Doradca klienta",
  "Asystentka biura",
  "Koordynator procesu"
];
const demoSources = ["OLX", "PRACUJ", "CSV", "MANUAL"] as const;
const demoStatuses = ["Nowy", "Kontakt", "Rozmowa", "Oferta"] as const;
const demoStages = ["Nowy", "Weryfikacja", "Rozmowa", "Oferta"] as const;

let candidates: Candidate[] = [
  candidate({
    id: "cand-001",
    applicationId: "app-001",
    fullName: "Anna Nowak",
    email: "anna.nowak@example.test",
    phone: "600 100 200",
    city: "Warszawa",
    companyId: "company-nova",
    companyName: "Nova Contact",
    jobId: "job-001",
    jobTitle: "Lider zespolu obslugi klienta",
    source: "OLX",
    status: "Nowy",
    stage: "Nowy",
    ownerId: "user-admin",
    ownerName: "Administrator",
    aiScore: 84,
    aiNote: "Doswiadczenie w prowadzeniu malego zespolu, obsludze klienta i raportowaniu zmian.",
    appliedAt: "2026-07-02T08:20:00.000Z",
    documents: [document("doc-001", "anna-nowak-cv.pdf")],
    rawFields: {
      Firma: "Nova Contact",
      Stanowisko: "Lider zespolu obslugi klienta",
      Doswiadczenie: "call center, zespol, raporty",
      Sektor: "obsluga klienta",
      Zrodlo: "OLX",
      "Notatka AI": "Dobry kandydat do rozmowy."
    }
  }),
  candidate({
    id: "cand-002",
    applicationId: "app-002",
    fullName: "Oliwia Szymanska",
    email: "oliwia.szymanska@example.test",
    phone: "600 200 300",
    city: "Krakow",
    companyId: "company-vector",
    companyName: "Vector Sales",
    jobId: "job-002",
    jobTitle: "Specjalista ds. sprzedazy",
    source: "PRACUJ",
    status: "Kontakt",
    stage: "Rozmowa",
    ownerId: "user-ops",
    ownerName: "Opiekun CRM",
    aiScore: 76,
    aiNote: "Profil sprzedazowy, kontakt z klientem, dobra historia stanowisk.",
    appliedAt: "2026-07-02T09:40:00.000Z",
    documents: [document("doc-002", "oliwia-szymanska-cv.pdf")],
    rawFields: {
      Firma: "Vector Sales",
      Stanowisko: "Specjalista ds. sprzedazy",
      Doswiadczenie: "sprzedaz, CRM, obsluga klienta",
      Sektor: "sprzedaz",
      Zrodlo: "Pracuj.pl",
      "Notatka AI": "Warto sprawdzic dyspozycyjnosc."
    }
  }),
  candidate({
    id: "cand-003",
    applicationId: "app-003",
    fullName: "Wiktoria Malinowska",
    email: "wiktoria.malinowska@example.test",
    phone: "600 300 400",
    city: "Poznan",
    companyId: "company-north",
    companyName: "North Services",
    jobId: "job-003",
    jobTitle: "Konsultantka klienta",
    source: "CSV",
    status: "Rozmowa",
    stage: "Oferta",
    ownerId: "user-admin",
    ownerName: "Administrator",
    aiScore: 91,
    aiNote: "Mocny profil rozmow telefonicznych i pracy na celach. Dobra kandydatka do szybkiej decyzji.",
    appliedAt: "2026-07-03T11:15:00.000Z",
    documents: [document("doc-003", "wiktoria-malinowska-cv.pdf")],
    rawFields: {
      Firma: "North Services",
      Stanowisko: "Konsultantka klienta",
      Doswiadczenie: "telefon, CRM, targets",
      Sektor: "B2B",
      Zrodlo: "CSV",
      "Notatka AI": "Najwyzszy scoring w aktualnym zestawie."
    }
  }),
  candidate({
    id: "cand-004",
    applicationId: "app-004",
    fullName: "Kamil Zielinski",
    email: "kamil.zielinski@example.test",
    phone: "600 400 500",
    city: "Gdansk",
    companyId: "company-vector",
    companyName: "Vector Sales",
    jobId: "job-002",
    jobTitle: "Specjalista ds. sprzedazy",
    source: "MANUAL",
    status: "Nowy",
    stage: "Nowy",
    ownerId: "user-ops",
    ownerName: "Opiekun CRM",
    aiScore: 68,
    aiNote: "Rekord dodany recznie, bez automatycznej analizy dokumentu.",
    appliedAt: "2026-07-04T13:10:00.000Z",
    documents: [],
    rawFields: {
      Firma: "Vector Sales",
      Stanowisko: "Specjalista ds. sprzedazy",
      Doswiadczenie: "kontakt z klientem",
      Sektor: "sprzedaz",
      Zrodlo: "Manual",
      "Notatka AI": "Brak CV - rekord uzupelniony recznie."
    }
  }),
  candidate({
    id: "cand-005",
    applicationId: "app-005",
    fullName: "Marta Golebiowska",
    email: "marta.golebiowska@example.test",
    phone: "600 500 600",
    city: "Torun",
    companyId: "company-nova",
    companyName: "Nova Contact",
    jobId: "job-001",
    jobTitle: "Lider zespolu obslugi klienta",
    source: "OLX",
    status: "Wykluczony",
    stage: "Czarna lista",
    ownerId: "user-admin",
    ownerName: "Administrator",
    aiScore: 20,
    aiNote: "Przyklad rekordu wykluczonego z glownej listy.",
    appliedAt: "2026-07-01T07:30:00.000Z",
    isBlacklisted: true,
    blacklistedAt: "2026-07-05T12:00:00.000Z",
    blacklistedByName: "Administrator",
    blacklistReason: "Przykladowy powod wykluczenia",
    documents: [document("doc-005", "marta-golebiowska-cv.pdf")],
    rawFields: {
      Firma: "Nova Contact",
      Stanowisko: "Lider zespolu obslugi klienta",
      Doswiadczenie: "rekord wykluczony",
      Sektor: "obsluga klienta",
      Zrodlo: "OLX",
      "Notatka AI": "Rekord celowo na czarnej liscie."
    }
  })
];

const generatedCandidates = Array.from({ length: 3940 }, (_, index) => {
  const n = index + 6;
  const name = demoNames[index % demoNames.length];
  const company = companies[index % companies.length];
  const city = demoCities[index % demoCities.length];
  const jobTitle = demoJobTitles[index % demoJobTitles.length];
  const source = demoSources[index % demoSources.length];
  const status = demoStatuses[index % demoStatuses.length];
  const stage = demoStages[index % demoStages.length];
  const owner = owners[index % owners.length];
  const hasCv = index % 5 !== 0;
  const isBlacklisted = index % 17 === 0;
  const appliedDay = String((index % 6) + 1).padStart(2, "0");
  const phoneTail = String(100 + index).padStart(3, "0");

  return candidate({
    id: `cand-${String(n).padStart(3, "0")}`,
    applicationId: `app-${String(n).padStart(3, "0")}`,
    fullName: name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.test`,
    phone: `600 ${phoneTail} ${String(200 + index).padStart(3, "0")}`,
    city,
    companyId: company.id,
    companyName: company.name,
    jobId: `job-${String((index % 3) + 1).padStart(3, "0")}`,
    jobTitle,
    source,
    status: isBlacklisted ? "Wykluczony" : status,
    stage: isBlacklisted ? "Czarna lista" : stage,
    ownerId: owner.id,
    ownerName: owner.name,
    aiScore: 52 + (index % 45),
    aiNote: `Profil pasuje do procesu: ${jobTitle.toLowerCase()}, ${city}, zrodlo ${source}.`,
    appliedAt: `2026-07-${appliedDay}T${String(8 + (index % 9)).padStart(2, "0")}:15:00.000Z`,
    isBlacklisted,
    blacklistedAt: isBlacklisted ? `2026-07-${appliedDay}T12:00:00.000Z` : null,
    blacklistedByName: isBlacklisted ? "Administrator" : null,
    blacklistReason: isBlacklisted ? "Przykladowe wykluczenie z procesu" : null,
    documents: hasCv ? [document(`doc-${String(n).padStart(3, "0")}`, `${name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`)] : [],
    rawFields: {
      Firma: company.name,
      Stanowisko: jobTitle,
      Doswiadczenie: index % 2 === 0 ? "obsluga klienta, CRM, telefon" : "sprzedaz, raporty, kontakt z klientem",
      Sektor: index % 3 === 0 ? "B2B" : "obsluga klienta",
      Zrodlo: source,
      "Notatka AI": "Rekord zasilony z importu lub formularza rekrutacyjnego."
    }
  });
});

candidates = [...candidates, ...generatedCandidates];

let auditLogs: AuditLog[] = [
  audit("audit-001", "app-003", "status", "Kontakt", "Rozmowa"),
  audit("audit-002", "app-002", "ownerId", "Administrator", "Opiekun CRM")
];

let notes: Record<string, CandidateNote[]> = {
  "app-003": [
    {
      id: "note-001",
      body: "Umowic rozmowe kwalifikacyjna i sprawdzic doswiadczenie w pracy na celach.",
      authorName: "Administrator",
      createdAt: now
    }
  ]
};

export function demoLogin(): AuthResponse {
  return demoAuthResponse;
}

export function demoMe() {
  return { user: demoAuthResponse.user };
}

export function demoAdminUsers(): AdminUser[] {
  return owners.map((owner, index) => ({
    ...owner,
    role: index === 0 ? "ADMIN" : "RECRUITER",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: now,
    ownedApplications: candidates.filter((item) => item.ownerId === owner.id).length,
    auditLogs: auditLogs.length,
    notes: Object.values(notes).flat().length
  }));
}

export function demoCandidates(filters: Record<string, string>, options: { page?: number; pageSize?: number } = {}): CandidateListResponse {
  const blacklistOnly = filters.blacklist === "only";
  const q = (filters.q ?? "").trim().toLocaleLowerCase("pl-PL");
  let data = candidates.filter((item) => blacklistOnly ? item.isBlacklisted : !item.isBlacklisted);

  if (q) {
    data = data.filter((item) => [
      item.fullName,
      item.email,
      item.phone,
      item.city,
      item.companyName,
      item.jobTitle,
      item.aiNote,
      ...Object.values(item.rawFields)
    ].filter(Boolean).join(" ").toLocaleLowerCase("pl-PL").includes(q));
  }
  if (filters.companyId) data = data.filter((item) => item.companyId === filters.companyId);
  if (filters.jobId) data = data.filter((item) => item.jobId === filters.jobId);
  if (filters.jobTitle) data = data.filter((item) => item.jobTitle === filters.jobTitle);
  if (filters.source) data = data.filter((item) => item.source === filters.source);
  if (filters.status) data = data.filter((item) => item.status === filters.status);
  if (filters.city) data = data.filter((item) => item.city === filters.city);
  if (filters.ownerId) data = data.filter((item) => item.ownerId === filters.ownerId);
  if (filters.hasCv === "1") data = data.filter((item) => item.documents.length > 0);

  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const paged = data.slice(offset, offset + pageSize);

  return {
    data: paged,
    meta: {
      total: data.length,
      returned: paged.length,
      limit: pageSize,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(data.length / pageSize)),
      sourceCounts: countBy(data.map((item) => item.source)),
      newCount: data.filter((item) => item.status === "Nowy").length,
      rawColumns
    }
  };
}

export function demoFilterOptions(): CandidateFilterOptions {
  return {
    companies,
    companyFilters: companies,
    jobs: demoJobs().data.map((job) => ({
      id: job.id,
      title: job.title,
      city: job.city,
      source: job.source,
      portalJobId: job.portalJobId,
      sourceFile: job.sourceFile,
      sourceSheet: job.sourceSheet,
      listingTitles: job.listingTitles,
      companyName: job.companyName
    })),
    jobTitles: demoJobs().data.map((job) => ({ value: job.title, label: job.title })),
    users: owners,
    statuses: ["Nowy", "Kontakt", "Rozmowa", "Oferta", "Wykluczony"],
    stages: ["Nowy", "Weryfikacja", "Rozmowa", "Oferta", "Czarna lista"],
    cities: demoCities,
    voivodeships: demoVoivodeships
  };
}

export function demoJobs(): JobListResponse {
  const jobs: JobSummary[] = [
    job("job-001", "Lider zespolu obslugi klienta", "Warszawa", "OLX", "Nova Contact"),
    job("job-002", "Specjalista ds. sprzedazy", "Krakow", "PRACUJ", "Vector Sales"),
    job("job-003", "Konsultantka klienta", "Poznan", "CSV", "North Services")
  ];
  return {
    data: jobs,
    meta: {
      totalApplications: candidates.length,
      unassignedApplications: candidates.filter((item) => !item.jobId).length
    }
  };
}

export function demoUpdateApplication(applicationId: string, payload: Record<string, unknown>) {
  candidates = candidates.map((item) => item.applicationId === applicationId ? { ...item, ...payload } as Candidate : item);
  Object.entries(payload).forEach(([fieldName, nextValue]) => {
    auditLogs.unshift(audit(`audit-${Date.now()}-${fieldName}`, applicationId, fieldName, null, String(nextValue ?? "")));
  });
  return { data: candidates.find((item) => item.applicationId === applicationId) };
}

export function demoAudit(applicationId?: string): AuditLog[] {
  return applicationId
    ? auditLogs.filter((entry) => entry.entityId === applicationId)
    : auditLogs;
}

export function demoNotes(applicationId: string): CandidateNote[] {
  return notes[applicationId] ?? [];
}

export function demoAddNote(applicationId: string, body: string): CandidateNote {
  const note = {
    id: `note-${Date.now()}`,
    body,
    authorName: "Administrator",
    createdAt: new Date().toISOString()
  };
  notes[applicationId] = [note, ...(notes[applicationId] ?? [])];
  return note;
}

export function demoDocumentUpload(file: File): CandidateDocumentUpload {
  return {
    id: `doc-${Date.now()}`,
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    storageKey: null,
    checksum: null,
    extractedChars: 1240,
    extractedEmail: "kandydat@example.test",
    extractedPhone: "600 000 000",
    aiNote: "Dokument zostal przyjety bez zapisu do realnego storage.",
    keywords: ["CV", "CRM", "rekrutacja"]
  };
}

export function demoDataQuality(): DataQualityReport {
  return {
    totals: {
      applications: candidates.length,
      candidates: candidates.length,
      applicationsWithoutJob: candidates.filter((item) => !item.jobId).length,
      applicationsWithoutSourceExternalId: 1,
      suspectedDuplicateGroups: 1,
      multiApplicationCandidates: 1,
      sharedContactGroups: 0
    },
    suspectedDuplicateApplications: [{
      key: "anna-nowak",
      candidateId: "cand-001",
      candidateName: "Anna Nowak",
      email: "anna.nowak@example.test",
      phone: "600 100 200",
      source: "OLX",
      sourceExternalId: "olx-preview-001",
      jobId: "job-001",
      jobTitle: "Lider zespolu obslugi klienta",
      companyName: "Nova Contact",
      count: 2,
      latestAppliedAt: "2026-07-02T08:20:00.000Z",
      applicationIds: ["app-001"]
    }],
    multiApplicationCandidates: [{
      candidateId: "cand-001",
      candidateName: "Anna Nowak",
      email: "anna.nowak@example.test",
      phone: "600 100 200",
      applicationCount: 2,
      distinctJobs: 2,
      distinctSources: 1,
      latestAppliedAt: "2026-07-02T08:20:00.000Z",
      jobs: ["Lider zespolu obslugi klienta", "Specjalista ds. sprzedazy"]
    }],
    sharedContactCandidates: []
  };
}

export const demoManagerReport: JobCvReport = {
  generatedAt: now,
  jobTitle: "Lider zespolu obslugi klienta",
  totalCv: 4,
  uniqueCv: 3,
  duplicateCvSkipped: 1,
  renewableEnergyUniqueCv: 1,
  renewableEnergyShare: 33,
  bySource: [{ label: "OLX", count: 2 }, { label: "Pracuj.pl", count: 1 }],
  byCompany: [{ label: "Nova Contact", count: 2 }, { label: "Vector Sales", count: 1 }],
  summary: "System porzadkuje CV, statusy, zrodla i notatki AI w jednym panelu.",
  methodology: ["Zliczenie rekordow z CV", "Usuniecie duplikatow", "Podzial wedlug zrodla i firmy"]
};

export const demoDailySyncSummary: DailySyncSummary = {
  generatedAt: now,
  window: {
    start: "2026-07-06T00:00:00.000Z",
    endExclusive: "2026-07-07T00:00:00.000Z",
    lookbackDays: 1
  },
  totals: {
    applications: 5,
    withOpenableCv: 4,
    withoutOpenableCv: 1,
    withReadableText: 4,
    withAiNote: 5,
    openableWithoutAiNote: 0
  },
  bySourceCompany: [{ source: "OLX", companyName: "Nova Contact", count: 2 }],
  bySource: [{ source: "OLX", label: "OLX", count: 2 }, { source: "PRACUJ", label: "Pracuj.pl", count: 1 }],
  sources: [],
  toast: {
    kind: "success",
    title: "Synchronizacja gotowa",
    body: "Przykladowe dane zostaly zaladowane bez laczenia z portalami."
  }
};

export function demoPortalConnections(): PortalConnection[] {
  return [
    portalConnection("conn-olx", "OLX", "OLX - konto rekrutacyjne"),
    portalConnection("conn-pracuj", "PRACUJ", "Pracuj.pl - konto rekrutacyjne")
  ];
}

export function demoSyncRuns(): SyncRun[] {
  return [
    syncRun("sync-001", "conn-olx", "OLX", "success", 3, 1, 0),
    syncRun("sync-002", "conn-pracuj", "PRACUJ", "success", 2, 0, 0)
  ];
}

export function demoStartSync(connectionId: string): SyncRun {
  return syncRun(`sync-${Date.now()}`, connectionId, connectionId.includes("pracuj") ? "PRACUJ" : "OLX", "success", 2, 0, 0);
}

export function demoProbe(connectionId: string): PortalProbeResult {
  return {
    connectionId,
    source: connectionId.includes("pracuj") ? "PRACUJ" : "OLX",
    adapterName: "Adapter portalu",
    jobsSeen: 2,
    jobSampleCount: 1,
    jobSamples: [{
      portalJobId: "job-preview",
      title: "Lider zespolu obslugi klienta",
      city: "Warszawa",
      companyName: "Nova Contact",
      url: "https://example.test/job/rekrutacja",
      rawFieldKeys: ["title", "city", "company"],
      missing: []
    }],
    applicationsSeen: 3,
    sampleCount: 1,
    nextCursor: null,
    quality: {
      readyForImport: true,
      samplesChecked: 1,
      samplesWithExternalId: 1,
      samplesWithPortalJobId: 1,
      samplesWithDocumentUrl: 1,
      samplesWithContact: 1,
      warnings: []
    },
    samples: [{
      fullName: "Anna Nowak",
      email: "anna.nowak@example.test",
      phone: "600 100 200",
      city: "Warszawa",
      companyName: "Nova Contact",
      jobTitle: "Lider zespolu obslugi klienta",
      status: "Nowy",
      stage: "Nowy",
      appliedAt: "2026-07-02T08:20:00.000Z",
      sourceExternalId: "olx-preview-001",
      portalJobId: "job-preview",
      documentName: "anna-nowak-cv.pdf",
      hasDocumentUrl: true,
      rawFieldKeys: ["name", "email", "phone", "city"],
      missing: []
    }]
  };
}

function candidate(input: Omit<Candidate, "applicationHistory" | "customFields"> & {
  applicationHistory?: Candidate["applicationHistory"];
  customFields?: Record<string, string>;
}): Candidate {
  return {
    ...input,
    applicationHistory: input.applicationHistory ?? [],
    customFields: input.customFields ?? {}
  };
}

function document(id: string, fileName: string) {
  return {
    id,
    fileName,
    mimeType: "application/pdf",
    storageKey: null,
    externalUrl: null,
    downloadUrl: `/api/documents/${id}/download`,
    createdAt: now
  };
}

function job(id: string, title: string, city: string, source: JobSummary["source"], companyName: string): JobSummary {
  const jobCandidates = candidates.filter((item) => item.jobId === id);
  return {
    id,
    title,
    city,
    source,
    portalJobId: `portal-${id}`,
    url: "https://example.test/job",
    sourceFile: null,
    sourceSheet: null,
    listingTitles: [title],
    companyName,
    applicationsCount: jobCandidates.length,
    latestApplicationAt: jobCandidates[0]?.appliedAt ?? null,
    latestApplications: jobCandidates.slice(0, 3).map((item) => ({
      id: item.applicationId,
      candidateId: item.id,
      candidateName: item.fullName,
      candidateCity: item.city,
      status: item.status,
      stage: item.stage,
      appliedAt: item.appliedAt ?? now
    })),
    statusCounts: countBy(jobCandidates.map((item) => item.status ?? "Brak")),
    stageCounts: countBy(jobCandidates.map((item) => item.stage ?? "Brak")),
    createdAt: "2026-06-25T08:00:00.000Z",
    updatedAt: now
  };
}

function audit(id: string, applicationId: string, fieldName: string, previousValue: string | null, nextValue: string | null): AuditLog {
  return {
    id,
    userId: "user-admin",
    userName: "Administrator",
    userEmail: "admin@example.test",
    entityType: "Application",
    entityId: applicationId,
    fieldName,
    previousValue,
    nextValue,
    createdAt: now
  };
}

function portalConnection(id: string, source: "PRACUJ" | "OLX", name: string): PortalConnection {
  return {
    id,
    source,
    name,
    companyName: source === "OLX" ? "Nova Contact" : "Vector Sales",
    accountEmail: "kontakt@example.test",
    panelSyncEnabled: true,
    panelProfileDir: null,
    panelLastImportedAt: now,
    panelLastStatus: "Gotowe",
    apiUrl: null,
    jobsApiUrl: null,
    clientId: null,
    hasClientSecret: false,
    hasAccessToken: false,
    hasRefreshToken: false,
    hasWebhookSecret: false,
    enabled: true,
    lastCursor: null,
    jobsLastCursor: null,
    createdAt: now,
    updatedAt: now
  };
}

function syncRun(
  id: string,
  connectionId: string | null,
  source: string,
  status: string,
  imported: number,
  updated: number,
  failed: number
): SyncRun {
  return {
    id,
    connectionId,
    connectionName: connectionId,
    source,
    status,
    imported,
    updated,
    failed,
    message: "Synchronizacja zakonczona - dane testowe bez polaczenia z portalem",
    startedAt: now,
    finishedAt: now,
    createdAt: now
  };
}

function countBy(values: Array<string | null | undefined>) {
  return values.reduce<Record<string, number>>((acc, value) => {
    const key = value || "Brak";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
