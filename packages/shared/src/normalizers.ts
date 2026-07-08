export const targetCompanyNames = [
  "Nova Contact",
  "Vector Sales",
  "North Services",
  "Delta Support",
  "Sigma Office"
] as const;

const companyAliases: Record<string, (typeof targetCompanyNames)[number]> = {
  nova_contact: "Nova Contact",
  novacontact: "Nova Contact",
  nc: "Nova Contact",
  vector_sales: "Vector Sales",
  vectorsales: "Vector Sales",
  vs: "Vector Sales",
  north_services: "North Services",
  northservices: "North Services",
  ns: "North Services",
  delta_support: "Delta Support",
  deltasupport: "Delta Support",
  ds: "Delta Support",
  sigma_office: "Sigma Office",
  sigmaoffice: "Sigma Office",
  so: "Sigma Office"
};

export const polishVoivodeships = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie"
];

const cityVoivodeships: Record<string, string> = {
  augustow: "podlaskie",
  "biala podlaska": "lubelskie",
  bialystok: "podlaskie",
  "bialystok lapy": "podlaskie",
  belchatow: "łódzkie",
  bedzin: "śląskie",
  "bielsko biala": "śląskie",
  brzeg: "opolskie",
  bydgoszcz: "kujawsko-pomorskie",
  bytom: "śląskie",
  chelm: "lubelskie",
  czestochowa: "śląskie",
  "dabrowa gornicza": "śląskie",
  dobrzyn: "kujawsko-pomorskie",
  elblag: "warmińsko-mazurskie",
  gdansk: "pomorskie",
  gdynia: "pomorskie",
  gliwice: "śląskie",
  gorzow: "lubuskie",
  "gorzow wielkopolski": "lubuskie",
  katowice: "śląskie",
  kielce: "świętokrzyskie",
  koszalin: "zachodniopomorskie",
  krakow: "małopolskie",
  lodz: "łódzkie",
  lublin: "lubelskie",
  "nowy sacz": "małopolskie",
  olsztyn: "warmińsko-mazurskie",
  ilawa: "warmińsko-mazurskie",
  "jelenia gora": "dolnośląskie",
  klodzko: "dolnośląskie",
  legnica: "dolnośląskie",
  nysa: "opolskie",
  opole: "opolskie",
  ostrowiec: "świętokrzyskie",
  "ostrowiec swietokrzyski": "świętokrzyskie",
  pabianice: "łódzkie",
  pila: "wielkopolskie",
  plock: "mazowieckie",
  poznan: "wielkopolskie",
  radom: "mazowieckie",
  rzeszow: "podkarpackie",
  szczecin: "zachodniopomorskie",
  suwalki: "podlaskie",
  siedlce: "mazowieckie",
  "skarzysko kamienna": "świętokrzyskie",
  starachowice: "świętokrzyskie",
  stargard: "zachodniopomorskie",
  stargrad: "zachodniopomorskie",
  torun: "kujawsko-pomorskie",
  tarnow: "małopolskie",
  walbrzych: "dolnośląskie",
  "piotrkow trybunalski": "łódzkie",
  warszawa: "mazowieckie",
  wroclaw: "dolnośląskie",
  zabrze: "śląskie",
  zawiercie: "śląskie",
  "zielona gora": "lubuskie",
  zamosc: "lubelskie",
};

export function canonicalCompanyName(value: string | null | undefined): string | null {
  const key = aliasKey(value);
  return companyAliases[key] ?? null;
}

export function displayCompanyName(value: string | null | undefined): string {
  const raw = cleanText(value);
  return canonicalCompanyName(raw) ?? raw;
}

export function companyFilterId(companyName: string): string {
  return `company:${companyName}`;
}

export function companyNameFromFilterId(value: string | null | undefined): string | null {
  const raw = cleanText(value);
  if (!raw.startsWith("company:")) return null;
  const companyName = raw.slice("company:".length).trim();
  return canonicalCompanyName(companyName) ?? (companyName || null);
}

