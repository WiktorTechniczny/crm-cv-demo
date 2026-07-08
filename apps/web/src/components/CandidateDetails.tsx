import { useEffect, useMemo, useState } from "react";
import { Ban, ExternalLink, FileText, History, Mail, MessageSquarePlus, Phone, RotateCcw, Save } from "lucide-react";
import { addNote, downloadProtectedFile, fetchAudit, fetchNotes, updateApplication } from "../api.js";
import type { AuditLog, Candidate, CandidateFilterOptions, CandidateNote } from "../types.js";
import { cleanNote } from "./candidateCrmFields.js";
import { documentOpenErrorMessage } from "./documentErrors.js";
import type { Notify } from "./toastTypes.js";

interface CandidateDetailsProps {
  candidate?: Candidate;
  owners: CandidateFilterOptions["users"];
  statuses: CandidateFilterOptions["statuses"];
  stages: CandidateFilterOptions["stages"];
  onChanged: () => void;
  onNotify?: Notify;
  readOnly?: boolean;
}

const DEFAULT_STATUSES = ["Nowy", "Do kontaktu", "Kontakt", "Rozmowa", "Do decyzji", "Odrzucony", "Zatrudniony"];
const DEFAULT_STAGES = ["Nowy", "Weryfikacja CV", "Kontakt telefoniczny", "Rozmowa", "Szkolenie", "Decyzja", "Zamknięte"];

