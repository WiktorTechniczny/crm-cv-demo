import { describe, expect, it } from "vitest";
import { canEditCrm, canExportCrm, canViewCvDocuments } from "./permissions.js";

describe("permissions", () => {
  it("pozwala obserwatorowi ogladac dane i CV", () => {
    expect(canViewCvDocuments("VIEWER")).toBe(true);
  });

  it("blokuje obserwatorowi edycje i eksport", () => {
    expect(canEditCrm("VIEWER")).toBe(false);
    expect(canExportCrm("VIEWER")).toBe(false);
  });

  it("zostawia eksport i edycje rolom operacyjnym", () => {
    for (const role of ["ADMIN", "MANAGER", "RECRUITER"] as const) {
      expect(canEditCrm(role)).toBe(true);
      expect(canExportCrm(role)).toBe(true);
    }
  });
});
