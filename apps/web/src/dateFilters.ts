const POLISH_MONTHS: Record<string, number> = {
  styczen: 1,
  stycznia: 1,
  luty: 2,
  lutego: 2,
  marzec: 3,
  marca: 3,
  kwiecien: 4,
  kwietnia: 4,
  maj: 5,
  maja: 5,
  czerwiec: 6,
  czerwca: 6,
  lipiec: 7,
  lipca: 7,
  sierpien: 8,
  sierpnia: 8,
  wrzesien: 9,
  wrzesnia: 9,
  pazdziernik: 10,
  pazdziernika: 10,
  listopad: 11,
  listopada: 11,
  grudzien: 12,
  grudnia: 12
};

export function formatDateFilterValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function parseDateFilterInput(value: string) {
  const input = normalizeDateText(value);
  if (!input) return "";

  const numeric = input.match(/^(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2}|\d{4}))?$/);
  if (numeric) {
    return buildIsoDate(numeric[1], numeric[2], numeric[3]);
  }

  const named = input.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{2}|\d{4}))?$/);
  if (named) {
    const month = POLISH_MONTHS[named[2]];
    if (!month) return null;
    return buildIsoDate(named[1], String(month), named[3]);
  }

  return null;
}

function normalizeDateText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
}

function buildIsoDate(dayText: string, monthText: string, yearText?: string) {
  const day = Number(dayText);
  const month = Number(monthText);
  const year = normalizeYear(yearText);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (day < 1 || month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeYear(yearText?: string) {
  if (!yearText) return new Date().getFullYear();
  const year = Number(yearText);
  if (yearText.length === 2) return 2000 + year;
  return year;
}
