import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  createBillServer,
  createExpenseServer,
  createPurchaseOrderServer,
  issuePurchaseOrderServer,
  listVisibleExpensesForActor,
  markExpenseReimbursedServer,
  resetFinanceOperationsRuntime,
  reviewExpenseServer,
  reviewPurchaseOrderServer,
  submitExpenseServer,
  updateBillServer,
  updateBillStatusServer,
  updatePurchaseOrderServer
} from "../packages/payments/src/index.ts";
import {
  FinanceOperationsValidationError,
  FinanceOperationsWorkflowError
} from "../packages/payments/src/operations-validation.ts";
import type { AuthorizationActor } from "../packages/types/src/index.ts";

function actor(overrides: Partial<AuthorizationActor>): AuthorizationActor {
  return {
    userId: overrides.userId ?? "user-1",
    memberships: overrides.memberships ?? [],
    assignedProjectIds: overrides.assignedProjectIds ?? [],
    managedPartnerOrgIds: overrides.managedPartnerOrgIds ?? []
  };
}

function adminActor(): AuthorizationActor {
  return actor({
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-admin",
        userId: "alex.owner",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ]
  });
}

function employeeActor(userId = "employee-1"): AuthorizationActor {
  return actor({
    userId,
    memberships: [
      {
        id: `membership-${userId}`,
        userId,
        role: "employee",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1", "project-demo-2"]
  });
}

test("employees can create and view only their own expenses", async () => {
  const runtime = resetFinanceOperationsRuntime();
  const employee = employeeActor("employee-1");

  const created = await createExpenseServer(runtime, employee, {
    organizationId: "org-hq",
    ownerUserId: "employee-1",
    claimantType: "employee",
    claimantUserId: "employee-1",
    actorUserId: "employee-1",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    category: "travel",
    description: "Downtown parking for permit pickup",
    currency: "USD",
    amountCents: 2800,
    expenseDate: "2026-04-28",
    reimbursementRequested: true,
    reimbursable: true,
    receiptDocumentIds: ["document-demo-4"],
    linkedDocumentIds: ["document-demo-4"]
  });

  await submitExpenseServer(runtime, employee, {
    expenseId: created.id,
    actorUserId: "employee-1"
  });

  const visible = await listVisibleExpensesForActor(runtime, employee);

  assert.equal(created.claimantUserId, "employee-1");
  assert.deepEqual(
    visible.map((expense) => expense.claimantUserId).every((claimantUserId) => claimantUserId === "employee-1"),
    true
  );
  assert.equal(runtime.repository.getExpenseById(created.id)?.status, "submitted");

  await assert.rejects(
    () =>
      createExpenseServer(runtime, employee, {
        organizationId: "org-hq",
        ownerUserId: "employee-2",
        claimantType: "employee",
        claimantUserId: "employee-2",
        actorUserId: "employee-1",
        vendorId: "vendor-demo-1",
        projectId: "project-demo-2",
        category: "materials",
        description: "Attempted expense on behalf of another employee",
        currency: "USD",
        amountCents: 1200,
        expenseDate: "2026-04-28",
        reimbursementRequested: false,
        reimbursable: false,
        receiptDocumentIds: ["document-demo-1"]
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("expense approval and reimbursement transitions write audit events", async () => {
  const runtime = resetFinanceOperationsRuntime();

  const approved = await reviewExpenseServer(runtime, adminActor(), {
    expenseId: "expense-demo-1",
    actorUserId: "alex.owner",
    action: "approve"
  });
  const reimbursed = await markExpenseReimbursedServer(runtime, adminActor(), {
    expenseId: "expense-demo-1",
    actorUserId: "alex.owner"
  });

  assert.equal(approved.status, "approved");
  assert.equal(reimbursed.status, "reimbursed");
  assert.equal(reimbursed.reimbursedAt !== null, true);
  assert.equal(
    runtime.auditSink.list().filter((event) => event.eventType === "expense.status_changed").length >= 2,
    true
  );
  assert.equal(
    runtime.repository
      .listActivitiesByResource("expense", "expense-demo-1")
      .some((activity) => activity.summary.toLowerCase().includes("reimbursed")),
    true
  );
});

test("employees cannot approve purchase orders, while admins can approve and issue them", async () => {
  const runtime = resetFinanceOperationsRuntime();

  await assert.rejects(
    () =>
      reviewPurchaseOrderServer(runtime, employeeActor("employee-2"), {
        purchaseOrderId: "purchase-order-demo-1",
        actorUserId: "employee-2",
        action: "approve"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );

  const approved = await reviewPurchaseOrderServer(runtime, adminActor(), {
    purchaseOrderId: "purchase-order-demo-1",
    actorUserId: "alex.owner",
    action: "approve"
  });
  const issued = await issuePurchaseOrderServer(runtime, adminActor(), {
    purchaseOrderId: "purchase-order-demo-1",
    actorUserId: "alex.owner",
    issuedAt: "2026-04-28"
  });

  assert.equal(approved.status, "approved");
  assert.equal(issued.status, "issued");
  assert.equal(issued.issuedAt, "2026-04-28");
  assert.equal(
    runtime.auditSink.list().some((event) => event.eventType === "purchase_order.status_changed"),
    true
  );
});

test("purchase order updates replace line items instead of appending duplicates", async () => {
  const runtime = resetFinanceOperationsRuntime();

  const created = await createPurchaseOrderServer(runtime, adminActor(), {
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    actorUserId: "alex.owner",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    poNumber: "PO-2026-011",
    title: "Initial framing order",
    description: "Draft order before vendor confirmation.",
    currency: "USD",
    expectedAt: "2026-05-05",
    linkedDocumentIds: ["document-demo-1"],
    lineItems: [
      {
        description: "Framing lumber",
        quantity: 4,
        unitCostCents: 22000
      },
      {
        description: "Fasteners",
        quantity: 2,
        unitCostCents: 6000
      }
    ]
  });

  const updated = await updatePurchaseOrderServer(runtime, adminActor(), {
    purchaseOrderId: created.id,
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    actorUserId: "alex.owner",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    poNumber: "PO-2026-011",
    title: "Initial framing order revised",
    description: "Reduced to the core stock package.",
    currency: "USD",
    expectedAt: "2026-05-06",
    linkedDocumentIds: ["document-demo-1", "document-demo-4"],
    lineItems: [
      {
        description: "Framing lumber",
        quantity: 3,
        unitCostCents: 22000
      }
    ]
  });

  const lineItems = runtime.repository.listPurchaseOrderLineItemsByPurchaseOrderId(created.id);

  assert.equal(updated.totalCents, 66000);
  assert.equal(lineItems.length, 1);
  assert.equal(lineItems[0]?.description, "Framing lumber");
});

test("bill edits and payable state transitions are audited and validated", async () => {
  const runtime = resetFinanceOperationsRuntime();

  const updated = await updateBillServer(runtime, adminActor(), {
    billId: "bill-demo-1",
    actorUserId: "alex.owner",
    vendorId: "vendor-demo-2",
    purchaseOrderId: "purchase-order-demo-2",
    projectId: "project-demo-2",
    billNumber: "BILL-2026-114",
    title: "Layout planning invoice revised",
    currency: "USD",
    dueAt: "2026-05-05",
    issuedAt: "2026-04-27",
    linkedDocumentIds: ["document-demo-1"],
    receiptDocumentIds: ["document-demo-4"],
    lineItems: [
      {
        purchaseOrderItemId: "purchase-order-demo-2-line-1",
        description: "Layout planning deposit",
        quantity: 1,
        unitCostCents: 82000
      }
    ]
  });

  const approved = await updateBillStatusServer(runtime, adminActor(), {
    billId: "bill-demo-1",
    actorUserId: "alex.owner",
    status: "approved"
  });
  const scheduled = await updateBillStatusServer(runtime, adminActor(), {
    billId: "bill-demo-1",
    actorUserId: "alex.owner",
    status: "scheduled"
  });
  const paid = await updateBillStatusServer(runtime, adminActor(), {
    billId: "bill-demo-1",
    actorUserId: "alex.owner",
    status: "paid",
    paidCents: 82000
  });

  assert.equal(updated.totalCents, 82000);
  assert.equal(approved.status, "approved");
  assert.equal(scheduled.status, "scheduled");
  assert.equal(paid.status, "paid");
  assert.equal(
    runtime.auditSink.list().some((event) => event.eventType === "bill.updated"),
    true
  );

  const freshRuntime = resetFinanceOperationsRuntime();

  const draftBill = await createBillServer(freshRuntime, adminActor(), {
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    actorUserId: "alex.owner",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    billNumber: "BILL-2026-220",
    title: "Draft supply bill",
    currency: "USD",
    dueAt: "2026-05-08",
    linkedDocumentIds: ["document-demo-1"],
    receiptDocumentIds: ["document-demo-4"],
    lineItems: [
      {
        description: "Supply deposit",
        quantity: 1,
        unitCostCents: 20000
      }
    ]
  });

  await assert.rejects(
    () =>
      updateBillStatusServer(freshRuntime, adminActor(), {
        billId: draftBill.id,
        actorUserId: "alex.owner",
        status: "paid",
        paidCents: 20000
      }),
    (error: unknown) => {
      assert.ok(
        error instanceof FinanceOperationsWorkflowError || error instanceof FinanceOperationsValidationError
      );
      return true;
    }
  );
});
