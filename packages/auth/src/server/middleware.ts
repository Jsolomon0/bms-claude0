import {
  type MonitoringHook,
  type MiddlewareOutcome,
  type MiddlewareRequest,
  type PermissionKey,
  type RateLimitRule,
  type RoleKey,
  type StructuredLogger
} from "../../../types/src/index.ts";
import { emitRateLimitBlocked, InMemoryRateLimiter } from "../../../security/src/index.ts";
import { actorHasAnyRole, actorHasPermission } from "../../../permissions/src/index.ts";

export interface PathAccessRule {
  prefix: string;
  allowRoles?: readonly RoleKey[];
  allowAnyPermissionKeys?: readonly PermissionKey[];
}

export interface PathAccessMiddlewareOptions {
  signInPath?: string;
  forbiddenPath?: string;
  logger?: StructuredLogger;
  monitoringHook?: MonitoringHook;
  now?: () => Date;
  rateLimit?: {
    limiter: InMemoryRateLimiter;
    rule: RateLimitRule;
    key?: (request: MiddlewareRequest) => string;
  };
}

export function createPathAccessMiddleware(
  rules: readonly PathAccessRule[],
  options: PathAccessMiddlewareOptions = {}
) {
  const signInPath = options.signInPath ?? "/login";
  const forbiddenPath = options.forbiddenPath ?? "/forbidden";
  const orderedRules = [...rules].sort((left, right) => right.prefix.length - left.prefix.length);

  return (request: MiddlewareRequest): MiddlewareOutcome => {
    if (options.rateLimit) {
      const now = options.now ? options.now() : new Date();
      const decision = options.rateLimit.limiter.check({
        key: options.rateLimit.key?.(request) ?? `${request.ipAddress ?? "unknown"}:${request.pathname}`,
        rule: options.rateLimit.rule,
        now,
        metadata: {
          pathname: request.pathname
        }
      });

      if (!decision.allowed) {
        void emitRateLimitBlocked({
          logger: options.logger,
          monitoringHook: options.monitoringHook,
          occurredAt: now.toISOString(),
          requestPath: request.pathname,
          actorUserId: request.actor?.userId ?? null,
          ipAddress: request.ipAddress ?? null,
          metadata: {
            retryAfterSeconds: decision.retryAfterSeconds ?? null,
            ruleName: options.rateLimit.rule.name
          }
        });
        return {
          allowed: false,
          status: 429,
          reason: "rate_limited"
        };
      }
    }

    const matchedRule = orderedRules.find(
      (rule) =>
        request.pathname === rule.prefix ||
        request.pathname.startsWith(`${rule.prefix}/`) ||
        rule.prefix === "/"
    );

    if (!matchedRule) {
      return {
        allowed: true,
        status: 200
      };
    }

    if (!request.actor) {
      return {
        allowed: false,
        status: 401,
        reason: "unauthenticated",
        redirectTo: signInPath
      };
    }

    if (matchedRule.allowRoles && actorHasAnyRole(request.actor, matchedRule.allowRoles)) {
      return {
        allowed: true,
        status: 200
      };
    }

    if (
      matchedRule.allowAnyPermissionKeys &&
      matchedRule.allowAnyPermissionKeys.some((permissionKey) => actorHasPermission(request.actor, permissionKey))
    ) {
      return {
        allowed: true,
        status: 200
      };
    }

    return {
      allowed: false,
      status: 403,
      reason: "forbidden",
      redirectTo: forbiddenPath
    };
  };
}
