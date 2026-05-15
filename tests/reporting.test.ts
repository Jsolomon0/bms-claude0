import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  calculateProjectProfitabilitySnapshots,
  exportBillAgingReportServer,
  exportProjectProfitabilityReportServer,
  generateReportingSnapshotServer,
  getAgingReportsForActor,
  getProjectProfitabilityReportForActor,
  resetReportingRuntime
} from "../packages/reporting/src/index.ts";
import type { AuthorizationActor, ExpenseRecord } from "../packages/types/src/index.ts";

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

function employeeActor(): AuthorizationActor {
  return actor({
    userId: "employee-1",
    memberships: [
      {
        id: "membership-employee",
        userId: "employee-1",
        role: "employee",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"]
  });
}

test("project profitability calculations are reproducible and allocate labor, material, subcontractor, and expense correctly", async () => {
  const runtime = resetReportingRuntime();
  const projects = runtime.projectRepository.listProjects();
  const invoices = runtime.invoiceRepository.listInvoices();
  const payments = invoices.flatMap((invoice) => runtime.invoiceRepository.listPaymentsByInvoiceId(invoice.id));
  const rows = calculateProjectProfitabilitySnapshots({
    organizationId: "org-hq",
    snapshotRunId: "snapshot-fixed",
    snapshotAt: "2026-04-28T16:00:00.000Z",
    projects,
    invoices,
    payments,
    vendors: runtime.financeRepository.listVendors(),
    expenses: runtime.financeRepository.listExpenses(),
    purchaseOrders: runtime.financeRepository.listPurchaseOrders(),
    bills: runtime.financeRepository.listBills(),
    payrollLaborCostAllocations: runtime.payrollRepository.listPayrollLaborCostAllocations()
  });
  const rerun = calculateProjectProfitabilitySnapshots({
    organizationId: "org-hq",
    snapshotRunId: "snapshot-fixed",
    snapshotAt: "2026-04-28T16:00:00.000Z",
    projects,
    invoices,
    payments,
    vendors: runtime.financeRepository.listVendors(),
    expenses: runtime.financeRepository.listExpenses(),
    purchaseOrders: runtime.financeRepository.listPurchaseOrders(),
    bills: runtime.financeRepository.listBills(),
    payrollLaborCostAllocations: runtime.payrollRepository.listPayrollLaborCostAllocations()
  });
  const projectOne = rows.find((row) => row.projectId === "project-demo-1");
  const projectTwo = rows.find((row) => row.projectId === "project-demo-2");

  assert.deepEqual(rows, rerun);
  assert.equal(projectOne?.revenueInvoicedCents, 280000);
  assert.equal(projectOne?.revenueCollectedCents, 120000);
  assert.equal(projectOne?.laborCostCents, 20400);
  assert.equal(projectOne?.materialCostCents, 82000);
  assert.equal(projectOne?.subcontractorCostCents, 0);
  assert.equal(projectOne?.expenseCostCents, 6000);
  assert.equal(projectOne?.openCommitmentCents, 43000);
  assert.equal(projectOne?.grossMarginCents, 171600);
  assert.equal(projectOne?.grossMarginPercent, 61.29);

  assert.equal(projectTwo?.revenueInvoicedCents, 280000);
  assert.equal(projectTwo?.revenueCollectedCents, 240000);
  assert.equal(projectTwo?.laborCostCents, 15000);
  assert.equal(projectTwo?.materialCostCents, 0);
  assert.equal(projectTwo?.subcontractorCostCents, 80000);
  assert.equal(projectTwo?.expenseCostCents, 9200);
  assert.equal(projectTwo?.openCommitmentCents, 0);
  assert.equal(projectTwo?.grossMarginCents, 175800);
  assert.equal(projectTwo?.grossMarginPercent, 62.79);
});

test("historical reporting snapshots remain immutable after raw transactions change", async () => {
  const runtime = resetReportingRuntime();
  const firstRun = runtime.reportingService.getLatestSnapshotRun("org-hq");
  const firstProjectRows = firstRun ? runtime.reportingService.listProjectProfitabilitySnapshots(firstRun.id) : [];
  const firstProjectOne = firstProjectRows.find((row) => row.projectId === "project-demo-1");

  const additionalExpense: ExpenseRecord = {
    id: "expense-report-extra-1",
    organizationId: "org-hq",
    ownerUserId: "employee-1",
    claimantType: "employee",
    claimantUserId: "employee-1",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    category: "travel",
    description: "Additional site coordination mileage",
    currency: "USD",
    amountCents: 10000,
    expenseDate: "2026-04-28",
    status: "approved",
    reimbursementRequested: true,
    reimbursable: true,
    reimbursedAt: null,
    approvedByUserId: "alex.owner",
    approvedAt: "2026-04-28T17:00:00.000Z",
    rejectedAt: null,
    rejectionReason: null,
    receiptDocumentIds: ["document-demo-4"],
    linkedDocumentIds: ["document-demo-4"],
    visibilityFlags: ["internal"],
    createdAt: "2026-04-28T17:00:00.000Z",
    updatedAt: "2026-04-28T17:00:00.000Z"
  };

  runtime.financeRepository.createExpense(additionalExpense);

  const secondRun = await generateReportingSnapshotServer(runtime, adminActor(), {
    organizationId: "org-hq",
    actorUserId: "alex.owner",
    snapshotAt: "2026-04-29T16:00:00.000Z"
  });
  const secondProjectRows = runtime.reportingService.listProjectProfitabilitySnapshots(secondRun.run.id);
  const secondProjectOne = secondProjectRows.find((row) => row.projectId === "project-demo-1");
  const unchangedFirstProjectOne = firstRun
    ? runtime.reportingService.listProjectProfitabilitySnapshots(firstRun.id).find((row) => row.projectId === "project-demo-1")
    : undefined;

  assert.equal(firstProjectOne?.expenseCostCents, 6000);
  assert.equal(unchangedFirstProjectOne?.expenseCostCents, 6000);
  assert.equal(secondProjectOne?.expenseCostCents, 16000);
  assert.equal(secondProjectOne?.grossMarginCents, 161600);
});

test("invoice and bill aging views bucket outstanding records correctly", async () => {
  const runtime = resetReportingRuntime();
  const aging = await getAgingReportsForActor(runtime, adminActor(), "org-hq");
  const invoiceOne = aging.invoiceAging.find((row) => row.invoiceId === "invoice-report-1");
  const invoiceTwo = aging.invoiceAging.find((row) => row.invoiceId === "invoice-report-2");
  const invoiceFour = aging.invoiceAging.find((row) => row.invoiceId === "invoice-report-4");
  const billOne = aging.billAging.find((row) => row.billId === "bill-demo-1");
  const billReport = aging.billAging.find((row) => row.billId === "bill-report-1");

  assert.equal(invoiceOne?.agingBucket, "days_1_30");
  assert.equal(invoiceTwo?.agingBucket, "current");
  assert.equal(invoiceFour?.agingBucket, "days_61_90");
  assert.equal(billOne?.agingBucket, "current");
  assert.equal(billReport?.agingBucket, "days_31_60");
});

test("report exports are protected and return exportable payloads", async () => {
  const runtime = resetReportingRuntime();

  const allowed = await exportProjectProfitabilityReportServer(runtime, {
    method: "GET",
    path: "/reports/project-profitability.csv",
    actor: adminActor(),
    organizationId: "org-hq",
    format: "csv"
  });
  const jsonAllowed = await exportBillAgingReportServer(runtime, {
    method: "GET",
    path: "/reports/bill-aging.json",
    actor: adminActor(),
    organizationId: "org-hq",
    format: "json"
  });
  const denied = await exportProjectProfitabilityReportServer(runtime, {
    method: "GET",
    path: "/reports/project-profitability.csv",
    actor: employeeActor(),
    organizationId: "org-hq",
    format: "csv"
  });

  assert.equal(allowed.status, 200);
  assert.equal("contentType" in allowed.body ? allowed.body.contentType : "", "text/csv");
  assert.equal("body" in allowed.body ? allowed.body.body.includes("project_id,project_name") : false, true);
  assert.equal(jsonAllowed.status, 200);
  assert.equal("contentType" in jsonAllowed.body ? jsonAllowed.body.contentType : "", "application/json");
  assert.equal("body" in jsonAllowed.body ? jsonAllowed.body.body.includes("\"billId\"") : false, true);
  assert.equal(denied.status, 403);
});

test("employees cannot access reporting views while administrators can", async () => {
  const runtime = resetReportingRuntime();

  const allowed = await getProjectProfitabilityReportForActor(runtime, adminActor(), "org-hq");

  assert.equal(allowed.rows.length > 0, true);

  await assert.rejects(
    () => getProjectProfitabilityReportForActor(runtime, employeeActor(), "org-hq"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});
