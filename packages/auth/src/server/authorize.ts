import {
  type AuditEvent,
  type AuditSink,
  type AuthorizationDecision,
  type AuthorizationInput
} from "../../../types/src/index.ts";
import { evaluateAuthorization } from "../../../permissions/src/index.ts";

export class AuthorizationError extends Error {
  decision: AuthorizationDecision;
  status: number;

  constructor(decision: AuthorizationDecision) {
    super(`Authorization failed: ${decision.reason}`);
    this.name = "AuthorizationError";
    this.decision = decision;
    this.status = mapDecisionToStatus(decision);
  }
}

function mapDecisionToStatus(decision: AuthorizationDecision): number {
  if (decision.reason === "unauthenticated") {
    return 401;
  }

  if (
    decision.reason === "public_link_expired" ||
    decision.reason === "public_link_revoked" ||
    decision.reason === "public_link_use_limit_exceeded"
  ) {
    return 410;
  }

  return 403;
}

export function buildAuthorizationAuditEvent(
  input: AuthorizationInput,
  decision: AuthorizationDecision
): AuditEvent {
  const visibility = input.record
    ? Array.isArray(input.record.visibility)
      ? input.record.visibility
      : [input.record.visibility]
    : undefined;

  return {
    eventType: decision.allowed ? "authorization.allow" : "authorization.deny",
    outcome: decision.allowed ? "allow" : "deny",
    actorUserId: input.actor?.userId ?? null,
    membershipId: decision.matchedMembershipId ?? null,
    permissionKey: input.permissionKey,
    resourceType: input.record?.resourceType ?? input.publicLink?.resourceType,
    resourceId: input.record?.resourceId ?? input.publicLink?.resourceId,
    visibility,
    reason: decision.reason,
    viaPublicLink: decision.viaPublicLink,
    sensitive: decision.sensitive,
    occurredAt: (input.now ?? new Date()).toISOString(),
    metadata: {
      matchedRole: decision.matchedRole ?? null,
      scope: decision.scope
    }
  };
}

export function shouldAudit(input: AuthorizationInput, decision: AuthorizationDecision): boolean {
  return decision.auditRequired || Boolean(input.publicLink);
}

export async function authorize(input: AuthorizationInput, auditSink?: AuditSink): Promise<AuthorizationDecision> {
  const decision = evaluateAuthorization(input);

  if (auditSink && shouldAudit(input, decision)) {
    await auditSink.write(buildAuthorizationAuditEvent(input, decision));
  }

  return decision;
}

export async function authorizeOrThrow(
  input: AuthorizationInput,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorize(input, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}