export function normalizeJobTitleDisplay(value: string | null | undefined): string {
  const cleaned = cleanText(value)
    .replace(/[_]+/g, " ")
    .replace(/\s*[·]\s*(Nova Contact|Vector Sales|North Services|Delta Support|Sigma Office)\b.*$/i, "")
    .replace(/\s*[\[(]\s*(?:k|m|x|d|w|f)(?:\s*\/\s*(?:k|m|x|d|w|f)){1,3}\s*[\])]\s*/gi, " ")
    .replace(/\s*(?:[-–|]\s*)?(?:k|m|x|d|w|f)(?:\s*\/\s*(?:k|m|x|d|w|f)){1,3}\s*$/gi, "")
    .replace(/\s*\|\s*.*$/i, "")
    .replace(/\s*[–-]\s*(?:branża\s+)?OZE\b.*$/i, "")
    .replace(/\s*[–-]\s*bez sprzedaży\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (isGenericOrPortalNoise(cleaned)) return "";
  return canonicalJobTitle(cleaned) ?? cleaned;
}

function canonicalJobTitle(value: string): string | null {
  const key = normalizeKey(value);
  if (!key) return null;

  if (
    key.includes("protetyk sluchu")
    || key.includes("audiofonolog")
    || key.includes("audiofonologia")
    || key.includes("fonoaudiolog")
    || key.includes("fonoaudiologia")
  ) {
    return "Protetyk słuchu";
  }

  if (key.includes("doradca handlowy zdalna")) return "Doradca handlowy zdalna";

  if (key.includes("doradca handlowy") && (key.includes("odszkodowan") || key.includes("roszczen"))) {
    return "Doradca handlowy ds. Odszkodowań i Roszczeń";
  }

  if (key.includes("przedstawiciel handlowy b2c")) return "Przedstawiciel handlowy B2C";

  if (key.includes("regionalny kierownik sprzedazy")) return "Regionalny Kierownik Sprzedaży";

  if (key.includes("manager operacyjny") || key.includes("menedzer operacyjny")) return "Manager Operacyjny";

  if (key.includes("trener sprzedazy b2c")) return "Trener Sprzedaży B2C";

  if (key.includes("specjalista") && key.includes("sprzedazy b2c")) return "Specjalista ds. Sprzedaży B2C";

  if (key.includes("specjalista ds sprzedazy") && key.includes("aparatow sluchowych")) {
    return "Specjalista ds. sprzedaży - aparaty słuchowe";
  }

  if (key.includes("specjalista ds sprzedazy") && key.includes("gabinet protetyki sluchu")) {
    return "Specjalista ds. sprzedaży - gabinet protetyki słuchu";
  }

  if (key.includes("specjalista ds kontraktowania") && key.includes("nfz")) {
    return "Specjalista ds. kontraktowania i rozliczeń NFZ";
  }

  if (key.includes("specjalista ds sprzedazy") && key.includes("doradca")) {
    return "Specjalista ds. sprzedaży / Doradca";
  }

  if (key.includes("specjalista ds kontaktu z klientem")) {
    return "Specjalista ds. Kontaktu z Klientem";
  }

  if (key.includes("lider zespolu call center") && key.includes("trener")) {
    return "Lider Zespołu Call Center / Trener";
  }

  if (
    key === "konsultant"
    || key === "konsultant nova contact"
    || key === "konsultant north services"
    || key === "konsultant ds umawiania wizyt torun centrum"
    || key.includes("konsultant ds umawiania wizyt")
    || key.includes("konsultant telefoniczny umawianie bezplatnych wizyt")
    || key.includes("konsultant telefoniczny ds umawiania spotkan")
  ) {
    return "Konsultant ds. Umawiania Wizyt";
  }

  return null;
}

function isGenericOrPortalNoise(value: string): boolean {
  const key = normalizeKey(value);
  if (!key) return true;
  return [
    "ogloszenie pracuj pl",
    "ogloszenie z portalu",
    "ogloszenie olx praca",
    "sprawdz ogloszenie",
    "sprawdz kandydatow",
    "zobacz kandydatow",
    "sprzedawca kandydatow",
    "kandydaci",
    "aplikacje",
    "platnosci i faktury",
    "moje konto",
    "kontakt",
    "profil",
    "ustawienia"
  ].includes(key);
}

export function inferVoivodeshipFromCity(value: string | null | undefined): string {
  const direct = cityVoivodeships[cityLookupKey(value)];
  if (direct) return direct;

  const normalized = normalizeKey(value);
  const knownCity = Object.keys(cityVoivodeships).find((city) => normalized.startsWith(city));
  return knownCity ? cityVoivodeships[knownCity] : "";
}

export function normalizeTextKey(value: string | null | undefined): string {
  return normalizeKey(value);
}

export function normalizePhoneNumber(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (!digits) return "";

  const candidates = [
    digits,
    digits.startsWith("0048") ? digits.slice(4) : "",
    digits.startsWith("48") ? digits.slice(2) : "",
    digits.startsWith("0") ? digits.slice(1) : ""
  ].filter(Boolean);

  const polishPhone = candidates.find((candidate) => candidate.length === 9);
  if (!polishPhone) return "";

  return polishPhone.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

function cityLookupKey(value: string | null | undefined): string {
  const firstPart = cleanText(value)
    .split(",")[0]
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s*-\s*/g, " ")
    .trim();
  return normalizeKey(firstPart);
}

function aliasKey(value: string | null | undefined): string {
  return normalizeKey(value).replace(/\s+/g, "_");
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return replacePolishLetters(cleanText(value))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function replacePolishLetters(value: string): string {
  return value
    .replace(/[\u0105\u0104]/g, "a")
    .replace(/[\u0107\u0106]/g, "c")
    .replace(/[\u0119\u0118]/g, "e")
    .replace(/[\u0142\u0141]/g, "l")
    .replace(/[\u0144\u0143]/g, "n")
    .replace(/[\u00f3\u00d3]/g, "o")
    .replace(/[\u015b\u015a]/g, "s")
    .replace(/[\u017a\u0179\u017c\u017b]/g, "z");
}
