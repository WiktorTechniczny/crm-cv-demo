import { useEffect, useRef, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, Download, Info, RefreshCcw, Search, SlidersHorizontal, Upload, X, XCircle } from "lucide-react";
import { AuthPanel } from "./components/AuthPanel.js";
import { CandidateDetails } from "./components/CandidateDetails.js";
import { buildSheetUpdatePayload, CandidateTable, type SheetColumn } from "./components/CandidateTable.js";
import { JobsView } from "./components/JobsView.js";
import { MetricBar } from "./components/MetricBar.js";
import { Sidebar, type AppSection } from "./components/Sidebar.js";
import { ProcessesView, ReportsView, SettingsView, SyncView } from "./components/WorkspaceViews.js";
import type { ToastMessage } from "./components/toastTypes.js";
import { formatDateFilterValue, parseDateFilterInput } from "./dateFilters.js";
import { canEditCrm, canExportCrm } from "./permissions.js";
import {
  clearToken,
  exportCandidatesCsv,
  exportCandidatesXlsx,
  fetchAdminUsers,
  fetchCandidateFilters,
  fetchCandidates,
  fetchDataQuality,
  fetchDailySyncSummary,
  fetchJobs,
  fetchManagerOperationalReport,
  fetchMe,
  fetchRecentAuditLogs,
  getToken,
  importBlacklistCsv,
  updateApplication
} from "./api.js";
import type { AdminUser, AuditLog, Candidate, CandidateFilterOptions, CandidateListMeta, DataQualityReport, JobCvReport, JobListMeta, JobSummary, User } from "./types.js";

type ViewMode = "crm" | "sheet";

const UNASSIGNED_JOB_FILTER = "__unassigned__";
const CANDIDATE_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 2400;

const emptyFilters = {
  q: "",
  jobId: "",
  jobTitle: "",
  companyId: "",
  source: "",
  status: "",
  city: "",
  ownerId: "",
  appliedFrom: "",
  appliedTo: "",
  fullName: "",
  phone: "",
  voivodeship: "",
  cvLink: "",
  hasCv: "1",
  note: "",
  acquisitionSource: "",
  renewableEnergy: "",
  hearingQualification: ""
};

type CandidateFilters = typeof emptyFilters;
type DateFilterKey = "appliedFrom" | "appliedTo";

function stripCandidateOnlyFilters(nextFilters: CandidateFilters): CandidateFilters {
  return {
    ...nextFilters,
    hasCv: "",
    renewableEnergy: "",
    hearingQualification: ""
  };
}

const emptyFilterOptions: CandidateFilterOptions = {
  companies: [],
  companyFilters: [],
  jobs: [],
  jobTitles: [],
  users: [],
  statuses: [],
  stages: [],
  cities: [],
  voivodeships: []
};

const emptyCandidateMeta: CandidateListMeta = {
  total: 0,
  returned: 0,
  limit: CANDIDATE_PAGE_SIZE,
  page: 1,
  pageSize: CANDIDATE_PAGE_SIZE,
  pageCount: 1,
  sourceCounts: {},
  newCount: 0,
  rawColumns: []
};

const emptyJobMeta: JobListMeta = {
  totalApplications: 0,
  unassignedApplications: 0
};

const emptyDataQuality: DataQualityReport = {
  totals: {
    applications: 0,
    candidates: 0,
    applicationsWithoutJob: 0,
    applicationsWithoutSourceExternalId: 0,
    suspectedDuplicateGroups: 0,
    multiApplicationCandidates: 0,
    sharedContactGroups: 0
  },
  suspectedDuplicateApplications: [],
  multiApplicationCandidates: [],
  sharedContactCandidates: []
};

const emptyManagerReport: JobCvReport = {
  generatedAt: "",
  jobTitle: "Manager Operacyjny",
  totalCv: 0,
  uniqueCv: 0,
  duplicateCvSkipped: 0,
  renewableEnergyUniqueCv: 0,
  renewableEnergyShare: 0,
  bySource: [],
  byCompany: [],
  summary: "",
  methodology: []
};

