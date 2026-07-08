import { useState } from "react";
import { Upload } from "lucide-react";
import { importCsv } from "../api.js";
import type { Notify } from "./toastTypes.js";

interface ImportPanelProps {
  onImported: () => void;
  onNotify?: Notify;
}

export function ImportPanel({ onImported, onNotify }: ImportPanelProps) {
  const [message, setMessage] = useState("Wczytaj CSV z obecnego arkusza lub starego skanera.");

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("Import trwa...");
    try {
      const content = await file.text();
      const result = await importCsv(file.name, content) as { imported: number; updated: number; rows: number };
      const nextMessage = `Zaimportowano: ${result.imported}, zaktualizowano: ${result.updated}, wiersze: ${result.rows}.`;
      setMessage(nextMessage);
      onNotify?.({ kind: "success", title: "Import CSV zakończony", body: nextMessage });
      onImported();
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Nie udało się zaimportować CSV.";
      setMessage(nextMessage);
      onNotify?.({ kind: "error", title: "Import CSV nie powiódł się", body: nextMessage });
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="mini-panel">
      <h3><Upload size={16} /> Import CSV</h3>
      <p>{message}</p>
      <label className="file-button">
        Wybierz plik CSV
        <input type="file" accept=".csv,text/csv" onChange={(event) => void onFile(event)} />
      </label>
    </section>
  );
}
