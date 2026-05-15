import test from "node:test";
import assert from "node:assert/strict";

import {
  DASHBOARD_NAVIGATION,
  DASHBOARD_PROTECTED_ROUTES,
  PORTAL_NAVIGATION,
  PORTAL_PROTECTED_ROUTES,
  canAccessNavigationItem,
  canAccessShellRoute,
  getNavigationForActor
} from "../packages/auth/src/shared/index.ts";
import { createPathAccessMiddleware } from "../packages/auth/src/server/index.ts";
import type { AuthorizationActor } from "../packages/types/src/index.ts";

function actor(overrides: Partial<AuthorizationActor>): AuthorizationActor {
  return {
    userId: overrides.userId ?? "user-1",
    memberships: overrides.memberships ?? [],
    assignedProjectIds: overrides.assignedProjectIds ?? [],
    managedPartnerOrgIds: overrides.managedPartnerOrgIds ?? []
  };
}

const adminActor = actor({
  userId: "admin-1",
  memberships: [
    {
      id: "membership-admin",
      userId: "admin-1",
      role: "administrator",
      orgId: "org-1",
      active: true
    }
  ]
});

const employeeActor = actor({
  userId: "employee-1",
  memberships: [
    {
      id: "membership-employee",
      userId: "employee-1",
      role: "employee",
      orgId: "org-1",
      active: true
    }
  ],
  assignedProjectIds: ["project-1"]
});

const customerActor = actor({
  userId: "customer-1",
  memberships: [
    {
      id: "membership-customer",
      userId: "customer-1",
      role: "customer",
      customerAccountId: "customer-1",
      active: true
    }
  ]
});

const applicantActor = actor({
  userId: "applicant.jules",
  memberships: [
    {
      id: "membership-applicant",
      userId: "applicant.jules",
      role: "applicant",
      active: true
    }
  ]
});

const subcontractorActor = actor({
  userId: "sub-1",
  memberships: [
    {
      id: "membership-sub",
      userId: "sub-1",
      role: "subcontractor",
      partnerOrgId: "partner-east",
      active: true
    }
  ],
  assignedProjectIds: ["project-1"]
});

test("dashboard navigation exposes audit and settings to administrator", () => {
  const items = getNavigationForActor("dashboard", adminActor);

  assert.ok(items.some((item) => item.href === "/audit"));
  assert.ok(items.some((item) => item.href === "/automation"));
  assert.ok(items.some((item) => item.href === "/settings"));
  assert.ok(items.some((item) => item.href === "/reports"));
  assert.ok(items.some((item) => item.href === "/crm"));
});

test("dashboard navigation limits employee to operational modules", () => {
  const items = getNavigationForActor("dashboard", employeeActor);
  const hrefs = items.map((item) => item.href);

  assert.deepEqual(hrefs.includes("/projects"), true);
  assert.deepEqual(hrefs.includes("/documents"), true);
  assert.deepEqual(hrefs.includes("/payroll"), true);
  assert.deepEqual(hrefs.includes("/notifications"), true);
  assert.deepEqual(hrefs.includes("/finance"), false);
  assert.deepEqual(hrefs.includes("/reports"), false);
  assert.deepEqual(hrefs.includes("/audit"), false);
  assert.deepEqual(hrefs.includes("/automation"), false);
  assert.deepEqual(hrefs.includes("/settings"), false);
});

test("portal navigation exposes customer-safe routes only", () => {
  const items = getNavigationForActor("portal", customerActor);
  const hrefs = items.map((item) => item.href);

  assert.deepEqual(hrefs.includes("/projects"), true);
  assert.deepEqual(hrefs.includes("/documents"), true);
  assert.deepEqual(hrefs.includes("/messages"), true);
  assert.deepEqual(hrefs.includes("/approvals"), true);
  assert.deepEqual(hrefs.includes("/finance"), true);
  assert.deepEqual(hrefs.includes("/notifications"), true);
  assert.deepEqual(hrefs.includes("/settings"), true);
});

test("portal navigation keeps subcontractors out of customer finance and approvals", () => {
  const items = getNavigationForActor("portal", subcontractorActor);
  const hrefs = items.map((item) => item.href);

  assert.deepEqual(hrefs.includes("/projects"), true);
  assert.deepEqual(hrefs.includes("/documents"), true);
  assert.deepEqual(hrefs.includes("/messages"), true);
  assert.deepEqual(hrefs.includes("/finance"), false);
  assert.deepEqual(hrefs.includes("/approvals"), false);
});

test("applicant portal navigation exposes hiring-only routes", () => {
  const items = getNavigationForActor("portal", applicantActor);
  const hrefs = items.map((item) => item.href);

  assert.deepEqual(hrefs.includes("/applications"), true);
  assert.deepEqual(hrefs.includes("/interviews"), true);
  assert.deepEqual(hrefs.includes("/offers"), true);
  assert.deepEqual(hrefs.includes("/onboarding"), true);
  assert.deepEqual(hrefs.includes("/projects"), false);
  assert.deepEqual(hrefs.includes("/finance"), false);
  assert.deepEqual(hrefs.includes("/approvals"), false);
});

test("navigation item access honors allowRoles and allowAnyPermissionKeys", () => {
  const auditItem = DASHBOARD_NAVIGATION.find((item) => item.href === "/audit");
  const financeItem = DASHBOARD_NAVIGATION.find((item) => item.href === "/finance");
  const portalFinanceItem = PORTAL_NAVIGATION.find((item) => item.href === "/finance");

  assert.ok(auditItem);
  assert.ok(financeItem);
  assert.ok(portalFinanceItem);
  assert.equal(canAccessNavigationItem(employeeActor, auditItem!), false);
  assert.equal(canAccessNavigationItem(adminActor, financeItem!), true);
  assert.equal(canAccessNavigationItem(customerActor, portalFinanceItem!), true);
});

test("shell route access prefers the longest matching prefix", () => {
  assert.equal(canAccessShellRoute(adminActor, DASHBOARD_PROTECTED_ROUTES, "/audit"), true);
  assert.equal(canAccessShellRoute(employeeActor, DASHBOARD_PROTECTED_ROUTES, "/audit"), false);
  assert.equal(canAccessShellRoute(applicantActor, DASHBOARD_PROTECTED_ROUTES, "/hiring"), false);
  assert.equal(canAccessShellRoute(customerActor, PORTAL_PROTECTED_ROUTES, "/finance"), true);
  assert.equal(canAccessShellRoute(undefined, DASHBOARD_PROTECTED_ROUTES, "/projects"), false);
});

test("dashboard middleware denies employee on audit but allows projects", () => {
  const middleware = createPathAccessMiddleware(DASHBOARD_PROTECTED_ROUTES, {
    signInPath: "/login",
    forbiddenPath: "/forbidden"
  });

  const auditDenied = middleware({
    pathname: "/audit",
    actor: employeeActor
  });

  const projectsAllowed = middleware({
    pathname: "/projects",
    actor: employeeActor
  });

  assert.equal(auditDenied.status, 403);
  assert.equal(projectsAllowed.status, 200);
});

test("portal middleware denies unauthenticated requests and allows customer finance", () => {
  const middleware = createPathAccessMiddleware(PORTAL_PROTECTED_ROUTES, {
    signInPath: "/sign-in",
    forbiddenPath: "/access-denied"
  });

  const denied = middleware({
    pathname: "/finance"
  });

  const allowed = middleware({
    pathname: "/finance",
    actor: customerActor
  });

  assert.equal(denied.status, 401);
  assert.equal(denied.redirectTo, "/sign-in");
  assert.equal(allowed.status, 200);
});
