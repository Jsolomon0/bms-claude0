import { type PermissionKey, type RoleKey, type VisibilityFlag } from "./authz.ts";

export const DOCUMENT_CATEGORIES = [
  "contracts",
  "receipts",
  "invoices",
  "permits",
  "progress_photos",
  "customer_uploads",
  "payroll_docs",
  "tax_docs"
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_ARCHIVE_STATES = ["active", "archived"] as const;

export type DocumentArchiveState = (typeof DOCUMENT_ARCHIVE_STATES)[number];

export const DOCUMENT_RETENTION_FLAGS = [
  "legal_hold",
  "accounting_required",
  "payroll_required",
  "tax_required",
  "customer_record_required"
] as const;

export type DocumentRetentionFlag = (typeof DOCUMENT_RETENTION_FLAGS)[number];

export const DOCUMENT_ACCESS_ACTIONS = ["view", "download", "upload", "manage"] as const;

export type DocumentAccessAction = (typeof DOCUMENT_ACCESS_ACTIONS)[number];

export const DOCUMENT_PRINCIPAL_TYPES = ["role", "user", "customer_account", "partner_org"] as const;

export type DocumentPrincipalType = (typeof DOCUMENT_PRINCIPAL_TYPES)[number];

export const DOCUMENT_MALWARE_STATUSES = ["pending", "clean", "infected"] as const;

export type DocumentMalwareStatus = (typeof DOCUMENT_MALWARE_STATUSES)[number];

export const DOCUMENT_SHARE_SCOPES = ["preview", "download", "preview_download"] as const;

export type DocumentShareScope = (typeof DOCUMENT_SHARE_SCOPES)[number];

export interface DocumentAccessRuleRecord {
  id: string;
  documentId: string;
  principalType: DocumentPrincipalType;
  principalId: string;
  actions: readonly DocumentAccessAction[];
  createdByUserId: string;
  createdAt: string;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  checksum?: string;
  malwareStatus: DocumentMalwareStatus;
  previewUrl?: string;
  downloadUrl?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  customerAccountId?: string;
  partnerOrgIds: readonly string[];
  assignedUserIds: readonly string[];
  projectId?: string;
  title: string;
  category: DocumentCategory;
  expiresAt?: string | null;
  archiveState: DocumentArchiveState;
  retentionFlags: readonly DocumentRetentionFlag[];
  visibilityFlags: readonly VisibilityFlag[];
  latestVersionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPublicShareLinkRecord {
  id: string;
  documentId: string;
  permissionKeys: readonly PermissionKey[];
  shareScope: DocumentShareScope;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  createdByUserId: string;
  createdAt: string;
}

export interface DocumentUploadInput {
  fileName: string;
  contentType: string;
  byteSize: number;
  checksum?: string;
}

export interface DocumentUploadEnvelope {
  organizationId: string;
  ownerUserId: string;
  customerAccountId?: string;
  partnerOrgIds?: readonly string[];
  assignedUserIds?: readonly string[];
  projectId?: string;
  title: string;
  category: DocumentCategory;
  expiresAt?: string;
  visibilityFlags: readonly VisibilityFlag[];
  retentionFlags?: readonly DocumentRetentionFlag[];
  file: DocumentUploadInput;
}

export interface DocumentVersionUploadEnvelope {
  documentId: string;
  actorUserId: string;
  file: DocumentUploadInput;
}

export interface DocumentPreviewResult {
  document: DocumentRecord;
  version: DocumentVersionRecord;
  previewUrl: string;
}

export interface DocumentDownloadResult {
  document: DocumentRecord;
  version: DocumentVersionRecord;
  downloadUrl: string;
}

export interface DocumentActivitySummary {
  id: string;
  documentId: string;
  eventType:
    | "document_created"
    | "document_version_uploaded"
    | "document_visibility_changed"
    | "document_archived"
    | "document_restored"
    | "document_access_rule_changed"
    | "document_public_link_issued"
    | "document_public_link_revoked"
    | "document_public_link_accessed";
  actorUserId?: string | null;
  summary: string;
  visibilityFlags: readonly VisibilityFlag[];
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentRepository {
  createDocument(document: DocumentRecord): void;
  updateDocument(document: DocumentRecord): void;
  getDocumentById(documentId: string): DocumentRecord | undefined;
  listDocuments(): readonly DocumentRecord[];
  createVersion(version: DocumentVersionRecord): void;
  getVersionById(versionId: string): DocumentVersionRecord | undefined;
  listVersionsByDocumentId(documentId: string): readonly DocumentVersionRecord[];
  createAccessRule(rule: DocumentAccessRuleRecord): void;
  replaceAccessRules(documentId: string, rules: readonly DocumentAccessRuleRecord[]): void;
  listAccessRulesByDocumentId(documentId: string): readonly DocumentAccessRuleRecord[];
  createActivity(activity: DocumentActivitySummary): void;
  listActivitiesByDocumentId(documentId: string): readonly DocumentActivitySummary[];
  createPublicShareLink(link: DocumentPublicShareLinkRecord): void;
  updatePublicShareLink(link: DocumentPublicShareLinkRecord): void;
  getPublicShareLinkById(linkId: string): DocumentPublicShareLinkRecord | undefined;
  listPublicShareLinksByDocumentId(documentId: string): readonly DocumentPublicShareLinkRecord[];
}

export interface DocumentActorSummary {
  userId: string;
  roles: readonly RoleKey[];
  customerAccountId?: string;
  partnerOrgIds: readonly string[];
}
