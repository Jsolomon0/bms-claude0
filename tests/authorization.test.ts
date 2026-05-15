import test from "node:test";
import assert from "node:assert/strict";

import { evaluateAuthorization } from "../packages/permissions/src/index.ts";
import {
  AuthorizationError,
  authorize,
  authorizeOrThrow,
  buildAuthorizationAuditEvent,
  createPathAccessMiddleware,
  hashPublicLinkToken,
  issueSignedPublicLinkToken,
  protectPublicLinkRoute,
  protectRoute,
  verifySignedPublicLinkToken
} from "../packages/auth/src/server/index.ts";
import { InMemoryMonitoringHook, InMemoryRateLimiter, InMemoryStructuredLogger } from "../packages/security/src/index.ts";
import {
  type AuditEvent,
  type AuthorizationActor,
  type PermissionKey,
  type ResourceRecord,
  type ResolvedPublicLink
} from "../packages/types/src/index.ts";

function actor(overrides: Partial<AuthorizationActor>): AuthorizationActor {
  return {
    userId: overrides.userId ?? "user-1",
    memberships: overrides.memberships ?? [],
    assignedProjectIds: overrides.assignedProjectIds ?? [],
    managedPartnerOrgIds: overrides.managedPartnerOrgIds ?? []
  };
}

function record(overrides: Partial<ResourceRecord>): ResourceRecord {
  return {
    resourceType: overrides.resourceType ?? "project",
    resourceId: overrides.resourceId ?? "project-1",
    orgId: overrides.orgId ?? "org-1",
    ownerUserId: overrides.ownerUserId ?? null,
    customerAccountId: overrides.customerAccountId ?? null,
    partnerOrgId: overrides.partnerOrgId ?? null,
    assignedUserIds: overrides.assignedUserIds ?? [],
    assignedProjectId: overrides.assignedProjectId ?? null,
    visibility: overrides.visibility ?? "internal"
  };
}

function publicLink(overrides: Partial<ResolvedPublicLink>): ResolvedPublicLink {
  return {
    id: overrides.id ?? "link-1",
    resourceType: overrides.resourceType ?? "project",
    resourceId: overrides.resourceId ?? "project-1",
    permissionKeys: overrides.permissionKeys ?? (["project.view.public_link"] as readonly PermissionKey[]),
    expiresAt: overrides.expiresAt ?? "2099-01-01T00:00:00.000Z",
    revokedAt: overrides.revokedAt ?? null,
    maxUses: overrides.maxUses ?? null,
    useCount: overrides.useCount ?? 0
  };
}

class MemoryAuditSink {
  events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }
}

