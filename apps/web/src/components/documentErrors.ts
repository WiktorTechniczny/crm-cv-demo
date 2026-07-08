export function documentOpenErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("exceeded_egress_quota") ||
    normalized.includes("exceeded_storage_size_quota") ||
    normalized.includes("service for this project is restricted") ||
    normalized.includes("project owner must upgrade")
  ) {
    return "Nie udało się otworzyć CV ze starego storage. Rekord w CRM działa, ale plik trzeba mieć zapisany w storage serwera albo ponownie pobrać z portalu.";
  }

  if (
    normalized.includes("plik cv nie istnieje") ||
    normalized.includes("nie ma zapisanego pliku") ||
    normalized.includes("nie znaleziono dokumentu cv") ||
    normalized.includes("not found") ||
    normalized.includes("404")
  ) {
    return "Tego CV nie ma w storage CRM. Rekord zostaje w bazie, ale plik trzeba ponownie pobrać z portalu albo odzyskać z kopii.";
  }

  return rawMessage || "Nie udało się otworzyć CV.";
}