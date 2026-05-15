import { AuthorizationError, authorize, authorizeOrThrow } from "../../auth/src/server/index.ts";
import type {
  ApprovedProjectRequestSnapshot,
  AuditSink,
  AuthorizationActor,
  AuthorizationDecision,
  ChangeOrderRecord,
  PermissionKey,
  ProjectChangeRequestRecord,
  ProjectPhaseRecord,
  ProjectProgressUpdateRecord,
  ProjectRecord,
  ProjectTaskRecord,
  ResourceRecord
} from "../../types/src/index.ts";

const PROJECT_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "project.view.all",
  "project.view.org",
  "project.view.assigned",
  "project.view.self",
  "project.view.partner"
] as const;

const PROJECT_PROGRESS_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "project.progress.create.org",
  "project.progress.create.assigned",
  "project.progress.create.partner"
] as const;

function toPartnerResourceFields(partnerOrgIds: readonly string[]) {
  return {
    partnerOrgId: partnerOrgIds[0] ?? null,
    partnerOrgIds
  };
}

export function toApprovedRequestResourceRecord(request: ApprovedProjectRequestSnapshot): ResourceRecord {
  return {
    resourceType: "project_request",
    resourceId: request.requestId,
    orgId: request.organizationId,
    customerAccountId: request.customerAccountId ?? null,
    visibility: ["internal", "customer"]
  };
}

export function toProjectResourceRecord(project: ProjectRecord): ResourceRecord {
  return {
    resourceType: "project",
    resourceId: project.id,
    orgId: project.organizationId,
    ownerUserId: project.ownerUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: project.visibilityFlags,
    ...toPartnerResourceFields(project.partnerOrgIds)
  };
}

export function toProjectPhaseResourceRecord(
  project: ProjectRecord,
  phase: ProjectPhaseRecord
): ResourceRecord {
  return {
    resourceType: "project_phase",
    resourceId: phase.id,
    orgId: project.organizationId,
    ownerUserId: project.ownerUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: phase.visibilityFlags,
    ...toPartnerResourceFields(project.partnerOrgIds)
  };
}

export function toProjectTaskResourceRecord(project: ProjectRecord, task: ProjectTaskRecord): ResourceRecord {
  return {
    resourceType: "project_task",
    resourceId: task.id,
    orgId: project.organizationId,
    ownerUserId: project.ownerUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: task.assignedUserIds.length > 0 ? task.assignedUserIds : project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: task.visibilityFlags,
    ...toPartnerResourceFields(task.partnerOrgIds.length > 0 ? task.partnerOrgIds : project.partnerOrgIds)
  };
}

export function toProjectProgressUpdateResourceRecord(
  project: ProjectRecord,
  update: ProjectProgressUpdateRecord
): ResourceRecord {
  return {
    resourceType: "project_progress_update",
    resourceId: update.id,
    orgId: project.organizationId,
    ownerUserId: update.authorUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: update.visibilityFlags,
    ...toPartnerResourceFields(project.partnerOrgIds)
  };
}

export function toProjectChangeRequestResourceRecord(
  project: ProjectRecord,
  changeRequest: ProjectChangeRequestRecord
): ResourceRecord {
  return {
    resourceType: "project_change_request",
    resourceId: changeRequest.id,
    orgId: project.organizationId,
    ownerUserId: changeRequest.requesterUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: changeRequest.visibilityFlags,
    ...toPartnerResourceFields(project.partnerOrgIds)
  };
}

export function toChangeOrderResourceRecord(project: ProjectRecord, changeOrder: ChangeOrderRecord): ResourceRecord {
  return {
    resourceType: "change_order",
    resourceId: changeOrder.id,
    orgId: project.organizationId,
    ownerUserId: project.ownerUserId,
    customerAccountId: project.customerAccountId ?? null,
    assignedUserIds: project.assignedUserIds,
    assignedProjectId: project.id,
    visibility: changeOrder.visibilityFlags,
    ...toPartnerResourceFields(project.partnerOrgIds)
  };
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

export async function authorizeProjectView(
  actor: AuthorizationActor | undefined,
  project: ProjectRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toProjectResourceRecord(project), PROJECT_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeProjectViewOrThrow(
  actor: AuthorizationActor | undefined,
  project: ProjectRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeProjectView(actor, project, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeProjectProgressCreateOrThrow(
  actor: AuthorizationActor | undefined,
  project: ProjectRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeAcrossPermissions(
    actor,
    toProjectResourceRecord(project),
    PROJECT_PROGRESS_PERMISSION_CANDIDATES,
    auditSink
  );

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeProjectMutationOrThrow(
  actor: AuthorizationActor | undefined,
  permissionKey: PermissionKey,
  record: ResourceRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey,
      record,
      now: new Date()
    },
    auditSink
  );
}
