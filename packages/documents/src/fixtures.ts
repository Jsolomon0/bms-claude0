import type {
  DocumentAccessRuleRecord,
  DocumentActivitySummary,
  DocumentPublicShareLinkRecord,
  DocumentRecord,
  DocumentVersionRecord
} from "../../types/src/index.ts";

export const DEMO_DOCUMENTS: readonly DocumentRecord[] = [
  {
    id: "document-demo-1",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-aria",
    partnerOrgIds: [],
    assignedUserIds: ["employee-1"],
    projectId: "project-demo-1",
    title: "Basement contract packet",
    category: "contracts",
    expiresAt: "2026-05-28T00:00:00.000Z",
    archiveState: "active",
    retentionFlags: ["legal_hold"],
    visibilityFlags: ["internal", "customer"],
    latestVersionId: "document-version-demo-2",
    createdAt: "2026-04-21T09:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z"
  },
  {
    id: "document-demo-2",
    organizationId: "org-hq",
    ownerUserId: "employee-1",
    customerAccountId: "customer-aria",
    partnerOrgIds: ["partner-east"],
    assignedUserIds: ["employee-1", "sub-user-1"],
    projectId: "project-demo-1",
    title: "Framing progress photo set",
    category: "progress_photos",
    archiveState: "active",
    retentionFlags: [],
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor", "public_link"],
    latestVersionId: "document-version-demo-3",
    createdAt: "2026-04-24T08:00:00.000Z",
    updatedAt: "2026-04-27T15:00:00.000Z"
  },
  {
    id: "document-demo-3",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    partnerOrgIds: [],
    assignedUserIds: [],
    title: "Payroll week 17 packet",
    category: "payroll_docs",
    archiveState: "active",
    retentionFlags: ["payroll_required"],
    visibilityFlags: ["internal"],
    latestVersionId: "document-version-demo-4",
    createdAt: "2026-04-25T09:00:00.000Z",
    updatedAt: "2026-04-25T09:00:00.000Z"
  },
  {
    id: "document-demo-4",
    organizationId: "org-hq",
    ownerUserId: "customer.aria",
    customerAccountId: "customer-aria",
    partnerOrgIds: [],
    assignedUserIds: ["employee-1"],
    projectId: "project-demo-1",
    title: "Customer finish inspiration",
    category: "customer_uploads",
    archiveState: "active",
    retentionFlags: ["customer_record_required"],
    visibilityFlags: ["internal", "customer"],
    latestVersionId: "document-version-demo-5",
    createdAt: "2026-04-26T12:00:00.000Z",
    updatedAt: "2026-04-26T12:00:00.000Z"
  }
] as const;

