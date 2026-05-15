import type {
  AuditEvent,
  AuditSink,
  MonitoringHook,
  PrivilegedActionKey,
  PrivilegedApprovalAssertionInput,
  PrivilegedApprovalCreateInput,
  PrivilegedApprovalRecord,
  RateLimitCheckInput,
  RateLimitDecision,
  RetentionPolicyEnforcementInput,
  StructuredLogEvent,
  StructuredLogger
} from "../../types/src/index.ts";

function defaultIdGenerator() {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function defaultNow() {
  return new Date();
}

async function writeAudit(auditSink: AuditSink | undefined, event: AuditEvent): Promise<void> {
  const result = auditSink?.write(event);
  await Promise.resolve(result);
}

async function emitStructuredEvent(
  logger: StructuredLogger | undefined,
  monitoringHook: MonitoringHook | undefined,
  event: StructuredLogEvent
): Promise<void> {
  const logResult = logger?.log(event);
  const captureResult = monitoringHook?.capture(event);
  await Promise.all([Promise.resolve(logResult), Promise.resolve(captureResult)]);
}

function buildSecurityAuditEvent(input: {
  eventType: AuditEvent["eventType"];
  outcome: AuditEvent["outcome"];
  actorUserId?: string | null;
  resourceType?: string;
  resourceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}): AuditEvent {
  return {
    eventType: input.eventType,
    outcome: input.outcome,
    actorUserId: input.actorUserId ?? null,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    viaPublicLink: false,
    sensitive: true,
    occurredAt: input.occurredAt,
    metadata: input.metadata
  };
}

export class InMemoryStructuredLogger implements StructuredLogger {
  private readonly events: StructuredLogEvent[] = [];

  log(event: StructuredLogEvent): void {
    this.events.push(event);
  }

  list(): readonly StructuredLogEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export class InMemoryMonitoringHook implements MonitoringHook {
  private readonly events: StructuredLogEvent[] = [];

  capture(event: StructuredLogEvent): void {
    this.events.push(event);
  }

  list(): readonly StructuredLogEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

interface RateLimitState {
  attemptCount: number;
  windowStartedAtMs: number;
  blockedUntilMs?: number;
}

export class InMemoryRateLimiter {
  private readonly states = new Map<string, RateLimitState>();

  check(input: RateLimitCheckInput): RateLimitDecision {
    const now = input.now ?? defaultNow();
    const nowMs = now.getTime();
    const stateKey = `${input.rule.name}:${input.key}`;
    let state = this.states.get(stateKey);

    if (!state) {
      state = {
        attemptCount: 0,
        windowStartedAtMs: nowMs
      };
      this.states.set(stateKey, state);
    }

    if (state.blockedUntilMs && state.blockedUntilMs > nowMs) {
      return {
        allowed: false,
        reason: "rate_limited",
        limit: input.rule.maxAttempts,
        remaining: 0,
        resetAt: new Date(state.blockedUntilMs).toISOString(),
        retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntilMs - nowMs) / 1000))
      };
    }

    if (nowMs - state.windowStartedAtMs >= input.rule.windowMs) {
      state.attemptCount = 0;
      state.windowStartedAtMs = nowMs;
      state.blockedUntilMs = undefined;
    }

    state.attemptCount += 1;

    if (state.attemptCount > input.rule.maxAttempts) {
      const blockedUntilMs = nowMs + (input.rule.blockDurationMs ?? input.rule.windowMs);
      state.blockedUntilMs = blockedUntilMs;
      return {
        allowed: false,
        reason: "rate_limited",
        limit: input.rule.maxAttempts,
        remaining: 0,
        resetAt: new Date(blockedUntilMs).toISOString(),
        retryAfterSeconds: Math.max(1, Math.ceil((blockedUntilMs - nowMs) / 1000))
      };
    }

    const remaining = Math.max(0, input.rule.maxAttempts - state.attemptCount);
    return {
      allowed: true,
      reason: "allowed",
      limit: input.rule.maxAttempts,
      remaining,
      resetAt: new Date(state.windowStartedAtMs + input.rule.windowMs).toISOString()
    };
  }
}

export class PrivilegedActionApprovalError extends Error {
  readonly reason:
    | "approval_required"
    | "approval_not_found"
    | "approval_expired"
    | "approval_revoked"
    | "approval_subject_mismatch";

  constructor(
    reason:
      | "approval_required"
      | "approval_not_found"
      | "approval_expired"
      | "approval_revoked"
      | "approval_subject_mismatch",
    message: string
  ) {
    super(message);
    this.name = "PrivilegedActionApprovalError";
    this.reason = reason;
  }
}

export interface PrivilegedApprovalServiceOptions {
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  now?: () => Date;
  idGenerator?: (prefix: string) => string;
}

export class InMemoryPrivilegedApprovalService {
  private readonly records = new Map<string, PrivilegedApprovalRecord>();
  private readonly auditSink?: AuditSink;
  private readonly logger?: StructuredLogger;
  private readonly monitoringHook?: MonitoringHook;
  private readonly now: () => Date;
  private readonly idGenerator: (prefix: string) => string;

