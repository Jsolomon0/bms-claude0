import type {
  BillAgingSnapshotRecord,
  InvoiceAgingSnapshotRecord,
  ProjectProfitabilitySnapshotRecord,
  ReportingRepository,
  ReportingSnapshotRunRecord
} from "../../types/src/index.ts";

export class InMemoryReportingRepository implements ReportingRepository {
  private readonly snapshotRuns = new Map<string, ReportingSnapshotRunRecord>();
  private readonly projectProfitabilitySnapshots = new Map<string, ProjectProfitabilitySnapshotRecord[]>();
  private readonly invoiceAgingSnapshots = new Map<string, InvoiceAgingSnapshotRecord[]>();
  private readonly billAgingSnapshots = new Map<string, BillAgingSnapshotRecord[]>();

  constructor(seed?: {
    snapshotRuns?: readonly ReportingSnapshotRunRecord[];
    projectProfitabilitySnapshots?: readonly ProjectProfitabilitySnapshotRecord[];
    invoiceAgingSnapshots?: readonly InvoiceAgingSnapshotRecord[];
    billAgingSnapshots?: readonly BillAgingSnapshotRecord[];
  }) {
    seed?.snapshotRuns?.forEach((run) => {
      this.snapshotRuns.set(run.id, run);
    });
    seed?.projectProfitabilitySnapshots?.forEach((record) => {
      const current = this.projectProfitabilitySnapshots.get(record.snapshotRunId) ?? [];
      this.projectProfitabilitySnapshots.set(record.snapshotRunId, [...current, record]);
    });
    seed?.invoiceAgingSnapshots?.forEach((record) => {
      const current = this.invoiceAgingSnapshots.get(record.snapshotRunId) ?? [];
      this.invoiceAgingSnapshots.set(record.snapshotRunId, [...current, record]);
    });
    seed?.billAgingSnapshots?.forEach((record) => {
      const current = this.billAgingSnapshots.get(record.snapshotRunId) ?? [];
      this.billAgingSnapshots.set(record.snapshotRunId, [...current, record]);
    });
  }

  createSnapshotRun(run: ReportingSnapshotRunRecord): void {
    this.snapshotRuns.set(run.id, run);
  }

  getSnapshotRunById(snapshotRunId: string): ReportingSnapshotRunRecord | undefined {
    return this.snapshotRuns.get(snapshotRunId);
  }

  findLatestSnapshotRunByOrganizationId(organizationId: string): ReportingSnapshotRunRecord | undefined {
    return this.listSnapshotRunsByOrganizationId(organizationId)[0];
  }

  listSnapshotRunsByOrganizationId(organizationId: string): readonly ReportingSnapshotRunRecord[] {
    return [...this.snapshotRuns.values()]
      .filter((run) => run.organizationId === organizationId)
      .sort((left, right) => right.snapshotAt.localeCompare(left.snapshotAt));
  }

  createProjectProfitabilitySnapshots(records: readonly ProjectProfitabilitySnapshotRecord[]): void {
    if (records.length === 0) {
      return;
    }

    const snapshotRunId = records[0].snapshotRunId;
    this.projectProfitabilitySnapshots.set(snapshotRunId, [...records]);
  }

  listProjectProfitabilitySnapshotsByRunId(snapshotRunId: string): readonly ProjectProfitabilitySnapshotRecord[] {
    return [...(this.projectProfitabilitySnapshots.get(snapshotRunId) ?? [])].sort(
      (left, right) => right.revenueInvoicedCents - left.revenueInvoicedCents
    );
  }

  createInvoiceAgingSnapshots(records: readonly InvoiceAgingSnapshotRecord[]): void {
    if (records.length === 0) {
      return;
    }

    const snapshotRunId = records[0].snapshotRunId;
    this.invoiceAgingSnapshots.set(snapshotRunId, [...records]);
  }

  listInvoiceAgingSnapshotsByRunId(snapshotRunId: string): readonly InvoiceAgingSnapshotRecord[] {
    return [...(this.invoiceAgingSnapshots.get(snapshotRunId) ?? [])].sort(
      (left, right) => right.outstandingCents - left.outstandingCents
    );
  }

  createBillAgingSnapshots(records: readonly BillAgingSnapshotRecord[]): void {
    if (records.length === 0) {
      return;
    }

    const snapshotRunId = records[0].snapshotRunId;
    this.billAgingSnapshots.set(snapshotRunId, [...records]);
  }

  listBillAgingSnapshotsByRunId(snapshotRunId: string): readonly BillAgingSnapshotRecord[] {
    return [...(this.billAgingSnapshots.get(snapshotRunId) ?? [])].sort(
      (left, right) => right.outstandingCents - left.outstandingCents
    );
  }
}
