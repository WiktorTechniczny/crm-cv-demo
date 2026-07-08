import { z } from "zod";

export const SourcePortalSchema = z.enum(["PRACUJ", "OLX", "CSV", "MANUAL", "OTHER"]);
export type SourcePortal = z.infer<typeof SourcePortalSchema>;

export const CandidateDocumentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string().nullable(),
  storageKey: z.string().nullable(),
  externalUrl: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  createdAt: z.string()
});

export const ApplicationHistoryItemSchema = z.object({
  applicationId: z.string(),
  candidateId: z.string(),
  fullName: z.string(),
  companyName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  source: SourcePortalSchema,
  appliedAt: z.string().nullable(),
  isCurrent: z.boolean()
});

export const CandidateListItemSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  jobId: z.string().nullable(),
  jobTitle: z.string().nullable(),
  source: SourcePortalSchema,
  status: z.string().nullable(),
  stage: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  aiScore: z.number().nullable(),
  aiNote: z.string().nullable(),
  appliedAt: z.string().nullable(),
  isBlacklisted: z.boolean().optional(),
  blacklistedAt: z.string().nullable().optional(),
  blacklistedByName: z.string().nullable().optional(),
  blacklistReason: z.string().nullable().optional(),
  documents: z.array(CandidateDocumentSchema),
  applicationHistory: z.array(ApplicationHistoryItemSchema).optional(),
  rawFields: z.record(z.string(), z.string()),
  customFields: z.record(z.string(), z.string())
});

export type CandidateListItem = z.infer<typeof CandidateListItemSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  userName: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  fieldName: z.string(),
  previousValue: z.string().nullable(),
  nextValue: z.string().nullable(),
  createdAt: z.string()
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
