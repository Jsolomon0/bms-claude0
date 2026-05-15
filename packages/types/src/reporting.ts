import type { ProtectedRouteRequest, ProtectedRouteResponse, VisibilityFlag } from "./authz.ts";
import type { BillStatus, InvoiceStatus } from "./finance.ts";
import type { ProjectStatus } from "./project-management.ts";

export const REPORT_EXPORT_FORMATS = ["csv", "json"] as const;

export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export const AGING_BUCKET_KEYS = ["current", "days_1_30", "days_31_60", "days_61_90", "days_91_plus"] as const;

export type AgingBucketKey = (typeof AGING_BUCKET_KEYS)[number];

export interface ReportingSnapshotRunRecord {
  id: string;
  organizationId: string;
  snapshotAt: string;
  generatedByUserId: string;
  createdAt: string;
}

export interface ProjectProfitabilitySnapshotRecord {
  id: string;
  snapshotRunId: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  currency: string;
  revenueInvoicedCents: number;
  revenueCollectedCents: number;
  laborCostCents: number;
  materialCostCents: number;
  subcontractorCostCents: number;
  expenseCostCents: number;
  committedCostCents: number;
  openCommitmentCents: number;
  totalCostCents: number;
  grossMarginCents: number;
  grossMarginPercent: number;
  invoiceCount: number;
  payrollAllocationCount: number;
  billCount: number;
  expenseCount: number;
  purchaseOrderCount: number;
  snapshotAt: string;
}

export interface InvoiceAgingSnapshotRecord {
  id: string;
  snapshotRunId: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerAccountId: string;
  projectId?: string;
  status: InvoiceStatus;
  currency: string;
  dueAt: string;
  totalCents: number;
  collectedCents: number;
  outstandingCents: number;
  daysPastDue: number;
  agingBucket: AgingBucketKey;
  snapshotAt: string;
}

export interface BillAgingSnapshotRecord {
  id: string;
  snapshotRunId: string;
  organizationId: string;
  billId: string;
  billNumber: string;
  vendorId: string;
  projectId?: string;
  status: BillStatus;
  currency: string;
  dueAt: string;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  daysPastDue: number;
  agingBucket: AgingBucketKey;
  snapshotAt: string;
}

export interface AgingBucketSummary {
  bucket: AgingBucketKey;
  count: number;
  totalOutstandingCents: number;
}

export interface ReportingRepository {
  createSnapshotRun(run: ReportingSnapshotRunRecord): void;
  getSnapshotRunById(snapshotRunId: string): ReportingSnapshotRunRecord | undefined;
  findLatestSnapshotRunByOrganizationId(organizationId: string): ReportingSnapshotRunRecord | undefined;
  listSnapshotRunsByOrganizationId(organizationId: string): readonly ReportingSnapshotRunRecord[];
  createProjectProfitabilitySnapshots(records: readonly ProjectProfitabilitySnapshotRecord[]): void;
  listProjectProfitabilitySnapshotsByRunId(snapshotRunId: string): readonly ProjectProfitabilitySnapshotRecord[];
  createInvoiceAgingSnapshots(records: readonly InvoiceAgingSnapshotRecord[]): void;
  listInvoiceAgingSnapshotsByRunId(snapshotRunId: string): readonly InvoiceAgingSnapshotRecord[];
  createBillAgingSnapshots(records: readonly BillAgingSnapshotRecord[]): void;
  listBillAgingSnapshotsByRunId(snapshotRunId: string): readonly BillAgingSnapshotRecord[];
}

export interface ExportedReportPayload {
  contentType: "text/csv" | "application/json";
  fileName: string;
  body: string;
}

export interface ReportingExportRouteRequest extends ProtectedRouteRequest {
  organizationId: string;
  snapshotRunId?: string;
  format?: ReportExportFormat;
}

export type ReportingExportRouteResponse = ProtectedRouteResponse<
  ExportedReportPayload | { error: string; reason: string }
>;

export interface ReportingResourceRecord {
  resourceType: "report";
  resourceId: string;
  orgId: string;
  visibility: readonly VisibilityFlag[];
}
