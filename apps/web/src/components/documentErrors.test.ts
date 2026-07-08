import { describe, expect, it } from "vitest";
import { documentOpenErrorMessage } from "./documentErrors.js";

describe("documentOpenErrorMessage", () => {
  it("pokazuje czytelny komunikat dla starego storage z limitem", () => {
    expect(documentOpenErrorMessage(new Error("Service for this project is restricted due to exceed_storage_size_quota")))
      .toContain("starego storage");
  });

  it("pokazuje czytelny komunikat dla rekordu bez fizycznego pliku CV", () => {
    expect(documentOpenErrorMessage(new Error("Plik CV nie istnieje w storage")))
      .toContain("nie ma w storage CRM");
  });

  it("zostawia nieznany blad jako tresc techniczna", () => {
    expect(documentOpenErrorMessage(new Error("fetch failed"))).toBe("fetch failed");
  });
});