test("owner wildcard grant can approve an org invoice", () => {
  const decision = evaluateAuthorization({
    actor: actor({
      memberships: [
        {
          id: "m-owner",
          userId: "user-1",
          role: "owner",
          orgId: "org-1"
        }
      ]
    }),
    permissionKey: "invoice.approve.org",
    record: record({
      resourceType: "invoice",
      resourceId: "invoice-1",
      visibility: "internal"
    })
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.matchedRole, "owner");
});

test("developer has no standing project access", () => {
  const decision = evaluateAuthorization({
    actor: actor({
      memberships: [
        {
          id: "m-dev",
          userId: "user-1",
          role: "developer",
          orgId: "org-1"
        }
      ]
    }),
    permissionKey: "project.view.org",
    record: record({})
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "permission_denied");
});

test("employee can access assigned project but not unassigned project", () => {
  const currentActor = actor({
    userId: "employee-1",
    assignedProjectIds: ["project-1"],
    memberships: [
      {
        id: "m-employee",
        userId: "employee-1",
        role: "employee",
        orgId: "org-1"
      }
    ]
  });

  const allowDecision = evaluateAuthorization({
    actor: currentActor,
    permissionKey: "project.view.assigned",
    record: record({
      resourceId: "project-1",
      assignedProjectId: "project-1",
      assignedUserIds: ["employee-1"]
    })
  });

  const denyDecision = evaluateAuthorization({
    actor: currentActor,
    permissionKey: "project.view.assigned",
    record: record({
      resourceId: "project-2",
      assignedProjectId: "project-2",
      assignedUserIds: ["employee-2"]
    })
  });

  assert.equal(allowDecision.allowed, true);
  assert.equal(denyDecision.allowed, false);
  assert.equal(denyDecision.reason, "scope_denied");
});

test("customer cannot read an internal-only project even when linked to the account", () => {
  const decision = evaluateAuthorization({
    actor: actor({
      userId: "customer-user",
      memberships: [
        {
          id: "m-customer",
          userId: "customer-user",
          role: "customer",
          customerAccountId: "customer-1"
        }
      ]
    }),
    permissionKey: "project.view.self",
    record: record({
      visibility: "internal",
      customerAccountId: "customer-1"
    })
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "visibility_denied");
});

test("supercontractor can read a subcontractor-visible partner record for a managed partner", () => {
  const decision = evaluateAuthorization({
    actor: actor({
      memberships: [
        {
          id: "m-super",
          userId: "super-user",
          role: "supercontractor",
          partnerOrgId: "partner-1"
        }
      ],
      managedPartnerOrgIds: ["partner-1", "partner-2"]
    }),
    permissionKey: "project.view.partner",
    record: record({
      visibility: "subcontractor",
      partnerOrgId: "partner-1"
    })
  });

  assert.equal(decision.allowed, true);
});

test("public link token verification detects tampering and expiration", () => {
  const secret = "top-secret-1234";
  const token = issueSignedPublicLinkToken(
    {
      linkId: "link-1",
      resourceType: "document",
      resourceId: "doc-1",
      permissionKeys: ["document.view.public_link"],
      expiresAt: "2099-01-01T00:00:00.000Z",
      nonce: "nonce-token-0001"
    },
    secret
  );

  const verified = verifySignedPublicLinkToken(token, secret);
  const tampered = verifySignedPublicLinkToken(`${token}tampered`, secret);
  const expired = verifySignedPublicLinkToken(
    issueSignedPublicLinkToken(
      {
        linkId: "link-2",
        resourceType: "document",
        resourceId: "doc-2",
        permissionKeys: ["document.view.public_link"],
        expiresAt: "2000-01-01T00:00:00.000Z",
        nonce: "nonce-token-0002"
      },
      secret
    ),
    secret
  );

  assert.equal(verified.valid, true);
  assert.equal(tampered.valid, false);
  assert.equal(tampered.reason, "signature_mismatch");
  assert.equal(expired.valid, false);
  assert.equal(expired.reason, "expired");
  assert.equal(hashPublicLinkToken(token).length, 64);
});

test("public link scope mismatch is denied", () => {
  const decision = evaluateAuthorization({
    permissionKey: "payment.view.public_link",
    record: record({
      resourceType: "payment",
      resourceId: "payment-1",
      visibility: "public_link"
    }),
    publicLink: publicLink({
      resourceType: "payment",
      resourceId: "payment-1",
      permissionKeys: ["project.view.public_link"]
    })
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "public_link_scope_denied");
});

test("authorize writes audit events for sensitive decisions", async () => {
  const sink = new MemoryAuditSink();

  const decision = await authorize(
    {
      actor: actor({
        memberships: [
          {
            id: "m-admin",
            userId: "admin-user",
            role: "administrator",
            orgId: "org-1"
          }
        ]
      }),
      permissionKey: "invoice.approve.org",
      record: record({
        resourceType: "invoice",
        resourceId: "invoice-2"
      })
    },
    sink
  );

  assert.equal(decision.allowed, true);
  assert.equal(sink.events.length, 1);
  assert.equal(sink.events[0]?.eventType, "authorization.allow");
});

test("authorizeOrThrow throws and audits denied sensitive access", async () => {
  const sink = new MemoryAuditSink();

  await assert.rejects(
    () =>
      authorizeOrThrow(
        {
          actor: actor({
            memberships: [
              {
                id: "m-employee",
                userId: "employee-1",
                role: "employee",
                orgId: "org-1"
              }
            ]
          }),
          permissionKey: "invoice.approve.org",
          record: record({
            resourceType: "invoice",
            resourceId: "invoice-3"
          })
        },
        sink
      ),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      assert.equal(error.decision.reason, "permission_denied");
      return true;
    }
  );

  assert.equal(sink.events.length, 1);
  assert.equal(sink.events[0]?.eventType, "authorization.deny");
});

test("protectRoute returns 401 for unauthenticated requests and 200 for authorized requests", async () => {
  const handler = protectRoute(
    {
      permissionKey: "project.view.assigned",
      resolveRecord: async () =>
        record({
          resourceId: "project-1",
          assignedProjectId: "project-1",
          assignedUserIds: ["employee-1"]
        })
    },
    async ({ record: resolvedRecord }) => ({
      status: 200,
      body: {
        id: resolvedRecord?.resourceId
      }
    })
  );

  const denied = await handler({
    method: "GET",
    path: "/projects/project-1"
  });

  const allowed = await handler({
    method: "GET",
    path: "/projects/project-1",
    actor: actor({
      userId: "employee-1",
      memberships: [
        {
          id: "m-employee",
          userId: "employee-1",
          role: "employee",
          orgId: "org-1"
        }
      ],
      assignedProjectIds: ["project-1"]
    })
  });

  assert.equal(denied.status, 401);
  assert.equal(allowed.status, 200);
});

test("protectRoute can rate limit repeated access and emit structured security events", async () => {
  const rateLimiter = new InMemoryRateLimiter();
  const logger = new InMemoryStructuredLogger();
  const monitoringHook = new InMemoryMonitoringHook();
  const auditSink = new MemoryAuditSink();
  const now = new Date("2026-04-28T00:00:00.000Z");
  const handler = protectRoute(
    {
      permissionKey: "project.view.assigned",
      auditSink,
      logger,
      monitoringHook,
      now: () => now,
      rateLimit: {
        limiter: rateLimiter,
        rule: {
          name: "test-route",
          maxAttempts: 1,
          windowMs: 60_000,
          blockDurationMs: 60_000
        }
      },
      resolveRecord: async () =>
        record({
          resourceId: "project-1",
          assignedProjectId: "project-1",
          assignedUserIds: ["employee-1"]
        })
    },
    async () => ({
      status: 200,
      body: {
        ok: true
      }
    })
  );

  const request = {
    method: "GET",
    path: "/projects/project-1",
    ipAddress: "127.0.0.1",
    actor: actor({
      userId: "employee-1",
      memberships: [
        {
          id: "m-employee",
          userId: "employee-1",
          role: "employee",
          orgId: "org-1"
        }
      ],
      assignedProjectIds: ["project-1"]
    })
  };

  const first = await handler(request);
  const second = await handler(request);

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(auditSink.events.some((event) => event.eventType === "security.rate_limit_blocked"), true);
  assert.equal(logger.list().some((event) => event.eventName === "security.rate_limit.blocked"), true);
  assert.equal(monitoringHook.list().some((event) => event.eventName === "security.rate_limit.blocked"), true);
});

test("protectPublicLinkRoute accepts valid links and rejects expired links", async () => {
  const handler = protectPublicLinkRoute(
    {
      permissionKey: "document.view.public_link",
      resolveRecord: async () =>
        record({
          resourceType: "document",
          resourceId: "doc-1",
          visibility: "public_link"
        })
    },
    async ({ record: resolvedRecord }) => ({
      status: 200,
      body: {
        id: resolvedRecord?.resourceId
      }
    })
  );

  const allowed = await handler({
    method: "GET",
    path: "/public/doc-1",
    publicLink: publicLink({
      resourceType: "document",
      resourceId: "doc-1",
      permissionKeys: ["document.view.public_link"]
    })
  });

  const expired = await handler({
    method: "GET",
    path: "/public/doc-1",
    publicLink: publicLink({
      resourceType: "document",
      resourceId: "doc-1",
      permissionKeys: ["document.view.public_link"],
      expiresAt: "2000-01-01T00:00:00.000Z"
    })
  });

  assert.equal(allowed.status, 200);
  assert.equal(expired.status, 410);
});

test("signed public link verification rejects invalid nonce payloads and reports them", () => {
  const logger = new InMemoryStructuredLogger();
  const monitoringHook = new InMemoryMonitoringHook();
  const secret = "top-secret-1234";
  const token = issueSignedPublicLinkToken(
    {
      linkId: "link-3",
      resourceType: "document",
      resourceId: "doc-3",
      permissionKeys: ["document.view.public_link"],
      expiresAt: "2099-01-01T00:00:00.000Z",
      nonce: "nonce-token-0003"
    },
    secret
  );
  const [payloadSegment, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      linkId: "link-3",
      resourceType: "document",
      resourceId: "doc-3",
      permissionKeys: ["document.view.public_link"],
      expiresAt: "2099-01-01T00:00:00.000Z",
      nonce: "bad"
    })
  ).toString("base64url");
  const invalidToken = `${tamperedPayload}.${signature}`;

  const verified = verifySignedPublicLinkToken(invalidToken, secret, new Date("2026-04-28T00:00:00.000Z"), {
    logger,
    monitoringHook,
    resourceType: "document",
    resourceId: "doc-3"
  });

  assert.equal(verified.valid, false);
  assert.equal(verified.reason, "signature_mismatch");
  assert.equal(logger.list().some((event) => event.eventName === "security.public_link.invalid"), true);
  assert.equal(monitoringHook.list().some((event) => event.eventName === "security.public_link.invalid"), true);
});

test("path middleware performs coarse gating for dashboard routes", () => {
  const middleware = createPathAccessMiddleware([
    {
      prefix: "/admin",
      allowRoles: ["owner", "administrator"]
    }
  ]);

  const denied = middleware({
    pathname: "/admin/settings"
  });

  const allowed = middleware({
    pathname: "/admin/settings",
    actor: actor({
      memberships: [
        {
          id: "m-admin",
          userId: "admin-1",
          role: "administrator",
          orgId: "org-1"
        }
      ]
    })
  });

  assert.equal(denied.status, 401);
  assert.equal(allowed.status, 200);
});

test("path middleware can rate limit repeated anonymous probes", () => {
  const logger = new InMemoryStructuredLogger();
  const monitoringHook = new InMemoryMonitoringHook();
  const middleware = createPathAccessMiddleware(
    [
      {
        prefix: "/admin",
        allowRoles: ["owner", "administrator"]
      }
    ],
    {
      logger,
      monitoringHook,
      now: () => new Date("2026-04-28T00:00:00.000Z"),
      rateLimit: {
        limiter: new InMemoryRateLimiter(),
        rule: {
          name: "test-middleware",
          maxAttempts: 1,
          windowMs: 60_000
        }
      }
    }
  );

  const first = middleware({
    pathname: "/admin/settings",
    ipAddress: "127.0.0.1"
  });
  const second = middleware({
    pathname: "/admin/settings",
    ipAddress: "127.0.0.1"
  });

  assert.equal(first.status, 401);
  assert.equal(second.status, 429);
  assert.equal(logger.list().some((event) => event.eventName === "security.rate_limit.blocked"), true);
  assert.equal(monitoringHook.list().some((event) => event.eventName === "security.rate_limit.blocked"), true);
});

test("buildAuthorizationAuditEvent captures visibility and scope metadata", () => {
  const event = buildAuthorizationAuditEvent(
    {
      actor: actor({
        memberships: [
          {
            id: "m-admin",
            userId: "admin-1",
            role: "administrator",
            orgId: "org-1"
          }
        ]
      }),
      permissionKey: "audit.view.org",
      record: record({
        resourceType: "audit_log",
        resourceId: "log-1",
        visibility: "internal"
      }),
      now: new Date("2026-04-28T00:00:00.000Z")
    },
    {
      allowed: true,
      reason: "allowed",
      permissionKey: "audit.view.org",
      scope: "org",
      sensitive: true,
      auditRequired: true,
      viaPublicLink: false,
      matchedMembershipId: "m-admin",
      matchedRole: "administrator"
    }
  );

  assert.equal(event.visibility?.[0], "internal");
  assert.equal(event.metadata?.scope, "org");
});
