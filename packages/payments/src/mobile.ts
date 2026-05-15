import type {
  AuthorizationActor,
  InvoiceActivityRecord,
  InvoiceRecord,
  PaymentCheckoutSession
} from "../../types/src/index.ts";
import {
  authorizeInvoiceMutationOrThrow,
  authorizeInvoiceView,
  authorizeInvoiceViewOrThrow
} from "./authorization.ts";
import type { PaymentsRuntime } from "./runtime.ts";

function requireInvoiceById(runtime: PaymentsRuntime, invoiceId: string): InvoiceRecord {
  const invoice = runtime.repository.getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} was not found.`);
  }

  return invoice;
}

function createActivity(
  runtime: PaymentsRuntime,
  invoiceId: string,
  eventType: InvoiceActivityRecord["eventType"],
  summary: string,
  occurredAt: string,
  actorUserId?: string | null,
  metadata?: Record<string, unknown>
) {
  runtime.repository.createActivity({
    id: runtime.nextId("invoice-activity"),
    invoiceId,
    eventType,
    actorUserId: actorUserId ?? null,
    summary,
    visibilityFlags: ["internal", "customer", "public_link"],
    occurredAt,
    metadata
  });
}

function normalizeCustomerEmail(input: string | undefined, invoice: InvoiceRecord): string {
  return input?.trim() || `${invoice.customerAccountId}@portal.local`;
}

export async function listVisibleInvoicesForActor(
  runtime: PaymentsRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly InvoiceRecord[]> {
  const visible: InvoiceRecord[] = [];

  for (const invoice of runtime.repository.listInvoices()) {
    const decision = await authorizeInvoiceView(actor, invoice, runtime.auditSink);

    if (decision.allowed) {
      visible.push(invoice);
    }
  }

  return visible;
}

export async function getInvoiceDetailForActor(
  runtime: PaymentsRuntime,
  actor: AuthorizationActor | undefined,
  invoiceId: string
) {
  const invoice = requireInvoiceById(runtime, invoiceId);
  await authorizeInvoiceViewOrThrow(actor, invoice, runtime.auditSink);

  return {
    invoice,
    lineItems: runtime.repository.listLineItemsByInvoiceId(invoice.id),
    payments: runtime.repository.listPaymentsByInvoiceId(invoice.id),
    receipts: runtime.repository.listReceiptsByInvoiceId(invoice.id),
    reminders: runtime.repository.listRemindersByInvoiceId(invoice.id),
    activities: runtime.repository.listActivitiesByInvoiceId(invoice.id),
    publicLinks: runtime.repository.listPublicPaymentLinksByInvoiceId(invoice.id)
  };
}

export async function startInvoiceCheckoutSessionForActor(
  runtime: PaymentsRuntime,
  actor: AuthorizationActor | undefined,
  input: {
    invoiceId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }
): Promise<PaymentCheckoutSession> {
  const invoice = requireInvoiceById(runtime, input.invoiceId);
  await authorizeInvoiceMutationOrThrow(actor, "payment.collect.self", invoice, runtime.auditSink);

  if (invoice.status === "paid" || invoice.status === "void" || invoice.balanceDueCents <= 0) {
    throw new Error("This invoice is not payable.");
  }

  const occurredAt = runtime.now().toISOString();
  const session = await runtime.provider.createCheckoutSession({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerEmail: normalizeCustomerEmail(input.customerEmail, invoice),
    amountCents: invoice.balanceDueCents,
    currency: invoice.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl
  });

  createActivity(runtime, invoice.id, "payment_session_created", "Mobile checkout session created.", occurredAt, actor?.userId, {
    sessionId: session.id
  });

  return session;
}
