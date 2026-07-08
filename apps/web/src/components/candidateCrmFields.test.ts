import { describe, expect, it } from "vitest";
import { candidateCrmColumns, candidateCrmFieldValue } from "./candidateCrmFields.js";
import type { Candidate } from "../types.js";

const candidate = {
  id: "candidate-1",
  applicationId: "application-1",
  fullName: "Anna Kowalska",
  email: "anna@example.com",
  phone: "500600700",
  city: "Białystok",
  companyId: "company-1",
  companyName: "Nova Contact",
  jobId: "job-1",
  jobTitle: "Protetyk słuchu",
  source: "PRACUJ",
  status: "Nowy",
  stage: "Nowy",
  ownerId: null,
  ownerName: null,
  aiScore: null,
  appliedAt: "2026-06-10T12:00:00.000Z",
  aiNote: "Dobra komunikacja",
  documents: [
    {
      id: "doc-1",
      fileName: "anna.pdf",
      mimeType: "application/pdf",
      storageKey: null,
      externalUrl: "https://example.com/anna.pdf",
      downloadUrl: "https://example.com/anna.pdf",
      createdAt: "2026-06-10T12:00:00.000Z"
    }
  ],
  rawFields: {
    "Województwo": "podlaskie",
    "ŹRÓDŁO CV": "Pracuj.pl",
    "Notatka po CV": "Ma doświadczenie",
    "cv link": "https://example.com/raw.pdf"
  },
  customFields: {}
} as Candidate;

describe("candidateCrmFieldValue", () => {
  it("wyciąga najważniejsze pola operacyjne CRM", () => {
    expect(candidateCrmFieldValue(candidate, "appliedAt")).toBe("10.06.2026");
    expect(candidateCrmFieldValue(candidate, "companyName")).toBe("Nova Contact");
    expect(candidateCrmFieldValue(candidate, "jobTitle")).toBe("Protetyk słuchu");
    expect(candidateCrmFieldValue(candidate, "voivodeship")).toBe("podlaskie");
    expect(candidateCrmFieldValue(candidate, "city")).toBe("Białystok");
    expect(candidateCrmFieldValue(candidate, "fullName")).toBe("Anna Kowalska");
    expect(candidateCrmFieldValue(candidate, "phone")).toBe("500 600 700");
    expect(candidateCrmFieldValue(candidate, "cvLink")).toBe("https://example.com/anna.pdf");
    expect(candidateCrmFieldValue(candidate, "note")).toBe("Dobra komunikacja");
    expect(candidateCrmFieldValue(candidate, "acquisitionSource")).toBe("Pracuj.pl");
  });

  it("trzyma w CRM wymagane kolumny operacyjne w oczekiwanej kolejności", () => {
    expect(candidateCrmColumns.map((column) => column.label)).toEqual([
      "Data dodania CV",
      "Spółka",
      "Nazwa stanowiska",
      "Województwo",
      "Miasto",
      "Imię nazwisko",
      "Telefon",
      "CV-link",
      "Notatka",
      "Źródło pozyskania CV"
    ]);
  });

  it("formatuje polskie daty z arkusza bez przestawiania dnia z miesiacem", () => {
    const rawDateCandidate = {
      ...candidate,
      appliedAt: null,
      rawFields: {
        "Data dodania CV": "20,03,2026"
      }
    } as Candidate;

    expect(candidateCrmFieldValue(rawDateCandidate, "appliedAt")).toBe("20.03.2026");
  });

  it("nie pokazuje przyszlej daty z odwróconego importu przed realnymi aplikacjami", () => {
    const rawDateCandidate = {
      ...candidate,
      appliedAt: "2026-12-04T00:00:00.000Z",
      rawFields: {}
    } as Candidate;

    expect(candidateCrmFieldValue(rawDateCandidate, "appliedAt")).toBe("12.04.2026");
  });

  it("porzadkuje wariant miasta z rawFields", () => {
    const cityCandidate = {
      ...candidate,
      city: null,
      rawFields: {
        Miasto: "Bydgoszczy"
      }
    } as Candidate;

    expect(candidateCrmFieldValue(cityCandidate, "city")).toBe("Bydgoszcz");
  });

  it("uzupelnia wojewodztwo z miasta, gdy portal nie podal regionu", () => {
    const cityCandidate = {
      ...candidate,
      city: "Warszawa",
      rawFields: {}
    } as Candidate;

    expect(candidateCrmFieldValue(cityCandidate, "voivodeship")).toBe("mazowieckie");
  });

  it("pokazuje w tabeli CRM kanoniczna nazwe stanowiska zamiast tytulu ogloszenia z miastem", () => {
    const olxCandidate = {
      ...candidate,
      jobTitle: "Konsultant ds. Umawiania Wizyt | Torun \u2013 Centrum",
      rawFields: {
        "Tytu\u0142 Og\u0142oszenia": "Konsultant ds. Umawiania Wizyt | Torun \u2013 Centrum"
      }
    } as Candidate;

    expect(candidateCrmFieldValue(olxCandidate, "jobTitle")).toBe("Konsultant ds. Umawiania Wizyt");
  });

  it("nie pokazuje technicznego tekstu Pobierz CV jako linku do dokumentu", () => {
    const withoutDocument = {
      ...candidate,
      documents: [],
      rawFields: {
        "cv link": "Pobierz CV"
      }
    } as Candidate;

    expect(candidateCrmFieldValue(withoutDocument, "cvLink")).toBe("");
  });

  it("nie traktuje zewnętrznego linku z rawFields jako zapisanego CV", () => {
    const withoutStoredDocument = {
      ...candidate,
      documents: [],
      rawFields: {
        "cv link": "https://drive.google.com/file/d/stary-link/view"
      }
    } as Candidate;

    expect(candidateCrmFieldValue(withoutStoredDocument, "cvLink")).toBe("");
  });
  it("ujednolica polskie numery telefonu w tabeli CRM", () => {
    expect(candidateCrmFieldValue({ ...candidate, phone: "+48 666 995 555" } as Candidate, "phone")).toBe("666 995 555");
    expect(candidateCrmFieldValue({ ...candidate, phone: "48 508 044 504" } as Candidate, "phone")).toBe("508 044 504");
    expect(candidateCrmFieldValue({ ...candidate, phone: "737481981" } as Candidate, "phone")).toBe("737 481 981");
    expect(candidateCrmFieldValue({ ...candidate, phone: "78133547120" } as Candidate, "phone")).toBe("");
  });

  it("ukrywa techniczne notatki importowe z paneli", () => {
    const importedOnly = {
      ...candidate,
      aiNote: "Zaimportowano z listy API Pracuj.pl: https://strefa.pracuj.pl/apps/kandydaci/123. Województwo: lubuskie"
    } as Candidate;

    expect(candidateCrmFieldValue(importedOnly, "note")).toBe("");
  });

  it("ukrywa techniczne dopasowanie i identyfikator OLX z notatki", () => {
    const importedOnly = {
      ...candidate,
      aiNote: "Strong Fit. Brak zalacznika CV w OLX. OLX applicationId=can_123_ad_pl_456"
    } as Candidate;

    expect(candidateCrmFieldValue(importedOnly, "note")).toBe("");
  });
});
