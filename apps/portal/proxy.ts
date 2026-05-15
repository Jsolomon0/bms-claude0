import { createPathAccessMiddleware } from "../../packages/auth/src/server/middleware.ts";
import { PORTAL_PROTECTED_ROUTES } from "../../packages/auth/src/shared/index.ts";
import type { AuthorizationActor, RoleKey } from "../../packages/types/src/index.ts";
import { NextResponse, type NextRequest } from "next/server";

export const portalMiddleware = createPathAccessMiddleware(PORTAL_PROTECTED_ROUTES, {
  signInPath: "/sign-in",
  forbiddenPath: "/access-denied"
});

function resolvePortalRole(input: string | undefined): RoleKey {
  if (
    input === "applicant" ||
    input === "customer" ||
    input === "subcontractor" ||
    input === "supercontractor"
  ) {
    return input;
  }

  return "customer";
}

function buildPortalActor(role: RoleKey): AuthorizationActor {
  if (role === "applicant") {
    return {
      userId: "applicant.jules",
      memberships: [
        {
          id: "membership-portal-applicant",
          userId: "applicant.jules",
          role,
          active: true
        }
      ]
    };
  }

  if (role === "customer") {
    return {
      userId: "customer.aria",
      memberships: [
        {
          id: "membership-portal-customer",
          userId: "customer.aria",
          role,
          customerAccountId: "customer-aria",
          active: true
        }
      ]
    };
  }

  if (role === "subcontractor") {
    return {
      userId: "sub-user-1",
      memberships: [
        {
          id: "membership-portal-subcontractor",
          userId: "sub-user-1",
          role,
          partnerOrgId: "partner-east",
          active: true
        }
      ],
      assignedProjectIds: ["project-demo-1"]
    };
  }

  return {
    userId: "super-user-1",
    memberships: [
      {
        id: "membership-portal-supercontractor",
        userId: "super-user-1",
        role,
        partnerOrgId: "partner-east",
        active: true
      }
    ],
    managedPartnerOrgIds: ["partner-east"]
  };
}

function resolveIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || undefined;
}

export function proxy(request: NextRequest) {
  const role = resolvePortalRole(
    request.headers.get("x-bms-demo-role") ?? request.cookies.get("bms_demo_role")?.value ?? process.env.PORTAL_DEMO_ROLE
  );
  const outcome = portalMiddleware({
    pathname: request.nextUrl.pathname,
    actor: buildPortalActor(role),
    ipAddress: resolveIpAddress(request)
  });

  if (outcome.allowed) {
    return NextResponse.next();
  }

  if (outcome.redirectTo) {
    return NextResponse.redirect(new URL(outcome.redirectTo, request.url));
  }

  return new NextResponse(outcome.reason ?? "forbidden", {
    status: outcome.status
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
