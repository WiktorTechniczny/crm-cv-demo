import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalCompanyName, targetCompanyNames } from "@amg/shared";
import { downloadProtectedFile } from "../api.js";
import { documentOpenErrorMessage } from "./documentErrors.js";
import type { Candidate, CandidateListMeta } from "../types.js";
import { blacklistCrmColumns, candidateCrmColumns, candidateCrmFieldValue, type CandidateCrmColumn, type CandidateCrmFieldKey } from "./candidateCrmFields.js";
import type { Notify } from "./toastTypes.js";

interface CandidateTableProps {
  candidates: Candidate[];
  selectedApplicationId: string;
  checkedApplicationIds: string[];
  viewMode: "crm" | "sheet";
  loading: boolean;
  sheetColumns: string[];
  pageInfo: CandidateListMeta;
  isBlacklistView?: boolean;
  readOnly?: boolean;
  allFilteredSelected?: boolean;
  onSelect: (candidate: Candidate) => void;
  onCheckedChange: (applicationIds: string[]) => void;
  onSelectAllFiltered?: () => void;
  onUsePageSelection?: () => void;
  onClearSelection?: () => void;
  onPageChange: (page: number) => void;
  onSheetCellUpdate: (candidate: Candidate, column: SheetColumn, value: string) => Promise<void>;
  onNotify?: Notify;
}

type SheetTab = {
  key: string;
  label: string;
  count: number;
};

export type SheetColumn =
  | { id: string; label: string; kind: "crm"; key: CandidateCrmFieldKey; editable: boolean }
  | { id: string; label: string; kind: "raw"; rawKey: string; editable: boolean };

type EditingCell = {
  applicationId: string;
  columnId: string;
  value: string;
};

const editableCrmFields = new Set<CandidateCrmFieldKey>([
  "appliedAt",
  "city",
  "fullName",
  "phone",
  "note"
]);

const labels = {
  loading: "Wczytuję wyniki z aktualnych filtrów...",
  empty: "Brak kandydat\u00f3w. Zaimportuj CSV albo uruchom synchronizacj\u0119 API.",
  noFilteredResults: "Brak wynik\u00f3w dla wybranych filtr\u00f3w. Zmie\u0144 filtr albo kliknij Wyczy\u015b\u0107.",
  sheetTitle: "Arkusz kandydat\u00f3w",
  editHint: "Kliknij kom\u00f3rk\u0119, aby edytowa\u0107. Enter zapisuje, Esc anuluje.",
  sheetEmpty: "Brak kandydat\u00f3w w tej zak\u0142adce arkusza.",
  sheetTabs: "Zak\u0142adki arkusza",
  all: "Wszystkie",
  other: "Pozosta\u0142e",
  noCompany: "Brak sp\u00f3\u0142ki",
  openCv: "Otw\u00f3rz CV"
};

