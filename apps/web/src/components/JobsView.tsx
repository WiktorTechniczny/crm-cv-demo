import { useMemo, useState, type ReactNode } from "react";
import { BriefcaseBusiness, Building2, ExternalLink, Search, Users } from "lucide-react";
import type { JobSummary } from "../types.js";

interface JobsViewProps {
  jobs: JobSummary[];
  loading: boolean;
  unassignedApplications: number;
  onShowCandidates: (job: JobSummary) => void;
  onShowUnassignedCandidates: () => void;
}

type CompanyTab = {
  id: string;
  label: string;
  count: number;
};

const targetCompanies = [
  "Nova Contact",
  "Vector Sales",
  "North Services",
  "Delta Support",
  "Sigma Office"
];

const operationalLookbackDays = 120;

export function JobsView({
  jobs,
  loading,
  unassignedApplications,
  onShowCandidates,
  onShowUnassignedCandidates
}: JobsViewProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [companyTab, setCompanyTab] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  const sourceAndQueryFiltered = useMemo(() => {
    const normalized = query.toLocaleLowerCase("pl-PL");
    return jobs.filter((job) => {
      const matchesSource = source ? job.source === source : true;
      const matchesActivity = showInactive ? true : isOperationalJob(job);
      const searchable = [
        job.title,
        job.city,
        job.companyName,
        job.portalJobId,
        job.sourceFile,
        job.sourceSheet,
        ...job.listingTitles
      ].filter(Boolean).join(" ").toLocaleLowerCase("pl-PL");
      return matchesSource && matchesActivity && (!normalized || searchable.includes(normalized));
    }).sort(compareJobsByRecency);
  }, [jobs, query, source, showInactive]);

  const companyTabs = useMemo(() => buildCompanyTabs(sourceAndQueryFiltered), [sourceAndQueryFiltered]);
  const filtered = useMemo(() => {
    if (companyTab === "all") return sourceAndQueryFiltered;
    if (companyTab === "other") {
      return sourceAndQueryFiltered.filter((job) => !targetCompanies.includes(normalizedCompany(job.companyName)));
    }
    return sourceAndQueryFiltered.filter((job) => normalizedCompany(job.companyName) === companyTab);
  }, [sourceAndQueryFiltered, companyTab]);
  const summary = useMemo(() => summarizeJobs(filtered), [filtered]);

  if (loading) {
    return <section className="main-panel empty-state">Ładowanie ogłoszeń...</section>;
  }

  return (
    <section className="jobs-panel">
      <div className="jobs-summary-grid">
        <SummaryCard icon={<BriefcaseBusiness size={18} />} label={showInactive ? "Ogłoszenia" : "Aktywne ogłoszenia"} value={filtered.length} />
        <SummaryCard icon={<Users size={18} />} label="Aplikacje" value={summary.applications} />
        <SummaryCard
          icon={<Users size={18} />}
          label="Bez ogłoszenia"
          value={unassignedApplications}
          onClick={unassignedApplications > 0 ? onShowUnassignedCandidates : undefined}
        />
        <SummaryCard icon={<Building2 size={18} />} label="Spółki" value={summary.companies} />
        <SummaryCard icon={<Search size={18} />} label="Pracuj.pl / OLX" value={`${summary.pracuj} / ${summary.olx}`} />
      </div>

      <div className="jobs-toolbar">
        <label className="searchbox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj stanowiska, miasta, spółki" />
        </label>
        <select value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">Wszystkie źródła</option>
          <option value="PRACUJ">Pracuj.pl</option>
          <option value="OLX">OLX</option>
          <option value="CSV">CSV</option>
          <option value="MANUAL">Ręcznie</option>
          <option value="OTHER">Inne</option>
        </select>
        <label className="compact-toggle">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Pokaż nieaktywne / puste
        </label>
      </div>

      <div className="company-tabs" aria-label="Zakładki spółek ogłoszeń">
        {companyTabs.map((tab) => (
          <button
            key={tab.id}
            className={companyTab === tab.id ? "active" : ""}
            type="button"
            onClick={() => setCompanyTab(tab.id)}
          >
            {tab.label}
            <small>{tab.count}</small>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">Brak ogłoszeń dla wybranych filtrów.</div>
      ) : (
        <div className="table-wrap jobs-table-wrap">
          <table className="candidate-table jobs-table">
            <colgroup>
              <col className="jobs-col-title" />
              <col className="jobs-col-company" />
              <col className="jobs-col-city" />
              <col className="jobs-col-source" />
              <col className="jobs-col-count" />
              <col className="jobs-col-date" />
              <col className="jobs-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Ogłoszenie</th>
                <th>Spółka</th>
                <th>Miasto</th>
                <th>Źródło</th>
                <th>Aplikacje</th>
                <th>Ostatnia aplikacja</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong title={job.title}>{job.title}</strong>
                    {job.listingTitles.length > 0 && (
                      <span className="table-subtext">{job.listingTitles.slice(0, 2).join(" · ")}</span>
                    )}
                  </td>
                  <td>{job.companyName ?? "-"}</td>
                  <td>{job.city ?? "-"}</td>
                  <td><span className="badge source">{job.source}</span></td>
                  <td><strong>{job.applicationsCount}</strong></td>
                  <td>{job.latestApplicationAt ? job.latestApplicationAt.slice(0, 10) : "-"}</td>
                  <td className="job-actions-cell">
                    <button className="table-action-button" type="button" onClick={() => onShowCandidates(job)}>
                      <Users size={15} />
                      Kandydaci
                    </button>
                    {job.url ? (
                      <a className="table-link" href={job.url} target="_blank" rel="noreferrer" aria-label="Otwórz ogłoszenie">
                        <ExternalLink size={16} />
                      </a>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  onClick
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  const content = (
    <>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (onClick) {
    return (
      <button className="jobs-summary-card is-action" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className="jobs-summary-card">
      {content}
    </div>
  );
}

function buildCompanyTabs(jobs: JobSummary[]): CompanyTab[] {
  const counts = countCompanies(jobs);
  const tabs = [
    { id: "all", label: "Wszystkie", count: jobs.length },
    ...targetCompanies.map((company) => ({
      id: company,
      label: company,
      count: counts.get(company) ?? 0
    }))
  ];
  const otherCount = jobs.filter((job) => !targetCompanies.includes(normalizedCompany(job.companyName))).length;
  if (otherCount > 0) {
    tabs.push({ id: "other", label: "Pozostałe", count: otherCount });
  }
  return tabs;
}

function countCompanies(jobs: JobSummary[]) {
  const counts = new Map<string, number>();
  jobs.forEach((job) => {
    const company = normalizedCompany(job.companyName);
    counts.set(company, (counts.get(company) ?? 0) + 1);
  });
  return counts;
}

function normalizedCompany(value: string | null) {
  const normalized = (value || "Brak spółki").trim();
  const key = normalized.toLocaleLowerCase("pl-PL");
  if (key === "nc") return "Nova Contact";
  if (key === "vector") return "Vector Sales";
  return normalized;
}

function isOperationalJob(job: JobSummary) {
  if (!job.latestApplicationAt) return false;
  const latest = new Date(job.latestApplicationAt);
  if (Number.isNaN(latest.getTime())) return job.applicationsCount > 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - operationalLookbackDays);
  return latest >= cutoff;
}

function compareJobsByRecency(left: JobSummary, right: JobSummary) {
  const rightTime = jobRecencyTime(right);
  const leftTime = jobRecencyTime(left);
  if (rightTime !== leftTime) return rightTime - leftTime;
  if (right.applicationsCount !== left.applicationsCount) return right.applicationsCount - left.applicationsCount;
  return left.title.localeCompare(right.title, "pl");
}

function jobRecencyTime(job: JobSummary) {
  const latest = job.latestApplicationAt ? new Date(job.latestApplicationAt).getTime() : 0;
  if (Number.isFinite(latest) && latest > 0) return latest;
  const updated = job.updatedAt ? new Date(job.updatedAt).getTime() : 0;
  return Number.isFinite(updated) ? updated : 0;
}

function summarizeJobs(jobs: JobSummary[]) {
  return {
    applications: jobs.reduce((sum, job) => sum + job.applicationsCount, 0),
    companies: new Set(jobs.map((job) => normalizedCompany(job.companyName))).size,
    pracuj: jobs.filter((job) => job.source === "PRACUJ").length,
    olx: jobs.filter((job) => job.source === "OLX").length
  };
}
