import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  GitBranch,
  KeyRound,
  Link2,
  LogOut,
  Printer,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users
} from "lucide-react";
import { createAdminUser, resetAdminUserPassword, updateAdminUser } from "../api.js";
import type { AdminUser, AuditLog, Candidate, CandidateFilterOptions, CandidateListMeta, DataQualityReport, JobCvReport, JobSummary, User } from "../types.js";
import { ImportPanel } from "./ImportPanel.js";
import { SyncPanel } from "./SyncPanel.js";
import type { Notify } from "./toastTypes.js";

interface SyncViewProps {
  onImported: () => void;
  onNotify?: Notify;
}

interface ProcessesViewProps {
  candidates: Candidate[];
  jobs: JobSummary[];
  filterOptions: CandidateFilterOptions;
}

interface ReportsViewProps {
  jobs: JobSummary[];
  meta: CandidateListMeta;
  dataQuality: DataQualityReport;
  managerReport: JobCvReport;
}

interface SettingsViewProps {
  user: User;
  filterOptions: CandidateFilterOptions;
  jobs: JobSummary[];
  meta: CandidateListMeta;
  adminUsers: AdminUser[];
  recentAuditLogs: AuditLog[];
  onUsersChanged: () => void;
  onLogout: () => void;
}

export function SyncView({ onImported, onNotify }: SyncViewProps) {
  return (
    <div className="workspace-grid two-columns">
      <SyncPanel onNotify={onNotify} />
      <ImportPanel onImported={onImported} onNotify={onNotify} />
      <section className="info-panel full-span">
        <h2><Link2 size={18} /> Endpointy integracyjne</h2>
        <div className="endpoint-grid">
          <EndpointItem label="Webhook Pracuj.pl" value="/api/webhooks/pracuj" />
          <EndpointItem label="Webhook OLX" value="/api/webhooks/olx" />
          <EndpointItem label="Import z panelu" value="/api/panel-imports" />
          <EndpointItem label="Cron synchronizacji" value="/api/cron/sync" />
          <EndpointItem label="Import CSV" value="/api/imports/csv" />
        </div>
      </section>
    </div>
  );
}

