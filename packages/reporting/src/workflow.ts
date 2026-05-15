import type {
  AgingBucketKey,
  AgingBucketSummary,
  BillAgingSnapshotRecord,
  BillRecord,
  ExportedReportPayload,
  ExpenseRecord,
  InvoiceAgingSnapshotRecord,
  InvoiceRecord,
  PaymentRecord,
  PayrollLaborCostAllocationRecord,
  ProjectProfitabilitySnapshotRecord,
  ProjectRecord,
  PurchaseOrderRecord,
  ReportExportFormat,
  ReportingRepository,
  ReportingSnapshotRunRecord,
  VendorRecord
} from "../../types/src/index.ts";

const MATERIAL_EXPENSE_CATEGORIES = new Set(["materials", "material", "inventory", "supplies", "equipment"]);

function defaultIdGenerator() {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function diffWholeDays(asOfIso: string, dueAt: string): number {
  const asOf = new Date(asOfIso);
  const due = new Date(dueAt.length === 10 ? `${dueAt}T00:00:00.000Z` : dueAt);
  return Math.floor((asOf.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
}

export function toAgingBucket(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 0) {
    return "current";
  }

  if (daysPastDue <= 30) {
    return "days_1_30";
  }

  if (daysPastDue <= 60) {
    return "days_31_60";
  }

  if (daysPastDue <= 90) {
    return "days_61_90";
  }

  return "days_91_plus";
}

function calculateInvoiceCollectedCents(
  invoice: InvoiceRecord,
  paymentsByInvoiceId: ReadonlyMap<string, readonly PaymentRecord[]>
): number {
  const payments = paymentsByInvoiceId.get(invoice.id) ?? [];

  if (payments.length === 0) {
    return invoice.paidCents;
  }

  return payments.reduce((sum, payment) => {
    if (payment.status === "succeeded" || payment.status === "manual_recorded") {
      return sum + payment.amountCents;
    }

    if (payment.status === "refunded") {
      return sum - payment.amountCents;
    }

    return sum;
  }, 0);
}

function shouldCountBillAsActualCost(bill: BillRecord): boolean {
  return bill.status !== "draft" && bill.status !== "void";
}

function shouldCountPurchaseOrderAsCommitted(purchaseOrder: PurchaseOrderRecord): boolean {
  return !["draft", "rejected", "cancelled"].includes(purchaseOrder.status);
}

function classifyExpenseAllocation(
  expense: ExpenseRecord,
  vendorById: ReadonlyMap<string, VendorRecord>
): "material" | "subcontractor" | "expense" | null {
  if (expense.status !== "approved" && expense.status !== "reimbursed") {
    return null;
  }

  if (expense.claimantType === "subcontractor") {
    return "subcontractor";
  }

  if (MATERIAL_EXPENSE_CATEGORIES.has(expense.category.trim().toLowerCase())) {
    return "material";
  }

  return "expense";
}

function classifyBillAllocation(vendor: VendorRecord | undefined): "material" | "subcontractor" {
  return vendor?.linkedOrganizationId ? "subcontractor" : "material";
}

export interface ProfitabilityCalculationInput {
  organizationId: string;
  snapshotRunId: string;
  snapshotAt: string;
  projects: readonly ProjectRecord[];
  invoices: readonly InvoiceRecord[];
  payments: readonly PaymentRecord[];
  vendors: readonly VendorRecord[];
  expenses: readonly ExpenseRecord[];
  purchaseOrders: readonly PurchaseOrderRecord[];
  bills: readonly BillRecord[];
  payrollLaborCostAllocations: readonly PayrollLaborCostAllocationRecord[];
}

export function calculateProjectProfitabilitySnapshots(
  input: ProfitabilityCalculationInput
): readonly ProjectProfitabilitySnapshotRecord[] {
  const vendorById = new Map(input.vendors.map((vendor) => [vendor.id, vendor] as const));
  const paymentsByInvoiceId = new Map<string, PaymentRecord[]>();

  input.payments.forEach((payment) => {
    const current = paymentsByInvoiceId.get(payment.invoiceId) ?? [];
    paymentsByInvoiceId.set(payment.invoiceId, [...current, payment]);
  });

  return input.projects
    .filter((project) => project.organizationId === input.organizationId)
    .map((project) => {
      const invoices = input.invoices.filter(
        (invoice) => invoice.organizationId === input.organizationId && invoice.projectId === project.id && invoice.status !== "void"
      );
      const bills = input.bills.filter(
        (bill) => bill.organizationId === input.organizationId && bill.projectId === project.id && shouldCountBillAsActualCost(bill)
      );
      const purchaseOrders = input.purchaseOrders.filter(
        (purchaseOrder) =>
          purchaseOrder.organizationId === input.organizationId &&
          purchaseOrder.projectId === project.id &&
          shouldCountPurchaseOrderAsCommitted(purchaseOrder)
      );
      const expenses = input.expenses.filter(
        (expense) => expense.organizationId === input.organizationId && expense.projectId === project.id
      );
      const payrollAllocations = input.payrollLaborCostAllocations.filter(
        (allocation) => allocation.organizationId === input.organizationId && allocation.projectId === project.id
      );

      const revenueInvoicedCents = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
      const revenueCollectedCents = invoices.reduce(
        (sum, invoice) => sum + calculateInvoiceCollectedCents(invoice, paymentsByInvoiceId),
        0
      );
      const laborCostCents = payrollAllocations.reduce((sum, allocation) => sum + allocation.laborCostCents, 0);

      let materialCostCents = 0;
      let subcontractorCostCents = 0;
      let expenseCostCents = 0;
      let expenseCount = 0;

      expenses.forEach((expense) => {
        const allocationClass = classifyExpenseAllocation(expense, vendorById);

        if (!allocationClass) {
          return;
        }

        expenseCount += 1;

        if (allocationClass === "material") {
          materialCostCents += expense.amountCents;
          return;
        }

        if (allocationClass === "subcontractor") {
          subcontractorCostCents += expense.amountCents;
          return;
        }

        expenseCostCents += expense.amountCents;
      });

      bills.forEach((bill) => {
        const allocationClass = classifyBillAllocation(vendorById.get(bill.vendorId));

        if (allocationClass === "subcontractor") {
          subcontractorCostCents += bill.totalCents;
          return;
        }

        materialCostCents += bill.totalCents;
      });

      const committedCostCents = purchaseOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalCents, 0);
      const billedAgainstPurchaseOrder = new Map<string, number>();

      bills.forEach((bill) => {
        if (!bill.purchaseOrderId) {
          return;
        }

        billedAgainstPurchaseOrder.set(
          bill.purchaseOrderId,
          (billedAgainstPurchaseOrder.get(bill.purchaseOrderId) ?? 0) + bill.totalCents
        );
      });

      const openCommitmentCents = purchaseOrders.reduce((sum, purchaseOrder) => {
        const billed = billedAgainstPurchaseOrder.get(purchaseOrder.id) ?? 0;
        return sum + Math.max(purchaseOrder.totalCents - billed, 0);
      }, 0);

      const totalCostCents = laborCostCents + materialCostCents + subcontractorCostCents + expenseCostCents;
      const grossMarginCents = revenueInvoicedCents - totalCostCents;
      const grossMarginPercent =
        revenueInvoicedCents > 0 ? roundPercent((grossMarginCents / revenueInvoicedCents) * 100) : 0;

      return {
        id: `${input.snapshotRunId}:project:${project.id}`,
        snapshotRunId: input.snapshotRunId,
        organizationId: input.organizationId,
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        currency: invoices[0]?.currency ?? bills[0]?.currency ?? expenses[0]?.currency ?? "USD",
        revenueInvoicedCents,
        revenueCollectedCents,
        laborCostCents,
        materialCostCents,
        subcontractorCostCents,
        expenseCostCents,
        committedCostCents,
        openCommitmentCents,
        totalCostCents,
        grossMarginCents,
        grossMarginPercent,
        invoiceCount: invoices.length,
        payrollAllocationCount: payrollAllocations.length,
        billCount: bills.length,
        expenseCount,
        purchaseOrderCount: purchaseOrders.length,
        snapshotAt: input.snapshotAt
      };
    })
    .sort((left, right) => right.revenueInvoicedCents - left.revenueInvoicedCents);
}

export interface InvoiceAgingCalculationInput {
  organizationId: string;
  snapshotRunId: string;
  snapshotAt: string;
  invoices: readonly InvoiceRecord[];
  payments: readonly PaymentRecord[];
}

export function calculateInvoiceAgingSnapshots(
  input: InvoiceAgingCalculationInput
): readonly InvoiceAgingSnapshotRecord[] {
  const paymentsByInvoiceId = new Map<string, PaymentRecord[]>();

  input.payments.forEach((payment) => {
    const current = paymentsByInvoiceId.get(payment.invoiceId) ?? [];
    paymentsByInvoiceId.set(payment.invoiceId, [...current, payment]);
  });

  return input.invoices
    .filter((invoice) => invoice.organizationId === input.organizationId && invoice.status !== "void")
    .map((invoice) => {
      const collectedCents = calculateInvoiceCollectedCents(invoice, paymentsByInvoiceId);
      const outstandingCents = Math.max(invoice.totalCents - collectedCents, 0);

      return {
        invoice,
        collectedCents,
        outstandingCents
      };
    })
    .filter((entry) => entry.outstandingCents > 0)
    .map(({ invoice, collectedCents, outstandingCents }) => {
      const daysPastDue = diffWholeDays(input.snapshotAt, invoice.dueAt);

      return {
        id: `${input.snapshotRunId}:invoice:${invoice.id}`,
        snapshotRunId: input.snapshotRunId,
        organizationId: input.organizationId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerAccountId: invoice.customerAccountId,
        projectId: invoice.projectId,
        status: invoice.status,
        currency: invoice.currency,
        dueAt: invoice.dueAt,
        totalCents: invoice.totalCents,
        collectedCents,
        outstandingCents,
        daysPastDue,
        agingBucket: toAgingBucket(daysPastDue),
        snapshotAt: input.snapshotAt
      };
    })
    .sort((left, right) => right.outstandingCents - left.outstandingCents);
}

export interface BillAgingCalculationInput {
  organizationId: string;
  snapshotRunId: string;
  snapshotAt: string;
  bills: readonly BillRecord[];
}

export function calculateBillAgingSnapshots(
  input: BillAgingCalculationInput
): readonly BillAgingSnapshotRecord[] {
  return input.bills
    .filter((bill) => bill.organizationId === input.organizationId && bill.status !== "void" && bill.status !== "paid")
    .map((bill) => {
      const outstandingCents = Math.max(bill.totalCents - bill.paidCents, 0);
      const daysPastDue = diffWholeDays(input.snapshotAt, bill.dueAt);

      return {
        id: `${input.snapshotRunId}:bill:${bill.id}`,
        snapshotRunId: input.snapshotRunId,
        organizationId: input.organizationId,
        billId: bill.id,
        billNumber: bill.billNumber,
        vendorId: bill.vendorId,
        projectId: bill.projectId,
        status: bill.status,
        currency: bill.currency,
        dueAt: bill.dueAt,
        totalCents: bill.totalCents,
        paidCents: bill.paidCents,
        outstandingCents,
        daysPastDue,
        agingBucket: toAgingBucket(daysPastDue),
        snapshotAt: input.snapshotAt
      };
    })
    .filter((entry) => entry.outstandingCents > 0)
    .sort((left, right) => right.outstandingCents - left.outstandingCents);
}

export function summarizeAgingRows<
  TRecord extends { agingBucket: AgingBucketKey; outstandingCents: number }
>(rows: readonly TRecord[]): readonly AgingBucketSummary[] {
  return (["current", "days_1_30", "days_31_60", "days_61_90", "days_91_plus"] as const).map((bucket) => {
    const bucketRows = rows.filter((row) => row.agingBucket === bucket);

    return {
      bucket,
      count: bucketRows.length,
      totalOutstandingCents: bucketRows.reduce((sum, row) => sum + row.outstandingCents, 0)
    };
  });
}

function csvCell(value: string | number): string {
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
}

function toCsv(headers: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  const lines = [headers.map(csvCell).join(",")];

  rows.forEach((row) => {
    lines.push(row.map(csvCell).join(","));
  });

  return lines.join("\n");
}

export interface ReportingServiceDependencies {
  reportingRepository: ReportingRepository;
  rawSources: {
    listProjects(): readonly ProjectRecord[];
    listVendors(): readonly VendorRecord[];
    listExpenses(): readonly ExpenseRecord[];
    listPurchaseOrders(): readonly PurchaseOrderRecord[];
    listBills(): readonly BillRecord[];
    listInvoices(): readonly InvoiceRecord[];
    listPaymentsByInvoiceId(invoiceId: string): readonly PaymentRecord[];
    listPayrollLaborCostAllocations(): readonly PayrollLaborCostAllocationRecord[];
  };
  idGenerator?: (prefix: string) => string;
  now?: () => Date;
}

export class ReportingService {
  private readonly reportingRepository: ReportingRepository;
  private readonly rawSources: ReportingServiceDependencies["rawSources"];
  private readonly idGenerator: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(dependencies: ReportingServiceDependencies) {
    this.reportingRepository = dependencies.reportingRepository;
    this.rawSources = dependencies.rawSources;
    this.idGenerator = dependencies.idGenerator ?? defaultIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  private collectPaymentsForInvoices(invoices: readonly InvoiceRecord[]): readonly PaymentRecord[] {
    return invoices.flatMap((invoice) => this.rawSources.listPaymentsByInvoiceId(invoice.id));
  }

  generateSnapshot(input: {
    organizationId: string;
    actorUserId: string;
    snapshotAt?: string;
  }): {
    run: ReportingSnapshotRunRecord;
    projectProfitability: readonly ProjectProfitabilitySnapshotRecord[];
    invoiceAging: readonly InvoiceAgingSnapshotRecord[];
    billAging: readonly BillAgingSnapshotRecord[];
  } {
    const snapshotAt = input.snapshotAt ?? this.now().toISOString();
    const snapshotRunId = this.idGenerator("reporting-snapshot");
    const run: ReportingSnapshotRunRecord = {
      id: snapshotRunId,
      organizationId: input.organizationId,
      snapshotAt,
      generatedByUserId: input.actorUserId,
      createdAt: snapshotAt
    };
    const projects = this.rawSources.listProjects();
    const vendors = this.rawSources.listVendors();
    const expenses = this.rawSources.listExpenses();
    const purchaseOrders = this.rawSources.listPurchaseOrders();
    const bills = this.rawSources.listBills();
    const invoices = this.rawSources.listInvoices();
    const payments = this.collectPaymentsForInvoices(invoices);
    const payrollLaborCostAllocations = this.rawSources.listPayrollLaborCostAllocations();
    const projectProfitability = calculateProjectProfitabilitySnapshots({
      organizationId: input.organizationId,
      snapshotRunId,
      snapshotAt,
      projects,
      invoices,
      payments,
      vendors,
      expenses,
      purchaseOrders,
      bills,
      payrollLaborCostAllocations
    });
    const invoiceAging = calculateInvoiceAgingSnapshots({
      organizationId: input.organizationId,
      snapshotRunId,
      snapshotAt,
      invoices,
      payments
    });
    const billAging = calculateBillAgingSnapshots({
      organizationId: input.organizationId,
      snapshotRunId,
      snapshotAt,
      bills
    });

    this.reportingRepository.createSnapshotRun(run);
    this.reportingRepository.createProjectProfitabilitySnapshots(projectProfitability);
    this.reportingRepository.createInvoiceAgingSnapshots(invoiceAging);
    this.reportingRepository.createBillAgingSnapshots(billAging);

    return {
      run,
      projectProfitability,
      invoiceAging,
      billAging
    };
  }

  getSnapshotRun(snapshotRunId: string): ReportingSnapshotRunRecord | undefined {
    return this.reportingRepository.getSnapshotRunById(snapshotRunId);
  }

  getLatestSnapshotRun(organizationId: string): ReportingSnapshotRunRecord | undefined {
    return this.reportingRepository.findLatestSnapshotRunByOrganizationId(organizationId);
  }

  listSnapshotRuns(organizationId: string): readonly ReportingSnapshotRunRecord[] {
    return this.reportingRepository.listSnapshotRunsByOrganizationId(organizationId);
  }

  listProjectProfitabilitySnapshots(snapshotRunId: string): readonly ProjectProfitabilitySnapshotRecord[] {
    return this.reportingRepository.listProjectProfitabilitySnapshotsByRunId(snapshotRunId);
  }

  listInvoiceAgingSnapshots(snapshotRunId: string): readonly InvoiceAgingSnapshotRecord[] {
    return this.reportingRepository.listInvoiceAgingSnapshotsByRunId(snapshotRunId);
  }

  listBillAgingSnapshots(snapshotRunId: string): readonly BillAgingSnapshotRecord[] {
    return this.reportingRepository.listBillAgingSnapshotsByRunId(snapshotRunId);
  }

  getLatestReportingView(organizationId: string) {
    const run = this.getLatestSnapshotRun(organizationId);

    if (!run) {
      return {
        run: undefined,
        projectProfitability: [],
        invoiceAging: [],
        billAging: []
      };
    }

    return {
      run,
      projectProfitability: this.listProjectProfitabilitySnapshots(run.id),
      invoiceAging: this.listInvoiceAgingSnapshots(run.id),
      billAging: this.listBillAgingSnapshots(run.id)
    };
  }

  buildOverview(organizationId: string) {
    const latest = this.getLatestReportingView(organizationId);
    const totals = latest.projectProfitability.reduce(
      (summary, row) => ({
        revenueInvoicedCents: summary.revenueInvoicedCents + row.revenueInvoicedCents,
        revenueCollectedCents: summary.revenueCollectedCents + row.revenueCollectedCents,
        totalCostCents: summary.totalCostCents + row.totalCostCents,
        grossMarginCents: summary.grossMarginCents + row.grossMarginCents,
        openCommitmentCents: summary.openCommitmentCents + row.openCommitmentCents
      }),
      {
        revenueInvoicedCents: 0,
        revenueCollectedCents: 0,
        totalCostCents: 0,
        grossMarginCents: 0,
        openCommitmentCents: 0
      }
    );
    const grossMarginPercent =
      totals.revenueInvoicedCents > 0
        ? roundPercent((totals.grossMarginCents / totals.revenueInvoicedCents) * 100)
        : 0;

    return {
      ...latest,
      totals: {
        ...totals,
        grossMarginPercent
      },
      receivableAgingSummary: summarizeAgingRows(latest.invoiceAging),
      payableAgingSummary: summarizeAgingRows(latest.billAging)
    };
  }

  exportProjectProfitability(
    organizationId: string,
    format: ReportExportFormat,
    snapshotRunId?: string
  ): ExportedReportPayload {
    const run = snapshotRunId ? this.getSnapshotRun(snapshotRunId) : this.getLatestSnapshotRun(organizationId);

    if (!run) {
      return {
        contentType: format === "csv" ? "text/csv" : "application/json",
        fileName: `project-profitability-${organizationId}-empty.${format}`,
        body: format === "csv" ? "project_id,project_name\n" : "[]"
      };
    }

    const rows = this.listProjectProfitabilitySnapshots(run.id);

    if (format === "json") {
      return {
        contentType: "application/json",
        fileName: `project-profitability-${run.snapshotAt.slice(0, 10)}.json`,
        body: JSON.stringify(rows, null, 2)
      };
    }

    return {
      contentType: "text/csv",
      fileName: `project-profitability-${run.snapshotAt.slice(0, 10)}.csv`,
      body: toCsv(
        [
          "project_id",
          "project_name",
          "project_status",
          "revenue_invoiced_cents",
          "revenue_collected_cents",
          "labor_cost_cents",
          "material_cost_cents",
          "subcontractor_cost_cents",
          "expense_cost_cents",
          "committed_cost_cents",
          "open_commitment_cents",
          "total_cost_cents",
          "gross_margin_cents",
          "gross_margin_percent",
          "snapshot_at"
        ],
        rows.map((row) => [
          row.projectId,
          row.projectName,
          row.projectStatus,
          row.revenueInvoicedCents,
          row.revenueCollectedCents,
          row.laborCostCents,
          row.materialCostCents,
          row.subcontractorCostCents,
          row.expenseCostCents,
          row.committedCostCents,
          row.openCommitmentCents,
          row.totalCostCents,
          row.grossMarginCents,
          row.grossMarginPercent,
          row.snapshotAt
        ])
      )
    };
  }

  exportInvoiceAging(
    organizationId: string,
    format: ReportExportFormat,
    snapshotRunId?: string
  ): ExportedReportPayload {
    const run = snapshotRunId ? this.getSnapshotRun(snapshotRunId) : this.getLatestSnapshotRun(organizationId);
    const rows = run ? this.listInvoiceAgingSnapshots(run.id) : [];

    if (format === "json") {
      return {
        contentType: "application/json",
        fileName: `invoice-aging-${run?.snapshotAt.slice(0, 10) ?? "empty"}.json`,
        body: JSON.stringify(rows, null, 2)
      };
    }

    return {
      contentType: "text/csv",
      fileName: `invoice-aging-${run?.snapshotAt.slice(0, 10) ?? "empty"}.csv`,
      body: toCsv(
        [
          "invoice_id",
          "invoice_number",
          "customer_account_id",
          "project_id",
          "status",
          "due_at",
          "outstanding_cents",
          "days_past_due",
          "aging_bucket",
          "snapshot_at"
        ],
        rows.map((row) => [
          row.invoiceId,
          row.invoiceNumber,
          row.customerAccountId,
          row.projectId ?? "",
          row.status,
          row.dueAt,
          row.outstandingCents,
          row.daysPastDue,
          row.agingBucket,
          row.snapshotAt
        ])
      )
    };
  }

  exportBillAging(
    organizationId: string,
    format: ReportExportFormat,
    snapshotRunId?: string
  ): ExportedReportPayload {
    const run = snapshotRunId ? this.getSnapshotRun(snapshotRunId) : this.getLatestSnapshotRun(organizationId);
    const rows = run ? this.listBillAgingSnapshots(run.id) : [];

    if (format === "json") {
      return {
        contentType: "application/json",
        fileName: `bill-aging-${run?.snapshotAt.slice(0, 10) ?? "empty"}.json`,
        body: JSON.stringify(rows, null, 2)
      };
    }

    return {
      contentType: "text/csv",
      fileName: `bill-aging-${run?.snapshotAt.slice(0, 10) ?? "empty"}.csv`,
      body: toCsv(
        [
          "bill_id",
          "bill_number",
          "vendor_id",
          "project_id",
          "status",
          "due_at",
          "outstanding_cents",
          "days_past_due",
          "aging_bucket",
          "snapshot_at"
        ],
        rows.map((row) => [
          row.billId,
          row.billNumber,
          row.vendorId,
          row.projectId ?? "",
          row.status,
          row.dueAt,
          row.outstandingCents,
          row.daysPastDue,
          row.agingBucket,
          row.snapshotAt
        ])
      )
    };
  }
}
