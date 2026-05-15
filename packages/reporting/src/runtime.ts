import type { AuditEvent, AuditSink, VendorRecord } from "../../types/src/index.ts";
import {
  DEMO_BILL_LINE_ITEMS,
  DEMO_BILLS,
  DEMO_EXPENSES,
  DEMO_PURCHASE_ORDERS,
  DEMO_VENDORS
} from "../../payments/src/operations-fixtures.ts";
import { InMemoryFinanceOperationsRepository } from "../../payments/src/operations-repository.ts";
import { InMemoryInvoiceRepository } from "../../payments/src/repository.ts";
import {
  DEMO_PAY_PERIODS,
  DEMO_PAYROLL_LABOR_COST_ALLOCATIONS,
  DEMO_PAYROLL_RUNS
} from "../../payroll/src/fixtures.ts";
import { InMemoryPayrollRepository } from "../../payroll/src/repository.ts";
import { DEMO_PROJECTS } from "../../projects/src/fixtures.ts";
import { InMemoryProjectRepository } from "../../projects/src/repository.ts";
import {
  REPORTING_DEMO_INVOICE_LINE_ITEMS,
  REPORTING_DEMO_INVOICES,
  REPORTING_DEMO_PAYMENTS,
  REPORTING_SUPPLEMENTAL_BILLS,
  REPORTING_SUPPLEMENTAL_BILL_LINE_ITEMS,
  REPORTING_SUPPLEMENTAL_EXPENSES,
  REPORTING_SUPPLEMENTAL_PAY_PERIODS,
  REPORTING_SUPPLEMENTAL_PAYROLL_LABOR_COST_ALLOCATIONS,
  REPORTING_SUPPLEMENTAL_PAYROLL_RUNS
} from "./fixtures.ts";
import { InMemoryReportingRepository } from "./repository.ts";
import { ReportingService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface ReportingRuntime {
  projectRepository: InMemoryProjectRepository;
  financeRepository: InMemoryFinanceOperationsRepository;
  invoiceRepository: InMemoryInvoiceRepository;
  payrollRepository: InMemoryPayrollRepository;
  reportingRepository: InMemoryReportingRepository;
  reportingService: ReportingService;
  auditSink: MemoryAuditSink;
}

function createReportingVendors(): readonly VendorRecord[] {
  return DEMO_VENDORS.map((vendor) =>
    vendor.id === "vendor-demo-2"
      ? {
          ...vendor,
          linkedOrganizationId: "partner-east"
        }
      : vendor
  );
}

function createRuntime(): ReportingRuntime {
  let counter = 6000;
  const projectRepository = new InMemoryProjectRepository({
    projects: DEMO_PROJECTS
  });
  const financeRepository = new InMemoryFinanceOperationsRepository({
    vendors: createReportingVendors(),
    expenses: [...DEMO_EXPENSES, ...REPORTING_SUPPLEMENTAL_EXPENSES],
    purchaseOrders: DEMO_PURCHASE_ORDERS,
    purchaseOrderLineItems: [],
    bills: [...DEMO_BILLS, ...REPORTING_SUPPLEMENTAL_BILLS],
    billLineItems: [...DEMO_BILL_LINE_ITEMS, ...REPORTING_SUPPLEMENTAL_BILL_LINE_ITEMS]
  });
  const invoiceRepository = new InMemoryInvoiceRepository({
    invoices: REPORTING_DEMO_INVOICES,
    lineItems: REPORTING_DEMO_INVOICE_LINE_ITEMS,
    payments: REPORTING_DEMO_PAYMENTS
  });
  const payrollRepository = new InMemoryPayrollRepository({
    payPeriods: [...DEMO_PAY_PERIODS, ...REPORTING_SUPPLEMENTAL_PAY_PERIODS],
    payrollRuns: [...DEMO_PAYROLL_RUNS, ...REPORTING_SUPPLEMENTAL_PAYROLL_RUNS],
    payrollLaborCostAllocations: [
      ...DEMO_PAYROLL_LABOR_COST_ALLOCATIONS,
      ...REPORTING_SUPPLEMENTAL_PAYROLL_LABOR_COST_ALLOCATIONS
    ]
  });
  const reportingRepository = new InMemoryReportingRepository();
  const auditSink = new MemoryAuditSink();
  const reportingService = new ReportingService({
    reportingRepository,
    rawSources: {
      listProjects: () => projectRepository.listProjects(),
      listVendors: () => financeRepository.listVendors(),
      listExpenses: () => financeRepository.listExpenses(),
      listPurchaseOrders: () => financeRepository.listPurchaseOrders(),
      listBills: () => financeRepository.listBills(),
      listInvoices: () => invoiceRepository.listInvoices(),
      listPaymentsByInvoiceId: (invoiceId: string) => invoiceRepository.listPaymentsByInvoiceId(invoiceId),
      listPayrollLaborCostAllocations: () => payrollRepository.listPayrollLaborCostAllocations()
    },
    now: () => new Date("2026-04-28T16:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  reportingService.generateSnapshot({
    organizationId: "org-hq",
    actorUserId: "alex.owner",
    snapshotAt: "2026-04-28T16:00:00.000Z"
  });

  return {
    projectRepository,
    financeRepository,
    invoiceRepository,
    payrollRepository,
    reportingRepository,
    reportingService,
    auditSink
  };
}

let runtime: ReportingRuntime | undefined;

export function getReportingRuntime(): ReportingRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetReportingRuntime(): ReportingRuntime {
  runtime = createRuntime();
  return runtime;
}
