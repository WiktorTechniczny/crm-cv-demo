import { useState } from "react";
import { Save, X } from "lucide-react";
import { createManualCandidate } from "../api.js";
import type { Candidate, CandidateFilterOptions } from "../types.js";
import type { Notify } from "./toastTypes.js";

interface ManualCandidateModalProps {
  filterOptions: CandidateFilterOptions;
  onClose: () => void;
  onCreated: (candidate: Candidate) => void;
  onNotify?: Notify;
}

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  companyId: "",
  companyName: "",
  jobId: "",
  jobTitle: "",
  status: "Nowy",
  stage: "Nowy",
  ownerId: "",
  aiNote: ""
};

export function ManualCandidateModal({ filterOptions, onClose, onCreated, onNotify }: ManualCandidateModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const candidate = await createManualCandidate(form);
      onNotify?.({ kind: "success", title: "Dodano kandydata", body: candidate.fullName });
      onCreated(candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać kandydata");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Dodaj kandydata">
        <header className="modal-header">
          <div>
            <h2>Dodaj kandydata</h2>
            <p>Ręczne zgłoszenie trafi do CRM jako źródło MANUAL.</p>
          </div>
          <button className="icon-button secondary" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </header>

        {error && <div className="form-error">{error}</div>}

        <div className="manual-form">
          <label>
            Imię i nazwisko
            <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label>
            Telefon
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label>
            Miasto
            <input value={form.city} onChange={(event) => update("city", event.target.value)} />
          </label>
          <label>
            Spółka z bazy
            <select value={form.companyId} onChange={(event) => update("companyId", event.target.value)}>
              <option value="">Nowa albo brak</option>
              {filterOptions.companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>
          <label>
            Nowa spółka
            <input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} disabled={Boolean(form.companyId)} />
          </label>
          <label>
            Ogłoszenie z bazy
            <select value={form.jobId} onChange={(event) => update("jobId", event.target.value)}>
              <option value="">Nowe albo brak</option>
              {filterOptions.jobs.map((job) => (
                <option key={job.id} value={job.id}>{[job.title, job.city, job.companyName].filter(Boolean).join(" · ")}</option>
              ))}
            </select>
          </label>
          <label>
            Nowe stanowisko
            <input value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} disabled={Boolean(form.jobId)} />
          </label>
          <label>
            Status
            <input value={form.status} onChange={(event) => update("status", event.target.value)} />
          </label>
          <label>
            Etap
            <input value={form.stage} onChange={(event) => update("stage", event.target.value)} />
          </label>
          <label>
            Opiekun
            <select value={form.ownerId} onChange={(event) => update("ownerId", event.target.value)}>
              <option value="">Ja / domyślnie</option>
              {filterOptions.users.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </select>
          </label>
          <label className="manual-form-wide">
            Notatka
            <textarea value={form.aiNote} onChange={(event) => update("aiNote", event.target.value)} rows={4} />
          </label>
        </div>

        <footer className="modal-actions">
          <button className="icon-button secondary" onClick={onClose}>Anuluj</button>
          <button className="icon-button primary" onClick={() => void submit()} disabled={saving || !form.fullName.trim()}>
            <Save size={18} />
            {saving ? "Zapisywanie..." : "Zapisz kandydata"}
          </button>
        </footer>
      </section>
    </div>
  );
}
