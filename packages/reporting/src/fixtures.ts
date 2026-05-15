import type {
  BillLineItemRecord,
  BillRecord,
  ExpenseRecord,
  InvoiceLineItemRecord,
  InvoiceRecord,
  PaymentRecord,
  PayPeriodRecord,
  PayrollLaborCostAllocationRecord,
  PayrollRunRecord
} from "../../types/src/index.ts";

export const REPORTING_DEMO_INVOICES: readonly InvoiceRecord[] = [
  {
    id: "invoice-report-1",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-aria",
    projectId: "project-demo-1",
    invoiceNumber: "INV-2026-021",
    title: "Basement finishing progress billing",
    currency: "USD",
    subtotalCents: 170000,
    taxCents: 15000,
    totalCents: 185000,
    paidCents: 120000,
    balanceDueCents: 65000,
    status: "partial",
    dueAt: "2026-04-10",
    sentAt: "2026-03-31T12:00:00.000Z",
    visibilityFlags: ["internal", "customer"],
    createdAt: "2026-03-31T12:00:00.000Z",
    updatedAt: "2026-04-18T16:00:00.000Z"
  },
  {
    id: "invoice-report-2",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-aria",
    projectId: "project-demo-1",
    invoiceNumber: "INV-2026-028",
    title: "Basement finishing milestone two",
    currency: "USD",
    subtotalCents: 90000,
    taxCents: 5000,
    totalCents: 95000,
    paidCents: 0,
    balanceDueCents: 95000,
    status: "sent",
    dueAt: "2026-05-12",
    sentAt: "2026-04-27T12:00:00.000Z",
    visibilityFlags: ["internal", "customer"],
    createdAt: "2026-04-27T12:00:00.000Z",
    updatedAt: "2026-04-27T12:00:00.000Z"
  },
  {
    id: "invoice-report-3",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-logistics",
    projectId: "project-demo-2",
    invoiceNumber: "INV-2026-016",
    title: "Warehouse planning phase invoice",
    currency: "USD",
    subtotalCents: 220000,
    taxCents: 20000,
    totalCents: 240000,
    paidCents: 240000,
    balanceDueCents: 0,
    status: "paid",
    dueAt: "2026-04-05",
    sentAt: "2026-03-20T12:00:00.000Z",
    paidAt: "2026-04-06T15:00:00.000Z",
    visibilityFlags: ["internal"],
    createdAt: "2026-03-20T12:00:00.000Z",
    updatedAt: "2026-04-06T15:00:00.000Z"
  },
  {
    id: "invoice-report-4",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-logistics",
    projectId: "project-demo-2",
    invoiceNumber: "INV-2026-018",
    title: "Warehouse change planning invoice",
    currency: "USD",
    subtotalCents: 38000,
    taxCents: 2000,
    totalCents: 40000,
    paidCents: 0,
    balanceDueCents: 40000,
    status: "overdue",
    dueAt: "2026-02-15",
    sentAt: "2026-02-01T12:00:00.000Z",
    visibilityFlags: ["internal"],
    createdAt: "2026-02-01T12:00:00.000Z",
    updatedAt: "2026-03-20T09:00:00.000Z"
  }
] as const;

export const REPORTING_DEMO_INVOICE_LINE_ITEMS: readonly InvoiceLineItemRecord[] = [
  {
    id: "invoice-report-1-line-1",
    invoiceId: "invoice-report-1",
    description: "Framing and rough-ins progress draw",
    quantity: 1,
    unitAmountCents: 185000,
    lineTotalCents: 185000
  },
  {
    id: "invoice-report-2-line-1",
    invoiceId: "invoice-report-2",
    description: "Milestone two progress draw",
    quantity: 1,
    unitAmountCents: 95000,
    lineTotalCents: 95000
  },
  {
    id: "invoice-report-3-line-1",
    invoiceId: "invoice-report-3",
    description: "Planning phase completion",
    quantity: 1,
    unitAmountCents: 240000,
    lineTotalCents: 240000
  },
  {
    id: "invoice-report-4-line-1",
    invoiceId: "invoice-report-4",
    description: "Change planning services",
    quantity: 1,
    unitAmountCents: 40000,
    lineTotalCents: 40000
  }
] as const;

export const REPORTING_DEMO_PAYMENTS: readonly PaymentRecord[] = [
  {
    id: "payment-report-1",
    invoiceId: "invoice-report-1",
    organizationId: "org-hq",
    customerAccountId: "customer-aria",
    provider: "stripe",
    providerReference: "pi_demo_1",
    amountCents: 120000,
    currency: "USD",
    status: "succeeded",
    methodType: "card",
    receivedAt: "2026-04-18T16:00:00.000Z",
    recordedByUserId: "alex.owner"
  },
  {
    id: "payment-report-2",
    invoiceId: "invoice-report-3",
    organizationId: "org-hq",
    customerAccountId: "customer-logistics",
    provider: "manual",
    providerReference: "wire-240000",
    amountCents: 240000,
    currency: "USD",
    status: "manual_recorded",
    methodType: "bank_transfer",
    receivedAt: "2026-04-06T15:00:00.000Z",
    recordedByUserId: "alex.owner"
  }
] as const;

