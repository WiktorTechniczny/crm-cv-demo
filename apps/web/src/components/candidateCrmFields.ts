import { displayCompanyName, inferVoivodeshipFromCity, normalizeJobTitleDisplay, normalizePhoneNumber } from "@amg/shared";
import type { Candidate } from "../types.js";

export type CandidateCrmFieldKey =
  | "appliedAt"
  | "companyName"
  | "jobTitle"
  | "voivodeship"
  | "city"
  | "fullName"
  | "phone"
  | "cvLink"
  | "note"
  | "acquisitionSource"
  | "blacklistedByName"
  | "blacklistReason";

export interface CandidateCrmColumn {
  key: CandidateCrmFieldKey;
  label: string;
}

export const candidateCrmColumns: CandidateCrmColumn[] = [
  { key: "appliedAt", label: "Data dodania CV" },
  { key: "companyName", label: "Sp\u00f3\u0142ka" },
  { key: "jobTitle", label: "Nazwa stanowiska" },
  { key: "voivodeship", label: "Wojew\u00f3dztwo" },
  { key: "city", label: "Miasto" },
  { key: "fullName", label: "Imi\u0119 nazwisko" },
  { key: "phone", label: "Telefon" },
  { key: "cvLink", label: "CV-link" },
  { key: "note", label: "Notatka" },
  { key: "acquisitionSource", label: "\u0179r\u00f3d\u0142o pozyskania CV" }
];

export const blacklistCrmColumns: CandidateCrmColumn[] = [
  { key: "appliedAt", label: "Data dodania CV" },
  { key: "companyName", label: "Sp\u00f3\u0142ka" },
  { key: "jobTitle", label: "Stanowisko" },
  { key: "voivodeship", label: "Wojew\u00f3dztwo" },
  { key: "city", label: "Miasto" },
  { key: "fullName", label: "Imi\u0119 nazwisko" },
  { key: "phone", label: "Numer telefonu" },
  { key: "cvLink", label: "CV-link" },
  { key: "blacklistedByName", label: "Osoba wpisuj\u0105ca" },
  { key: "blacklistReason", label: "Pow\u00f3d" },
  { key: "acquisitionSource", label: "\u0179r\u00f3d\u0142o" }
];

export function candidateCrmFieldValue(candidate: Candidate, key: CandidateCrmFieldKey): string {
  if (key === "appliedAt") return dateOnly(candidate.appliedAt || rawAny(candidate, ["Data dodania CV", "data dodania cv", "appliedAt"]));
  if (key === "companyName") return displayCompanyName(candidate.companyName || rawAny(candidate, ["Sp\u00f3\u0142ka", "Spolka", "Firma", "companyName"]));
  if (key === "jobTitle") return normalizeJobTitleDisplay(candidate.jobTitle || rawAny(candidate, ["Nazwa stanowiska", "Stanowisko", "Tytu\u0142 og\u0142oszenia", "Tytu\u0142 Og\u0142oszenia"]));
  if (key === "voivodeship") return rawAny(candidate, ["Wojew\u00f3dztwo", "Wojewodztwo", "wojew\u00f3dztwo", "wojewodztwo", "voivodeship"]) || inferVoivodeshipFromCity(cityValue(candidate));
  if (key === "city") return normalizeCity(cityValue(candidate));
  if (key === "fullName") return candidate.fullName || rawAny(candidate, ["Imi\u0119 i Nazwisko", "IMI\u0118 NAZWISKO", "Imi\u0119 nazwisko", "name"]);
  if (key === "phone") return normalizePhoneNumber(candidate.phone || rawAny(candidate, ["Telefon", "NUMER TELEFONU", "Numer telefonu", "phone"]));
  if (key === "cvLink") return documentLink(candidate);
  if (key === "note") return cleanNote(candidate.aiNote || rawAny(candidate, ["Notatka po CV", "Notatka po ", "Notatka", "notatka", "note"]));
  if (key === "acquisitionSource") return rawAny(candidate, ["\u0179R\u00d3D\u0141O CV", "\u0179R\u00d3D\u0141O", "\u0179r\u00f3d\u0142o pozyskania CV", "Zrodlo pozyskania CV", "source"]) || candidate.source;
  if (key === "blacklistedByName") return candidate.blacklistedByName || rawAny(candidate, ["Osoba wpisuj\u0105ca", "Kto wpisa\u0142", "Kto wpisal"]);
  if (key === "blacklistReason") return candidate.blacklistReason || rawAny(candidate, ["Pow\u00f3d", "Powod", "Pow\u00f3d wykluczenia"]);
  return "";
}

