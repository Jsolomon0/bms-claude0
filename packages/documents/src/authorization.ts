import {
  AuthorizationError,
  authorize,
  authorizeOrThrow
} from "../../auth/src/server/index.ts";
import type {
  AuditSink,
  AuthorizationActor,
  AuthorizationDecision,
  DocumentAccessAction,
  DocumentAccessRuleRecord,
  DocumentRecord,
  DocumentUploadEnvelope,
  PermissionKey,
  ResourceRecord
} from "../../types/src/index.ts";

const DOCUMENT_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "document.view.org",
  "document.view.assigned",
  "document.view.self",
  "document.view.partner"
] as const;

const DOCUMENT_UPLOAD_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "document.upload.org",
  "document.upload.assigned",
  "document.upload.self",
  "document.upload.partner"
] as const;

const DOCUMENT_VERSION_UPLOAD_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "document.version.upload.org",
  "document.version.upload.assigned",
  "document.version.upload.self",
  "document.version.upload.partner"
] as const;

function toPartnerFields(partnerOrgIds: readonly string[]) {
  return {
    partnerOrgId: partnerOrgIds[0] ?? null,
    partnerOrgIds
  };
}

export function toDocumentResourceRecord(document: DocumentRecord): ResourceRecord {
  return {
    resourceType: "document",
    resourceId: document.id,
    orgId: document.organizationId,
    ownerUserId: document.ownerUserId,
    customerAccountId: document.customerAccountId ?? null,
    assignedUserIds: document.assignedUserIds,
    assignedProjectId: document.projectId ?? null,
    visibility: document.visibilityFlags,
    ...toPartnerFields(document.partnerOrgIds)
  };
}

export function toDraftDocumentResourceRecord(input: DocumentUploadEnvelope): ResourceRecord {
  return {
    resourceType: "document",
    resourceId: "draft-document",
    orgId: input.organizationId,
    ownerUserId: input.ownerUserId,
    customerAccountId: input.customerAccountId ?? null,
    assignedUserIds: input.assignedUserIds ?? [],
    assignedProjectId: input.projectId ?? null,
    visibility: input.visibilityFlags,
    ...toPartnerFields(input.partnerOrgIds ?? [])
  };
}

function actorHasPrivilegedDocumentRole(actor: AuthorizationActor | undefined): boolean {
  if (!actor) {
    return false;
  }

  return actor.memberships.some((membership) => membership.role === "owner" || membership.role === "administrator");
}

function matchesAccessRule(
  actor: AuthorizationActor,
  rule: DocumentAccessRuleRecord,
  action: DocumentAccessAction
): boolean {
  if (!rule.actions.includes(action)) {
    return false;
  }

  switch (rule.principalType) {
    case "role":
      return actor.memberships.some((membership) => membership.role === rule.principalId);
    case "user":
      return actor.userId === rule.principalId;
    case "customer_account":
      return actor.memberships.some((membership) => membership.customerAccountId === rule.principalId);
    case "partner_org":
      return actor.memberships.some((membership) => membership.partnerOrgId === rule.principalId);
  }
}

export function documentAccessRulesAllow(
  actor: AuthorizationActor | undefined,
  rules: readonly DocumentAccessRuleRecord[],
  action: DocumentAccessAction
): boolean {
  if (rules.length === 0) {
    return true;
  }

  if (!actor) {
    return false;
  }

  if (actorHasPrivilegedDocumentRole(actor)) {
    return true;
  }

  return rules.some((rule) => matchesAccessRule(actor, rule, action));
}

async function authorizeAcrossPermissions(
  actor: AuthorizationActor | undefined,
  record: ResourceRecord,
  permissionKeys: readonly PermissionKey[],
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  let lastDecision: AuthorizationDecision | undefined;

  for (const permissionKey of permissionKeys) {
    const decision = await authorize(
      {
        actor,
        permissionKey,
        record,
        now: new Date()
      },
      auditSink
    );

    if (decision.allowed) {
      return decision;
    }

    lastDecision = decision;
  }

  if (!lastDecision) {
    throw new Error("No permission candidates were provided.");
  }

  return lastDecision;
}

export async function authorizeDocumentView(
  actor: AuthorizationActor | undefined,
  document: DocumentRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toDocumentResourceRecord(document), DOCUMENT_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeDocumentViewOrThrow(
  actor: AuthorizationActor | undefined,
  document: DocumentRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeDocumentView(actor, document, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeDocumentUploadOrThrow(
  actor: AuthorizationActor | undefined,
  draftInput: DocumentUploadEnvelope,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeAcrossPermissions(
    actor,
    toDraftDocumentResourceRecord(draftInput),
    DOCUMENT_UPLOAD_PERMISSION_CANDIDATES,
    auditSink
  );

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeDocumentVersionUploadOrThrow(
  actor: AuthorizationActor | undefined,
  document: DocumentRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeAcrossPermissions(
    actor,
    toDocumentResourceRecord(document),
    DOCUMENT_VERSION_UPLOAD_PERMISSION_CANDIDATES,
    auditSink
  );

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeDocumentMutationOrThrow(
  actor: AuthorizationActor | undefined,
  permissionKey: PermissionKey,
  document: DocumentRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey,
      record: toDocumentResourceRecord(document),
      now: new Date()
    },
    auditSink
  );
}
