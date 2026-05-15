import type {
  PayrollCompensationType,
  PayrollDocumentCategory,
  PayrollPaySchedule,
  PayrollProviderName,
  PayrollRunStatus
} from "../../types/src/index.ts";

export interface UpsertPayrollProfileInput {
  employeeUserId: string;
  workEmail: string;
  legalName: string;
  compensationType: PayrollCompensationType;
  paySchedule: PayrollPaySchedule;
  overtimeEligible: boolean;
  laborCostRateCents: number;
  providerEmployeeId?: string | null;
}

export interface PayrollProviderProfileResult {
  providerEmployeeId: string;
  status: "pending_provider" | "active";
  providerWorkerToken: string;
  providerOnboardingUrl?: string | null;
  maskedTaxId?: string | null;
  bankAccountLast4?: string | null;
}

export interface PayrollProviderExportEntryInput {
  timeEntryId: string;
  employeeUserId: string;
  workDate: string;
  minutesWorked: number;
  projectId?: string;
  taskId?: string;
  laborCostRateCents: number;
}

export interface CreatePayrollRunInput {
  payPeriodId: string;
  periodStart: string;
  periodEnd: string;
  payDate?: string;
  entries: readonly PayrollProviderExportEntryInput[];
}

export interface PayrollProviderRunLineItem {
  timeEntryId: string;
  employeeUserId: string;
  projectId?: string;
  taskId?: string;
  minutesWorked: number;
  laborCostCents: number;
}

export interface PayrollProviderDocumentSummary {
  employeeUserId: string;
  category: PayrollDocumentCategory;
  title: string;
  fileName: string;
  externalDocumentId: string;
  downloadUrl: string;
  issuedAt: string;
}

export interface PayrollProviderRunSnapshot {
  providerRunId: string;
  status: PayrollRunStatus;
  totalLaborCostCents: number;
  lineItems: readonly PayrollProviderRunLineItem[];
  documents: readonly PayrollProviderDocumentSummary[];
  completedAt?: string | null;
  failureReason?: string | null;
}

export interface PayrollProviderAdapter {
  providerName: PayrollProviderName;
  upsertEmployeeProfile(input: UpsertPayrollProfileInput): Promise<PayrollProviderProfileResult> | PayrollProviderProfileResult;
  createPayrollRun(input: CreatePayrollRunInput): Promise<PayrollProviderRunSnapshot> | PayrollProviderRunSnapshot;
  getPayrollRunStatus(providerRunId: string): Promise<PayrollProviderRunSnapshot> | PayrollProviderRunSnapshot;
}

export class MemoryEmbeddedPayrollProvider implements PayrollProviderAdapter {
  readonly providerName: PayrollProviderName = "embedded_payroll";
  private readonly now: () => Date;
  private readonly profiles = new Map<string, PayrollProviderProfileResult>();
  private readonly runs = new Map<string, PayrollProviderRunSnapshot>();
  private profileCounter = 0;
  private runCounter = 0;

  constructor(now?: () => Date) {
    this.now = now ?? (() => new Date());
  }

  upsertEmployeeProfile(input: UpsertPayrollProfileInput): PayrollProviderProfileResult {
    if (input.providerEmployeeId) {
      const existing = this.profiles.get(input.providerEmployeeId);

      if (existing) {
        const updated: PayrollProviderProfileResult = {
          ...existing,
          status: "active"
        };
        this.profiles.set(input.providerEmployeeId, updated);
        return updated;
      }

      const restored: PayrollProviderProfileResult = {
        providerEmployeeId: input.providerEmployeeId,
        status: "active",
        providerWorkerToken: `wrk_tok_${input.providerEmployeeId}`,
        providerOnboardingUrl: `https://embedded-payroll.local/onboarding/${input.providerEmployeeId}`,
        maskedTaxId: "***-**-9999",
        bankAccountLast4: "9999"
      };
      this.profiles.set(input.providerEmployeeId, restored);
      return restored;
    }

    this.profileCounter += 1;
    const providerEmployeeId = input.providerEmployeeId ?? `worker_${this.profileCounter}`;
    const result: PayrollProviderProfileResult = {
      providerEmployeeId,
      status: "pending_provider",
      providerWorkerToken: `wrk_tok_${providerEmployeeId}`,
      providerOnboardingUrl: `https://embedded-payroll.local/onboarding/${providerEmployeeId}`,
      maskedTaxId: `***-**-${String(1000 + this.profileCounter).slice(-4)}`,
      bankAccountLast4: String(2000 + this.profileCounter).slice(-4)
    };
    this.profiles.set(providerEmployeeId, result);
    return result;
  }

  createPayrollRun(input: CreatePayrollRunInput): PayrollProviderRunSnapshot {
    this.runCounter += 1;
    const providerRunId = `payrun_${this.runCounter}`;
    const lineItems = input.entries.map((entry) => ({
      timeEntryId: entry.timeEntryId,
      employeeUserId: entry.employeeUserId,
      projectId: entry.projectId,
      taskId: entry.taskId,
      minutesWorked: entry.minutesWorked,
      laborCostCents: Math.round((entry.minutesWorked * entry.laborCostRateCents) / 60)
    }));
    const snapshot: PayrollProviderRunSnapshot = {
      providerRunId,
      status: "submitted",
      totalLaborCostCents: lineItems.reduce((sum, item) => sum + item.laborCostCents, 0),
      lineItems,
      documents: []
    };
    this.runs.set(providerRunId, snapshot);
    return snapshot;
  }

  getPayrollRunStatus(providerRunId: string): PayrollProviderRunSnapshot {
    const run = this.runs.get(providerRunId);

    if (!run) {
      throw new Error(`Payroll run ${providerRunId} was not found.`);
    }

    return run;
  }

  setRunStatus(
    providerRunId: string,
    status: PayrollRunStatus,
    options?: {
      failureReason?: string | null;
      documents?: readonly PayrollProviderDocumentSummary[];
    }
  ): PayrollProviderRunSnapshot {
    const existing = this.getPayrollRunStatus(providerRunId);
    const snapshot: PayrollProviderRunSnapshot = {
      ...existing,
      status,
      completedAt: status === "completed" ? this.now().toISOString() : null,
      failureReason: status === "failed" ? options?.failureReason ?? "Provider run failed." : null,
      documents:
        status === "completed"
          ? [
              ...new Map(
                (options?.documents ??
                  [...new Set(existing.lineItems.map((item) => item.employeeUserId))].map((employeeUserId) => ({
                    employeeUserId,
                    category: "paystub" as const,
                    title: `Paystub for ${providerRunId}`,
                    fileName: `${employeeUserId}-${providerRunId}.pdf`,
                    externalDocumentId: `doc_${providerRunId}_${employeeUserId}`,
                    downloadUrl: `https://embedded-payroll.local/documents/${providerRunId}/${employeeUserId}`,
                    issuedAt: this.now().toISOString()
                  }))).map((document) => [`${document.employeeUserId}:${document.externalDocumentId}`, document])
              ).values()
            ]
          : existing.documents
    };
    this.runs.set(providerRunId, snapshot);
    return snapshot;
  }
}