export const DEMO_DOCUMENT_VERSIONS: readonly DocumentVersionRecord[] = [
  {
    id: "document-version-demo-1",
    documentId: "document-demo-1",
    versionNumber: 1,
    fileName: "basement-contract-v1.pdf",
    contentType: "application/pdf",
    byteSize: 341002,
    storageKey: "documents/document-demo-1/v1/basement-contract-v1.pdf",
    malwareStatus: "clean",
    previewUrl: "memory://preview/documents/document-demo-1/v1/basement-contract-v1.pdf",
    downloadUrl: "memory://download/documents/document-demo-1/v1/basement-contract-v1.pdf",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-21T09:00:00.000Z"
  },
  {
    id: "document-version-demo-2",
    documentId: "document-demo-1",
    versionNumber: 2,
    fileName: "basement-contract-v2.pdf",
    contentType: "application/pdf",
    byteSize: 355221,
    storageKey: "documents/document-demo-1/v2/basement-contract-v2.pdf",
    malwareStatus: "clean",
    previewUrl: "memory://preview/documents/document-demo-1/v2/basement-contract-v2.pdf",
    downloadUrl: "memory://download/documents/document-demo-1/v2/basement-contract-v2.pdf",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-26T10:00:00.000Z"
  },
  {
    id: "document-version-demo-3",
    documentId: "document-demo-2",
    versionNumber: 1,
    fileName: "framing-progress-0427.jpg",
    contentType: "image/jpeg",
    byteSize: 1822000,
    storageKey: "documents/document-demo-2/v1/framing-progress-0427.jpg",
    malwareStatus: "clean",
    previewUrl: "memory://preview/documents/document-demo-2/v1/framing-progress-0427.jpg",
    downloadUrl: "memory://download/documents/document-demo-2/v1/framing-progress-0427.jpg",
    createdByUserId: "employee-1",
    createdAt: "2026-04-27T15:00:00.000Z"
  },
  {
    id: "document-version-demo-4",
    documentId: "document-demo-3",
    versionNumber: 1,
    fileName: "payroll-week-17.pdf",
    contentType: "application/pdf",
    byteSize: 451002,
    storageKey: "documents/document-demo-3/v1/payroll-week-17.pdf",
    malwareStatus: "clean",
    previewUrl: "memory://preview/documents/document-demo-3/v1/payroll-week-17.pdf",
    downloadUrl: "memory://download/documents/document-demo-3/v1/payroll-week-17.pdf",
    createdByUserId: "alex.owner",
    createdAt: "2026-04-25T09:00:00.000Z"
  },
  {
    id: "document-version-demo-5",
    documentId: "document-demo-4",
    versionNumber: 1,
    fileName: "finish-inspiration.png",
    contentType: "image/png",
    byteSize: 1322000,
    storageKey: "documents/document-demo-4/v1/finish-inspiration.png",
    malwareStatus: "clean",
    previewUrl: "memory://preview/documents/document-demo-4/v1/finish-inspiration.png",
    downloadUrl: "memory://download/documents/document-demo-4/v1/finish-inspiration.png",
    createdByUserId: "customer.aria",
    createdAt: "2026-04-26T12:00:00.000Z"
  }
] as const;

export const DEMO_DOCUMENT_ACCESS_RULES: readonly DocumentAccessRuleRecord[] = [
  {
    id: "document-access-rule-demo-1",
    documentId: "document-demo-1",
    principalType: "customer_account",
    principalId: "customer-aria",
    actions: ["view", "download"],
    createdByUserId: "alex.owner",
    createdAt: "2026-04-21T09:05:00.000Z"
  },
  {
    id: "document-access-rule-demo-2",
    documentId: "document-demo-2",
    principalType: "partner_org",
    principalId: "partner-east",
    actions: ["view", "download", "upload"],
    createdByUserId: "alex.owner",
    createdAt: "2026-04-24T08:10:00.000Z"
  }
] as const;

export const DEMO_DOCUMENT_ACTIVITIES: readonly DocumentActivitySummary[] = [
  {
    id: "document-activity-demo-1",
    documentId: "document-demo-1",
    eventType: "document_created",
    actorUserId: "alex.owner",
    summary: "Basement contract packet uploaded.",
    visibilityFlags: ["internal", "customer"],
    occurredAt: "2026-04-21T09:00:00.000Z"
  },
  {
    id: "document-activity-demo-2",
    documentId: "document-demo-1",
    eventType: "document_version_uploaded",
    actorUserId: "alex.owner",
    summary: "Version 2 uploaded for basement contract packet.",
    visibilityFlags: ["internal", "customer"],
    occurredAt: "2026-04-26T10:00:00.000Z"
  },
  {
    id: "document-activity-demo-3",
    documentId: "document-demo-2",
    eventType: "document_created",
    actorUserId: "employee-1",
    summary: "Framing progress photo set uploaded.",
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor", "public_link"],
    occurredAt: "2026-04-24T08:00:00.000Z"
  }
] as const;

export const DEMO_DOCUMENT_PUBLIC_SHARE_LINKS: readonly DocumentPublicShareLinkRecord[] = [
  {
    id: "document-share-link-demo-1",
    documentId: "document-demo-2",
    permissionKeys: ["document.view.public_link"],
    shareScope: "preview_download",
    tokenHash: "seed-link-hash",
    tokenPrefix: "seed-link",
    expiresAt: "2026-05-31T00:00:00.000Z",
    revokedAt: null,
    maxUses: 25,
    useCount: 0,
    createdByUserId: "alex.owner",
    createdAt: "2026-04-27T16:00:00.000Z"
  }
] as const;
