import { actorHasAnyRole, actorHasPermission } from "../../../permissions/src/index.ts";
import {
  type AppNavigationItem,
  type AppShellModel,
  type AppSurface,
  type AuthorizationActor,
  type NotificationPreview,
  type PermissionKey,
  type RoleKey,
  type ShellUserSummary
} from "../../../types/src/index.ts";

function item(definition: AppNavigationItem): AppNavigationItem {
  return definition;
}

export const DASHBOARD_NAVIGATION = [
  item({
    id: "dashboard-home",
    app: "dashboard",
    label: "Overview",
    href: "/",
    description: "Operational command center",
    group: "work",
    matchPrefixes: ["/"],
    allowRoles: ["owner", "administrator", "developer", "employee"]
  }),
  item({
    id: "dashboard-crm",
    app: "dashboard",
    label: "CRM",
    href: "/crm",
    description: "Accounts, contacts, and lifecycle",
    group: "work",
    matchPrefixes: ["/crm"],
    allowAnyPermissionKeys: ["crm.view.org", "intake.view.org", "lead.view.org"]
  }),
  item({
    id: "dashboard-hiring",
    app: "dashboard",
    label: "Hiring",
    href: "/hiring",
    description: "Jobs, applicants, interviews, and offers",
    group: "work",
    matchPrefixes: ["/hiring"],
    allowRoles: ["owner", "administrator"],
    allowAnyPermissionKeys: [
      "hiring.job_post.manage.org",
      "hiring.application.view.org",
      "hiring.application.review.org",
      "hiring.application.status.manage.org",
      "hiring.offer.manage.org",
      "hiring.convert.org"
    ]
  }),
  item({
    id: "dashboard-projects",
    app: "dashboard",
    label: "Projects",
    href: "/projects",
    description: "Delivery, tasks, and updates",
    group: "work",
    matchPrefixes: ["/projects"],
    allowAnyPermissionKeys: ["project.view.all", "project.view.org", "project.view.assigned"]
  }),
  item({
    id: "dashboard-documents",
    app: "dashboard",
    label: "Documents",
    href: "/documents",
    description: "Files, sharing, and access",
    group: "work",
    matchPrefixes: ["/documents"],
    allowAnyPermissionKeys: ["document.view.org", "document.view.assigned"]
  }),
  item({
    id: "dashboard-finance",
    app: "dashboard",
    label: "Finance",
    href: "/finance",
    description: "Invoices, bills, and payments",
    group: "finance",
    matchPrefixes: ["/finance"],
    allowAnyPermissionKeys: ["finance.view.org", "invoice.view.org"]
  }),
  item({
    id: "dashboard-reports",
    app: "dashboard",
    label: "Reports",
    href: "/reports",
    description: "Profitability, aging, and exports",
    group: "finance",
    matchPrefixes: ["/reports"],
    allowRoles: ["owner", "administrator"],
    allowAnyPermissionKeys: ["report.view.org", "report.export.org"]
  }),
  item({
    id: "dashboard-payroll",
    app: "dashboard",
    label: "Payroll",
    href: "/payroll",
    description: "Time, pay periods, and approvals",
    group: "finance",
    matchPrefixes: ["/payroll"],
    allowAnyPermissionKeys: ["payroll.view.org", "payroll.view.self"]
  }),
  item({
    id: "dashboard-inventory",
    app: "dashboard",
    label: "Inventory",
    href: "/inventory",
    description: "Stock, movements, and allocations",
    group: "work",
    matchPrefixes: ["/inventory"],
    allowAnyPermissionKeys: ["inventory.view.org"]
  }),
  item({
    id: "dashboard-partners",
    app: "dashboard",
    label: "Partners",
    href: "/partners",
    description: "Subcontractors and supercontractors",
    group: "work",
    matchPrefixes: ["/partners"],
    allowAnyPermissionKeys: ["partner.view.org"]
  }),
  item({
    id: "dashboard-notifications",
    app: "dashboard",
    label: "Notifications",
    href: "/notifications",
    description: "Alerts and inbox activity",
    group: "engage",
    matchPrefixes: ["/notifications"],
    allowAnyPermissionKeys: ["notification.view.self"]
  }),
  item({
    id: "dashboard-audit",
    app: "dashboard",
    label: "Audit Log",
    href: "/audit",
    description: "Sensitive access and system changes",
    group: "system",
    matchPrefixes: ["/audit"],
    allowRoles: ["owner", "administrator"],
    allowAnyPermissionKeys: ["audit.view.org", "audit.view.all"]
  }),
  item({
    id: "dashboard-automation",
    app: "dashboard",
    label: "Automation",
    href: "/automation",
    description: "Jobs, reminders, and failures",
    group: "system",
    matchPrefixes: ["/automation"],
    allowRoles: ["owner", "administrator"],
    allowAnyPermissionKeys: ["automation.view.org", "automation.run.org"]
  }),
  item({
    id: "dashboard-settings",
    app: "dashboard",
    label: "Settings",
    href: "/settings",
    description: "Environment and policy setup",
    group: "system",
    matchPrefixes: ["/settings"],
    allowRoles: ["owner", "administrator"],
    allowAnyPermissionKeys: ["settings.view.org", "security.permission.view.all"]
  })
] as const;

