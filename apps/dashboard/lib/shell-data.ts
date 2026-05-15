import { buildAppShellModel } from "../../../packages/auth/src/shared/index.ts";
import type {
  AuthorizationActor,
  EmptyStateContent,
  ModuleSummaryItem,
  NotificationPreview
} from "../../../packages/types/src/index.ts";

export function getDashboardActor(): AuthorizationActor {
  return {
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-dashboard-admin",
        userId: "alex.owner",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-shell"],
    managedPartnerOrgIds: ["partner-east"]
  };
}

export function getDashboardShellModel() {
  return buildAppShellModel("dashboard", getDashboardActor());
}

export const dashboardSummaryStats: readonly ModuleSummaryItem[] = [
  { label: "Visible modules", value: "12" },
  { label: "Protected routes", value: "13" },
  { label: "Unread alerts", value: "2" }
] as const;

export const dashboardModules = [
  {
    title: "CRM",
    description: "Account pipelines, customer state, and contact ownership placeholders."
  },
  {
    title: "Projects",
    description: "Phase, task, and change-order screens can mount into this shell."
  },
  {
    title: "Finance",
    description: "Invoices, bills, expenses, and payment workflows share the same frame."
  },
  {
    title: "Reports",
    description: "Profitability snapshots, aging views, and export controls stay owner/admin gated."
  },
  {
    title: "Payroll",
    description: "Timesheets, pay periods, and approvals get isolated finance-grade surfaces."
  },
  {
    title: "Inventory",
    description: "Stock views and material allocations inherit the same navigation rules."
  },
  {
    title: "Documents",
    description: "Document access and public link tooling plug into shared cards and states."
  },
  {
    title: "Automation",
    description: "Scheduled jobs, reminders, retries, and failure reporting stay system-scoped."
  },
  {
    title: "Partners",
    description: "Subcontractor and supercontractor workspaces will hang off this module."
  },
  {
    title: "Settings",
    description: "Policy, access, and integration setup stays owner/admin gated."
  }
] as const;

export const dashboardReadinessItems = [
  {
    title: "Protected routing ready",
    body: "Dashboard paths are now backed by permission-aware middleware rules.",
    meta: "Access foundation"
  },
  {
    title: "Derived reporting ready",
    body: "Owner and admin users can work from historical snapshots instead of mutating source transactions.",
    meta: "Reporting layer"
  },
  {
    title: "Empty states in place",
    body: "Each module page is safe to ship before live data is connected.",
    meta: "UX baseline"
  },
  {
    title: "Notification center mounted",
    body: "System and workflow alerts share a reusable surface component.",
    meta: "Reusable shell"
  }
] as const;

export const dashboardAuditPreview = [
  {
    title: "authorization.allow",
    body: "Owner/admin-only pages will stream sensitive access decisions here.",
    meta: "Most recent"
  },
  {
    title: "public_link.issue",
    body: "Signed-link issuance and revoke events get a dedicated audit lane.",
    meta: "Policy event"
  }
] as const;

export const dashboardEmptyStates: Record<string, EmptyStateContent> = {
  crm: {
    title: "No CRM records wired yet",
    description: "Lead, account, and lifecycle tables are ready; UI workflows can be mounted into this page next.",
    action: { label: "Review schema", href: "/crm" }
  },
  projects: {
    title: "No projects loaded",
    description: "The shell is ready for project lists, kanban views, milestones, and task drawers."
  },
  finance: {
    title: "No finance workbench yet",
    description: "Invoices, payments, expenses, and bills can plug into this protected frame."
  },
  payroll: {
    title: "No payroll workflows connected",
    description: "Time, timesheets, and pay periods already have route and state placeholders."
  },
  inventory: {
    title: "No inventory movements displayed",
    description: "Material stock, allocations, and reservation states will render here."
  },
  documents: {
    title: "No document index available",
    description: "Version lists, access rules, and public-link actions can replace this empty state."
  },
  partners: {
    title: "No partner roster yet",
    description: "Partner qualification, assignments, and compliance snapshots fit into this module."
  },
  settings: {
    title: "No settings panels enabled",
    description: "Tenant policy, access, and integration controls can mount into this shell."
  }
};

export function getDashboardNotifications(): readonly NotificationPreview[] {
  return getDashboardShellModel().notifications;
}