const sectionCopy: Record<AppSection, { title: string; description: string }> = {
  candidates: {
    title: "Kandydaci",
    description: "CRM rekrutacji z pełnym widokiem arkusza, audytem zmian i synchronizacją API."
  },
  blacklist: {
    title: "Czarna lista",
    description: "Wykluczeni kandydaci ukryci z normalnej tabeli CRM."
  },
  jobs: {
    title: "Ogłoszenia",
    description: "Lista ogłoszeń z portali i importów z liczbą aplikacji oraz statusem procesu."
  },
  sync: {
    title: "Synchronizacja",
    description: "Połączenia Pracuj.pl, OLX, webhooki, cron oraz import CSV."
  },
  processes: {
    title: "Procesy",
    description: "Etapy, statusy, pola procesu i największe lejki rekrutacyjne."
  },
  reports: {
    title: "Raporty",
    description: "Szybkie podsumowania po spółkach, źródłach, statusach i miastach."
  },
  settings: {
    title: "Ustawienia",
    description: "Informacje o koncie, spółkach, rolach i konfiguracji systemu."
  }
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("candidates");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateMeta, setCandidateMeta] = useState<CandidateListMeta>(emptyCandidateMeta);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [jobMeta, setJobMeta] = useState<JobListMeta>(emptyJobMeta);
  const [dataQuality, setDataQuality] = useState<DataQualityReport>(emptyDataQuality);
  const [managerReport, setManagerReport] = useState<JobCvReport>(emptyManagerReport);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [filterOptions, setFilterOptions] = useState<CandidateFilterOptions>(emptyFilterOptions);
  const [selectedId, setSelectedId] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [qDraft, setQDraft] = useState(emptyFilters.q);
  const [dateDrafts, setDateDrafts] = useState<Record<DateFilterKey, string>>({
    appliedFrom: "",
    appliedTo: ""
  });
  const [viewMode, setViewMode] = useState<ViewMode>("crm");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("amg_sidebar_collapsed") === "1");
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [candidatePage, setCandidatePage] = useState(1);
  const [exporting, setExporting] = useState<"" | "csv" | "xlsx">("");
  const [blacklistImporting, setBlacklistImporting] = useState(false);
  const [error, setError] = useState("");
  const [checkedApplicationIds, setCheckedApplicationIds] = useState<string[]>([]);
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const blacklistImportInputRef = useRef<HTMLInputElement | null>(null);
  const candidateLoadRequestRef = useRef(0);

  const selected = candidates.find((candidate) => candidate.applicationId === selectedId) ?? candidates[0];
  const isCandidateListSection = activeSection === "candidates" || activeSection === "blacklist";

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    fetchMe()
      .then((response) => setUser(response.user))
      .catch(() => {
        clearToken();
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    void refreshAll();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activeSection === "jobs") {
      void loadJobs();
    }
    if (activeSection === "processes") {
      void Promise.all([
        loadCandidates(filters, candidatePage, activeSection),
        loadJobs()
      ]);
    }
    if (activeSection === "reports") {
      void Promise.all([
        loadJobs(),
        loadDataQuality(),
        loadManagerReport()
      ]);
    }
    if (activeSection === "settings" && user.role === "ADMIN") {
      void Promise.all([
        loadJobs(),
        loadDataQuality(),
        loadAdminSettingsData()
      ]);
    }
  }, [activeSection, user]);

  useEffect(() => {
    if (!user) return;
    fetchDailySyncSummary()
      .then((summary) => {
        const storageKey = `amg_daily_sync_toast:${user.id}:${summary.window.start}:${summary.window.endExclusive}`;
        if (localStorage.getItem(storageKey)) return;
        localStorage.setItem(storageKey, "1");
        notify({
          kind: summary.toast.kind,
          title: summary.toast.title,
          body: summary.toast.body
        });
        void refreshAll(filters, candidatePage);
      })
      .catch(() => {
        notify({
          kind: "warning",
          title: "Nie udało się pobrać wyniku automatu",
          body: "Dane w CRM działają normalnie, ale raport synchronizacji nie odpowiedział."
        });
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activeSection === "settings" && user.role !== "ADMIN") {
      setActiveSection("candidates");
    }
  }, [activeSection, user]);

  useEffect(() => {
    if (allFilteredSelected) return;
    const visibleIds = new Set(candidates.map((candidate) => candidate.applicationId));
    setCheckedApplicationIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [allFilteredSelected, candidates]);

  useEffect(() => {
    setQDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    setDateDrafts({
      appliedFrom: formatDateFilterValue(filters.appliedFrom),
      appliedTo: formatDateFilterValue(filters.appliedTo)
    });
  }, [filters.appliedFrom, filters.appliedTo]);

  useEffect(() => {
    localStorage.setItem("amg_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!user) return undefined;
    if (qDraft === filters.q) return undefined;

    const timeoutId = window.setTimeout(() => applySearchDraft(), SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [filters, qDraft, user]);

  function notify(message: Omit<ToastMessage, "id">) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { ...message, id }].slice(-4));
    window.setTimeout(() => dismissToast(id), 5200);
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function refreshAll(nextFilters = filters, page = candidatePage) {
    const tasks: Array<Promise<unknown>> = [loadFilterOptions()];
    if (isCandidateListSection || activeSection === "processes") {
      tasks.push(loadCandidates(nextFilters, page));
    }
    if (activeSection === "jobs" || activeSection === "processes" || activeSection === "reports" || activeSection === "settings") {
      tasks.push(loadJobs());
    }
    if (activeSection === "reports" || activeSection === "settings") {
      tasks.push(loadDataQuality());
    }
    if (activeSection === "reports") {
      tasks.push(loadManagerReport());
    }
    if (activeSection === "settings") {
      tasks.push(loadAdminSettingsData());
    }
    await Promise.all(tasks);
  }

  async function refreshAllWithToast(nextFilters = filters, page = candidatePage) {
    try {
      await refreshAll(nextFilters, page);
      notify({
        kind: "success",
        title: "Baza odświeżona",
        body: "Aktualny widok i jego filtry zostały pobrane ponownie."
      });
    } catch (err) {
      notify({
        kind: "error",
        title: "Nie udało się odświeżyć bazy",
        body: err instanceof Error ? err.message : "Spróbuj ponownie za chwilę."
      });
    }
  }

  async function loadCandidates(nextFilters = filters, page = candidatePage, section = activeSection) {
    const requestId = candidateLoadRequestRef.current + 1;
    candidateLoadRequestRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      const response = await fetchCandidates(candidateRequestFilters(nextFilters, section), { page, pageSize: CANDIDATE_PAGE_SIZE });
      if (requestId !== candidateLoadRequestRef.current) return;
      setCandidates(response.data);
      setCandidateMeta(response.meta);
      setCandidatePage(response.meta.page || page);
      setSelectedId((current) => (
        response.data.some((candidate) => candidate.applicationId === current)
          ? current
          : response.data[0]?.applicationId || ""
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać kandydatów");
    } finally {
      if (requestId === candidateLoadRequestRef.current) {
        setLoading(false);
      }
    }
  }

  async function loadJobs() {
    setJobsLoading(true);
    try {
      const response = await fetchJobs();
      setJobs(response.data);
      setJobMeta(response.meta);
    } finally {
      setJobsLoading(false);
    }
  }

  async function loadFilterOptions() {
    return fetchCandidateFilters()
      .then(setFilterOptions)
      .catch(() => setFilterOptions(emptyFilterOptions));
  }

  async function loadDataQuality() {
    return fetchDataQuality()
      .then(setDataQuality)
      .catch(() => setDataQuality(emptyDataQuality));
  }

  async function loadManagerReport() {
    return fetchManagerOperationalReport()
      .then(setManagerReport)
      .catch(() => setManagerReport(emptyManagerReport));
  }

  async function loadAdminSettingsData() {
    if (!currentUserIsAdmin()) {
      setAdminUsers([]);
      setRecentAuditLogs([]);
      return;
    }
    await Promise.all([
      fetchAdminUsers().then(setAdminUsers).catch(() => setAdminUsers([])),
      fetchRecentAuditLogs().then(setRecentAuditLogs).catch(() => setRecentAuditLogs([]))
    ]);
  }

  function updateCheckedApplicationIds(applicationIds: string[]) {
    setAllFilteredSelected(false);
    setCheckedApplicationIds(applicationIds);
  }

  function clearSelection() {
    setAllFilteredSelected(false);
    setCheckedApplicationIds([]);
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    clearSelection();
    setCandidatePage(1);
    void loadCandidates(next, 1);
  }

  function navigate(section: AppSection) {
    if (section === activeSection) return;
    setActiveSection(section);
    if (section === "candidates" || section === "blacklist") {
      const nextFilters = section === "blacklist"
        ? stripCandidateOnlyFilters(filters)
        : activeSection === "blacklist"
          ? { ...filters, hasCv: emptyFilters.hasCv, renewableEnergy: emptyFilters.renewableEnergy, hearingQualification: emptyFilters.hearingQualification }
        : filters;
      if (nextFilters !== filters) {
        setFilters(nextFilters);
      }
      setSelectedId("");
      clearSelection();
      void loadCandidates(nextFilters, candidatePage, section);
    }
  }

  function applySearchDraft() {
    const nextQ = qDraft.trim();
    if (nextQ === filters.q) return;
    const next = { ...filters, q: nextQ };
    setFilters(next);
    setCandidatePage(1);
    void loadCandidates(next, 1);
  }

  function updateDateDraft(key: DateFilterKey, value: string) {
    setDateDrafts((current) => ({ ...current, [key]: value }));
  }

  function revertDateDraft(key: DateFilterKey) {
    setDateDrafts((current) => ({ ...current, [key]: formatDateFilterValue(filters[key]) }));
  }

  function applyDateDraft(key: DateFilterKey) {
    const rawValue = dateDrafts[key].trim();
    const parsedDate = parseDateFilterInput(rawValue);

    if (parsedDate === null) {
      notify({
        kind: "warning",
        title: "Nieprawidłowa data",
        body: "Wpisz datę jako dd.mm.rrrr, np. 22.05.2026 albo 22 maja 2026."
      });
      revertDateDraft(key);
      return;
    }

    const nextDisplayValue = formatDateFilterValue(parsedDate);
    setDateDrafts((current) => ({ ...current, [key]: nextDisplayValue }));

    if (parsedDate === filters[key]) return;
    updateFilter(key, parsedDate);
  }

  function resetFilters() {
    const nextFilters = activeSection === "blacklist"
      ? stripCandidateOnlyFilters(emptyFilters)
      : emptyFilters;
    setFilters(nextFilters);
    setQDraft(nextFilters.q);
    clearSelection();
    setCandidatePage(1);
    void loadCandidates(nextFilters, 1);
  }

  function activeCandidateFilterCount() {
    const currentFilters = {
      ...(activeSection === "blacklist" ? stripCandidateOnlyFilters(filters) : filters),
      q: qDraft.trim(),
      renewableEnergy: filters.renewableEnergy === "with" ? "with" : "",
      hearingQualification: filters.hearingQualification === "with" ? "with" : ""
    };
    if (activeSection === "blacklist") {
      currentFilters.renewableEnergy = "";
      currentFilters.hearingQualification = "";
    }
    return Object.entries(currentFilters).filter(([key, value]) => {
      if (activeSection === "blacklist" && (key === "hasCv" || key === "renewableEnergy" || key === "hearingQualification")) {
        return false;
      }
      const defaultValue = emptyFilters[key as keyof typeof emptyFilters];
      return String(value ?? "") !== String(defaultValue ?? "");
    }).length;
  }

  function showJobCandidates(job: JobSummary) {
    const next = { ...emptyFilters, jobId: job.id };
    setFilters(next);
    setQDraft(next.q);
    clearSelection();
    setViewMode("crm");
    setSelectedId("");
    setActiveSection("candidates");
    setCandidatePage(1);
    void loadCandidates(next, 1);
  }

  function showUnassignedCandidates() {
    const next = { ...emptyFilters, jobId: UNASSIGNED_JOB_FILTER };
    setFilters(next);
    setQDraft(next.q);
    clearSelection();
    setViewMode("crm");
    setSelectedId("");
    setActiveSection("candidates");
    setCandidatePage(1);
    void loadCandidates(next, 1);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function downloadExport(format: "csv" | "xlsx") {
    if (!currentUserCanExportCrm()) {
      notify({
        kind: "error",
        title: "Eksport niedostępny",
        body: "Konto obserwatora ma tylko podgląd danych i CV."
      });
      return;
    }
    setExporting(format);
    setError("");
    try {
      const exportApplicationIds = allFilteredSelected ? [] : checkedApplicationIds;
      const exportCount = checkedApplicationIds.length > 0
        ? (allFilteredSelected ? candidateMeta.total : checkedApplicationIds.length)
        : candidateMeta.total;
      const blob = format === "csv"
        ? await exportCandidatesCsv(candidateRequestFilters(filters), exportApplicationIds)
        : await exportCandidatesXlsx(candidateRequestFilters(filters), exportApplicationIds);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kandydaci-${format}-cv-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      notify({
        kind: "success",
        title: "Eksport gotowy",
        body: checkedApplicationIds.length > 0
          ? `Pobrano paczkę ${format.toUpperCase()} z arkuszem i CV dla ${exportCount} wyników.`
          : `Pobrano paczkę ${format.toUpperCase()} z arkuszem i CV dla wszystkich wyników z aktualnego filtra.`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wyeksportować danych");
    } finally {
      setExporting("");
    }
  }



  async function importBlacklistFile(file: File) {
    setBlacklistImporting(true);
    try {
      const content = await file.text();
      const result = await importBlacklistCsv(file.name, content) as {
        imported: number;
        updated: number;
        rows: number;
        skippedRows?: number;
        overlapRepair?: {
          matchedActiveCandidates: number;
          enrichedBlacklistCandidates: number;
          matchedBy: {
            phone: number;
            email: number;
            nameAndCity: number;
          };
        };
      };
      const repaired = result.overlapRepair?.matchedActiveCandidates ?? 0;
      const repairedDetails = [
        result.overlapRepair?.matchedBy.phone ? `telefon: ${result.overlapRepair.matchedBy.phone}` : "",
        result.overlapRepair?.matchedBy.email ? `mail: ${result.overlapRepair.matchedBy.email}` : "",
        result.overlapRepair?.matchedBy.nameAndCity ? `imię+miasto: ${result.overlapRepair.matchedBy.nameAndCity}` : ""
      ].filter(Boolean).join(", ");
      const repairedText = repaired
        ? `, przeniesiono z aktywnych na czarną listę ${repaired}${repairedDetails ? ` (${repairedDetails})` : ""}`
        : "";
      notify({
        kind: "success",
        title: "Czarna lista zaimportowana",
        body: `Dodano ${result.imported}, zaktualizowano ${result.updated}${repairedText}, wiersze ${result.rows}${result.skippedRows ? `, pominięto ${result.skippedRows}` : ""}.`
      });
      clearSelection();
      setCandidatePage(1);
      await refreshAll(filters, 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się zaimportować czarnej listy.";
      notify({ kind: "error", title: "Import czarnej listy nie powiódł się", body: message });
    } finally {
      setBlacklistImporting(false);
      if (blacklistImportInputRef.current) blacklistImportInputRef.current.value = "";
    }
  }

  function updateJobTitleFilter(value: string) {
    const next = value === UNASSIGNED_JOB_FILTER
      ? { ...filters, jobId: UNASSIGNED_JOB_FILTER, jobTitle: "" }
      : { ...filters, jobId: "", jobTitle: value };
    setFilters(next);
    setCandidatePage(1);
    void loadCandidates(next, 1);
  }

  function changeCandidatePage(page: number) {
    const nextPage = Math.max(1, Math.min(candidateMeta.pageCount || 1, page));
    setAllFilteredSelected(false);
    setCandidatePage(nextPage);
    void loadCandidates(filters, nextPage);
  }

  async function updateSheetCell(candidate: Candidate, column: SheetColumn, value: string) {
    if (!currentUserCanEditCrm()) return;
    const payload = buildSheetUpdatePayload(candidate, column, value);
    if (Object.keys(payload).length === 0) return;
    await updateApplication(candidate.applicationId, payload);
    const updatedCandidate = applyCandidatePatch(candidate, payload);
    setCandidates((current) => current.map((item) => (
      item.applicationId === candidate.applicationId ? updatedCandidate : item
    )));
    setSelectedId(candidate.applicationId);
    notify({ kind: "success", title: "Zapisano komórkę", body: `${column.label}: ${value || "-"}` });
  }

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  const currentUser = user;
  const currentSection = sectionCopy[activeSection];

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        user={user}
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        onNavigate={navigate}
        onLogout={logout}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <main className={`workspace ${isCandidateListSection ? "candidate-workspace" : ""} ${activeSection === "blacklist" ? "blacklist-workspace" : ""} ${activeSection === "jobs" ? "jobs-workspace" : ""}`}>
        <header className="topbar">
          <div>
            <h1>{currentSection.title}</h1>
            <p>{currentSection.description}</p>
          </div>
          <div className="topbar-actions">
            {(isCandidateListSection || activeSection === "reports") && (
              <>
                {isCandidateListSection && (
                <button
                  className="icon-button secondary"
                  type="button"
                  onClick={() => setFiltersCollapsed((current) => !current)}
                >
                  <SlidersHorizontal size={18} />
                  {filtersCollapsed ? "Pokaż filtry" : "Ukryj filtry"}
                </button>
                )}
                {currentUserCanExportCrm() && (
                  <>
                    <button className="icon-button secondary" onClick={() => void downloadExport("csv")} disabled={Boolean(exporting)} title="Pobiera paczkę ZIP: arkusz oraz folder CV. Bez zaznaczenia eksportuje wszystkie wyniki z aktualnych filtrów.">
                      <Download size={18} />
                      {exporting === "csv" ? "Eksportuję..." : allFilteredSelected ? `CSV + CV (${candidateMeta.total})` : checkedApplicationIds.length ? `CSV + CV (${checkedApplicationIds.length})` : "CSV + CV"}
                    </button>
                    <button className="icon-button secondary" onClick={() => void downloadExport("xlsx")} disabled={Boolean(exporting)} title="Pobiera paczkę ZIP: arkusz oraz folder CV. Bez zaznaczenia eksportuje wszystkie wyniki z aktualnych filtrów.">
                      <Download size={18} />
                      {exporting === "xlsx" ? "Eksportuję..." : allFilteredSelected ? `XLSX + CV (${candidateMeta.total})` : checkedApplicationIds.length ? `XLSX + CV (${checkedApplicationIds.length})` : "XLSX + CV"}
                    </button>
                  </>
                )}
                {activeSection === "blacklist" && currentUserCanEditCrm() && (
                  <>
                    <button
                      className="icon-button secondary"
                      disabled={blacklistImporting}
                      onClick={() => blacklistImportInputRef.current?.click()}
                      type="button"
                    >
                      <Upload size={18} />
                      {blacklistImporting ? "Importuję..." : "Import czarnej listy"}
                    </button>
                    <input
                      ref={blacklistImportInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void importBlacklistFile(file);
                      }}
                    />
                  </>
                )}
              </>
            )}
            <button className="icon-button" onClick={() => void refreshAllWithToast()}>
              <RefreshCcw size={18} />
              Odśwież
            </button>
          </div>
        </header>

        {renderSection()}
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );

  function renderSection() {
    if (activeSection === "jobs") {
      return (
        <JobsView
          jobs={jobs}
          loading={jobsLoading}
          unassignedApplications={jobMeta.unassignedApplications}
          onShowCandidates={showJobCandidates}
          onShowUnassignedCandidates={showUnassignedCandidates}
        />
      );
    }

    if (activeSection === "sync") {
      return <SyncView onImported={() => void refreshAllWithToast()} onNotify={notify} />;
    }

    if (activeSection === "processes") {
      return <ProcessesView candidates={candidates} jobs={jobs} filterOptions={filterOptions} />;
    }

    if (activeSection === "reports") {
      return <ReportsView jobs={jobs} meta={candidateMeta} dataQuality={dataQuality} managerReport={managerReport} />;
    }

    if (activeSection === "settings") {
      if (!currentUserIsAdmin()) {
        return null;
      }
      return (
        <SettingsView
          user={currentUser}
          filterOptions={filterOptions}
          jobs={jobs}
          meta={candidateMeta}
          adminUsers={adminUsers}
          recentAuditLogs={recentAuditLogs}
          onUsersChanged={() => void refreshAll()}
          onLogout={logout}
        />
      );
    }

    const activeFilterCount = activeCandidateFilterCount();
    const filterControlsDisabled = false;

    return (
      <div className={`candidates-view ${filtersCollapsed ? "filters-collapsed" : ""}`}>
        {!filtersCollapsed ? (
          <MetricBar
            total={candidateMeta.total}
            returned={candidateMeta.returned}
            sourceCounts={candidateMeta.sourceCounts}
            newCount={candidateMeta.newCount}
            loading={loading}
          />
        ) : (
          <div className="collapsed-filter-strip">
            <span>
              Filtry ukryte
              {activeFilterCount > 0 ? ` • aktywne: ${activeFilterCount}` : ""}
            </span>
            <button type="button" onClick={() => setFiltersCollapsed(false)}>Pokaż filtry</button>
          </div>
        )}

        {!filtersCollapsed && (
        <section className="control-row">
          <label className="searchbox filter-search">
            <Search size={18} />
            <input
              disabled={filterControlsDisabled}
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearchDraft();
                }
              }}
              placeholder="Słowo kluczowe, imię nazwisko, stanowisko, Excel..."
            />
          </label>
          <label className="date-filter">
            <span>Data CV od</span>
            <input
              disabled={filterControlsDisabled}
              type="text"
              inputMode="numeric"
              placeholder="dd.mm.rrrr"
              value={dateDrafts.appliedFrom}
              onChange={(event) => updateDateDraft("appliedFrom", event.target.value)}
              onBlur={() => applyDateDraft("appliedFrom")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyDateDraft("appliedFrom");
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  revertDateDraft("appliedFrom");
                }
              }}
            />
          </label>
          <label className="date-filter">
            <span>Data CV do</span>
            <input
              disabled={filterControlsDisabled}
              type="text"
              inputMode="numeric"
              placeholder="dd.mm.rrrr"
              value={dateDrafts.appliedTo}
              onChange={(event) => updateDateDraft("appliedTo", event.target.value)}
              onBlur={() => applyDateDraft("appliedTo")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyDateDraft("appliedTo");
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  revertDateDraft("appliedTo");
                }
              }}
            />
          </label>
          <select disabled={filterControlsDisabled} value={filters.companyId} onChange={(event) => updateFilter("companyId", event.target.value)}>
            <option value="">Spółka</option>
            {(filterOptions.companyFilters.length ? filterOptions.companyFilters : filterOptions.companies).map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <select
            disabled={filterControlsDisabled}
            value={filters.jobId === UNASSIGNED_JOB_FILTER ? UNASSIGNED_JOB_FILTER : filters.jobTitle}
            onChange={(event) => updateJobTitleFilter(event.target.value)}
          >
            <option value="">Nazwa stanowiska</option>
            <option value={UNASSIGNED_JOB_FILTER}>Bez przypiętego ogłoszenia</option>
            {filterOptions.jobTitles.map((jobTitle) => (
              <option key={jobTitle.value} value={jobTitle.value}>
                {jobTitle.label}
              </option>
            ))}
          </select>
          <select disabled={filterControlsDisabled} value={filters.voivodeship} onChange={(event) => updateFilter("voivodeship", event.target.value)}>
            <option value="">Województwo</option>
            {filterOptions.voivodeships.map((voivodeship) => (
              <option key={voivodeship} value={voivodeship}>{voivodeship}</option>
            ))}
          </select>
          <select disabled={filterControlsDisabled} value={filters.city} onChange={(event) => updateFilter("city", event.target.value)}>
            <option value="">Miasto</option>
            {filterOptions.cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select disabled={filterControlsDisabled} value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
            <option value="">Źródło pozyskania CV</option>
            <option value="PRACUJ">Pracuj.pl</option>
            <option value="OLX">OLX</option>
            <option value="CSV">CSV</option>
            <option value="MANUAL">Ręcznie</option>
            <option value="OTHER">Inne</option>
          </select>
          {activeSection !== "blacklist" && (
            <>
              <label className="checkbox-filter">
                <input
                  disabled={filterControlsDisabled}
                  type="checkbox"
                  checked={filters.hasCv === "1"}
                  onChange={(event) => updateFilter("hasCv", event.target.checked ? "1" : "")}
                />
                Tylko z CV
              </label>
              <label
                className="checkbox-filter audio-filter"
                title="Pokaż kandydatów, których CV wskazuje wykształcenie lub dyplom: protetyk słuchu, audiofonolog albo fonoaudiolog"
              >
                <input
                  disabled={filterControlsDisabled}
                  type="checkbox"
                  checked={filters.hearingQualification === "with"}
                  onChange={(event) => updateFilter("hearingQualification", event.target.checked ? "with" : "")}
                />
                Dyplom audio
              </label>
              <div className="segmented sector-toggle" aria-label="Filtr OZE">
                <button
                  type="button"
                  className={filters.renewableEnergy !== "with" ? "active" : ""}
                  aria-pressed={filters.renewableEnergy !== "with"}
                  disabled={filterControlsDisabled}
                  title="Pokaż wszystkich kandydatów, bez filtrowania po OZE"
                  onClick={() => updateFilter("renewableEnergy", "")}
                >
                  Wszystkie
                </button>
                <button
                  type="button"
                  className={filters.renewableEnergy === "with" ? "active" : ""}
                  aria-pressed={filters.renewableEnergy === "with"}
                  disabled={filterControlsDisabled}
                  title="Pokaż tylko kandydatów z doświadczeniem OZE / energia"
                  onClick={() => updateFilter("renewableEnergy", filters.renewableEnergy === "with" ? "" : "with")}
                >
                  Z OZE
                </button>
              </div>
            </>
          )}
          <button className="icon-button secondary" onClick={resetFilters}>Wyczyść</button>
          <div className="segmented" aria-label="Tryb widoku">
            <button className={viewMode === "crm" ? "active" : ""} onClick={() => setViewMode("crm")}>CRM</button>
            <button className={viewMode === "sheet" ? "active" : ""} onClick={() => setViewMode("sheet")}>Arkusz</button>
          </div>
        </section>
        )}

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {activeSection === "blacklist" && (
          <div className="blacklist-context-banner">
            <Ban size={18} />
            <div>
              <strong>Widok wykluczonych kandydatów</strong>
              <span>Te osoby są ukryte z głównej listy Kandydaci. Tutaj sprawdzasz powód, historię aplikacji i ewentualnie przywracasz rekord.</span>
            </div>
          </div>
        )}

        <div className={viewMode === "sheet" ? "sheet-content-grid" : "content-grid"}>
          <section className="main-panel">
            <CandidateTable
              candidates={candidates}
              selectedApplicationId={selected?.applicationId ?? ""}
              checkedApplicationIds={checkedApplicationIds}
              viewMode={viewMode}
              loading={loading}
              sheetColumns={candidateMeta.rawColumns}
              pageInfo={candidateMeta}
              isBlacklistView={activeSection === "blacklist"}
              onSelect={(candidate) => setSelectedId(candidate.applicationId)}
              onCheckedChange={updateCheckedApplicationIds}
              allFilteredSelected={allFilteredSelected}
              onSelectAllFiltered={() => setAllFilteredSelected(true)}
              onUsePageSelection={() => setAllFilteredSelected(false)}
              onClearSelection={clearSelection}
              onPageChange={changeCandidatePage}
              onSheetCellUpdate={updateSheetCell}
              readOnly={!currentUserCanEditCrm()}
              onNotify={notify}
            />
          </section>
          {viewMode === "crm" && (
            <aside className="candidate-sidebar">
              <CandidateDetails
                candidate={selected}
                owners={filterOptions.users}
                statuses={filterOptions.statuses}
                stages={filterOptions.stages}
                onChanged={() => void refreshAll()}
                onNotify={notify}
                readOnly={!currentUserCanEditCrm()}
              />
            </aside>
          )}
        </div>
      </div>
    );
  }

  function currentUserIsAdmin() {
    return user?.role === "ADMIN";
  }

  function currentUserCanEditCrm() {
    return canEditCrm(user?.role);
  }

  function currentUserCanExportCrm() {
    return canExportCrm(user?.role);
  }

  function candidateRequestFilters(nextFilters = filters, section = activeSection): Record<string, string> {
    if (section === "blacklist") {
      const { blacklist: _blacklist, ...baseFilters } = stripCandidateOnlyFilters(nextFilters) as typeof emptyFilters & { blacklist?: string };
      return { ...baseFilters, blacklist: "only" };
    }
    const { blacklist: _blacklist, ...baseFilters } = nextFilters as typeof emptyFilters & { blacklist?: string };
    return {
      ...baseFilters,
      renewableEnergy: baseFilters.renewableEnergy === "with" ? "with" : "",
      hearingQualification: baseFilters.hearingQualification === "with" ? "with" : ""
    };
  }
}