  constructor(options: PrivilegedApprovalServiceOptions = {}) {
    this.auditSink = options.auditSink;
    this.logger = options.logger;
    this.monitoringHook = options.monitoringHook;
    this.now = options.now ?? defaultNow;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator();
  }

  list(): readonly PrivilegedApprovalRecord[] {
    return [...this.records.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async createApproval(input: PrivilegedApprovalCreateInput): Promise<PrivilegedApprovalRecord> {
    const createdAt = this.now().toISOString();
    const record: PrivilegedApprovalRecord = {
      id: this.idGenerator("privileged-approval"),
      actionKey: input.actionKey,
      actorUserId: input.actorUserId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      approvedByUserId: input.approvedByUserId,
      justification: input.justification.trim(),
      createdAt,
      expiresAt: input.expiresAt,
      revokedAt: null,
      metadata: input.metadata
    };
    this.records.set(record.id, record);

    await writeAudit(
      this.auditSink,
      buildSecurityAuditEvent({
        eventType: "security.privileged_approval.recorded",
        outcome: "success",
        actorUserId: record.approvedByUserId,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        occurredAt: createdAt,
        metadata: {
          approvalId: record.id,
          actionKey: record.actionKey,
          subjectActorUserId: record.actorUserId,
          expiresAt: record.expiresAt
        }
      })
    );
    await emitStructuredEvent(this.logger, this.monitoringHook, {
      eventName: "security.privileged_approval.recorded",
      level: "info",
      occurredAt: createdAt,
      actorUserId: record.approvedByUserId,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      metadata: {
        approvalId: record.id,
        actionKey: record.actionKey,
        subjectActorUserId: record.actorUserId
      }
    });

    return record;
  }

  async assertApproved(input: PrivilegedApprovalAssertionInput): Promise<PrivilegedApprovalRecord> {
    const now = input.now ?? this.now();
    const occurredAt = now.toISOString();

    if (!input.approvalId) {
      await this.recordDeniedApproval(occurredAt, input, "approval_required");
      throw new PrivilegedActionApprovalError(
        "approval_required",
        `Privileged action ${input.actionKey} requires an approval record.`
      );
    }

    const record = this.records.get(input.approvalId);

    if (!record) {
      await this.recordDeniedApproval(occurredAt, input, "approval_not_found");
      throw new PrivilegedActionApprovalError("approval_not_found", `Approval ${input.approvalId} was not found.`);
    }

    if (record.revokedAt) {
      await this.recordDeniedApproval(occurredAt, input, "approval_revoked", record);
      throw new PrivilegedActionApprovalError("approval_revoked", `Approval ${record.id} has been revoked.`);
    }

    if (new Date(record.expiresAt) <= now) {
      await this.recordDeniedApproval(occurredAt, input, "approval_expired", record);
      throw new PrivilegedActionApprovalError("approval_expired", `Approval ${record.id} has expired.`);
    }

    if (
      record.actionKey !== input.actionKey ||
      record.actorUserId !== input.actorUserId ||
      record.resourceType !== input.resourceType ||
      record.resourceId !== input.resourceId
    ) {
      await this.recordDeniedApproval(occurredAt, input, "approval_subject_mismatch", record);
      throw new PrivilegedActionApprovalError(
        "approval_subject_mismatch",
        `Approval ${record.id} does not match the requested privileged action.`
      );
    }

    return record;
  }

  private async recordDeniedApproval(
    occurredAt: string,
    input: PrivilegedApprovalAssertionInput,
    reason: PrivilegedActionApprovalError["reason"],
    record?: PrivilegedApprovalRecord
  ): Promise<void> {
    await writeAudit(
      this.auditSink,
      buildSecurityAuditEvent({
        eventType: "security.privileged_approval.denied",
        outcome: "failure",
        actorUserId: input.actorUserId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        occurredAt,
        metadata: {
          approvalId: input.approvalId ?? null,
          actionKey: input.actionKey,
          reason,
          matchedApprovalId: record?.id ?? null
        }
      })
    );
    await emitStructuredEvent(this.logger, this.monitoringHook, {
      eventName: "security.privileged_approval.denied",
      level: "warn",
      occurredAt,
      actorUserId: input.actorUserId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: {
        approvalId: input.approvalId ?? null,
        actionKey: input.actionKey,
        reason
      }
    });
  }
}

export interface InMemorySecurityContext {
  logger: InMemoryStructuredLogger;
  monitoringHook: InMemoryMonitoringHook;
  rateLimiter: InMemoryRateLimiter;
  approvals: InMemoryPrivilegedApprovalService;
}

export function createInMemorySecurityContext(input: {
  auditSink?: AuditSink;
  now?: () => Date;
  idGenerator?: (prefix: string) => string;
} = {}): InMemorySecurityContext {
  const logger = new InMemoryStructuredLogger();
  const monitoringHook = new InMemoryMonitoringHook();
  return {
    logger,
    monitoringHook,
    rateLimiter: new InMemoryRateLimiter(),
    approvals: new InMemoryPrivilegedApprovalService({
      auditSink: input.auditSink,
      logger,
      monitoringHook,
      now: input.now,
      idGenerator: input.idGenerator
    })
  };
}

export function ensureOpaquePublicLinkNonce(value: string): boolean {
  return /^[A-Za-z0-9_-]{12,128}$/.test(value);
}

export interface ResolveRuntimeSecretInput {
  envKey: string;
  fallbackSecret: string;
  minimumLength?: number;
  env?: Record<string, string | undefined>;
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  now?: () => Date;
}

export function resolveRuntimeSecret(input: ResolveRuntimeSecretInput): string {
  const env = input.env ?? process.env;
  const now = input.now ?? defaultNow;
  const occurredAt = now().toISOString();
  const configured = env[input.envKey]?.trim();
  const secret = configured && configured.length > 0 ? configured : input.fallbackSecret;
  const minimumLength = input.minimumLength ?? 24;

  if (!configured) {
    const metadata = {
      envKey: input.envKey,
      minimumLength
    };
    void writeAudit(
      input.auditSink,
      buildSecurityAuditEvent({
        eventType: "security.secret_fallback_used",
        outcome: "success",
        occurredAt,
        metadata
      })
    );
    void emitStructuredEvent(input.logger, input.monitoringHook, {
      eventName: "security.secret.fallback_used",
      level: "warn",
      occurredAt,
      metadata
    });
  }

  if (secret.length < minimumLength) {
    const metadata = {
      envKey: input.envKey,
      minimumLength
    };
    void emitStructuredEvent(input.logger, input.monitoringHook, {
      eventName: "security.secret.invalid",
      level: "error",
      occurredAt,
      metadata
    });
    throw new Error(`Secret ${input.envKey} must be at least ${minimumLength} characters long.`);
  }

  return secret;
}

export async function emitRateLimitBlocked(input: {
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  occurredAt: string;
  requestPath: string;
  actorUserId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await emitStructuredEvent(input.logger, input.monitoringHook, {
    eventName: "security.rate_limit.blocked",
    level: "warn",
    occurredAt: input.occurredAt,
    actorUserId: input.actorUserId ?? null,
    requestPath: input.requestPath,
    ipAddress: input.ipAddress ?? null,
    resourceType: "route",
    resourceId: input.requestPath,
    metadata: input.metadata
  });
  await writeAudit(
    input.auditSink,
    buildSecurityAuditEvent({
      eventType: "security.rate_limit_blocked",
      outcome: "failure",
      actorUserId: input.actorUserId ?? null,
      resourceType: "route",
      resourceId: input.requestPath,
      occurredAt: input.occurredAt,
      metadata: input.metadata
    })
  );
}

export async function emitInvalidPublicLinkAttempt(input: {
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  occurredAt: string;
  resourceType?: string;
  resourceId?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await emitStructuredEvent(input.logger, input.monitoringHook, {
    eventName: "security.public_link.invalid",
    level: "warn",
    occurredAt: input.occurredAt,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: {
      reason: input.reason,
      ...input.metadata
    }
  });
  await writeAudit(
    input.auditSink,
    buildSecurityAuditEvent({
      eventType: "public_link.invalid",
      outcome: "failure",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      occurredAt: input.occurredAt,
      metadata: {
        reason: input.reason,
        ...input.metadata
      }
    })
  );
}

export async function enforceRetentionPolicy(input: {
  policy: RetentionPolicyEnforcementInput;
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (input.policy.retentionFlags.length === 0) {
    return;
  }

  await writeAudit(
    input.auditSink,
    buildSecurityAuditEvent({
      eventType: "security.retention_policy.enforced",
      outcome: "success",
      actorUserId: input.policy.actorUserId,
      resourceType: input.policy.resourceType,
      resourceId: input.policy.resourceId,
      occurredAt: input.occurredAt,
      metadata: {
        policyKey: input.policy.policyKey,
        retentionFlags: input.policy.retentionFlags,
        ...input.metadata
      }
    })
  );
  await emitStructuredEvent(input.logger, input.monitoringHook, {
    eventName: "security.retention_policy.enforced",
    level: "info",
    occurredAt: input.occurredAt,
    actorUserId: input.policy.actorUserId,
    resourceType: input.policy.resourceType,
    resourceId: input.policy.resourceId,
    metadata: {
      policyKey: input.policy.policyKey,
      retentionFlags: input.policy.retentionFlags,
      ...input.metadata
    }
  });
}

export function createPrivilegedApprovalExpiry(now: Date, ttlMinutes: number): string {
  return new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
}

export function privilegedActionResourceKey(
  actionKey: PrivilegedActionKey,
  resourceType: string,
  resourceId: string
): string {
  return `${actionKey}:${resourceType}:${resourceId}`;
}
