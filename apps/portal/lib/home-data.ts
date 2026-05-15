import type { AuthorizationActor, ModuleSummaryItem, RoleKey } from "../../../packages/types/src/index.ts";
import { getPortalApprovalsData } from "./approvals-data.ts";
import { getPortalDocumentsData } from "./document-data.ts";
import { getPortalFinanceData, formatCurrency } from "./finance-data.ts";
import {
  getApplicantApplicationsData,
  getApplicantInterviewsData,
  getApplicantOffersData,
  getApplicantOnboardingData
} from "./hiring-data.ts";
import { listPortalMessageThreads } from "./messages-data.ts";
import { getPortalNotificationsData } from "./notifications-data.ts";
import { getPortalProjectsData } from "./project-data.ts";
import { getPortalActor, getPortalPrimaryRole } from "./shell-data.ts";

interface RoleCopy {
  title: string;
  description: string;
  badges: readonly string[];
  actions: readonly { label: string; href: string }[];
}

const ROLE_COPY: Record<RoleKey, RoleCopy> = {
  owner: {
    title: "Portal scope",
    description: "Owner users do not use the external portal surface.",
    badges: [],
    actions: []
  },
  administrator: {
    title: "Portal scope",
    description: "Administrator users do not use the external portal surface.",
    badges: [],
    actions: []
  },
  developer: {
    title: "Portal scope",
    description: "Developer users do not use the external portal surface.",
    badges: [],
    actions: []
  },
  employee: {
    title: "Portal scope",
    description: "Employee users do not use the external portal surface.",
    badges: [],
    actions: []
  },
  applicant: {
    title: "Applicant portal",
    description: "Applicants only see hiring records tied to their own application, interview schedule, offer status, and onboarding checklist.",
    badges: ["Applicant self scope", "Hiring-only access", "No admin data"],
    actions: [
      { label: "View applications", href: "/applications" },
      { label: "Open interviews", href: "/interviews" }
    ]
  },
  customer: {
    title: "Customer portal",
    description: "Customers see their own projects, documents, approvals, invoices, payments, and conversation threads.",
    badges: ["Customer self scope", "Project updates", "Portal payments"],
    actions: [
      { label: "Review projects", href: "/projects" },
      { label: "Open approvals", href: "/approvals" }
    ]
  },
  subcontractor: {
    title: "Subcontractor portal",
    description: "Subcontractors only see assigned or partner-scoped work, files, and message threads for their own organization.",
    badges: ["Assigned scope", "Partner documents", "Messaging only"],
    actions: [
      { label: "Review assignments", href: "/projects" },
      { label: "Open messages", href: "/messages" }
    ]
  },
  supercontractor: {
    title: "Supercontractor portal",
    description: "Supercontractors see partner-scoped workspaces across managed partner records without internal finance or admin tools.",
    badges: ["Partner scope", "Managed workspaces", "Role-safe alerts"],
    actions: [
      { label: "Open projects", href: "/projects" },
      { label: "Open messages", href: "/messages" }
    ]
  }
};

export async function getPortalHomeData(actor: AuthorizationActor = getPortalActor()) {
  const role = getPortalPrimaryRole(actor);

  if (role === "applicant") {
    const [applications, interviews, offers, onboarding, notifications] = await Promise.all([
      getApplicantApplicationsData(actor),
      getApplicantInterviewsData(actor),
      getApplicantOffersData(actor),
      getApplicantOnboardingData(actor),
      getPortalNotificationsData(actor)
    ]);
    const copy = ROLE_COPY[role];

    return {
      role,
      copy,
      stats: [
        { label: "Applications", value: String(applications.length) },
        { label: "Interviews", value: String(interviews.length) },
        { label: "Offers", value: String(offers.length) },
        { label: "Onboarding", value: String(onboarding.length) },
        { label: "Scope", value: "Self only" }
      ] satisfies ModuleSummaryItem[],
      spotlight: [
        {
          title: `${applications.length} application${applications.length === 1 ? "" : "s"} visible`,
          body: "Applicants only receive records tied to their own profile and application history.",
          meta: "Applications"
        },
        {
          title: `${interviews.length} interview${interviews.length === 1 ? "" : "s"} scheduled`,
          body: "Interview timing is shared without exposing internal hiring notes or interviewer feedback.",
          meta: "Interviews"
        },
        {
          title: `${offers.length} offer${offers.length === 1 ? "" : "s"} available`,
          body: "Only sent offers and onboarding steps are exposed after the hiring team advances the application.",
          meta: "Offers"
        }
      ],
      notifications: notifications.notifications
    };
  }

  const [projects, documents, finance, threads, approvals, notifications] = await Promise.all([
    getPortalProjectsData(actor),
    getPortalDocumentsData(actor),
    getPortalFinanceData(actor),
    listPortalMessageThreads(actor),
    getPortalApprovalsData(actor),
    getPortalNotificationsData(actor)
  ]);
  const copy = ROLE_COPY[role];
  const stats: ModuleSummaryItem[] = [
    { label: "Projects", value: String(projects.length) },
    { label: "Documents", value: String(documents.length) },
    { label: "Messages", value: String(threads.length) }
  ];

  if (role === "customer") {
    stats.push(
      { label: "Outstanding", value: formatCurrency(finance.stats.outstandingCents) },
      { label: "Pending approvals", value: String(approvals.pending.length) }
    );
  } else {
    stats.push({ label: "Partner scope", value: role === "subcontractor" ? "Assigned" : "Managed" });
  }

  return {
    role,
    copy,
    stats,
    spotlight: [
      {
        title: `${projects.length} scoped project${projects.length === 1 ? "" : "s"}`,
        body: "Each workspace is filtered before it reaches the portal layout.",
        meta: "Projects"
      },
      {
        title: `${threads.length} active conversation${threads.length === 1 ? "" : "s"}`,
        body: "Messaging stays inside the actor's own customer or partner scope.",
        meta: "Messages"
      },
      {
        title:
          role === "customer"
            ? `${finance.invoices.length} invoice${finance.invoices.length === 1 ? "" : "s"} published`
            : `${documents.length} document${documents.length === 1 ? "" : "s"} shared`,
        body:
          role === "customer"
            ? "Finance remains read-safe while payments stay server-authorized."
            : "Files remain limited to the actor's partner-visible records.",
        meta: role === "customer" ? "Finance" : "Documents"
      }
    ],
    notifications: notifications.notifications
  };
}
