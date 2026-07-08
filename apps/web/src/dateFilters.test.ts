import { describe, expect, it } from "vitest";
import { formatDateFilterValue, parseDateFilterInput } from "./dateFilters.js";

describe("date filter input", () => {
  it("akceptuje polski zapis liczbowy i formatuje go do ISO", () => {
    expect(parseDateFilterInput("22.05.2026")).toBe("2026-05-22");
    expect(parseDateFilterInput("2/5/2026")).toBe("2026-05-02");
  });

  it("akceptuje miesiac wpisany slowem", () => {
    expect(parseDateFilterInput("22 maja 2026")).toBe("2026-05-22");
    expect(parseDateFilterInput("7 czerwiec 2026")).toBe("2026-06-07");
  });

  it("odrzuca nieistniejace daty zamiast przesuwac je automatycznie", () => {
    expect(parseDateFilterInput("31.02.2026")).toBeNull();
    expect(parseDateFilterInput("22 foobar 2026")).toBeNull();
  });

  it("pokazuje date ISO jako dd.mm.rrrr", () => {
    expect(formatDateFilterValue("2026-05-22")).toBe("22.05.2026");
    expect(formatDateFilterValue("")).toBe("");
  });
});
