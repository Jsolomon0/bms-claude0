export const SECURITY_LOG_LEVELS = ["info", "warn", "error"] as const;

export type SecurityLogLevel = (typeof SECURITY_LOG_LEVELS)[number];

export interface StructuredLogEvent {
  eventName: string;
  level: SecurityLogLevel;
  occurredAt: string;
  actorUserId?: string | null;
  requestPath?: string;
  ipAddress?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredLogger {
  log(event: StructuredLogEvent): void | Promise<void>;
}

export interface MonitoringHook {
  capture(event: StructuredLogEvent): void | Promise<void>;
}

export interface RateLimitRule {
  name: string;
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitCheckInput {
  key: string;
  rule: RateLimitRule;
  now?: Date;
  metadata?: Record<string, unknown>;
}

export interface RateLimitDecision {
  allowed: boolean;
  reason: "allowed" | "rate_limited";
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds?: number;
}

export const PRIVILEGED_ACTION_KEYS = [
  "public_link.issue",
  "payroll.export",
  "document.archive.retained"
] as const;

export type PrivilegedActionKey = (typeof PRIVILEGED_ACTION_KEYS)[number];

export interface PrivilegedApprovalRecord {
  id: string;
  actionKey: PrivilegedActionKey;
  actorUserId: string;
  resourceType: string;
  resourceId: string;
  approvedByUserId: string;
  justification: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PrivilegedApprovalCreateInput {
  actionKey: PrivilegedActionKey;
  actorUserId: string;
  resourceType: string;
  resourceId: string;
  approvedByUserId: string;
  justification: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

export interface PrivilegedApprovalAssertionInput {
  approvalId?: string;
  actionKey: PrivilegedActionKey;
  actorUserId: string;
  resourceType: string;
  resourceId: string;
  now?: Date;
}

export interface RetentionPolicyEnforcementInput {
  policyKey: string;
  resourceType: string;
  resourceId: string;
  actorUserId: string;
  retentionFlags: readonly string[];
}
