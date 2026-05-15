import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { emitInvalidPublicLinkAttempt, ensureOpaquePublicLinkNonce } from "../../../security/src/index.ts";
import { type AuditSink, type MonitoringHook, type PermissionKey, type ResolvedPublicLink, type StructuredLogger } from "../../../types/src/index.ts";

export interface PublicLinkTokenPayload {
  linkId: string;
  resourceType: string;
  resourceId: string;
  permissionKeys: readonly PermissionKey[];
  expiresAt: string;
  nonce: string;
  issuedAt?: string;
}

export interface VerifiedPublicLinkToken {
  valid: boolean;
  reason?: "malformed" | "signature_mismatch" | "expired" | "payload_invalid" | "secret_invalid";
  payload?: PublicLinkTokenPayload;
}

export interface PublicLinkSecurityHooks {
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  resourceType?: string;
  resourceId?: string;
}

function sign(payloadSegment: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

function validateSecret(secret: string): string | undefined {
  if (!secret.trim()) {
    return "Public link secret cannot be empty.";
  }

  if (secret.length < 12) {
    return "Public link secret must be at least 12 characters long.";
  }

  return undefined;
}

function validatePayload(payload: PublicLinkTokenPayload): string | undefined {
  if (!payload.linkId.trim() || !payload.resourceType.trim() || !payload.resourceId.trim()) {
    return "Public link payload identifiers are required.";
  }

  if (!Array.isArray(payload.permissionKeys) || payload.permissionKeys.length === 0) {
    return "Public link payload requires at least one permission key.";
  }

  if (!payload.permissionKeys.every((value) => typeof value === "string" && value.trim().length > 0)) {
    return "Public link permission keys must be non-empty strings.";
  }

  if (!ensureOpaquePublicLinkNonce(payload.nonce)) {
    return "Public link nonce format is invalid.";
  }

  if (Number.isNaN(Date.parse(payload.expiresAt))) {
    return "Public link expiration must be a valid ISO timestamp.";
  }

  if (payload.issuedAt && Number.isNaN(Date.parse(payload.issuedAt))) {
    return "Public link issuedAt must be a valid ISO timestamp.";
  }

  return undefined;
}

function reportInvalidAttempt(
  reason: VerifiedPublicLinkToken["reason"],
  hooks: PublicLinkSecurityHooks | undefined,
  payload?: Partial<PublicLinkTokenPayload>
): void {
  if (!reason) {
    return;
  }

  void emitInvalidPublicLinkAttempt({
    auditSink: hooks?.auditSink,
    logger: hooks?.logger,
    monitoringHook: hooks?.monitoringHook,
    occurredAt: new Date().toISOString(),
    resourceType: payload?.resourceType ?? hooks?.resourceType,
    resourceId: payload?.resourceId ?? hooks?.resourceId,
    reason,
    metadata: payload
      ? {
          linkId: payload.linkId ?? null
        }
      : undefined
  });
}

export function issueSignedPublicLinkToken(
  payload: PublicLinkTokenPayload,
  secret: string,
  hooks?: PublicLinkSecurityHooks
): string {
  const secretIssue = validateSecret(secret);

  if (secretIssue) {
    reportInvalidAttempt("secret_invalid", hooks, payload);
    throw new Error(secretIssue);
  }

  const payloadIssue = validatePayload(payload);

  if (payloadIssue) {
    reportInvalidAttempt("payload_invalid", hooks, payload);
    throw new Error(payloadIssue);
  }

  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(serializedPayload, secret);
  return `${serializedPayload}.${signature}`;
}

export function verifySignedPublicLinkToken(
  token: string,
  secret: string,
  now = new Date(),
  hooks?: PublicLinkSecurityHooks
): VerifiedPublicLinkToken {
  const secretIssue = validateSecret(secret);

  if (secretIssue) {
    reportInvalidAttempt("secret_invalid", hooks);
    return { valid: false, reason: "secret_invalid" };
  }

  if (!token.trim() || token.length > 4096) {
    reportInvalidAttempt("malformed", hooks);
    return { valid: false, reason: "malformed" };
  }

  const segments = token.split(".");

  if (segments.length !== 2) {
    reportInvalidAttempt("malformed", hooks);
    return { valid: false, reason: "malformed" };
  }

  const [serializedPayload, providedSignature] = segments;

  if (!serializedPayload || !providedSignature) {
    reportInvalidAttempt("malformed", hooks);
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = sign(serializedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    reportInvalidAttempt("signature_mismatch", hooks);
    return { valid: false, reason: "signature_mismatch" };
  }

  let payload: PublicLinkTokenPayload;

  try {
    payload = JSON.parse(Buffer.from(serializedPayload, "base64url").toString("utf8")) as PublicLinkTokenPayload;
  } catch {
    reportInvalidAttempt("malformed", hooks);
    return { valid: false, reason: "malformed" };
  }

  const payloadIssue = validatePayload(payload);

  if (payloadIssue) {
    reportInvalidAttempt("payload_invalid", hooks, payload);
    return { valid: false, reason: "payload_invalid", payload };
  }

  if (payload.issuedAt && now < new Date(payload.issuedAt)) {
    reportInvalidAttempt("payload_invalid", hooks, payload);
    return { valid: false, reason: "payload_invalid", payload };
  }

  if (now > new Date(payload.expiresAt)) {
    reportInvalidAttempt("expired", hooks, payload);
    return { valid: false, reason: "expired", payload };
  }

  return { valid: true, payload };
}

export function hashPublicLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 12);
}

export function materializeResolvedPublicLink(
  link: Pick<ResolvedPublicLink, "id" | "resourceType" | "resourceId" | "permissionKeys" | "expiresAt"> &
    Partial<Pick<ResolvedPublicLink, "revokedAt" | "maxUses" | "useCount">>
): ResolvedPublicLink {
  return {
    id: link.id,
    resourceType: link.resourceType,
    resourceId: link.resourceId,
    permissionKeys: link.permissionKeys,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt ?? null,
    maxUses: link.maxUses ?? null,
    useCount: link.useCount ?? 0
  };
}