export const PORTAL_NAVIGATION = [
  item({
    id: "portal-home",
    app: "portal",
    label: "Workspace",
    href: "/",
    description: "Stakeholder summary",
    group: "work",
    matchPrefixes: ["/"],
    allowRoles: ["customer", "subcontractor", "supercontractor", "applicant"]
  }),
  item({
    id: "portal-applications",
    app: "portal",
    label: "Applications",
    href: "/applications",
    description: "Your hiring applications",
    group: "work",
    matchPrefixes: ["/applications"],
    allowRoles: ["applicant"],
    allowAnyPermissionKeys: ["hiring.application.view.self", "hiring.profile.view.self"]
  }),
  item({
    id: "portal-interviews",
    app: "portal",
    label: "Interviews",
    href: "/interviews",
    description: "Schedules and interview requests",
    group: "work",
    matchPrefixes: ["/interviews"],
    allowRoles: ["applicant"],
    allowAnyPermissionKeys: ["hiring.interview.view.self"]
  }),
  item({
    id: "portal-offers",
    app: "portal",
    label: "Offers",
    href: "/offers",
    description: "Offer and decision status",
    group: "work",
    matchPrefixes: ["/offers"],
    allowRoles: ["applicant"],
    allowAnyPermissionKeys: ["hiring.offer.view.self"]
  }),
  item({
    id: "portal-onboarding",
    app: "portal",
    label: "Onboarding",
    href: "/onboarding",
    description: "Checklist and next steps",
    group: "work",
    matchPrefixes: ["/onboarding"],
    allowRoles: ["applicant"],
    allowAnyPermissionKeys: ["hiring.onboarding.view.self"]
  }),
  item({
    id: "portal-projects",
    app: "portal",
    label: "Projects",
    href: "/projects",
    description: "Assigned and shared work",
    group: "work",
    matchPrefixes: ["/projects"],
    allowAnyPermissionKeys: ["project.view.self", "project.view.assigned", "project.view.partner"]
  }),
  item({
    id: "portal-documents",
    app: "portal",
    label: "Documents",
    href: "/documents",
    description: "Shared files and updates",
    group: "work",
    matchPrefixes: ["/documents"],
    allowAnyPermissionKeys: ["document.view.self", "document.view.assigned", "document.view.partner"]
  }),
  item({
    id: "portal-messages",
    app: "portal",
    label: "Messages",
    href: "/messages",
    description: "Stakeholder conversations",
    group: "engage",
    matchPrefixes: ["/messages"],
    allowAnyPermissionKeys: ["message.view.self"]
  }),
  item({
    id: "portal-approvals",
    app: "portal",
    label: "Approvals",
    href: "/approvals",
    description: "Customer-facing change decisions",
    group: "work",
    matchPrefixes: ["/approvals"],
    allowAnyPermissionKeys: ["project.change_order.approve.self"]
  }),
  item({
    id: "portal-billing",
    app: "portal",
    label: "Finance",
    href: "/finance",
    description: "Invoices and payments",
    group: "finance",
    matchPrefixes: ["/finance"],
    allowAnyPermissionKeys: ["invoice.view.self", "payment.view.self"]
  }),
  item({
    id: "portal-notifications",
    app: "portal",
    label: "Notifications",
    href: "/notifications",
    description: "Messages and alerts",
    group: "engage",
    matchPrefixes: ["/notifications"],
    allowAnyPermissionKeys: ["notification.view.self"]
  }),
  item({
    id: "portal-settings",
    app: "portal",
    label: "Settings",
    href: "/settings",
    description: "Profile and preferences",
    group: "system",
    matchPrefixes: ["/settings"],
    allowRoles: ["customer", "subcontractor", "supercontractor", "applicant"]
  })
] as const;

export const WEBSITE_NAVIGATION = [
  item({
    id: "website-home",
    app: "website",
    label: "Platform",
    href: "/",
    description: "Product overview",
    group: "engage"
  }),
  item({
    id: "website-solutions",
    app: "website",
    label: "Solutions",
    href: "/solutions",
    description: "Workflow snapshots",
    group: "engage"
  }),
  item({
    id: "website-access",
    app: "website",
    label: "Access",
    href: "/access",
    description: "Dashboard and portal entry points",
    group: "engage"
  }),
  item({
    id: "website-request",
    app: "website",
    label: "Request Project",
    href: "/request",
    description: "Public intake for short-term customer requests",
    group: "engage"
  }),
  item({
    id: "website-careers",
    app: "website",
    label: "Careers",
    href: "/careers",
    description: "Public job board and applications",
    group: "engage"
  })
] as const;

