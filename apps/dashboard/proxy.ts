import { createPathAccessMiddleware } from "../../packages/auth/src/server/middleware.ts";
import { DASHBOARD_PROTECTED_ROUTES } from "../../packages/auth/src/shared/index.ts";
import type { AuthorizationActor, RoleKey } from "../../packages/types/src/index.ts";
import { NextResponse, type NextRequest } from "next/server";

export const dashboardMiddleware = createPathAccessMiddleware(DASHBOARD_PROTECTED_ROUTES, {
  signInPath: "/login",
  forbiddenPath: "/forbidden"
});

function resolveDashboardRole(input: string | undefined): RoleKey {
  if (
    input === "owner" ||
    input === "administrator" ||
    input === "developer" ||
    input === "employee" ||
    input === "customer" ||
    input === "subcontractor" ||
    input === "supercontractor" ||
    input === "applicant"
  ) {
    return input;
  }

  return "administrator";
}

function buildDashboardActor(role: RoleKey): AuthorizationActor {
  return {
    userId: `dashboard.${role}`,
    memberships: [
      {
        id: `membership-dashboard-${role}`,
        userId: `dashboard.${role}`,
        role,
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"],
    managedPartnerOrgIds: role === "owner" || role === "administrator" ? ["partner-east"] : []
  };
}

function resolveIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || undefined;
}

export function proxy(request: NextRequest) {
  const role = resolveDashboardRole(
    request.headers.get("x-bms-demo-role") ??
      request.cookies.get("bms_demo_role")?.value ??
      process.env.DASHBOARD_DEMO_ROLE
  );
  const outcome = dashboardMiddleware({
    pathname: request.nextUrl.pathname,
    actor: buildDashboardActor(role),
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