function cityValue(candidate: Candidate) {
  return candidate.city || rawAny(candidate, ["Miasto", "MIEJSCOWO\u015a\u0106", "Miejscowo\u015b\u0107", "city"]);
}

function rawAny(candidate: Candidate, keys: string[]) {
  const normalizedEntries = Object.entries(candidate.rawFields).map(([key, value]) => [normalizeText(key), value] as const);
  for (const key of keys) {
    const normalizedKey = normalizeText(key);
    const exactValue = candidate.rawFields[key]?.trim();
    const value = exactValue || normalizedEntries.find(([entryKey]) => entryKey === normalizedKey)?.[1]?.trim();
    if (value) return value;
  }
  return "";
}

function documentLink(candidate: Candidate) {
  const document = candidate.documents[0];
  if (!document) return "";
  return document.downloadUrl || "";
}

function dateOnly(value: string) {
  if (!value) return "";
  const polish = value.trim().match(/^(\d{1,2})[.,/-](\d{1,2})[.,/-](\d{4})$/);
  if (polish) {
    const [, day, month, year] = polish;
    return displayDateParts(Number(year), Number(month), Number(day));
  }
  const isoDate = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return displayDateParts(Number(year), Number(month), Number(day));
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const formatter = new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Warsaw"
    });
    return formatter.format(date);
  }
  return value.slice(0, 10);
}

function displayDateParts(year: number, month: number, day: number) {
  const normalized = normalizeReasonableDateParts(year, month, day);
  return `${String(normalized.day).padStart(2, "0")}.${String(normalized.month).padStart(2, "0")}.${normalized.year}`;
}

function normalizeReasonableDateParts(year: number, month: number, day: number) {
  const direct = Date.UTC(year, month - 1, day);
  if (isReasonableApplicationTime(direct)) return { year, month, day };

  const swapped = Date.UTC(year, day - 1, month);
  if (day <= 12 && month <= 12 && isReasonableApplicationTime(swapped)) {
    return { year, month: day, day: month };
  }

  return { year, month, day };
}

function isReasonableApplicationTime(timestamp: number) {
  return timestamp <= Date.now() + 24 * 60 * 60 * 1000;
}

function normalizeCity(value: string | null) {
  const cleaned = String(value ?? "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const key = cleaned
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[-\s]+/g, " ")
    .trim();
  if (key === "bydgoszczy" || key === "bydgoszcz") return "Bydgoszcz";
  if (key === "bielsko biala") return "Bielsko-Bia\u0142a";
  return cleaned;
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

export function cleanNote(value: string | null | undefined) {
  const cleaned = String(value ?? "")
    .replace(/\b(?:Strong|Moderate|Weak)\s+Fit\b\.?\s*/gi, "")
    .replace(/\bOcena OLX:\s*(?:UNDEFINED|null|-)\b\.?\s*/gi, "")
    .replace(/\bUNDEFINED\b\.?\s*/gi, "")
    .replace(/OLX applicationId=[^\s.]+\.?\s*/gi, "")
    .replace(/Zaimportowano z (?:listy API|listy kandydat[oó]w|panelu|profilu) Pracuj\.pl:\s*https?:\/\/\S+\.?\s*/gi, "")
    .replace(/Zaimportowano z (?:listy API|listy kandydat[oó]w|panelu|profilu) Pracuj\.pl:[^.]+\.?\s*/gi, "")
    .replace(/Zaimportowano z profilu Pracuj\.pl\.?\s*/gi, "")
    .replace(/Zaimportowano z panelu Pracuj\.pl\.?\s*/gi, "")
    .replace(/Zaimportowano z listy kandydatow OLX:\s*https?:\/\/\S+\.?\s*/gi, "")
    .replace(/Zaimportowano z listy kandydatow OLX:[^.]+\.?\s*/gi, "")
    .replace(/Zaimportowano z karty kandydata OLX:\s*https?:\/\/\S+\.?\s*/gi, "")
    .replace(/Zaimportowano z karty kandydata OLX:[^.]+\.?\s*/gi, "")
    .replace(/Wykryto (?:link CV\/dokumentu|CV\/dokument)\.?\s*/gi, "")
    .replace(/Kandydat ma za[łl]acznik CV\.?\s*/gi, "")
    .replace(/Brak za[łl]acznika CV w OLX\.?\s*/gi, "")
    .replace(/\bWojew[oó]dztwo:\s*[-\p{L}\s]+\.?\s*/giu, "")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (/^[-.]*$/.test(cleaned)) return "";
  return cleaned;
}
