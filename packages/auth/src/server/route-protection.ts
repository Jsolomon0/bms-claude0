import {
  type AuditSink,
  type MonitoringHook,
  type PermissionKey,
  type ProtectedRouteRequest,
  type ProtectedRouteResponse,
  type RateLimitRule,
  type ResourceRecord,
  type StructuredLogger
} from "../../../types/src/index.ts";
import { emitRateLimitBlocked, InMemoryRateLimiter } from "../../../security/src/index.ts";
import { AuthorizationError, authorizeOrThrow } from "./authorize.ts";

type MaybePromise<T> = T | Promise<T>;

export interface ProtectedRouteContext<TRequest extends ProtectedRouteRequest> {
  request: TRequest;
  record?: ResourceRecord;
}

export interface ProtectedRouteOptions<TRequest extends ProtectedRouteRequest> {
  permissionKey: PermissionKey;
  resolveRecord?: (request: TRequest) => MaybePromise<ResourceRecord | undefined>;
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  now?: () => Date;
  rateLimit?: {
    limiter: InMemoryRateLimiter;
    rule: RateLimitRule;
    key?: (request: TRequest) => string;
  };
}

export function protectRoute<TRequest extends ProtectedRouteRequest, TBody>(
  options: ProtectedRouteOptions<TRequest>,
  handler: (context: ProtectedRouteContext<TRequest>) => MaybePromise<ProtectedRouteResponse<TBody>>
) {
  return async (request: TRequest): Promise<ProtectedRouteResponse<TBody | { error: string; reason: string }>> => {
    try {
      const now = options.now ? options.now() : new Date();

      if (options.rateLimit) {
        const rateLimitKey =
          options.rateLimit.key?.(request) ?? `${request.ipAddress ?? "unknown"}:${options.permissionKey}:${request.path}`;
        const decision = options.rateLimit.limiter.check({
          key: rateLimitKey,
          rule: options.rateLimit.rule,
          now,
          metadata: {
            method: request.method,
            path: request.path,
            permissionKey: options.permissionKey
          }
        });

        if (!decision.allowed) {
          await emitRateLimitBlocked({
            auditSink: options.auditSink,
            logger: options.logger,
            monitoringHook: options.monitoringHook,
            occurredAt: now.toISOString(),
            requestPath: request.path,
            actorUserId: request.actor?.userId ?? null,
            ipAddress: request.ipAddress ?? null,
            metadata: {
              method: request.method,
              permissionKey: options.permissionKey,
              retryAfterSeconds: decision.retryAfterSeconds ?? null,
              ruleName: options.rateLimit.rule.name
            }
          });
          return {
            status: 429,
            body: {
              error: "rate_limited",
              reason: "rate_limited"
            }
          };
        }
      }

      const record = options.resolveRecord ? await options.resolveRecord(request) : undefined;

      await authorizeOrThrow(
        {
          actor: request.actor,
          permissionKey: options.permissionKey,
          record,
          now
        },
        options.auditSink
      );

      return await handler({ request, record });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return {
          status: error.status,
          body: {
            error: "forbidden",
            reason: error.decision.reason
          }
        };
      }

      throw error;
    }
  };
}

export interface ProtectedPublicLinkRouteOptions<TRequest extends ProtectedRouteRequest> {
  permissionKey: PermissionKey;
  resolveRecord: (request: TRequest) => MaybePromise<ResourceRecord>;
  auditSink?: AuditSink;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  now?: () => Date;
  rateLimit?: {
    limiter: InMemoryRateLimiter;
    rule: RateLimitRule;
    key?: (request: TRequest) => string;
  };
}

export function protectPublicLinkRoute<TRequest extends ProtectedRouteRequest, TBody>(
  options: ProtectedPublicLinkRouteOptions<TRequest>,
  handler: (context: ProtectedRouteContext<TRequest>) => MaybePromise<ProtectedRouteResponse<TBody>>
) {
  return async (request: TRequest): Promise<ProtectedRouteResponse<TBody | { error: string; reason: string }>> => {
    try {
      const now = options.now ? options.now() : new Date();

      if (options.rateLimit) {
        const rateLimitKey =
          options.rateLimit.key?.(request) ?? `${request.ipAddress ?? "unknown"}:${options.permissionKey}:${request.path}`;
        const decision = options.rateLimit.limiter.check({
          key: rateLimitKey,
          rule: options.rateLimit.rule,
          now,
          metadata: {
            method: request.method,
            path: request.path,
            permissionKey: options.permissionKey
          }
        });

        if (!decision.allowed) {
          await emitRateLimitBlocked({
            auditSink: options.auditSink,
            logger: options.logger,
            monitoringHook: options.monitoringHook,
            occurredAt: now.toISOString(),
            requestPath: request.path,
            actorUserId: request.actor?.userId ?? null,
            ipAddress: request.ipAddress ?? null,
            metadata: {
              method: request.method,
              permissionKey: options.permissionKey,
              retryAfterSeconds: decision.retryAfterSeconds ?? null,
              ruleName: options.rateLimit.rule.name
            }
          });
          return {
            status: 429,
            body: {
              error: "rate_limited",
              reason: "rate_limited"
            }
          };
        }
      }

      const record = await options.resolveRecord(request);

      await authorizeOrThrow(
        {
          permissionKey: options.permissionKey,
          record,
          publicLink: request.publicLink,
          now
        },
        options.auditSink
      );

      return await handler({ request, record });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return {
          status: error.status,
          body: {
            error: "forbidden",
            reason: error.decision.reason
          }
        };
      }

      throw error;
    }
  };
}
