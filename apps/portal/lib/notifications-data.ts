import type { AuthorizationActor, NotificationPreview } from "../../../packages/types/src/index.ts";
import { getPortalApprovalsData } from "./approvals-data.ts";
import { getPortalDocumentsData } from "./document-data.ts";
import { getPortalFinanceData, formatCurrency } from "./finance-data.ts";
import { listPortalMessageThreads } from "./messages-data.ts";
import { getPortalProjectsData } from "./project-data.ts";
import { getPortalActor, getPortalPrimaryRole } from "./shell-data.ts";

function notification(
  id: string,
  title: string,
  body: string,
  tone: NotificationPreview["tone"],
  timestampLabel: string
): NotificationPreview {
  return {
    id,
    title,
    body,
    tone,
    timestampLabel
  };
}

export async function getPortalNotificationsData(actor: AuthorizationActor = getPortalActor()) {
  const role = getPortalPrimaryRole(actor);
  const [projects, documents, finance, threads, approvals] = await Promise.all([
    getPortalProjectsData(actor),
    getPortalDocumentsData(actor),
    getPortalFinanceData(actor),
    listPortalMessageThreads(actor),
    getPortalApprovalsData(actor)
  ]);
  const notifications: NotificationPreview[] = [];

  if (threads[0]) {
    notifications.push(
      notification(
        "portal-thread-latest",
        "Latest conversation",
        `${threads[0].subject} is active in your scoped workspace.`,
        "info",
        threads[0].updatedAt.slice(5, 16).replace("T", " ")
      )
    );
  }

  if (approvals.pending[0]) {
    notifications.push(
      notification(
        "portal-approval-pending",
        "Approval requested",
        `${approvals.pending[0].changeOrder.title} is waiting for a customer decision.`,
        "warning",
        approvals.pending[0].changeOrder.updatedAt.slice(5, 16).replace("T", " ")
      )
    );
  }

  if (finance.overdueInvoices[0]) {
    notifications.push(
      notification(
        "portal-finance-overdue",
        "Payment attention needed",
        `${finance.overdueInvoices[0].invoiceNumber} is overdue for ${formatCurrency(finance.overdueInvoices[0].balanceDueCents)}.`,
        "warning",
        finance.overdueInvoices[0].dueAt
      )
    );
  } else if (finance.nextDueInvoice) {
    notifications.push(
      notification(
        "portal-finance-due",
        "Upcoming invoice due date",
        `${finance.nextDueInvoice.invoiceNumber} has ${formatCurrency(finance.nextDueInvoice.balanceDueCents)} outstanding.`,
        "info",
        finance.nextDueInvoice.dueAt
      )
    );
  }

  if (documents[0]) {
    notifications.push(
      notification(
        "portal-document-visible",
        "Shared document available",
        `${documents[0].title} is available in your portal document feed.`,
        "success",
        documents[0].updatedAt.slice(5, 16).replace("T", " ")
      )
    );
  }

  if (notifications.length === 0) {
    notifications.push(
      notification(
        `portal-${role}-idle`,
        "Workspace quiet",
        "No new stakeholder-safe alerts are waiting right now.",
        "info",
        "Now"
      )
    );
  }

  return {
    notifications,
    stats: {
      visibleProjects: projects.length,
      visibleDocuments: documents.length,
      activeThreads: threads.length,
      pendingApprovals: approvals.pending.length,
      financeAlerts: finance.overdueInvoices.length + (finance.nextDueInvoice ? 1 : 0)
    }
  };
}
