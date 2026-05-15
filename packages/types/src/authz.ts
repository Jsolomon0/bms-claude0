export const ROLE_KEYS = [
  "owner",
  "administrator",
  "developer",
  "employee",
  "applicant",
  "customer",
  "subcontractor",
  "supercontractor"
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const VISIBILITY_FLAGS = [
  "internal",
  "applicant",
  "customer",
  "subcontractor",
  "supercontractor",
  "public_link"
] as const;

export type VisibilityFlag = (typeof VISIBILITY_FLAGS)[number];

export const RECORD_SCOPES = [
  "all",
  "org",
  "assigned",
  "self",
  "partner",
  "public_link"
] as const;

export type RecordScope = (typeof RECORD_SCOPES)[number];

export type PermissionKey = `${string}.${string}.${RecordScope}`;

export type AuthorizationDecisionReason =
  | "allowed"
  | "unauthenticated"
  | "no_active_membership"
  | "unknown_permission"
  | "permission_denied"
  | "scope_denied"
  | "visibility_denied"
  | "public_link_required"
  | "public_link_expired"
  | "public_link_revoked"
  | "public_link_scope_denied"
  | "public_link_resource_mismatch"
  | "public_link_use_limit_exceeded";

export interface PermissionDefinition {
  key: PermissionKey;
  description: string;
  scope: RecordScope;
  allowedVisibilities: readonly VisibilityFlag[];
  sensitive: boolean;
  publicLinkAllowed: boolean;
}

export interface RoleMembership {
  id: string;
  userId: string;
  role: RoleKey;
  orgId?: string | null;
  customerAccountId?: string | null;
  partnerOrgId?: string | null;
  grantedPermissionKeys?: readonly PermissionKey[];
  deniedPermissionKeys?: readonly PermissionKey[];
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AuthorizationActor {
  userId: string;
  memberships: readonly RoleMembership[];
  assignedProjectIds?: readonly string[];
  managedPartnerOrgIds?: readonly string[];
}

export interface ResourceRecord {
  resourceType: string;
  resourceId: string;
  orgId?: string | null;
  ownerUserId?: string | null;
  customerAccountId?: string | null;
  partnerOrgId?: string | null;
  partnerOrgIds?: readonly string[];
  assignedUserIds?: readonly string[];
  assignedProjectId?: string | null;
  visibility: VisibilityFlag | readonly VisibilityFlag[];
}

export interface ResolvedPublicLink {
  id: string;
  resourceType: string;
  resourceId: string;
  permissionKeys: readonly PermissionKey[];
  expiresAt: string;
  revokedAt?: string | null;
  maxUses?: number | null;
  useCount?: number;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationDecisionReason;
  permissionKey: PermissionKey;
  scope: RecordScope;
  sensitive: boolean;
  auditRequired: boolean;
  viaPublicLink: boolean;
  matchedMembershipId?: string;
  matchedRole?: RoleKey;
}

export type AuditEventType =
  | "authorization.allow"
  | "authorization.deny"
  | "security.rate_limit_blocked"
  | "security.secret_fallback_used"
  | "security.privileged_approval.recorded"
  | "security.privileged_approval.denied"
  | "security.retention_policy.enforced"
  | "automation.job.completed"
  | "automation.job.failed"
  | "notification.sent"
  | "public_link.invalid"
  | "public_link.issue"
  | "public_link.access"
  | "public_link.revoke"
  | "intake.project_request.submitted"
  | "intake.project_request.status_changed"
  | "intake.lead.status_changed"
  | "project.created"
  | "project.status_changed"
  | "project.visibility_changed"
  | "project.phase.status_changed"
  | "project.task.status_changed"
  | "project.change_request.status_changed"
  | "project.change_order.status_changed"
  | "document.version_uploaded"
  | "document.archive_state_changed"
  | "document.visibility_changed"
  | "document.access_rule_changed"
  | "time.clock.recorded"
  | "timesheet.submitted"
  | "timesheet.approved"
  | "timesheet.rejected"
  | "payroll.profile_synced"
  | "payroll.export_started"
  | "payroll.run.status_changed"
  | "payroll.document_published"
  | "vendor.created"
  | "vendor.updated"
  | "expense.created"
  | "expense.updated"
  | "expense.status_changed"
  | "purchase_order.created"
  | "purchase_order.updated"
  | "purchase_order.status_changed"
  | "bill.created"
  | "bill.updated"
  | "bill.status_changed"
  | "report.snapshot_generated"
  | "report.exported"
  | "invoice.created"
  | "invoice.status_changed"
  | "payment.recorded"
  | "payment.webhook_processed"
  | "hiring.job_posting.created"
  | "hiring.job_posting.updated"
  | "hiring.job_posting.archived"
  | "hiring.application.submitted"
  | "hiring.application.status_changed"
  | "hiring.document.uploaded"
  | "hiring.document.deleted"
  | "hiring.interview.scheduled"
  | "hiring.interview.status_changed"
  | "hiring.interview_feedback.submitted"
  | "hiring.offer.created"
  | "hiring.offer.status_changed"
  | "hiring.applicant.converted";

export type AuditOutcome = "allow" | "deny" | "issued" | "revoked" | "success" | "failure";

export interface AuditEvent {
  eventType: AuditEventType;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  membershipId?: string | null;
  permissionKey?: PermissionKey;
  resourceType?: string;
  resourceId?: string;
  visibility?: readonly VisibilityFlag[];
  reason?: AuthorizationDecisionReason | string;
  viaPublicLink: boolean;
  sensitive: boolean;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSink {
  write(event: AuditEvent): void | Promise<void>;
}

export interface AuthorizationInput {
  actor?: AuthorizationActor;
  permissionKey: PermissionKey;
  record?: ResourceRecord;
  publicLink?: ResolvedPublicLink;
  now?: Date;
}

export interface MiddlewareRequest {
  pathname: string;
  actor?: AuthorizationActor;
  ipAddress?: string;
  userAgent?: string;
}

export interface MiddlewareOutcome {
  allowed: boolean;
  status: number;
  reason?: string;
  redirectTo?: string;
}

export interface ProtectedRouteRequest {
  method: string;
  path: string;
  actor?: AuthorizationActor;
  ipAddress?: string;
  userAgent?: string;
  publicLink?: ResolvedPublicLink;
}

export interface ProtectedRouteResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
