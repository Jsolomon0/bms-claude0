import {
  authorizeOrThrow,
  hashPublicLinkToken,
  issueSignedPublicLinkToken,
  materializeResolvedPublicLink,
  tokenPrefix,
  verifySignedPublicLinkToken
} from "../../auth/src/server/index.ts";
import type {
  AuditEvent,
  AuthorizationActor,
  InvoiceActivityRecord,
  InvoicePublicPaymentLinkRecord,
  InvoiceRecord,
  PaymentCheckoutSession,
  PaymentLinkScope
} from "../../types/src/index.ts";
import {
  authorizeInvoiceMutationOrThrow,
  authorizeInvoiceView,
  authorizeInvoiceViewOrThrow,
  toInvoiceResourceRecord
} from "./authorization.ts";
import type { PaymentsRuntime } from "./runtime.ts";

function buildPublicLinkAuditEvent(
  eventType: AuditEvent["eventType"],
  invoiceId: string,
  occurredAt: string,
  actorUserId?: string | null,
  metadata?: Record<string, unknown>
): AuditEvent {
  return {
    eventType,
    outcome: eventType === "public_link.issue" ? "issued" : eventType === "public_link.revoke" ? "revoked" : "success",
    actorUserId: actorUserId ?? null,
    resourceType: "invoice",
    resourceId: invoiceId,
    viaPublicLink: eventType === "public_link.access",
    sensitive: true,
    occurredAt,
    metadata
  };
}

function publicScopePermissionKeys(scope: PaymentLinkScope) {
  if (scope === "invoice_view") {
    return ["invoice.view.public_link"] as const;
  }

  return ["invoice.view.public_link", "payment.view.public_link", "payment.collect.public_link"] as const;
}

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

  createActivity(runtime, invoice.id, "payment_session_created", "Portal checkout session created.", occurredAt, actor?.userId, {
    sessionId: session.id
  });

  return session;
}

export async function issueInvoicePublicPaymentLinkServer(
  runtime: PaymentsRuntime,
  actor: AuthorizationActor | undefined,
  input: {
    invoiceId: string;
    actorUserId: string;
    expiresAt: string;
    scope: PaymentLinkScope;
    maxUses?: number | null;
    approvalId?: string;
  }
): Promise<{ link: InvoicePublicPaymentLinkRecord; token: string }> {
  const invoice = requireInvoiceById(runtime, input.invoiceId);
  await authorizeInvoiceMutationOrThrow(actor, "public_link.issue.org", invoice, runtime.auditSink);
  await runtime.security.approvals.assertApproved({
    approvalId: input.approvalId,
    actionKey: "public_link.issue",
    actorUserId: input.actorUserId,
    resourceType: "invoice",
    resourceId: invoice.id,
    now: runtime.now()
  });

  if (!invoice.visibilityFlags.includes("public_link")) {
    throw new Error("Invoice visibility must include public_link before issuing a public payment link.");
  }

  const occurredAt = runtime.now().toISOString();
  const permissionKeys = publicScopePermissionKeys(input.scope);
  const linkId = `invoice-link-${hashPublicLinkToken(`${invoice.id}:${input.expiresAt}:${occurredAt}`).slice(0, 12)}`;
  const token = issueSignedPublicLinkToken(
    {
      linkId,
      resourceType: "invoice",
      resourceId: invoice.id,
      permissionKeys,
      expiresAt: input.expiresAt,
      nonce: hashPublicLinkToken(`${invoice.id}:${input.actorUserId}:${occurredAt}`).slice(0, 24),
      issuedAt: occurredAt
    },
    runtime.publicLinkSecret,
    {
      auditSink: runtime.auditSink,
      logger: runtime.security.logger,
      monitoringHook: runtime.security.monitoringHook,
      resourceType: "invoice",
      resourceId: invoice.id
    }
  );

  const link: InvoicePublicPaymentLinkRecord = {
    id: linkId,
    invoiceId: invoice.id,
    permissionKeys,
    scope: input.scope,
    tokenHash: hashPublicLinkToken(token),
    tokenPrefix: tokenPrefix(token),
    expiresAt: input.expiresAt,
    revokedAt: null,
    maxUses: input.maxUses ?? null,
    useCount: 0,
    createdByUserId: input.actorUserId,
    createdAt: occurredAt
  };

  runtime.repository.createPublicPaymentLink(link);
  createActivity(runtime, invoice.id, "public_link_issued", "Public invoice payment link issued.", occurredAt, input.actorUserId, {
    linkId,
    scope: input.scope
  });
  runtime.auditSink.write(
    buildPublicLinkAuditEvent("public_link.issue", invoice.id, occurredAt, input.actorUserId, {
      linkId,
      scope: input.scope,
      expiresAt: input.expiresAt
    })
  );

  return { link, token };
}

