import { actorHasPermission } from "../../../packages/permissions/src/index.ts";
import {
  getInvoiceDetailForActor,
  getPaymentsRuntime,
  listVisibleInvoicesForActor
} from "../../../packages/payments/src/index.ts";
import type { AuthorizationActor } from "../../../packages/types/src/index.ts";
import { getPortalActor } from "./shell-data.ts";

export function formatCurrency(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

export async function getPortalFinanceData(actor: AuthorizationActor = getPortalActor()) {
  const canViewFinance =
    actorHasPermission(actor, "invoice.view.self") && actorHasPermission(actor, "payment.view.self");

  if (!canViewFinance) {
    return {
      canViewFinance,
      invoices: [],
      payments: [],
      recentActivity: [],
      nextDueInvoice: undefined,
      overdueInvoices: [],
      stats: {
        openInvoices: 0,
        overdueInvoices: 0,
        outstandingCents: 0,
        recordedPayments: 0
      },
      formatCurrency
    };
  }

  const runtime = getPaymentsRuntime();
  const invoices = await listVisibleInvoicesForActor(runtime, actor);
  const payments = invoices.flatMap((invoice) => runtime.repository.listPaymentsByInvoiceId(invoice.id));
  const recentActivity = invoices
    .flatMap((invoice) => runtime.repository.listActivitiesByInvoiceId(invoice.id))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 8);
  const dueInvoices = [...invoices]
    .filter((invoice) => invoice.balanceDueCents > 0 && invoice.status !== "void")
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const overdueInvoices = dueInvoices.filter((invoice) => invoice.status === "overdue");

  return {
    canViewFinance,
    invoices,
    payments,
    recentActivity,
    nextDueInvoice: dueInvoices[0],
    overdueInvoices,
    stats: {
      openInvoices: dueInvoices.length,
      overdueInvoices: overdueInvoices.length,
      outstandingCents: dueInvoices.reduce((sum, invoice) => sum + invoice.balanceDueCents, 0),
      recordedPayments: payments.length
    },
    formatCurrency
  };
}

export async function getPortalInvoiceDetail(
  invoiceId: string,
  actor: AuthorizationActor = getPortalActor()
) {
  return getInvoiceDetailForActor(getPaymentsRuntime(), actor, invoiceId);
}