export const APP_NAVIGATION: Record<AppSurface, readonly AppNavigationItem[]> = {
  dashboard: DASHBOARD_NAVIGATION,
  portal: PORTAL_NAVIGATION,
  website: WEBSITE_NAVIGATION
};

export interface ProtectedShellRoute {
  prefix: string;
  allowRoles?: readonly RoleKey[];
  allowAnyPermissionKeys?: readonly PermissionKey[];
}

export const DASHBOARD_PROTECTED_ROUTES: readonly ProtectedShellRoute[] = DASHBOARD_NAVIGATION.filter(
  (itemDefinition) => itemDefinition.app === "dashboard"
).map((itemDefinition) => ({
  prefix: itemDefinition.href === "/" ? "/" : itemDefinition.href,
  allowRoles: itemDefinition.allowRoles,
  allowAnyPermissionKeys: itemDefinition.allowAnyPermissionKeys
}));

export const PORTAL_PROTECTED_ROUTES: readonly ProtectedShellRoute[] = PORTAL_NAVIGATION.map((itemDefinition) => ({
  prefix: itemDefinition.href === "/" ? "/" : itemDefinition.href,
  allowRoles: itemDefinition.allowRoles,
  allowAnyPermissionKeys: itemDefinition.allowAnyPermissionKeys
}));

export function getActorRoles(actor?: AuthorizationActor): RoleKey[] {
  if (!actor) {
    return [];
  }

  return [...new Set(actor.memberships.map((membership) => membership.role))];
}

export function toShellUserSummary(actor?: AuthorizationActor): ShellUserSummary {
  const roles = getActorRoles(actor);
  const primaryRole = roles[0] ?? "employee";

  return {
    displayName: actor ? actor.userId : "Guest User",
    primaryRole,
    roles
  };
}

export function canAccessNavigationItem(actor: AuthorizationActor | undefined, itemDefinition: AppNavigationItem): boolean {
  if (!itemDefinition.allowRoles && !itemDefinition.allowAnyPermissionKeys) {
    return true;
  }

  if (!actor) {
    return false;
  }

  if (itemDefinition.allowRoles && actorHasAnyRole(actor, itemDefinition.allowRoles)) {
    return true;
  }

  if (
    itemDefinition.allowAnyPermissionKeys &&
    itemDefinition.allowAnyPermissionKeys.some((permissionKey) => actorHasPermission(actor, permissionKey))
  ) {
    return true;
  }

  return false;
}

export function getNavigationForActor(app: AppSurface, actor?: AuthorizationActor): AppNavigationItem[] {
  return APP_NAVIGATION[app].filter((itemDefinition) => canAccessNavigationItem(actor, itemDefinition));
}

export function canAccessShellRoute(
  actor: AuthorizationActor | undefined,
  routes: readonly ProtectedShellRoute[],
  pathname: string
): boolean {
  const matchedRule = [...routes]
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`) || rule.prefix === "/");

  if (!matchedRule) {
    return true;
  }

  if (!actor) {
    return false;
  }

  if (matchedRule.allowRoles && actorHasAnyRole(actor, matchedRule.allowRoles)) {
    return true;
  }

  if (
    matchedRule.allowAnyPermissionKeys &&
    matchedRule.allowAnyPermissionKeys.some((permissionKey) => actorHasPermission(actor, permissionKey))
  ) {
    return true;
  }

  return false;
}

export function getDefaultNotifications(app: AppSurface): NotificationPreview[] {
  if (app === "dashboard") {
    return [
      {
        id: "ops-1",
        title: "Queue idle",
        body: "Background workers are connected, but no module jobs are configured yet.",
        tone: "info",
        timestampLabel: "Now"
      },
      {
        id: "audit-1",
        title: "Audit stream ready",
        body: "Sensitive route decisions will appear here once module actions are enabled.",
        tone: "success",
        timestampLabel: "2 min ago"
      }
    ];
  }

  if (app === "portal") {
    return [
      {
        id: "portal-1",
        title: "Workspace waiting",
        body: "Shared projects, documents, and invoices will appear when internal teams publish them.",
        tone: "info",
        timestampLabel: "Now"
      }
    ];
  }

  return [
    {
      id: "website-1",
      title: "Headless website shell",
      body: "Public content and intake routes can mount into this surface next.",
      tone: "info",
      timestampLabel: "Now"
    }
  ];
}

export function buildAppShellModel(app: AppSurface, actor?: AuthorizationActor): AppShellModel {
  return {
    app,
    actor,
    user: toShellUserSummary(actor),
    navigation: getNavigationForActor(app, actor),
    notifications: getDefaultNotifications(app)
  };
}