export const REPORTING_SUPPLEMENTAL_EXPENSES: readonly ExpenseRecord[] = [
  {
    id: "expense-report-1",
    organizationId: "org-hq",
    ownerUserId: "employee-1",
    claimantType: "employee",
    claimantUserId: "employee-1",
    vendorId: "vendor-demo-1",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    category: "travel",
    description: "Inspection office mileage reimbursement",
    currency: "USD",
    amountCents: 6000,
    expenseDate: "2026-04-21",
    status: "approved",
    reimbursementRequested: true,
    reimbursable: true,
    reimbursedAt: null,
    approvedByUserId: "alex.owner",
    approvedAt: "2026-04-22T11:00:00.000Z",
    rejectedAt: null,
    rejectionReason: null,
    receiptDocumentIds: ["document-demo-4"],
    linkedDocumentIds: ["document-demo-4"],
    visibilityFlags: ["internal"],
    createdAt: "2026-04-21T15:00:00.000Z",
    updatedAt: "2026-04-22T11:00:00.000Z"
  }
] as const;

export const REPORTING_SUPPLEMENTAL_BILLS: readonly BillRecord[] = [
  {
    id: "bill-report-1",
    organizationId: "org-hq",
    ownerUserId: "alex.owner",
    vendorId: "vendor-demo-1",
    purchaseOrderId: "purchase-order-demo-1",
    projectId: "project-demo-1",
    billNumber: "BILL-2026-090",
    title: "Trim package remainder",
    currency: "USD",
    totalCents: 32000,
    paidCents: 0,
    dueAt: "2026-03-20",
    issuedAt: "2026-03-05",
    status: "approved",
    approvedByUserId: "alex.owner",
    approvedAt: "2026-03-06T10:00:00.000Z",
    linkedDocumentIds: ["document-demo-1"],
    receiptDocumentIds: [],
    visibilityFlags: ["internal"],
    createdAt: "2026-03-05T12:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z"
  }
] as const;

export const REPORTING_SUPPLEMENTAL_BILL_LINE_ITEMS: readonly BillLineItemRecord[] = [
  {
    id: "bill-report-1-line-1",
    billId: "bill-report-1",
    purchaseOrderItemId: "purchase-order-demo-1-line-1",
    lineNumber: 1,
    description: "Trim package remainder",
    quantity: 1,
    unitCostCents: 32000,
    totalAmountCents: 32000
  }
] as const;

export const REPORTING_SUPPLEMENTAL_PAY_PERIODS: readonly PayPeriodRecord[] = [
  {
    id: "pay-period-report-1",
    organizationId: "org-hq",
    status: "paid",
    periodStart: "2026-04-13",
    periodEnd: "2026-04-19",
    payDate: "2026-04-24",
    visibilityFlags: ["internal"],
    createdByUserId: "alex.owner",
    closedByUserId: "alex.owner",
    createdAt: "2026-04-10T12:00:00.000Z",
    updatedAt: "2026-04-24T18:00:00.000Z"
  }
] as const;

export const REPORTING_SUPPLEMENTAL_PAYROLL_RUNS: readonly PayrollRunRecord[] = [
  {
    id: "payroll-run-report-1",
    organizationId: "org-hq",
    payPeriodId: "pay-period-report-1",
    providerName: "embedded_payroll",
    providerRunId: "payrun_report_1",
    status: "completed",
    approvedTimesheetCount: 1,
    approvedTimeEntryCount: 1,
    totalMinutes: 360,
    totalLaborCostCents: 20400,
    failureReason: null,
    visibilityFlags: ["internal"],
    createdByUserId: "alex.owner",
    submittedAt: "2026-04-24T16:00:00.000Z",
    syncedAt: "2026-04-24T18:00:00.000Z",
    completedAt: "2026-04-24T18:00:00.000Z",
    failedAt: null,
    createdAt: "2026-04-24T16:00:00.000Z",
    updatedAt: "2026-04-24T18:00:00.000Z"
  }
] as const;

export const REPORTING_SUPPLEMENTAL_PAYROLL_LABOR_COST_ALLOCATIONS: readonly PayrollLaborCostAllocationRecord[] = [
  {
    id: "payroll-cost-report-1",
    organizationId: "org-hq",
    payrollRunId: "payroll-run-report-1",
    payPeriodId: "pay-period-report-1",
    employeeUserId: "employee-1",
    timeEntryId: "time-entry-report-1",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    minutesWorked: 360,
    laborCostCents: 20400,
    createdAt: "2026-04-24T18:00:00.000Z"
  }
] as const;
