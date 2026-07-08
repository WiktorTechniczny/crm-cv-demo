import type { User } from "./types.js";

type Role = User["role"] | undefined | null;

export function canEditCrm(role: Role) {
  return role !== "VIEWER";
}

export function canExportCrm(role: Role) {
  return role !== "VIEWER";
}

export function canViewCvDocuments(_role: Role) {
  return true;
}