export async function revokeInvoicePublicPaymentLinkServer(
  runtime: PaymentsRuntime,
  actor: AuthorizationActor | undefined,
  input: {
    linkId: string;
    actorUserId: string;
  }
) {
  const link = runtime.repository.getPublicPaymentLinkById(input.linkId);

  if (!link) {
    throw new Error(`Public payment link ${input.linkId} was not found.`);
  }

  const invoice = requireInvoiceById(runtime, link.invoiceId);
  await authorizeInvoiceMutationOrThrow(actor, "public_link.revoke.org", invoice, runtime.auditSink);

  const occurredAt = runtime.now().toISOString();
  const updatedLink: InvoicePublicPaymentLinkRecord = {
    ...link,
    revokedAt: occurredAt
  };
  runtime.repository.updatePublicPaymentLink(updatedLink);
  createActivity(runtime, invoice.id, "public_link_revoked", "Public invoice payment link revoked.", occurredAt, input.actorUserId, {
    linkId: updatedLink.id
  });
  runtime.auditSink.write(
    buildPublicLinkAuditEvent("public_link.revoke", invoice.id, occurredAt, input.actorUserId, {
      linkId: updatedLink.id
    })
  );

  return updatedLink;
}

async function resolvePublicInvoiceLink(runtime: PaymentsRuntime, token: string, now: Date) {
  const verified = verifySignedPublicLinkToken(token, runtime.publicLinkSecret, now, {
    auditSink: runtime.auditSink,
    logger: runtime.security.logger,
    monitoringHook: runtime.security.monitoringHook,
    resourceType: "invoice"
  });

  if (!verified.valid || !verified.payload) {
    throw new Error(`Public link token is invalid: ${verified.reason ?? "unknown"}.`);
  }

  const link = runtime.repository.getPublicPaymentLinkById(verified.payload.linkId);

  if (!link || link.tokenHash !== hashPublicLinkToken(token)) {
    throw new Error("Public link record was not found.");
  }

  const invoice = requireInvoiceById(runtime, link.invoiceId);
  const resolvedPublicLink = materializeResolvedPublicLink({
    id: link.id,
    resourceType: "invoice",
    resourceId: invoice.id,
    permissionKeys: link.permissionKeys,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    maxUses: link.maxUses,
    useCount: link.useCount
  });

  return { invoice, link, resolvedPublicLink };
}

export async function viewInvoiceViaPublicLinkServer(
  runtime: PaymentsRuntime,
  token: string,
  now = new Date()
) {
  const { invoice, link, resolvedPublicLink } = await resolvePublicInvoiceLink(runtime, token, now);

  await authorizeOrThrow(
    {
      permissionKey: "invoice.view.public_link",
      record: toInvoiceResourceRecord(invoice),
      publicLink: resolvedPublicLink,
      now
    },
    runtime.auditSink
  );

  const updatedLink = {
    ...link,
    useCount: link.useCount + 1
  };
  runtime.repository.updatePublicPaymentLink(updatedLink);
  createActivity(runtime, invoice.id, "public_link_accessed", "Public invoice link viewed.", now.toISOString(), null, {
    linkId: link.id,
    scope: link.scope
  });
  runtime.auditSink.write(
    buildPublicLinkAuditEvent("public_link.access", invoice.id, now.toISOString(), null, {
      linkId: link.id,
      scope: link.scope,
      accessType: "invoice_view"
    })
  );

  return {
    invoice,
    lineItems: runtime.repository.listLineItemsByInvoiceId(invoice.id),
    payments: runtime.repository.listPaymentsByInvoiceId(invoice.id),
    activities: runtime.repository.listActivitiesByInvoiceId(invoice.id),
    linkScope: link.scope,
    canCollectPayment: link.permissionKeys.includes("payment.collect.public_link")
  };
}

export async function startInvoiceCheckoutSessionViaPublicLinkServer(
  runtime: PaymentsRuntime,
  token: string,
  input: {
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  },
  now = new Date()
): Promise<PaymentCheckoutSession> {
  const { invoice, link, resolvedPublicLink } = await resolvePublicInvoiceLink(runtime, token, now);

  await authorizeOrThrow(
    {
      permissionKey: "payment.collect.public_link",
      record: toInvoiceResourceRecord(invoice),
      publicLink: resolvedPublicLink,
      now
    },
    runtime.auditSink
  );

  if (invoice.status === "paid" || invoice.status === "void" || invoice.balanceDueCents <= 0) {
    throw new Error("This invoice is not payable.");
  }

  const session = await runtime.provider.createCheckoutSession({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerEmail: normalizeCustomerEmail(input.customerEmail, invoice),
    amountCents: invoice.balanceDueCents,
    currency: invoice.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl
  });

  const updatedLink = {
    ...link,
    useCount: link.useCount + 1
  };
  runtime.repository.updatePublicPaymentLink(updatedLink);
  createActivity(runtime, invoice.id, "payment_session_created", "Public-link checkout session created.", now.toISOString(), null, {
    sessionId: session.id,
    linkId: link.id
  });
  runtime.auditSink.write(
    buildPublicLinkAuditEvent("public_link.access", invoice.id, now.toISOString(), null, {
      linkId: link.id,
      scope: link.scope,
      accessType: "payment_collect"
    })
  );

  return session;
}
