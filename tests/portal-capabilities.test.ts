import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  getPaymentsRuntime,
  issueInvoicePublicPaymentLinkServer,
  resetPaymentsRuntime,
  startInvoiceCheckoutSessionViaPublicLinkServer,
  viewInvoiceViaPublicLinkServer
} from "../packages/payments/src/index.ts";
import { resetDocumentsRuntime } from "../packages/documents/src/index.ts";
import { resetProjectsRuntime } from "../packages/projects/src/index.ts";
import { getPortalApprovalsData, respondToPortalApproval } from "../apps/portal/lib/approvals-data.ts";
import { getPortalDocumentDetail, getPortalDocumentsData } from "../apps/portal/lib/document-data.ts";
import { getPortalFinanceData, getPortalInvoiceDetail } from "../apps/portal/lib/finance-data.ts";
import { listPortalMessageThreads, getPortalMessageThreadDetail, resetPortalMessagingRuntime } from "../apps/portal/lib/messages-data.ts";
import { getPortalProjectDetail, getPortalProjectsData } from "../apps/portal/lib/project-data.ts";
import { buildPortalActor, getOtherPortalActor } from "../apps/portal/lib/shell-data.ts";
import type { AuthorizationActor } from "../packages/types/src/index.ts";

function adminActor(): AuthorizationActor {
  return {
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-admin",
        userId: "alex.owner",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"],
    managedPartnerOrgIds: ["partner-east"]
  };
}

function resetAll(): void {
  resetProjectsRuntime();
  resetDocumentsRuntime();
  resetPaymentsRuntime();
  resetPortalMessagingRuntime();
}

async function createPaymentLinkApproval(invoiceId: string, actorUserId = "alex.owner") {
  const runtime = getPaymentsRuntime();
  return runtime.security.approvals.createApproval({
    actionKey: "public_link.issue",
    actorUserId,
    resourceType: "invoice",
    resourceId: invoiceId,
    approvedByUserId: "owner.approver",
    justification: "Approve public payment link issuance",
    expiresAt: "2026-05-10T00:00:00.000Z"
  });
}

test("customer portal scope returns only customer-owned records", async () => {
  resetAll();
  const actor = buildPortalActor("customer");

  const [projects, documents, finance, threads, approvals] = await Promise.all([
    getPortalProjectsData(actor),
    getPortalDocumentsData(actor),
    getPortalFinanceData(actor),
    listPortalMessageThreads(actor),
    getPortalApprovalsData(actor)
  ]);

  assert.deepEqual(projects.map((project) => project.id), ["project-demo-1"]);
  assert.deepEqual(
    documents.map((document) => document.id).sort(),
    ["document-demo-1", "document-demo-4"]
  );
  assert.deepEqual(finance.invoices.map((invoice) => invoice.id).sort(), ["invoice-report-1", "invoice-report-2"]);
  assert.deepEqual(threads.map((thread) => thread.id), ["thread-customer-1"]);
  assert.equal(approvals.pending.length, 1);
  assert.equal(approvals.pending[0]?.changeOrder.id, "change-order-demo-1");
});

test("other customer cannot access primary customer project, invoice, or thread", async () => {
  resetAll();
  const actor = getOtherPortalActor("customer");

  await assert.rejects(() => getPortalProjectDetail("project-demo-1", actor), AuthorizationError);
  await assert.rejects(() => getPortalInvoiceDetail("invoice-report-1", actor), AuthorizationError);
  await assert.rejects(() => getPortalMessageThreadDetail("thread-customer-1", actor), AuthorizationError);

  const threads = await listPortalMessageThreads(actor);
  assert.deepEqual(threads.map((thread) => thread.id), ["thread-customer-2"]);
});

test("subcontractor portal scope stays assigned and excludes finance and customer approvals", async () => {
  resetAll();
  const actor = buildPortalActor("subcontractor");

  const [projects, documents, finance, threads, approvals] = await Promise.all([
    getPortalProjectsData(actor),
    getPortalDocumentsData(actor),
    getPortalFinanceData(actor),
    listPortalMessageThreads(actor),
    getPortalApprovalsData(actor)
  ]);

  assert.deepEqual(projects.map((project) => project.id), ["project-demo-1"]);
  assert.deepEqual(documents.map((document) => document.id), ["document-demo-2"]);
  assert.equal(finance.canViewFinance, false);
  assert.deepEqual(threads.map((thread) => thread.id), ["thread-partner-east-1"]);
  assert.equal(approvals.canViewApprovals, false);
});

test("supercontractor portal scope sees partner-managed threads but not other partner records", async () => {
  resetAll();
  const actor = buildPortalActor("supercontractor");
  const otherActor = getOtherPortalActor("supercontractor");

  const documents = await getPortalDocumentsData(actor);
  const threads = await listPortalMessageThreads(actor);

  assert.deepEqual(documents.map((document) => document.id), ["document-demo-2"]);
  assert.deepEqual(
    threads.map((thread) => thread.id).sort(),
    ["thread-partner-east-1", "thread-partner-east-2"]
  );

  await assert.rejects(() => getPortalMessageThreadDetail("thread-partner-east-1", otherActor), AuthorizationError);
  const otherThreads = await listPortalMessageThreads(otherActor);
  assert.deepEqual(otherThreads.map((thread) => thread.id), ["thread-partner-west-1"]);
});

test("customer approval decisions are allowed only for the matching customer account", async () => {
  resetAll();
  const actor = buildPortalActor("customer");

  const approved = await respondToPortalApproval(
    {
      changeOrderId: "change-order-demo-1",
      status: "approved"
    },
    actor
  );

  assert.equal(approved.status, "approved");

  resetAll();
  await assert.rejects(
    () =>
      respondToPortalApproval(
        {
          changeOrderId: "change-order-demo-1",
          status: "rejected"
        },
        getOtherPortalActor("customer")
      ),
    AuthorizationError
  );
});

test("document detail keeps explicit access rules and cross-org access prevention intact", async () => {
  resetAll();

  const customer = buildPortalActor("customer");
  const subcontractor = buildPortalActor("subcontractor");

  const customerDetail = await getPortalDocumentDetail("document-demo-1", customer);
  const partnerDetail = await getPortalDocumentDetail("document-demo-2", subcontractor);

  assert.equal(customerDetail.document?.id, "document-demo-1");
  assert.equal(partnerDetail.document?.id, "document-demo-2");
  await assert.rejects(() => getPortalDocumentDetail("document-demo-2", customer), /deny the view action/i);
});

test("public payment links allow no-login invoice viewing and checkout within scope", async () => {
  resetAll();
  const runtime = getPaymentsRuntime();
  const approval = await createPaymentLinkApproval("invoice-report-2");

  const issued = await issueInvoicePublicPaymentLinkServer(runtime, adminActor(), {
    invoiceId: "invoice-report-2",
    actorUserId: "alex.owner",
    expiresAt: "2026-05-05T00:00:00.000Z",
    scope: "invoice_payment",
    maxUses: 5,
    approvalId: approval.id
  });

  const preview = await viewInvoiceViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T16:30:00.000Z"));
  const session = await startInvoiceCheckoutSessionViaPublicLinkServer(
    runtime,
    issued.token,
    {
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      customerEmail: "payer@example.com"
    },
    new Date("2026-04-28T16:31:00.000Z")
  );

  assert.equal(preview.invoice.id, "invoice-report-2");
  assert.equal(preview.canCollectPayment, true);
  assert.equal(session.invoiceId, "invoice-report-2");
  assert.match(session.checkoutUrl, /checkout\.stripe\.local/);
});