export function CandidateTable({
  candidates,
  selectedApplicationId,
  checkedApplicationIds,
  viewMode,
  loading,
  sheetColumns,
  pageInfo,
  isBlacklistView = false,
  readOnly = false,
  allFilteredSelected = false,
  onSelect,
  onCheckedChange,
  onSelectAllFiltered,
  onUsePageSelection,
  onClearSelection,
  onPageChange,
  onSheetCellUpdate,
  onNotify
}: CandidateTableProps) {
  const [activeSheetTab, setActiveSheetTab] = useState("all");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  const sortedCandidates = useMemo(() => sortCandidatesByAppliedDate(candidates), [candidates]);
  const crmColumns = isBlacklistView ? blacklistCrmColumns : candidateCrmColumns;
  const localSheetColumns = Array.from(new Set(sortedCandidates.flatMap((candidate) => Object.keys(candidate.rawFields))));
  const rawSheetColumns = sheetColumns.length ? sheetColumns : localSheetColumns;
  const allSheetColumns = useMemo(() => buildSheetColumns(rawSheetColumns), [rawSheetColumns]);
  const sheetTabs = useMemo(() => buildSheetTabs(sortedCandidates), [sortedCandidates]);
  const sheetCandidates = useMemo(
    () => filterBySheetTab(sortedCandidates, activeSheetTab),
    [activeSheetTab, sortedCandidates]
  );
  const checkedSet = useMemo(() => new Set(checkedApplicationIds), [checkedApplicationIds]);
  const pageCount = Math.max(1, pageInfo.pageCount || 1);
  const currentPage = Math.min(Math.max(pageInfo.page || 1, 1), pageCount);
  const pageSize = Math.max(1, pageInfo.pageSize || pageInfo.limit || 100);
  const pageCandidates = sortedCandidates;
  const visibleIds = pageCandidates.map((candidate) => candidate.applicationId);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => checkedSet.has(id));
  const someVisibleChecked = visibleIds.some((id) => checkedSet.has(id));
  const totalRows = pageInfo.total || sortedCandidates.length;
  const pageFrom = totalRows && pageCandidates.length ? ((currentPage - 1) * pageSize) + 1 : 0;
  const pageTo = totalRows && pageCandidates.length ? Math.min(pageFrom + pageCandidates.length - 1, totalRows) : 0;
  const emptyMessage = loading
    ? labels.loading
    : (pageInfo.total === 0 ? labels.noFilteredResults : labels.empty);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleChecked && !allVisibleChecked;
    }
  }, [allVisibleChecked, someVisibleChecked]);

  async function saveEditingCell(candidate: Candidate, column: SheetColumn) {
    if (!editingCell || readOnly) return;
    const nextValue = editingCell.value.trim();
    const currentEditingCell = editingCell;
    setEditingCell(null);
    if (nextValue === sheetCellValue(candidate, column)) return;
    try {
      await onSheetCellUpdate(candidate, column, nextValue);
    } catch (error) {
      setEditingCell(currentEditingCell);
      onNotify?.({
        kind: "error",
        title: "Nie udało się zapisać komórki",
        body: error instanceof Error ? error.message : "Spróbuj ponownie za chwilę."
      });
    }
  }

  function startEditingCell(candidate: Candidate, column: SheetColumn) {
    if (readOnly || !column.editable) return;
    setEditingCell({
      applicationId: candidate.applicationId,
      columnId: column.id,
      value: sheetCellValue(candidate, column)
    });
  }

  if (viewMode === "sheet") {
    return (
      <div className="sheet-shell">
        <div className="sheet-toolbar">
          <strong>{labels.sheetTitle}</strong>
          <span>{sheetCandidates.length} wierszy</span>
          <span>{allSheetColumns.length} kolumn</span>
          {!readOnly && <span>{labels.editHint}</span>}
        </div>
        <div className={`sheet-table-wrap ${loading ? "is-loading" : ""}`} aria-busy={loading}>
          <table className="sheet-table">
            <thead>
              <tr className="sheet-letters-row">
                <th className="sheet-corner" />
                {allSheetColumns.map((column, index) => (
                  <th key={`letter-${column.id}`}>{columnLetter(index)}</th>
                ))}
              </tr>
              <tr className="sheet-fields-row">
                <th className="sheet-row-number">1</th>
                {allSheetColumns.map((column) => (
                  <th className={column.kind === "crm" ? "sheet-crm-column" : ""} key={column.id} title={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheetCandidates.map((candidate, rowIndex) => (
                <tr
                  className={candidate.applicationId === selectedApplicationId ? "selected" : ""}
                  key={candidate.applicationId}
                  onClick={() => onSelect(candidate)}
                >
                  <th className="sheet-row-number">{rowIndex + 2}</th>
                  {allSheetColumns.map((column) => (
                    <td
                      className={column.editable && !readOnly ? "editable-cell" : ""}
                      key={column.id}
                      onClick={(event) => {
                        if (readOnly || !column.editable || sheetCellIsLink(candidate, column)) return;
                        event.stopPropagation();
                        onSelect(candidate);
                        startEditingCell(candidate, column);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        startEditingCell(candidate, column);
                      }}
                      onKeyDown={(event) => {
                        if (readOnly || !column.editable) return;
                        if (event.key === "Enter" || event.key === "F2") {
                          event.preventDefault();
                          startEditingCell(candidate, column);
                        }
                      }}
                      tabIndex={column.editable && !readOnly ? 0 : undefined}
                      title={sheetCellValue(candidate, column)}
                    >
                      {editingCell?.applicationId === candidate.applicationId && editingCell.columnId === column.id ? (
                        <input
                          autoFocus
                          className="sheet-cell-input"
                          value={editingCell.value}
                          onBlur={() => void saveEditingCell(candidate, column)}
                          onChange={(event) => setEditingCell({ ...editingCell, value: event.target.value })}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setEditingCell(null);
                            }
                          }}
                        />
                      ) : renderSheetCell(candidate, column, onNotify)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sheetCandidates.length === 0 && (
            <div className="sheet-empty-state">{labels.sheetEmpty}</div>
          )}
        </div>
        <div className="sheet-tabs" aria-label={labels.sheetTabs}>
          {sheetTabs.map((tab) => (
            <button
              className={activeSheetTab === tab.key ? "active" : ""}
              key={tab.key}
              onClick={() => setActiveSheetTab(tab.key)}
              type="button"
            >
              <span>{tab.label}</span>
              <small>{tab.count}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="crm-table-shell">
      <div className={`table-wrap ${loading ? "is-loading" : ""}`} aria-busy={loading}>
        <table className="candidate-table">
          <colgroup>
            <col className="col-select" />
            {crmColumns.map((column) => <col className={`col-${column.key}`} key={column.key} />)}
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Zaznacz wiersze na tej stronie"
                  checked={allVisibleChecked}
                  ref={headerCheckboxRef}
                  disabled={loading}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onCheckedChange(Array.from(new Set([...checkedApplicationIds, ...visibleIds])));
                      return;
                    }
                    const visibleSet = new Set(visibleIds);
                    onCheckedChange(checkedApplicationIds.filter((id) => !visibleSet.has(id)));
                  }}
                  type="checkbox"
                />
              </th>
              {crmColumns.map((column) => <th key={column.key} title={column.label}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageCandidates.map((candidate) => (
              <tr
                className={candidate.applicationId === selectedApplicationId ? "selected" : ""}
                key={candidate.applicationId}
                onClick={() => onSelect(candidate)}
              >
                <td>
                  <input
                    aria-label={`Zaznacz ${candidate.fullName || "kandydata"}`}
                    checked={checkedSet.has(candidate.applicationId)}
                    disabled={loading}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? Array.from(new Set([...checkedApplicationIds, candidate.applicationId]))
                        : checkedApplicationIds.filter((id) => id !== candidate.applicationId);
                      onCheckedChange(next);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </td>
                {crmColumns.map((column) => (
                  <td className={`col-${column.key}`} key={column.key}>{renderCrmCell(candidate, column, onNotify)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pageCandidates.length === 0 && (
          <div className={`table-empty-overlay ${loading ? "is-loading" : ""}`}>
            {loading ? <span className="filter-feedback-spinner" aria-hidden="true" /> : null}
            <span>{emptyMessage}</span>
          </div>
        )}
      </div>
      <div className="table-pagination">
        <div className="pagination-summary">
          <span>{pageFrom}-{pageTo} z {totalRows}</span>
          {checkedApplicationIds.length > 0 && (
            <div className="selection-inline">
              <strong>
                {allFilteredSelected
                  ? `${totalRows} z filtrów`
                  : `${checkedApplicationIds.length} zazn.`}
              </strong>
              {!allFilteredSelected && totalRows > checkedApplicationIds.length && (
                <button type="button" onClick={onSelectAllFiltered}>Wszystkie z filtrów</button>
              )}
              {allFilteredSelected && (
                <button type="button" onClick={onUsePageSelection}>Tylko ta strona</button>
              )}
              <button type="button" onClick={onClearSelection}>Odznacz</button>
            </div>
          )}
        </div>
        <div>
          <button
            className="icon-button secondary"
            disabled={loading || currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
          >
            Poprzednia
          </button>
          <strong>strona {currentPage} / {pageCount}</strong>
          <button
            className="icon-button secondary"
            disabled={loading || currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Następna
          </button>
        </div>
      </div>
    </div>
  );
}

export function buildSheetUpdatePayload(candidate: Candidate, column: SheetColumn, value: string): Record<string, unknown> {
  if (column.kind === "crm") {
    if (column.key === "appliedAt") return { appliedAt: value || null };
    if (column.key === "city") return { city: value || null };
    if (column.key === "fullName") return { fullName: value };
    if (column.key === "phone") return { phone: value || null };
    if (column.key === "note") return { aiNote: value || null };
    return {};
  }

  const rawFields = { ...candidate.rawFields, [column.rawKey]: value };
  const normalized = normalizeColumnName(column.rawKey);
  const payload: Record<string, unknown> = { rawFields };
  if (["status"].includes(normalized)) payload.status = value || null;
  if (["etap", "aktualny etap procesu"].includes(normalized)) payload.stage = value || null;
  if (["miasto", "miejscowosc"].includes(normalized)) payload.city = value || null;
  if (["telefon", "numer telefonu"].includes(normalized)) payload.phone = value || null;
  if (["mail", "email", "e mail"].includes(normalized)) payload.email = value || null;
  if (["imie i nazwisko", "imie nazwisko", "name"].includes(normalized)) payload.fullName = value;
  if (["data dodania cv", "data cv", "data aplikacji"].includes(normalized)) payload.appliedAt = value || null;
  if (normalized.includes("notatka")) payload.aiNote = value || null;
  return payload;
}

function buildSheetColumns(rawColumns: string[]): SheetColumn[] {
  const crmColumns: SheetColumn[] = candidateCrmColumns.map((column) => ({
    id: `crm:${column.key}`,
    label: column.label,
    kind: "crm",
    key: column.key,
    editable: editableCrmFields.has(column.key)
  }));
  const crmLabels = new Set(crmColumns.map((column) => normalizeColumnName(column.label)));
  const rawDefinitions = rawColumns
    .filter((column) => !crmLabels.has(normalizeColumnName(column)))
    .map((column) => ({
      id: `raw:${column}`,
      label: displayColumnName(column),
      kind: "raw" as const,
      rawKey: column,
      editable: true
    }));
  return [...crmColumns, ...rawDefinitions];
}

function buildSheetTabs(candidates: Candidate[]): SheetTab[] {
  const companyCounts = countCompanies(candidates);
  const tabs: SheetTab[] = [
    { key: "all", label: labels.all, count: candidates.length },
    ...targetCompanyNames.map((company) => ({
      key: company,
      label: company,
      count: companyCounts[company] ?? 0
    }))
  ];
  const otherCount = candidates.filter((candidate) => {
    const company = normalizedCompany(candidate);
    return !targetCompanyNames.includes(company as typeof targetCompanyNames[number]);
  }).length;
  if (otherCount > 0) {
    tabs.push({ key: "other", label: labels.other, count: otherCount });
  }
  return tabs;
}

function filterBySheetTab(candidates: Candidate[], tab: string) {
  if (tab === "all") return candidates;
  if (tab === "other") {
    return candidates.filter((candidate) => !targetCompanyNames.includes(normalizedCompany(candidate) as typeof targetCompanyNames[number]));
  }
  return candidates.filter((candidate) => normalizedCompany(candidate) === tab);
}

function countCompanies(candidates: Candidate[]) {
  return candidates.reduce<Record<string, number>>((acc, candidate) => {
    const company = normalizedCompany(candidate);
    acc[company] = (acc[company] ?? 0) + 1;
    return acc;
  }, {});
}

function sortCandidatesByAppliedDate(candidates: Candidate[]) {
  return [...candidates].sort((left, right) => {
    const dateDiff = candidateAppliedTime(right) - candidateAppliedTime(left);
    if (dateDiff !== 0) return dateDiff;
    return right.applicationId.localeCompare(left.applicationId);
  });
}

function candidateAppliedTime(candidate: Candidate) {
  return parseCandidateDate(
    candidate.appliedAt
      || candidate.rawFields["Data dodania CV"]
      || candidate.rawFields["data dodania cv"]
      || candidate.rawFields["Data aplikacji"]
      || candidate.rawFields["data aplikacji"]
      || candidate.rawFields.appliedAt
      || ""
  );
}

function parseCandidateDate(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === "-") return 0;
  const polishDate = normalized.match(/^(\d{1,2})[.,](\d{1,2})[.,](\d{4})/);
  if (polishDate) {
    const [, day, month, year] = polishDate;
    return reasonableApplicationTime(Number(year), Number(month), Number(day));
  }
  const isoDate = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return reasonableApplicationTime(Number(year), Number(month), Number(day));
  }
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : capFutureApplicationTime(parsed);
}

function reasonableApplicationTime(year: number, month: number, day: number) {
  const direct = Date.UTC(year, month - 1, day);
  if (isReasonableApplicationTime(direct)) return direct;

  const swapped = Date.UTC(year, day - 1, month);
  if (day <= 12 && month <= 12 && isReasonableApplicationTime(swapped)) return swapped;

  return 0;
}

function capFutureApplicationTime(timestamp: number) {
  return isReasonableApplicationTime(timestamp) ? timestamp : 0;
}

function isReasonableApplicationTime(timestamp: number) {
  return timestamp <= Date.now() + 24 * 60 * 60 * 1000;
}

function normalizedCompany(candidate: Candidate) {
  const company = candidate.companyName || candidate.rawFields["Sp\u00f3\u0142ka"] || candidate.rawFields.Spolka || "";
  const displayName = canonicalCompanyName(company) ?? company.trim();
  return displayName || labels.noCompany;
}

function renderSheetCell(candidate: Candidate, column: SheetColumn, onNotify?: Notify) {
  const value = sheetCellValue(candidate, column);
  if (column.kind === "crm" && column.key === "cvLink") {
    return renderDocumentLink(candidate, onNotify);
  }
  if (column.kind === "raw") {
    const document = documentForColumn(candidate, column.rawKey, value);
    if (document) return renderDocumentLink(candidate, onNotify, document);
  }
  const isCvColumn = column.label.toLocaleLowerCase("pl-PL").includes("cv");
  if (isCvColumn && !looksLikeDownloadPath(value)) {
    return <span className="cell-ellipsis muted-cell">Brak CV</span>;
  }
  if (looksLikeUrl(value) || looksLikeDownloadPath(value)) {
    if (looksLikeDownloadPath(value)) {
      return (
        <button
          className={`sheet-link button-link${isCvColumn ? " cv-link" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            void openProtectedDownload(value, onNotify);
          }}
          type="button"
        >
          {cvLinkLabel(value)}
        </button>
      );
    }
    return (
      <a
        className={`sheet-link${isCvColumn ? " cv-link" : ""}`}
        href={value}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {isCvColumn ? cvLinkLabel(value) : shortUrlLabel(value)}
      </a>
    );
  }
  return value || "";
}

function sheetCellIsLink(candidate: Candidate, column: SheetColumn) {
  const value = sheetCellValue(candidate, column);
  if (column.kind === "crm" && column.key === "cvLink" && candidate.documents.some((document) => document.downloadUrl)) return true;
  const document = column.kind === "raw" ? documentForColumn(candidate, column.rawKey, value) : null;
  if (document?.downloadUrl) return true;
  const isCvColumn = column.label.toLocaleLowerCase("pl-PL").includes("cv");
  if (isCvColumn && !looksLikeDownloadPath(value)) return false;
  return looksLikeUrl(value) || looksLikeDownloadPath(value);
}

function sheetCellValue(candidate: Candidate, column: SheetColumn) {
  if (column.kind === "crm") return candidateCrmFieldValue(candidate, column.key);
  return candidate.rawFields[column.rawKey] ?? "";
}

function documentForColumn(candidate: Candidate, column: string, value: string) {
  const normalizedColumn = column.toLocaleLowerCase("pl-PL");
  if (!normalizedColumn.includes("cv")) return null;
  return candidate.documents.find((document) => document.fileName === value)
    ?? candidate.documents.find((document) => document.downloadUrl === value)
    ?? candidate.documents.find((document) => document.downloadUrl)
    ?? null;
}

function renderCrmCell(candidate: Candidate, column: CandidateCrmColumn, onNotify?: Notify) {
  const value = candidateCrmFieldValue(candidate, column.key);
  if (column.key === "acquisitionSource") return <span className="badge source">{value || "-"}</span>;
  if (column.key === "cvLink") {
    return renderDocumentLink(candidate, onNotify);
  }
  return <span className="cell-ellipsis" title={value}>{value || "-"}</span>;
}

function renderDocumentLink(candidate: Candidate, onNotify?: Notify, document = candidate.documents[0]) {
  const url = document?.downloadUrl || "";
  if (!url) return <span className="cell-ellipsis muted-cell">Brak CV</span>;
  if (looksLikeDownloadPath(url)) {
    return (
      <button
        className="sheet-link button-link cv-link"
        onClick={(event) => {
          event.stopPropagation();
          void openProtectedDownload(url, onNotify, document?.fileName);
        }}
        title={document?.fileName ?? "Otwórz CV"}
        type="button"
      >
        Otwórz CV
      </button>
    );
  }
  return (
    <a
      className="sheet-link cv-link"
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={document?.fileName ?? "Otwórz CV"}
    >
      Otwórz CV
    </a>
  );
}

async function openProtectedDownload(path: string, onNotify?: Notify, fileName = "") {
  try {
    const blob = await downloadProtectedFile(path);
    const objectUrl = URL.createObjectURL(openableDocumentBlob(blob, fileName));
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    onNotify?.({ kind: "info", title: "Otwieram CV", body: "Dokument otworzy się w nowej karcie." });
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

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikeDownloadPath(value: string) {
  return /^\/api\/documents\/[^/]+\/download$/i.test(value.trim());
}

function cvLinkLabel(value: string) {
  return labels.openCv;
}

function shortUrlLabel(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function displayColumnName(value: string) {
  const normalized = normalizeColumnName(value);
  const columnLabels: Record<string, string> = {
    spolka: "Sp\u00f3\u0142ka",
    wojewodztwo: "Wojew\u00f3dztwo",
    "imie i nazwisko": "Imi\u0119 i nazwisko",
    "imie nazwisko": "Imi\u0119 nazwisko",
    "zrodlo cv": "\u0179r\u00f3d\u0142o CV",
    "zrodlo pozyskania cv": "\u0179r\u00f3d\u0142o pozyskania CV",
    powod: "POW\u00d3D",
    obecnosc: "Obecno\u015b\u0107",
    "komunikatywnosc 1 5": "Komunikatywno\u015b\u0107 1-5",
    "etap ii stabilnosc zatrudnienia": "ETAP II Stabilno\u015b\u0107 zatrudnienia",
    "etap ii doswiadczenie zawodowe": "ETAP II Do\u015bwiadczenie zawodowe"
  };
  return columnLabels[normalized] ?? value.replace(/_/g, " ").trim();
}

function normalizeColumnName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function columnLetter(index: number) {
  let value = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}


