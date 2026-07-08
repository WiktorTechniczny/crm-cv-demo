import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Clock3, Copy, KeyRound, Link2, ListChecks, Play, RefreshCcw, Save, Settings, TriangleAlert, Webhook } from "lucide-react";
import {
  fetchPortalConnections,
  fetchSyncRuns,
  probePortalConnection,
  savePortalConnection,
  startEnabledSyncs,
  startSync
} from "../api.js";
import type { PortalConnection, PortalProbeResult, SyncRun } from "../types.js";
import type { Notify } from "./toastTypes.js";

type DraftConnection = {
  apiUrl: string;
  jobsApiUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  webhookSecret: string;
  panelSyncEnabled: boolean;
  panelProfileDir: string;
  enabled: boolean;
};

type NewConnectionDraft = {
  source: "PRACUJ" | "OLX";
  companyName: string;
  accountEmail: string;
};

type SyncPanelTab = "accounts" | "configuration" | "panel";

const cronScheduleText = "Automat serwerowy: codziennie 05:00";
const targetCompanies = ["Nova Contact", "Vector Sales", "North Services", "Delta Support", "Sigma Office"];
const emptyNewConnection: NewConnectionDraft = {
  source: "PRACUJ",
  companyName: targetCompanies[0],
  accountEmail: ""
};