export function CandidateDetails({ candidate, owners, statuses, stages, onChanged, onNotify, readOnly = false }: CandidateDetailsProps) {
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [blacklistReasonDraft, setBlacklistReasonDraft] = useState("");
  const [blacklistEditorOpen, setBlacklistEditorOpen] = useState(false);

  useEffect(() => {
    setStatus(candidate?.status ?? "");
    setStage(candidate?.stage ?? "");
    setOwnerId(candidate?.ownerId ?? "");
    setAiNote(cleanNote(candidate?.aiNote ?? candidate?.rawFields["Notatka po CV"] ?? candidate?.rawFields["Notatka po "] ?? candidate?.rawFields["Notatka"] ?? candidate?.customFields.ai_note ?? ""));
    setManualNote("");
    setBlacklistReasonDraft(candidate?.blacklistReason ?? "");
    setBlacklistEditorOpen(false);
    if (candidate) {
      void refreshTimeline(candidate.applicationId);
    } else {
      setAudit([]);
      setNotes([]);
    }
  }, [candidate?.applicationId]);

  const documentReferences = useMemo(() => collectDocumentReferences(candidate), [candidate]);
  const applicationHistory = candidate?.applicationHistory ?? [];
  const statusOptions = useMemo(() => uniqueOptions([status, ...statuses, ...DEFAULT_STATUSES]), [status, statuses]);
  const stageOptions = useMemo(() => uniqueOptions([stage, ...stages, ...DEFAULT_STAGES]), [stage, stages]);

  if (!candidate) {
    return <section className="details-panel empty-state">Wybierz kandydata z tabeli.</section>;
  }

  async function refreshTimeline(applicationId: string) {
    const [nextAudit, nextNotes] = await Promise.all([
      fetchAudit(applicationId).catch(() => []),
      fetchNotes(applicationId).catch(() => [])
    ]);
    setAudit(nextAudit);
    setNotes(nextNotes);
  }

  async function save() {
    if (!candidate || readOnly) return;
    setSaving(true);
    await updateApplication(candidate.applicationId, {
      status,
      stage,
      ownerId: ownerId || null,
      aiNote
    });
    await refreshTimeline(candidate.applicationId);
    setSaving(false);
    onNotify?.({ kind: "success", title: "Zapisano zmiany", body: candidate.fullName });
    onChanged();
  }

  async function saveNote() {
    if (!candidate || readOnly || !manualNote.trim()) return;
    setSavingNote(true);
    await addNote(candidate.applicationId, manualNote.trim());
    setManualNote("");
    await refreshTimeline(candidate.applicationId);
    setSavingNote(false);
    onNotify?.({ kind: "success", title: "Dodano notatkę", body: candidate.fullName });
    onChanged();
  }

  async function excludeCandidate() {
    if (!candidate || readOnly) return;
    const reason = blacklistReasonDraft.trim();
    if (!reason) {
      onNotify?.({ kind: "warning", title: "Podaj powód", body: "Powód wykluczenia jest wymagany przy dodaniu do czarnej listy." });
      return;
    }
    setSaving(true);
    await updateApplication(candidate.applicationId, {
      isBlacklisted: true,
      blacklistReason: reason
    });
    await refreshTimeline(candidate.applicationId);
    setSaving(false);
    setBlacklistEditorOpen(false);
    onNotify?.({
      kind: "warning",
      title: "Dodano do czarnej listy",
      body: candidate.fullName
    });
    onChanged();
  }

  async function restoreCandidate() {
    if (!candidate || readOnly) return;
    setSaving(true);
    await updateApplication(candidate.applicationId, {
      isBlacklisted: false,
      blacklistReason: null
    });
    await refreshTimeline(candidate.applicationId);
    setSaving(false);
    onNotify?.({ kind: "success", title: "Przywrócono do CRM", body: candidate.fullName });
    onChanged();
  }

  return (
    <section className="details-panel">
      <div className="details-header">
        <div>
          <h2>{candidate.fullName}</h2>
          <span>{candidate.jobTitle ?? "Brak stanowiska"} - {candidate.companyName ?? "Brak spółki"}</span>
        </div>
        <span className="badge source">{candidate.source}</span>
      </div>

      <div className="contact-grid">
        <div><Phone size={16} /> <span>{candidate.phone ?? "-"}</span></div>
        <div><Mail size={16} /> <span>{candidate.email ?? "-"}</span></div>
        <div><FileText size={16} /> <span>{documentReferences.length ? `${documentReferences.length} CV / dokument` : "Brak CV"}</span></div>
      </div>

      {applicationHistory.length >= 0 && (
        <div className="application-history-card">
          <div className="application-history-header">
            <History size={16} />
            <strong>Historia aplikacji</strong>
            <span>{Math.max(1, applicationHistory.length)}</span>
          </div>
          <div className="application-history-list">
            {applicationHistory.length <= 1 && (
              <p className="application-history-empty">
                Brak innych aplikacji rozpoznanych po telefonie, mailu lub profilu kandydata.
              </p>
            )}
            {applicationHistory.map((entry) => (
              <div className={`application-history-row ${entry.isCurrent ? "current" : ""}`} key={entry.applicationId}>
                <div>
                  <strong>{entry.companyName ?? "Brak spółki"}</strong>
                  <span>{entry.jobTitle ?? "Brak stanowiska"}</span>
                </div>
                <small>
                  {formatShortDate(entry.appliedAt)} · {entry.source}{entry.isCurrent ? " · aktualna" : ""}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`blacklist-action ${candidate.isBlacklisted ? "active" : ""}`}>
        <div>
          <strong>{candidate.isBlacklisted ? "Na czarnej liście" : "Czarna lista"}</strong>
          {candidate.isBlacklisted && (
            <small>
              {candidate.blacklistedByName ? `Wpisał/a: ${candidate.blacklistedByName}` : "Wpisał/a: brak danych"}
              {candidate.blacklistReason ? ` · ${candidate.blacklistReason}` : ""}
            </small>
          )}
        </div>
        <button
          className={candidate.isBlacklisted ? "icon-button secondary" : "icon-button danger"}
          onClick={() => candidate.isBlacklisted ? void restoreCandidate() : setBlacklistEditorOpen(true)}
          disabled={saving || readOnly}
          type="button"
        >
          {candidate.isBlacklisted ? <RotateCcw size={16} /> : <Ban size={16} />}
          {candidate.isBlacklisted ? "Przywróć" : "Wyklucz"}
        </button>
      </div>

      {!readOnly && blacklistEditorOpen && !candidate.isBlacklisted && (
        <div className="blacklist-editor">
          <label>
            Powód wykluczenia
            <textarea
              value={blacklistReasonDraft}
              onChange={(event) => setBlacklistReasonDraft(event.target.value)}
              rows={4}
              placeholder="Np. nie kontaktować ponownie, rezygnacja, błędny numer, decyzja rekrutera..."
            />
          </label>
          <div>
            <button className="icon-button secondary" type="button" onClick={() => setBlacklistEditorOpen(false)}>
              Anuluj
            </button>
            <button className="icon-button danger" type="button" onClick={() => void excludeCandidate()} disabled={saving || !blacklistReasonDraft.trim()}>
              <Ban size={16} />
              Zapisz wykluczenie
            </button>
          </div>
        </div>
      )}

      {documentReferences.length > 0 && (
        <div className="document-list">
          <div className="document-list-header">
            <strong>CV i dokumenty</strong>
          </div>
          {documentReferences.map((document) => (
            <div className="document-list-row" key={document.id}>
              <div className="document-list-info">
                <FileText size={16} />
                <div>
                  <span>{document.fileName}</span>
                  <small>{document.meta}</small>
                </div>
              </div>
              {document.url && (
                <button
                  className="document-open-link"
                  onClick={() => void openDocument(document, onNotify)}
                  title={document.fileName}
                  type="button"
                >
                  <ExternalLink size={14} />
                  Otwórz CV
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <label>
        Status
        <select value={status} disabled={readOnly} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Brak statusu</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        Etap
        <select value={stage} disabled={readOnly} onChange={(event) => setStage(event.target.value)}>
          <option value="">Brak etapu</option>
          {stageOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        Opiekun
        <select value={ownerId} disabled={readOnly} onChange={(event) => setOwnerId(event.target.value)}>
          <option value="">Brak opiekuna</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.name}</option>
          ))}
        </select>
      </label>
      <ReadOnlyField label="Spółka" value={candidate.companyName ?? "Brak spółki"} />
      <ReadOnlyField label="Ogłoszenie" value={candidate.jobTitle ?? "Bez przypiętego ogłoszenia"} />
      <label className="ai-note-field">
        Notatka AI / po CV
        <textarea value={aiNote} readOnly={readOnly} onChange={(event) => setAiNote(event.target.value)} rows={14} />
      </label>

      {!readOnly && (
        <button className="icon-button primary" onClick={() => void save()} disabled={saving}>
          <Save size={18} />
          {saving ? "Zapis..." : "Zapisz zmiany"}
        </button>
      )}

      {!readOnly && (
        <div className="note-composer">
          <label>
            Notatka rekrutera
            <textarea
              value={manualNote}
              onChange={(event) => setManualNote(event.target.value)}
              rows={4}
              placeholder="Np. kandydat oddzwoni jutro, oczekuje widełek, wymaga sprawdzenia NFZ..."
            />
          </label>
          <button className="icon-button secondary" onClick={() => void saveNote()} disabled={savingNote || !manualNote.trim()}>
            <MessageSquarePlus size={18} />
            {savingNote ? "Dodawanie..." : "Dodaj notatkę"}
          </button>
        </div>
      )}

      <div className="history">
        <h3><MessageSquarePlus size={16} /> Notatki</h3>
        {notes.length === 0 && <p>Brak notatek rekrutera.</p>}
        {notes.map((note) => (
          <div className="history-entry note-entry" key={note.id}>
            <strong>{note.authorName}</strong>
            <span>{new Date(note.createdAt).toLocaleString("pl-PL")}</span>
            <small>{note.body}</small>
          </div>
        ))}
      </div>

      <div className="history">
        <h3><History size={16} /> Historia</h3>
        {audit.length === 0 && <p>Brak zmian ręcznych dla tej aplikacji.</p>}
        {audit.map((entry) => (
          <div className="history-entry" key={entry.id}>
            <strong>{entry.fieldName}</strong>
            <span>{entry.userName} · {new Date(entry.createdAt).toLocaleString("pl-PL")}</span>
            <small>{entry.previousValue ?? "-"} → {entry.nextValue ?? "-"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="readonly-field">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function uniqueOptions(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "pl-PL"));
}

async function openDocument(document: DocumentReference, onNotify?: Notify) {
  if (!document.url) return;
  if (!looksLikeProtectedDownload(document.url)) {
    window.open(document.url, "_blank", "noopener,noreferrer");
    onNotify?.({ kind: "info", title: "Otwieram CV", body: document.fileName });
    return;
  }
  try {
    const blob = await downloadProtectedFile(document.url);
    const objectUrl = URL.createObjectURL(openableDocumentBlob(blob, document.fileName));
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    onNotify?.({ kind: "info", title: "Otwieram CV", body: document.fileName });
  } catch (error) {
    onNotify?.({ kind: "error", title: "Nie udało się otworzyć CV", body: documentOpenErrorMessage(error) });
  }
}

function openableDocumentBlob(blob: Blob, fileName: string) {
  const mimeType = blob.type.toLocaleLowerCase("pl-PL");
  const isPdf = mimeType.includes("pdf") || /\.pdf$/i.test(fileName);
  if (isPdf && mimeType !== "application/pdf") {
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}

interface DocumentReference {
  id: string;
  fileName: string;
  meta: string;
  url: string | null;
}

function collectDocumentReferences(candidate: Candidate | undefined): DocumentReference[] {
  if (!candidate) return [];
  const references: DocumentReference[] = [];
  const seen = new Set<string>();

  candidate.documents
    .filter((document) => Boolean(document.downloadUrl))
    .forEach((document) => {
      addDocumentReference(references, seen, {
        id: `document-${document.id}`,
        fileName: document.fileName,
        meta: `Zapisane w CRM · ${formatDate(document.createdAt)}`,
        url: document.downloadUrl
      });
    });

  return references;
}
function addDocumentReference(references: DocumentReference[], seen: Set<string>, reference: DocumentReference) {
  const key = `${reference.fileName}|${reference.url ?? ""}`.toLocaleLowerCase("pl-PL");
  if (seen.has(key)) return;
  seen.add(key);
  references.push(reference);
}

function looksLikeProtectedDownload(value: string) {
  return /^\/api\/documents\/[^/]+\/download$/i.test(value.trim());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pl-PL");
}

function formatShortDate(value: string | null) {
  if (!value) return "Brak daty";
  return new Date(value).toLocaleDateString("pl-PL");
}