export function ProcessesView({ candidates, jobs, filterOptions }: ProcessesViewProps) {
  const stages = countBy(candidates.map((candidate) => candidate.stage || candidate.status || "Nowy"));
  const statuses = countBy(candidates.map((candidate) => candidate.status || "Brak statusu"));
  const owners = countBy(candidates.map((candidate) => candidate.ownerName || "Brak opiekuna"));
  const processFields = uniqueRawColumns(candidates);
  const topJobs = [...jobs].sort((a, b) => b.applicationsCount - a.applicationsCount).slice(0, 8);

  return (
    <div className="workspace-grid">
      <section className="info-panel full-span">
        <h2><GitBranch size={18} /> Etapy procesu</h2>
        <div className="pipeline-board">
          {topEntries(stages, 8).map(([stage, count]) => (
            <article key={stage} className="pipeline-column">
              <strong>{stage}</strong>
              <span>{count} kandydatów</span>
              <small>{sampleForStage(candidates, stage)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="info-panel">
        <h2><CheckCircle2 size={18} /> Statusy</h2>
        <StatList entries={topEntries(statuses, 10)} />
      </section>

      <section className="info-panel">
        <h2><Users size={18} /> Opiekunowie</h2>
        <StatList entries={topEntries(owners, 8)} />
      </section>

      <section className="info-panel full-span">
        <h2><FileSpreadsheet size={18} /> Pola procesu z arkuszy</h2>
        <div className="field-chip-list">
          {processFields.map((field) => <span key={field}>{field}</span>)}
        </div>
        <p className="panel-note">
          Pola są czytane z CSV i przechowywane w aplikacji, więc można obsługiwać protetyków, doradców i kolejne stanowiska bez przepisywania bazy.
        </p>
      </section>

      <section className="info-panel full-span">
        <h2><BriefcaseBusiness size={18} /> Największe procesy</h2>
        <div className="compact-table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Ogłoszenie</th>
                <th>Spółka</th>
                <th>Źródło</th>
                <th>Aplikacje</th>
                <th>Ostatnio</th>
              </tr>
            </thead>
            <tbody>
              {topJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.companyName ?? "-"}</td>
                  <td>{job.source}</td>
                  <td>{job.applicationsCount}</td>
                  <td>{job.latestApplicationAt ? job.latestApplicationAt.slice(0, 10) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filterOptions.stages.length > 0 && (
          <p className="panel-note">Zdefiniowane etapy z danych: {filterOptions.stages.slice(0, 8).join(", ")}</p>
        )}
      </section>
    </div>
  );
}

export function ReportsView({ jobs, meta, dataQuality, managerReport }: ReportsViewProps) {
  const activeJobs = jobs.filter((job) => job.applicationsCount > 0);
  const companyApplicationCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    const key = job.companyName || "Brak spolki";
    acc[key] = (acc[key] ?? 0) + job.applicationsCount;
    return acc;
  }, {});
  const cityApplicationCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    const key = job.city || "Brak miasta";
    acc[key] = (acc[key] ?? 0) + job.applicationsCount;
    return acc;
  }, {});
  const topJobCounts = [...jobs]
    .sort((a, b) => b.applicationsCount - a.applicationsCount)
    .slice(0, 12)
    .reduce<Record<string, number>>((acc, job) => {
      const label = [job.title, job.companyName, job.city].filter(Boolean).join(" - ");
      acc[label || "Bez nazwy"] = job.applicationsCount;
      return acc;
    }, {});

  return (
    <div className="workspace-grid reports-view">
      <section className="info-panel full-span boss-report-panel">
        <div className="panel-heading-row">
          <h2><FileSpreadsheet size={18} /> Raport dla szefa: Manager Operacyjny</h2>
          <div>
            <button className="icon-button secondary" type="button" onClick={() => downloadManagerReportCsv(managerReport)}>
              <Download size={16} />
              CSV raport
            </button>
            <button className="icon-button secondary" type="button" onClick={() => window.print()}>
              <Printer size={16} />
              Drukuj / PDF
            </button>
          </div>
        </div>
        <p className="boss-report-summary">
          {managerReport.summary || "Raport zostanie pokazany po pobraniu danych z bazy."}
        </p>
        <div className="report-metrics quality-metrics">
          <MetricCard icon={FileSpreadsheet} label="CV na stanowisku" value={managerReport.totalCv} />
          <MetricCard icon={Users} label="Unikalne CV / osoby" value={managerReport.uniqueCv} />
          <MetricCard icon={ShieldCheck} label="OZE / energia bez dubli" value={managerReport.renewableEnergyUniqueCv} />
          <MetricCard icon={TriangleAlert} label="Duble zdjęte z raportu" value={managerReport.duplicateCvSkipped} />
        </div>
        <div className="boss-report-columns">
          <div>
            <h3>Podział po źródle</h3>
            <StatList entries={managerReport.bySource.map((entry) => [entry.label, entry.count])} />
          </div>
          <div>
            <h3>Podział po spółce</h3>
            <StatList entries={managerReport.byCompany.map((entry) => [entry.label, entry.count])} />
          </div>
        </div>
        <ul className="report-methodology">
          {managerReport.methodology.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="panel-note">
          Wygenerowano: {formatDateTime(managerReport.generatedAt || null)}
        </p>
      </section>
      <section className="report-metrics full-span">
        <MetricCard icon={Users} label="Kandydaci" value={meta.total} />
        <MetricCard icon={FileSpreadsheet} label="Aplikacje w bazie" value={dataQuality.totals.applications || meta.total} />
        <MetricCard icon={ShieldCheck} label="Ogłoszenia z aplikacjami" value={activeJobs.length} />
        <MetricCard icon={BriefcaseBusiness} label="Ogłoszenia" value={jobs.length} />
      </section>

      <section className="info-panel">
        <h2><Building2 size={18} /> Spółki</h2>
        <StatList entries={topEntries(companyApplicationCounts, 12)} />
      </section>

      <section className="info-panel">
        <h2><Database size={18} /> Źródła</h2>
        <StatList entries={Object.entries(meta.sourceCounts).sort((a, b) => b[1] - a[1])} />
      </section>

      <section className="info-panel">
        <h2><Clock size={18} /> Statusy</h2>
        <StatList entries={topEntries(topJobCounts, 12)} />
      </section>

      <section className="info-panel">
        <h2><BarChart3 size={18} /> Miasta</h2>
        <StatList entries={topEntries(cityApplicationCounts, 12)} />
      </section>

      <section className="info-panel full-span reports-quality-panel">
        <h2><TriangleAlert size={18} /> Kontrola jakości danych</h2>
        <div className="report-metrics quality-metrics">
          <MetricCard icon={BriefcaseBusiness} label="Bez ogłoszenia" value={dataQuality.totals.applicationsWithoutJob} />
          <MetricCard icon={Database} label="Bez ID zewnętrznego" value={dataQuality.totals.applicationsWithoutSourceExternalId} />
          <MetricCard icon={TriangleAlert} label="Podejrzenia duplikatów" value={dataQuality.totals.suspectedDuplicateGroups} />
          <MetricCard icon={Users} label="Kilka aplikacji osoby" value={dataQuality.totals.multiApplicationCandidates} />
        </div>
        <p className="panel-note">
          Duplikatem podejrzanym jest to samo zgłoszenie dla tego samego kandydata, źródła i ogłoszenia. Osobne aplikacje tej samej osoby na różne ogłoszenia są pokazane niżej jako normalny przypadek do kontroli, a nie błąd.
        </p>

        <QualityTable
          title="Podejrzane duplikaty aplikacji"
          empty="Brak podejrzanych duplikatów aplikacji."
          headers={["Kandydat", "Ogłoszenie", "Spółka", "Źródło", "Ile", "Ostatnio"]}
          rows={dataQuality.suspectedDuplicateApplications.map((group) => [
            group.candidateName,
            group.jobTitle ?? "Bez ogłoszenia",
            group.companyName ?? "-",
            group.source,
            String(group.count),
            formatDate(group.latestAppliedAt)
          ])}
        />

        <QualityTable
          title="Ta sama osoba w kilku aplikacjach"
          empty="Brak kandydatów z wieloma aplikacjami."
          headers={["Kandydat", "Aplikacje", "Ogłoszenia", "Źródła", "Procesy", "Ostatnio"]}
          rows={dataQuality.multiApplicationCandidates.map((candidate) => [
            candidate.candidateName,
            String(candidate.applicationCount),
            String(candidate.distinctJobs),
            String(candidate.distinctSources),
            candidate.jobs.join(", "),
            formatDate(candidate.latestAppliedAt)
          ])}
        />

        <QualityTable
          title="Wspólny email lub telefon w kilku kartach kandydata"
          empty="Brak podejrzanych powtórek po kontakcie."
          headers={["Typ", "Kontakt", "Kandydaci", "Aplikacje", "Nazwy"]}
          rows={dataQuality.sharedContactCandidates.map((group) => [
            group.type === "email" ? "Email" : "Telefon",
            group.value,
            String(group.candidateCount),
            String(group.applicationCount),
            group.candidateNames.join(", ")
          ])}
        />
      </section>
    </div>
  );
}

export function SettingsView({ user, filterOptions, jobs, meta, adminUsers, recentAuditLogs, onUsersChanged, onLogout }: SettingsViewProps) {
  const companies = filterOptions.companies.map((company) => company.name).sort((a, b) => a.localeCompare(b, "pl"));
  const trackedCompanies = ["Nova Contact", "Vector Sales", "North Services", "Delta Support", "Sigma Office"];

  return (
    <div className="workspace-grid two-columns">
      <section className="info-panel">
        <h2><Settings size={18} /> Konto</h2>
        <div className="settings-list">
          <InfoRow label="Użytkownik" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Rola" value={user.role} />
        </div>
        <div className="settings-actions">
          <button className="icon-button secondary" type="button" onClick={onLogout}>
            <LogOut size={16} />
            Wyloguj
          </button>
          <span>Wylogowanie jest też dostępne w lewym dolnym rogu panelu.</span>
        </div>
      </section>

      <section className="info-panel">
        <h2><Database size={18} /> System</h2>
        <div className="settings-list">
          <InfoRow label="Baza" value="MySQL - serwer CRM" />
          <InfoRow label="Frontend / API" value="Serwer CRM" />
          <InfoRow label="Rekordy CRM" value={String(meta.total)} />
          <InfoRow label="Ogłoszenia" value={String(jobs.length)} />
        </div>
      </section>

      <section className="info-panel">
        <h2><Building2 size={18} /> Spółki śledzone</h2>
        <div className="field-chip-list">
          {trackedCompanies.map((company) => <span key={company}>{company}</span>)}
        </div>
      </section>

      <section className="info-panel">
        <h2><KeyRound size={18} /> Uprawnienia</h2>
        <p className="panel-note">
          Zmiany statusów, etapów, notatek i CV są zapisywane z użytkownikiem oraz historią zmian. Sekrety integracji są maskowane w API.
        </p>
        <p className="panel-note">
          Konto pracownika tworzysz niżej: wpisujesz email, hasło startowe i rolę. Pracownik loguje się tymi danymi na stronie CRM.
        </p>
      </section>

      <section className="info-panel full-span">
        <h2><Building2 size={18} /> Spółki w bazie</h2>
        <div className="field-chip-list">
          {companies.map((company) => <span key={company}>{company}</span>)}
        </div>
      </section>

      {user.role === "ADMIN" && (
        <>
          <UserAdminPanel currentUser={user} users={adminUsers} onChanged={onUsersChanged} />
          <AuditActivityPanel logs={recentAuditLogs} />
        </>
      )}
    </div>
  );
}

function EndpointItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="report-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function downloadManagerReportCsv(report: JobCvReport) {
  const rows = [
    ["Raport", "Manager Operacyjny"],
    ["Wygenerowano", formatDateTime(report.generatedAt || null)],
    ["CV na stanowisku", report.totalCv],
    ["Unikalne CV / osoby", report.uniqueCv],
    ["OZE / energia bez dubli", report.renewableEnergyUniqueCv],
    ["Udzial OZE / energia", `${report.renewableEnergyShare}%`],
    ["Duble zdjete z raportu", report.duplicateCvSkipped],
    [],
    ["Podzial po zrodle"],
    ...report.bySource.map((entry) => [entry.label, entry.count]),
    [],
    ["Podzial po spolce"],
    ...report.byCompany.map((entry) => [entry.label, entry.count]),
    [],
    ["Metodologia"],
    ...report.methodology.map((item) => [item])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `raport-manager-operacyjny-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UserAdminPanel({ currentUser, users, onChanged }: {
  currentUser: User;
  users: AdminUser[];
  onChanged: () => void;
}) {
  const [busyUserId, setBusyUserId] = useState("");
  const [resetBusyUserId, setResetBusyUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "RECRUITER"
  });

  async function changeRole(userId: string, role: string) {
    setBusyUserId(userId);
    setMessage("");
    setError("");
    try {
      await updateAdminUser(userId, { role });
      setMessage("Zmieniono rolę użytkownika.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zmienić roli użytkownika.");
    } finally {
      setBusyUserId("");
    }
  }

  async function createUser() {
    setCreating(true);
    setMessage("");
    setError("");
    try {
      await createAdminUser(newUser);
      setNewUser({ name: "", email: "", password: "", role: "RECRUITER" });
      setMessage("Utworzono konto pracownika.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć konta pracownika.");
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(userId: string) {
    const password = resetPasswords[userId] ?? "";
    setResetBusyUserId(userId);
    setMessage("");
    setError("");
    try {
      await resetAdminUserPassword(userId, password);
      setResetPasswords((current) => ({ ...current, [userId]: "" }));
      setMessage("Zresetowano hasło użytkownika.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zresetować hasła użytkownika.");
    } finally {
      setResetBusyUserId("");
    }
  }

  return (
    <section className="info-panel full-span">
      <h2><ShieldCheck size={18} /> Użytkownicy i role</h2>
      <p className="panel-note">
        Admin dodaje konto pracownika tutaj, a potem przekazuje mu email i hasło startowe. Po zalogowaniu każda zmiana statusu, etapu, CV i notatki zapisuje się na konto tej osoby.
      </p>
      <div className="role-helper-grid">
        <div>
          <strong>VIEWER</strong>
          <span>podglad kandydatow, ogloszen i raportow bez edycji</span>
        </div>
        <div>
          <strong>RECRUITER</strong>
          <span>praca na kandydatach, notatki i statusy</span>
        </div>
        <div>
          <strong>MANAGER</strong>
          <span>raporty i kontrola procesu rekrutacji</span>
        </div>
        <div>
          <strong>ADMIN</strong>
          <span>użytkownicy, integracje i konfiguracja</span>
        </div>
      </div>
      {message && <p className="mini-success">{message}</p>}
      {error && <p className="mini-error">{error}</p>}

      <div className="user-create-form">
        <label>
          Imię i nazwisko
          <input
            value={newUser.name}
            onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
            placeholder="np. Anna Kowalska"
          />
        </label>
        <label>
          Email
          <input
            value={newUser.email}
            onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
            placeholder="anna@firma.pl"
            type="email"
          />
        </label>
        <label>
          Hasło startowe
          <input
            value={newUser.password}
            onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
            placeholder="min. 8 znaków"
            type="password"
          />
        </label>
        <label>
          Rola
          <select
            value={newUser.role}
            onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="VIEWER">VIEWER</option>
            <option value="RECRUITER">RECRUITER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <button
          className="icon-button primary"
          disabled={creating || !newUser.name || !newUser.email || newUser.password.length < 8}
          onClick={() => void createUser()}
        >
          <Users size={16} />
          Dodaj pracownika
        </button>
      </div>

      <div className="compact-table-wrap">
        <table className="compact-table user-admin-table">
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Email</th>
              <th>Rola</th>
              <th>Aplikacje</th>
              <th>Notatki</th>
              <th>Zmiany</th>
              <th>Reset hasła</th>
              <th>Utworzono</th>
            </tr>
          </thead>
          <tbody>
            {users.map((adminUser) => (
              <tr key={adminUser.id}>
                <td>
                  <strong>{adminUser.name}</strong>
                  {adminUser.id === currentUser.id && <span className="inline-note">to Ty</span>}
                </td>
                <td>{adminUser.email}</td>
                <td>
                  <select
                    value={adminUser.role}
                    disabled={busyUserId === adminUser.id}
                    onChange={(event) => void changeRole(adminUser.id, event.target.value)}
                    aria-label={`Rola użytkownika ${adminUser.name}`}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="RECRUITER">RECRUITER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </td>
                <td>{adminUser.ownedApplications}</td>
                <td>{adminUser.notes}</td>
                <td>{adminUser.auditLogs}</td>
                <td>
                  <div className="password-reset-row">
                    <input
                      value={resetPasswords[adminUser.id] ?? ""}
                      onChange={(event) => setResetPasswords((current) => ({ ...current, [adminUser.id]: event.target.value }))}
                      placeholder="nowe hasło"
                      type="password"
                    />
                    <button
                      className="table-action-button"
                      disabled={resetBusyUserId === adminUser.id || (resetPasswords[adminUser.id] ?? "").length < 8}
                      onClick={() => void resetPassword(adminUser.id)}
                    >
                      Reset
                    </button>
                  </div>
                </td>
                <td>{formatDate(adminUser.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className="panel-note">Brak użytkowników do pokazania.</p>}
    </section>
  );
}

function AuditActivityPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="info-panel full-span">
      <h2><Clock size={18} /> Ostatnia aktywność</h2>
      <p className="panel-note">
        Ostatnie ręczne zmiany w CRM: statusy, role, notatki, CV, przypisania i inne działania zapisane w audycie.
      </p>
      <div className="compact-table-wrap">
        <table className="compact-table audit-activity-table">
          <thead>
            <tr>
              <th>Kiedy</th>
              <th>Kto</th>
              <th>Obiekt</th>
              <th>Pole</th>
              <th>Poprzednio</th>
              <th>Teraz</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>
                  <strong>{log.userName}</strong>
                  {log.userEmail && <span className="table-subtext">{log.userEmail}</span>}
                </td>
                <td>{entityLabel(log.entityType)}</td>
                <td>{fieldLabel(log.fieldName)}</td>
                <td>{shortValue(log.previousValue)}</td>
                <td>{shortValue(log.nextValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && <p className="panel-note">Brak wpisów audytu do pokazania.</p>}
    </section>
  );
}

function StatList({ entries }: { entries: Array<[string, number]> }) {
  if (entries.length === 0) return <p className="panel-note">Brak danych.</p>;
  const max = Math.max(...entries.map(([, count]) => count), 1);
  return (
    <div className="stat-list">
      {entries.map(([label, count]) => (
        <div key={label} className="stat-row">
          <span>{label}</span>
          <strong>{count}</strong>
          <i style={{ width: `${Math.max(6, (count / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function QualityTable({ title, empty, headers, rows }: {
  title: string;
  empty: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="quality-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="panel-note">{empty}</p>
      ) : (
        <div className="compact-table-wrap">
          <table className="compact-table quality-table">
            <thead>
              <tr>
                {headers.map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell || "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function topEntries(values: Record<string, number>, limit: number): Array<[string, number]> {
  return Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pl-PL");
}

function entityLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    Application: "Aplikacja",
    Candidate: "Kandydat",
    User: "Użytkownik"
  };
  return value ? labels[value] ?? value : "-";
}

function fieldLabel(value: string) {
  const labels: Record<string, string> = {
    status: "Status",
    stage: "Etap",
    ownerId: "Opiekun",
    job: "Ogłoszenie",
    company: "Spółka",
    aiScore: "Ocena AI",
    aiNote: "Notatka AI",
    customFields: "Pola procesu",
    note: "Notatka",
    document: "CV / dokument",
    role: "Rola",
    name: "Nazwa",
    password: "Hasło",
    created: "Utworzenie"
  };
  return labels[value] ?? value;
}

function shortValue(value: string | null) {
  if (!value) return "-";
  return value.length > 90 ? `${value.slice(0, 90)}...` : value;
}

function uniqueRawColumns(candidates: Candidate[]) {
  return Array.from(new Set(candidates.flatMap((candidate) => Object.keys(candidate.rawFields))))
    .filter((field) => !["stan", "f"].includes(field))
    .sort((a, b) => a.localeCompare(b, "pl"));
}

function sampleForStage(candidates: Candidate[], stage: string) {
  const sample = candidates.find((candidate) => (candidate.stage || candidate.status || "Nowy") === stage);
  if (!sample) return "Brak przykładowego kandydata";
  return [sample.fullName, sample.companyName, sample.city].filter(Boolean).join(" · ");
}