export function SyncPanel({ onNotify }: { onNotify?: Notify }) {
  const [connections, setConnections] = useState<PortalConnection[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftConnection>>({});
  const [probeResults, setProbeResults] = useState<Record<string, PortalProbeResult>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newConnection, setNewConnection] = useState<NewConnectionDraft>(emptyNewConnection);
  const [activeTab, setActiveTab] = useState<SyncPanelTab>("accounts");

  useEffect(() => {
    void load();
  }, []);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const automationSummary = useMemo(() => summarizeAutomation(connections, runs), [connections, runs]);

  async function load() {
    setError("");
    try {
      const [nextConnections, nextRuns] = await Promise.all([
        fetchPortalConnections(),
        fetchSyncRuns()
      ]);
      setConnections(nextConnections);
      setRuns(nextRuns);
      setDrafts(Object.fromEntries(nextConnections.map((connection) => [
        connection.id,
        {
          apiUrl: connection.apiUrl ?? "",
          jobsApiUrl: connection.jobsApiUrl ?? "",
          clientId: connection.clientId ?? "",
          clientSecret: "",
          accessToken: "",
          refreshToken: "",
          webhookSecret: "",
          panelSyncEnabled: connection.panelSyncEnabled,
          panelProfileDir: connection.panelProfileDir ?? "",
          enabled: connection.enabled
        }
      ])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać synchronizacji");
    }
  }

  function updateDraft(id: string, patch: Partial<DraftConnection>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch
      }
    }));
  }

  async function save(connection: PortalConnection) {
    const draft = drafts[connection.id];
    if (!draft) return;
    setBusyId(connection.id);
    setError("");
    setMessage("");
    try {
      await savePortalConnection(connection.id, {
        name: connection.name,
        source: connection.source,
        companyName: connection.companyName,
        accountEmail: connection.accountEmail,
        apiUrl: draft.apiUrl,
        jobsApiUrl: draft.jobsApiUrl,
        panelSyncEnabled: draft.panelSyncEnabled,
        panelProfileDir: draft.panelProfileDir,
        clientId: draft.clientId,
        clientSecret: draft.clientSecret || undefined,
        accessToken: draft.accessToken || undefined,
        refreshToken: draft.refreshToken || undefined,
        webhookSecret: draft.webhookSecret || undefined,
        enabled: draft.enabled
      });
      setMessage(`Zapisano połączenie ${connection.name}.`);
      await load();
      onNotify?.({ kind: "success", title: "Połączenie zapisane", body: connection.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać połączenia");
    } finally {
      setBusyId("");
    }
  }

  async function run(connection: PortalConnection) {
    setBusyId(connection.id);
    setError("");
    setMessage("");
    try {
      const nextRun = await startSync(connection.id);
      setRuns((current) => [nextRun, ...current.filter((item) => item.id !== nextRun.id)]);
      onNotify?.({ kind: "info", title: "Synchronizacja uruchomiona", body: connection.name });
      setMessage(`Uruchomiono synchronizację ${connection.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się uruchomić synchronizacji");
      await load();
    } finally {
      setBusyId("");
    }
  }

  async function probe(connection: PortalConnection) {
    setBusyId(probeBusyId(connection.id));
    setError("");
    setMessage("");
    try {
      const result = await probePortalConnection(connection.id);
      setProbeResults((current) => ({ ...current, [connection.id]: result }));
      onNotify?.({
        kind: "success",
        title: "Sprawdzono połączenie",
        body: `${connection.name}: ogłoszenia ${result.jobsSeen}, aplikacje ${result.applicationsSeen}.`
      });
      setMessage(`Sprawdzono API ${connection.name}. Ogłoszenia: ${result.jobsSeen}, aplikacje: ${result.applicationsSeen}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się sprawdzić API portalu");
    } finally {
      setBusyId("");
    }
  }

  async function runAllEnabled() {
    setBusyId("all");
    setError("");
    setMessage("");
    try {
      const result = await startEnabledSyncs();
      setRuns((current) => [
        ...result.runs,
        ...current.filter((item) => !result.runs.some((run) => run.id === item.id))
      ]);
      onNotify?.({
        kind: result.failed > 0 ? "error" : "success",
        title: "Synchronizacja zakończona",
        body: `Sprawdzono ${result.checked}, sukces ${result.success}, błędy ${result.failed}.`
      });
      setMessage(`Pobrano aktywne źródła. Sprawdzono: ${result.checked}, sukces: ${result.success}, błędy: ${result.failed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać aktywnych źródeł");
      await load();
    } finally {
      setBusyId("");
    }
  }

  async function copyWebhook(connection: PortalConnection) {
    const value = `${origin}${webhookPath(connection)}`;
    await navigator.clipboard?.writeText(value);
    setMessage(`Skopiowano webhook ${connection.name}.`);
    onNotify?.({ kind: "success", title: "Webhook skopiowany", body: connection.name });
  }

  async function createConnection() {
    const companyName = newConnection.companyName.trim();
    const accountEmail = newConnection.accountEmail.trim();
    const sourceLabel = newConnection.source === "PRACUJ" ? "Pracuj.pl" : "OLX Praca";
    const name = [sourceLabel, companyName, accountEmail].filter(Boolean).join(" · ");
    if (!companyName && !accountEmail) {
      setError("Wpisz spółkę albo email konta portalu, żeby nazwać nowe połączenie.");
      return;
    }

    setBusyId("create-connection");
    setError("");
    setMessage("");
    try {
      await savePortalConnection(null, {
        source: newConnection.source,
        name,
        companyName,
        accountEmail,
        panelSyncEnabled: true,
        panelProfileDir: panelProfileDir(newConnection.source, companyName, accountEmail),
        enabled: false
      });
      setNewConnection(emptyNewConnection);
      setMessage(`Dodano połączenie ${name}. Uzupełnij API URL i tokeny, a potem włącz synchronizację.`);
      await load();
      onNotify?.({ kind: "success", title: "Dodano konto portalu", body: name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać połączenia portalu");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mini-panel sync-panel">
      <h3><RefreshCcw size={16} /> Synchronizacja API</h3>
      <p className="panel-note">
        Automat serwerowy codziennie pobiera nowe aplikacje z Pracuj.pl i OLX oraz zapisuje wynik w historii synchronizacji.
      </p>
      {error && <p className="mini-error">{error}</p>}
      {message && <p className="mini-success">{message}</p>}

      <div className="automation-status-grid">
        <AutomationStatus icon={<Clock3 size={17} />} label="Cron" value={cronScheduleText} ok />
        <AutomationStatus
          icon={<Link2 size={17} />}
          label="Połączenia gotowe"
          value={`${automationSummary.readyConnections}/${connections.length || 0}`}
          ok={automationSummary.readyConnections > 0}
        />
        <AutomationStatus
          icon={<Webhook size={17} />}
          label="Webhooki z sekretem"
          value={`${automationSummary.webhookReady}/${connections.length || 0}`}
          ok={automationSummary.webhookReady > 0}
        />
        <AutomationStatus
          icon={<CheckCircle2 size={17} />}
          label="Ostatni wynik"
          value={automationSummary.lastRunText}
          ok={automationSummary.lastRunOk}
        />
      </div>

      <div className="sync-primary-actions">
        <button
          className="icon-button primary"
          disabled={busyId === "all" || automationSummary.readyConnections === 0}
          onClick={() => void runAllEnabled()}
          title={automationSummary.readyConnections === 0 ? "Najpierw włącz połączenie i uzupełnij API URL" : "Pobierz aplikacje ze wszystkich aktywnych połączeń"}
        >
          <RefreshCcw size={16} />
          Pobierz teraz aktywne
        </button>
        <span>To uruchamia te same połączenia, których używa automat serwerowy.</span>
      </div>

      <div className="sync-tabs" aria-label="Zakładki synchronizacji">
        <button className={activeTab === "accounts" ? "active" : ""} onClick={() => setActiveTab("accounts")} type="button">
          <ListChecks size={16} />
          Połączone konta
          <span>{connections.length}</span>
        </button>
        <button className={activeTab === "configuration" ? "active" : ""} onClick={() => setActiveTab("configuration")} type="button">
          <Settings size={16} />
          Konfiguracja API
        </button>
        <button className={activeTab === "panel" ? "active" : ""} onClick={() => setActiveTab("panel")} type="button">
          <Webhook size={16} />
          Import z panelu
        </button>
      </div>

      {activeTab === "accounts" && (
        <>
          <div className="connection-onboarding">
            <div>
              <strong>Dodaj konto portalu do podpięcia</strong>
              <p>
                Jedno konto w portalu zapisujemy jako osobne połączenie. Tu wpisujemy nazwę spółki i email konta,
                a hasła do OLX/Pracuj nie są zapisywane w CRM. Robot korzysta z normalnie zalogowanej sesji portalu.
              </p>
            </div>
            <div className="new-connection-form">
              <label>
                Portal
                <select
                  value={newConnection.source}
                  onChange={(event) => setNewConnection((current) => ({ ...current, source: event.target.value as NewConnectionDraft["source"] }))}
                >
                  <option value="PRACUJ">Pracuj.pl</option>
                  <option value="OLX">OLX Praca</option>
                </select>
              </label>
              <label>
                Spółka
                <select
                  value={newConnection.companyName}
                  onChange={(event) => setNewConnection((current) => ({ ...current, companyName: event.target.value }))}
                >
                  {targetCompanies.map((company) => <option key={company} value={company}>{company}</option>)}
                  <option value="">Inna / wpiszę w emailu</option>
                </select>
              </label>
              <label>
                Email konta portalu
                <input
                  value={newConnection.accountEmail}
                  onChange={(event) => setNewConnection((current) => ({ ...current, accountEmail: event.target.value }))}
                  placeholder="np. rekrutacja@firma.test"
                />
              </label>
              <button
                className="icon-button secondary"
                disabled={busyId === "create-connection"}
                onClick={() => void createConnection()}
                type="button"
              >
                <Link2 size={16} />
                Dodaj konto
              </button>
            </div>
            <div className="connection-requirements">
              <strong>Do realnej synchronizacji potrzebne są:</strong>
              <span>API URL aplikacji kandydatów i CV</span>
              <span>API URL aktywnych ogłoszeń</span>
              <span>Client ID / token API / refresh token, jeśli portal wymaga autoryzacji</span>
              <span>Webhook secret, jeśli portal potrafi wysyłać nowe aplikacje automatycznie</span>
            </div>
          </div>

          <ConnectedAccountsTable
            busyId={busyId}
            connections={connections}
            drafts={drafts}
            runs={runs}
            onConfigure={() => setActiveTab("configuration")}
            onProbe={probe}
            onRun={run}
          />
        </>
      )}

      {activeTab === "configuration" && (
        <div className="connection-list">
          {connections.map((connection) => {
            const draft = drafts[connection.id];
            const status = connectionStatus(connection, draft);
            const lastRun = runs.find((run) => run.connectionId === connection.id || run.source === connection.source);
            const probeResult = probeResults[connection.id];
            const isConnectionBusy = busyId === connection.id || busyId === probeBusyId(connection.id);
            const canProbe = Boolean(connection.apiUrl || connection.jobsApiUrl);
            return (
              <article className="connection-card" key={connection.id}>
                <div className="connection-header">
                  <div>
                    <strong>{connection.name}</strong>
                    <span>{sourceName(connection.source)}</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={draft?.enabled ?? connection.enabled}
                      onChange={(event) => updateDraft(connection.id, { enabled: event.target.checked })}
                    />
                    <span>{draft?.enabled ?? connection.enabled ? "aktywne" : "wyłączone"}</span>
                  </label>
                </div>

                <div className={`connection-readiness ${status.ready ? "ready" : "missing"}`}>
                  {status.ready ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
                  <div>
                    <strong>{status.label}</strong>
                    <span>{status.description}</span>
                  </div>
                </div>

                <div className="webhook-row">
                  <div>
                    <span>Webhook do portalu</span>
                    <code>{origin}{webhookPath(connection)}</code>
                  </div>
                  <button className="icon-only-button" type="button" onClick={() => void copyWebhook(connection)} aria-label={`Kopiuj webhook ${connection.name}`}>
                    <Copy size={15} />
                  </button>
                </div>

                <div className="connection-fields">
                  <label className="connection-wide-field">
                    Tryb synchronizacji
                    <select
                      value={draft?.panelSyncEnabled ? "panel" : "api"}
                      onChange={(event) => updateDraft(connection.id, { panelSyncEnabled: event.target.value === "panel" })}
                    >
                      <option value="panel">Panel / RPA bez oficjalnego API</option>
                      <option value="api">Oficjalne API / webhook</option>
                    </select>
                  </label>
                  <label className="connection-wide-field">
                    Profil sesji robota
                    <input
                      value={draft?.panelProfileDir ?? ""}
                      onChange={(event) => updateDraft(connection.id, { panelProfileDir: event.target.value })}
                      placeholder="np. olx-lex-protecta-rekrutacja"
                    />
                  </label>
                  <label className="connection-wide-field">
                    API URL aplikacji / CV
                    <input
                      value={draft?.apiUrl ?? ""}
                      onChange={(event) => updateDraft(connection.id, { apiUrl: event.target.value })}
                      placeholder="https://... endpoint z aplikacjami kandydatów"
                    />
                  </label>
                  <label className="connection-wide-field">
                    API URL ogłoszeń
                    <input
                      value={draft?.jobsApiUrl ?? ""}
                      onChange={(event) => updateDraft(connection.id, { jobsApiUrl: event.target.value })}
                      placeholder="https://... endpoint z aktywnymi ogłoszeniami"
                    />
                  </label>
                  <label>
                    Client ID
                    <input
                      value={draft?.clientId ?? ""}
                      onChange={(event) => updateDraft(connection.id, { clientId: event.target.value })}
                      placeholder="ID aplikacji portalu"
                    />
                  </label>
                  <label>
                    Sekret klienta
                    <input
                      value={draft?.clientSecret ?? ""}
                      onChange={(event) => updateDraft(connection.id, { clientSecret: event.target.value })}
                      placeholder={connection.hasClientSecret ? "zapisany, wpisz aby zmienić" : "brak"}
                      type="password"
                    />
                  </label>
                  <label>
                    Access token
                    <input
                      value={draft?.accessToken ?? ""}
                      onChange={(event) => updateDraft(connection.id, { accessToken: event.target.value })}
                      placeholder={connection.hasAccessToken ? "zapisany, wpisz aby zmienić" : "brak"}
                      type="password"
                    />
                  </label>
                  <label>
                    Refresh token
                    <input
                      value={draft?.refreshToken ?? ""}
                      onChange={(event) => updateDraft(connection.id, { refreshToken: event.target.value })}
                      placeholder={connection.hasRefreshToken ? "zapisany, wpisz aby zmienić" : "brak"}
                      type="password"
                    />
                  </label>
                  <label className="connection-wide-field">
                    Webhook secret
                    <input
                      value={draft?.webhookSecret ?? ""}
                      onChange={(event) => updateDraft(connection.id, { webhookSecret: event.target.value })}
                      placeholder={connection.hasWebhookSecret ? "zapisany, wpisz aby zmienić" : "opcjonalny sekret nagłówka webhooka"}
                      type="password"
                    />
                  </label>
                </div>

                <div className="connection-actions">
                  <button className="icon-button secondary" disabled={isConnectionBusy} onClick={() => void save(connection)}>
                    <Save size={16} />
                    Zapisz
                  </button>
                  <button
                    className="icon-button"
                    disabled={isConnectionBusy || !canProbe}
                    onClick={() => void probe(connection)}
                    title={canProbe ? "Sprawdź realną odpowiedź API bez importu" : "Najpierw zapisz API URL."}
                  >
                    <CheckCircle2 size={16} />
                    Sprawdź API
                  </button>
                  <button
                    className="icon-button"
                    disabled={isConnectionBusy || !status.canStart}
                    onClick={() => void run(connection)}
                    title={status.canStart ? "Pobierz i zapisz aplikacje teraz" : status.description}
                  >
                    <Play size={16} />
                    Importuj teraz
                  </button>
                  <span><KeyRound size={14} /> Sekrety są maskowane w API</span>
                </div>

                {probeResult && <ProbeResultView result={probeResult} />}

                <div className="connection-run-note">
                  <span>Ostatnio</span>
                  <strong>{lastRun ? `${statusLabel(lastRun.status)} · ${formatDate(lastRun.finishedAt ?? lastRun.createdAt)}` : "Brak uruchomień"}</strong>
                  {lastRun?.message && <small>{lastRun.message}</small>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeTab === "panel" && (
        <div className="connection-onboarding">
          <div>
            <strong>Tryb bez oficjalnego API</strong>
            <p>
              Robot czyta zalogowany panel OLX albo Pracuj.pl, zbiera widoczne ogłoszenia, aplikacje i linki CV,
              a potem wysyła paczkę JSON do CRM. Nie zapisujemy tu haseł portali.
            </p>
          </div>
          <div className="connection-requirements">
            <strong>Endpoint dla robota:</strong>
            <code>{origin}/api/panel-imports</code>
            <span>Nagłówek: x-portal-secret = PORTAL_SECRET_KEY</span>
            <span>Payload: source, jobs, applications</span>
            <span>Duplikaty blokuje ID aplikacji portalu albo dedupe po kandydacie i ogłoszeniu.</span>
          </div>
        </div>
      )}

      <div className="sync-list">
        <strong>Ostatnie uruchomienia</strong>
        {runs.slice(0, 6).map((run) => (
          <div key={run.id}>
            <span>{run.connectionName ?? sourceName(run.source)} · {statusLabel(run.status)}</span>
            <small>{run.message ?? "Brak komunikatu"}</small>
          </div>
        ))}
        {runs.length === 0 && <p>Brak uruchomień synchronizacji.</p>}
      </div>
    </section>
  );
}

function ConnectedAccountsTable({
  busyId,
  connections,
  drafts,
  runs,
  onConfigure,
  onProbe,
  onRun
}: {
  busyId: string;
  connections: PortalConnection[];
  drafts: Record<string, DraftConnection>;
  runs: SyncRun[];
  onConfigure: () => void;
  onProbe: (connection: PortalConnection) => void | Promise<void>;
  onRun: (connection: PortalConnection) => void | Promise<void>;
}) {
  if (connections.length === 0) {
    return <div className="empty-state">Brak podpiętych kont portali. Dodaj konto spółki powyżej.</div>;
  }

  return (
    <div className="connected-accounts">
      <div className="connected-accounts-header">
        <strong>Połączone konta</strong>
        <span>{connections.length} kont do obsługi synchronizacji</span>
      </div>
      <div className="connected-accounts-table-wrap">
        <table className="connected-accounts-table">
          <thead>
            <tr>
              <th>Konto / spółka</th>
              <th>Portal</th>
              <th>API</th>
              <th>Tokeny</th>
              <th>Webhook</th>
              <th>Status</th>
              <th>Ostatnio</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((connection) => {
              const draft = drafts[connection.id];
              const status = connectionStatus(connection, draft);
              const lastRun = runs.find((run) => run.connectionId === connection.id || run.source === connection.source);
              const canProbe = !connection.panelSyncEnabled && Boolean(connection.apiUrl || connection.jobsApiUrl);
              const isConnectionBusy = busyId === connection.id || busyId === probeBusyId(connection.id);
              return (
                <tr key={connection.id}>
                  <td>
                    <strong>{connection.name}</strong>
                    <small>{[connection.companyName, connection.accountEmail].filter(Boolean).join(" · ") || (connection.enabled ? "aktywne" : "wyłączone")}</small>
                  </td>
                  <td>{sourceName(connection.source)}</td>
                  <td>
                    <ConnectionFlag ok={connection.panelSyncEnabled || Boolean(connection.apiUrl)} label={connection.panelSyncEnabled ? "panel/RPA" : "aplikacje"} />
                    <ConnectionFlag ok={connection.panelSyncEnabled || Boolean(connection.jobsApiUrl)} label="ogłoszenia" />
                  </td>
                  <td>
                    <ConnectionFlag ok={connection.hasAccessToken || connection.hasClientSecret || connection.hasRefreshToken} label="autoryzacja" />
                  </td>
                  <td>
                    <ConnectionFlag ok={connection.hasWebhookSecret} label="sekret" />
                  </td>
                  <td>
                    <span className={`account-status-pill ${status.ready ? "ready" : "missing"}`}>
                      {status.ready ? "gotowe" : "do uzupełnienia"}
                    </span>
                    <small>{status.label}</small>
                  </td>
                  <td>
                    <strong>{lastRun ? statusLabel(lastRun.status) : "-"}</strong>
                    <small>{connection.panelLastImportedAt ? formatDate(connection.panelLastImportedAt) : (lastRun ? formatDate(lastRun.finishedAt ?? lastRun.createdAt) : "brak uruchomień")}</small>
                  </td>
                  <td>
                    <div className="account-row-actions">
                      <button className="icon-button secondary" onClick={onConfigure} type="button">
                        <Settings size={15} />
                        Konfiguruj
                      </button>
                      <button
                        className="icon-button"
                        disabled={isConnectionBusy || !canProbe}
                        onClick={() => void onProbe(connection)}
                        type="button"
                      >
                        <CheckCircle2 size={15} />
                        Sprawdź
                      </button>
                      <button
                        className="icon-button"
                        disabled={isConnectionBusy || !status.canStart}
                        onClick={() => void onRun(connection)}
                        type="button"
                      >
                        <Play size={15} />
                        Importuj
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConnectionFlag({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`connection-flag ${ok ? "ok" : "missing"}`}>{label}</span>;
}

function AutomationStatus({ icon, label, value, ok }: { icon: ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className={ok ? "ok" : "warn"}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProbeResultView({ result }: { result: PortalProbeResult }) {
  return (
    <div className="probe-result">
      <div className="probe-result-header">
        <strong>Wynik sprawdzenia API</strong>
        <span>{sourceName(result.source)} · {result.adapterName}</span>
      </div>
      <div className="probe-metrics">
        <span>Ogłoszenia w odpowiedzi <strong>{result.jobsSeen}</strong></span>
        <span>Aplikacje w odpowiedzi <strong>{result.applicationsSeen}</strong></span>
        <span>Próbki mapowania <strong>{result.sampleCount}</strong></span>
        <span>Następny cursor <strong>{result.nextCursor ?? "-"}</strong></span>
      </div>
      <div className={`probe-quality ${result.quality.readyForImport ? "ready" : "warn"}`}>
        {result.quality.readyForImport ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
        <div>
          <strong>{result.quality.readyForImport ? "API gotowe do importu" : "API wymaga sprawdzenia przed importem"}</strong>
          <span>
            ID aplikacji {result.quality.samplesWithExternalId}/{result.quality.samplesChecked} ·
            ID ogłoszenia {result.quality.samplesWithPortalJobId}/{result.quality.samplesChecked} ·
            CV {result.quality.samplesWithDocumentUrl}/{result.quality.samplesChecked} ·
            kontakt {result.quality.samplesWithContact}/{result.quality.samplesChecked}
          </span>
        </div>
      </div>
      {result.quality.warnings.length > 0 && (
        <div className="probe-warnings">
          {result.quality.warnings.map((warning) => <span key={warning}>{warning}</span>)}
        </div>
      )}
      {result.samples.length === 0 ? (
        <p className="probe-empty">Portal odpowiedział, ale nie zwrócił aplikacji do sprawdzenia.</p>
      ) : (
        <div className="probe-samples">
          {result.samples.map((sample, index) => (
            <div className="probe-sample" key={`${sample.sourceExternalId ?? sample.fullName ?? "sample"}-${index}`}>
              <div className="probe-sample-title">
                <strong>{sample.fullName ?? `Próbka ${index + 1}`}</strong>
                <span>{sample.hasDocumentUrl ? "CV/link wykryty" : "Brak linku CV"}</span>
              </div>
              <dl>
                <div><dt>Email</dt><dd>{formatProbeValue(sample.email)}</dd></div>
                <div><dt>Telefon</dt><dd>{formatProbeValue(sample.phone)}</dd></div>
                <div><dt>Spółka</dt><dd>{formatProbeValue(sample.companyName)}</dd></div>
                <div><dt>Ogłoszenie</dt><dd>{formatProbeValue(sample.jobTitle)}</dd></div>
                <div><dt>ID aplikacji</dt><dd>{formatProbeValue(sample.sourceExternalId)}</dd></div>
                <div><dt>ID ogłoszenia</dt><dd>{formatProbeValue(sample.portalJobId)}</dd></div>
              </dl>
              <small>
                Braki: {sample.missing.length > 0 ? sample.missing.map(missingFieldLabel).join(", ") : "brak"}
              </small>
              <code>{sample.rawFieldKeys.slice(0, 18).join(", ") || "brak pól raw"}</code>
            </div>
          ))}
        </div>
      )}
      {result.jobSamples.length > 0 && (
        <div className="probe-samples">
          {result.jobSamples.map((sample, index) => (
            <div className="probe-sample" key={`${sample.portalJobId ?? sample.title ?? "job"}-${index}`}>
              <div className="probe-sample-title">
                <strong>{sample.title ?? `Ogłoszenie ${index + 1}`}</strong>
                <span>{sample.companyName ?? "Brak spółki"}</span>
              </div>
              <dl>
                <div><dt>ID ogłoszenia</dt><dd>{formatProbeValue(sample.portalJobId)}</dd></div>
                <div><dt>Miasto</dt><dd>{formatProbeValue(sample.city)}</dd></div>
                <div><dt>Spółka</dt><dd>{formatProbeValue(sample.companyName)}</dd></div>
                <div><dt>Link</dt><dd>{formatProbeValue(sample.url)}</dd></div>
              </dl>
              <small>
                Braki: {sample.missing.length > 0 ? sample.missing.join(", ") : "brak"}
              </small>
              <code>{sample.rawFieldKeys.slice(0, 18).join(", ") || "brak pól raw"}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeAutomation(connections: PortalConnection[], runs: SyncRun[]) {
  const readyConnections = connections.filter((connection) => connection.enabled && (connection.panelSyncEnabled || Boolean(connection.apiUrl || connection.jobsApiUrl))).length;
  const webhookReady = connections.filter((connection) => connection.enabled && connection.hasWebhookSecret).length;
  const lastRun = runs[0];
  return {
    readyConnections,
    webhookReady,
    lastRunText: lastRun ? `${sourceName(lastRun.source)} · ${statusLabel(lastRun.status)}` : "Brak uruchomień",
    lastRunOk: lastRun?.status === "SUCCESS"
  };
}

function connectionStatus(connection: PortalConnection, draft: DraftConnection | undefined) {
  const enabled = draft?.enabled ?? connection.enabled;
  const panelSyncEnabled = draft?.panelSyncEnabled ?? connection.panelSyncEnabled;
  const panelProfileDir = (draft?.panelProfileDir ?? connection.panelProfileDir ?? "").trim();
  const hasApiUrl = Boolean((draft?.apiUrl ?? connection.apiUrl ?? "").trim());
  const hasJobsApiUrl = Boolean((draft?.jobsApiUrl ?? connection.jobsApiUrl ?? "").trim());
  const hasStoredToken = connection.hasAccessToken || connection.hasClientSecret || connection.hasRefreshToken;
  const hasDraftToken = Boolean(draft?.accessToken || draft?.clientSecret || draft?.refreshToken);
  const hasToken = hasStoredToken || hasDraftToken;

  if (!enabled) {
    return {
      ready: false,
      canStart: false,
      label: "Połączenie wyłączone",
      description: "Cron i ręczny test pominą to źródło, dopóki go nie włączysz."
    };
  }
  if (panelSyncEnabled) {
    if (!panelProfileDir) {
      return {
        ready: false,
        canStart: false,
        label: "Brakuje profilu RPA",
        description: "Uzupełnij nazwę profilu sesji robota, np. olx-lex-protecta."
      };
    }
    return {
      ready: true,
      canStart: false,
      label: "Gotowe dla robota panelowego",
      description: "To konto synchronizuje lokalny robot RPA przez endpoint importu z panelu."
    };
  }
  if (!hasApiUrl && !hasJobsApiUrl) {
    return {
      ready: false,
      canStart: false,
      label: "Brakuje API URL",
      description: "Uzupełnij endpoint portalu, z którego CRM ma pobierać aplikacje."
    };
  }
  if (!hasToken) {
    return {
      ready: true,
      canStart: true,
      label: "API URL gotowy, token opcjonalny",
      description: "Cron będzie próbował pobierać dane. Jeśli portal wymaga autoryzacji, dopisz token."
    };
  }
  return {
    ready: true,
    canStart: true,
    label: "Gotowe do automatycznego pobierania",
    description: "Cron będzie pobierał aplikacje, a webhook może przyjmować nowe zgłoszenia."
  };
}

function webhookPath(connection: PortalConnection) {
  return connection.source === "PRACUJ" ? "/api/webhooks/pracuj" : "/api/webhooks/olx";
}

function sourceName(source: string) {
  if (source === "PRACUJ") return "Pracuj.pl";
  if (source === "OLX") return "OLX";
  return source;
}

function statusLabel(status: string) {
  if (status === "SUCCESS") return "sukces";
  if (status === "FAILED") return "błąd";
  if (status === "RUNNING") return "w trakcie";
  if (status === "QUEUED") return "w kolejce";
  return status;
}

function formatProbeValue(value: string | null) {
  return value?.trim() || "-";
}

function missingFieldLabel(value: string) {
  const labels: Record<string, string> = {
    fullName: "imię i nazwisko",
    email: "email",
    phone: "telefon",
    companyName: "spółka",
    jobTitle: "ogłoszenie",
    sourceExternalId: "ID aplikacji",
    portalJobId: "ID ogłoszenia"
  };
  return labels[value] ?? value;
}

function probeBusyId(connectionId: string) {
  return `probe:${connectionId}`;
}

function panelProfileDir(source: "PRACUJ" | "OLX", companyName: string, accountEmail: string) {
  return [source, companyName, accountEmail]
    .filter(Boolean)
    .join("-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pl-PL");
}
