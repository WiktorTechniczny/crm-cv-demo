import { describe, expect, it } from "vitest";
import { inferVoivodeshipFromCity, normalizeJobTitleDisplay, normalizePhoneNumber } from "./normalizers.js";

describe("inferVoivodeshipFromCity", () => {
  it("uzupełnia województwo dla miast często występujących w CRM", () => {
    expect(inferVoivodeshipFromCity("Poznań")).toBe("wielkopolskie");
    expect(inferVoivodeshipFromCity("Bełchatów")).toBe("łódzkie");
    expect(inferVoivodeshipFromCity("Chełm")).toBe("lubelskie");
    expect(inferVoivodeshipFromCity("Rzeszów")).toBe("podkarpackie");
    expect(inferVoivodeshipFromCity("Olsztyn")).toBe("warmińsko-mazurskie");
    expect(inferVoivodeshipFromCity("Wałbrzych")).toBe("dolnośląskie");
    expect(inferVoivodeshipFromCity("Piotrków Trybunalski")).toBe("łódzkie");
  });
});

describe("normalizePhoneNumber", () => {
  it("formatuje polskie numery i usuwa prefiks kraju", () => {
    expect(normalizePhoneNumber("781335471")).toBe("781 335 471");
    expect(normalizePhoneNumber("781-335-471")).toBe("781 335 471");
    expect(normalizePhoneNumber("+48 781 335 471")).toBe("781 335 471");
    expect(normalizePhoneNumber("48 781 335 471")).toBe("781 335 471");
    expect(normalizePhoneNumber("0048 781 335 471")).toBe("781 335 471");
    expect(normalizePhoneNumber("0781335471")).toBe("781 335 471");
  });

  it("odrzuca numery z nadmiarowymi cyframi zamiast pokazywac je w CRM", () => {
    expect(normalizePhoneNumber("78133547120")).toBe("");
    expect(normalizePhoneNumber("781 335 471 20")).toBe("");
    expect(normalizePhoneNumber("12345")).toBe("");
  });
});

describe("normalizeJobTitleDisplay", () => {
  it("scala duplikaty konsultanta i warianty protetyki do jednej nazwy stanowiska", () => {
    expect(normalizeJobTitleDisplay("Konsultant")).toBe("Konsultant ds. Umawiania Wizyt");
    expect(normalizeJobTitleDisplay("Konsultant ds. Umawiania Wizyt | Torun – Centrum")).toBe("Konsultant ds. Umawiania Wizyt");
    expect(normalizeJobTitleDisplay("Audiofonolog")).toBe("Protetyk słuchu");
    expect(normalizeJobTitleDisplay("Fonoaudiologia")).toBe("Protetyk słuchu");
  });
});

describe("inferVoivodeshipFromCity - aktualne miasta CRM", () => {
  it("uzupełnia województwo dla miast z importów Pracuj i OLX", () => {
    expect(inferVoivodeshipFromCity("Opole")).toBe("opolskie");
    expect(inferVoivodeshipFromCity("Toruń")).toBe("kujawsko-pomorskie");
    expect(inferVoivodeshipFromCity("Zamość")).toBe("lubelskie");
    expect(inferVoivodeshipFromCity("Płock")).toBe("mazowieckie");
    expect(inferVoivodeshipFromCity("Piła")).toBe("wielkopolskie");
    expect(inferVoivodeshipFromCity("Ostrowiec Świętokrzyski")).toBe("świętokrzyskie");
    expect(inferVoivodeshipFromCity("Siedlce")).toBe("mazowieckie");
    expect(inferVoivodeshipFromCity("Zawiercie")).toBe("śląskie");
    expect(inferVoivodeshipFromCity("Jelenia Góra")).toBe("dolnośląskie");
    expect(inferVoivodeshipFromCity("Nysa")).toBe("opolskie");
    expect(inferVoivodeshipFromCity("Stargard")).toBe("zachodniopomorskie");
    expect(inferVoivodeshipFromCity("Legnica")).toBe("dolnośląskie");
    expect(inferVoivodeshipFromCity("Skarżysko-Kamienna")).toBe("świętokrzyskie");
    expect(inferVoivodeshipFromCity("Starachowice")).toBe("świętokrzyskie");
    expect(inferVoivodeshipFromCity("Kłodzko")).toBe("dolnośląskie");
    expect(inferVoivodeshipFromCity("Iława")).toBe("warmińsko-mazurskie");
    expect(inferVoivodeshipFromCity("Pabianice")).toBe("łódzkie");
  });
});