function applyCandidatePatch(candidate: Candidate, payload: Record<string, unknown>): Candidate {
  const next = { ...candidate };
  if (typeof payload.fullName === "string") next.fullName = payload.fullName;
  if (typeof payload.email === "string" || payload.email === null) next.email = payload.email;
  if (typeof payload.phone === "string" || payload.phone === null) next.phone = payload.phone;
  if (typeof payload.city === "string" || payload.city === null) next.city = payload.city;
  if (typeof payload.status === "string" || payload.status === null) next.status = payload.status;
  if (typeof payload.stage === "string" || payload.stage === null) next.stage = payload.stage;
  if (typeof payload.ownerId === "string" || payload.ownerId === null) next.ownerId = payload.ownerId;
  if (typeof payload.aiNote === "string" || payload.aiNote === null) next.aiNote = payload.aiNote;
  if (typeof payload.appliedAt === "string" || payload.appliedAt === null) next.appliedAt = payload.appliedAt;
  if (isStringRecord(payload.rawFields)) next.rawFields = payload.rawFields;
  if (isStringRecord(payload.customFields)) next.customFields = payload.customFields;
  return next;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value)
    && typeof value === "object"
    && Object.values(value as Record<string, unknown>).every((entry) => typeof entry === "string");
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? XCircle : toast.kind === "warning" ? AlertCircle : Info;
        return (
          <div className={`toast toast-${toast.kind}`} key={toast.id}>
            <Icon size={18} />
            <div>
              <strong>{toast.title}</strong>
              {toast.body && <span>{toast.body}</span>}
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Zamknij powiadomienie">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
