import { type VisibilityFlag } from "./authz.ts";

export const PAY_PERIOD_STATUSES = ["open", "closed", "processing", "paid"] as const;

export type PayPeriodStatus = (typeof PAY_PERIOD_STATUSES)[number];

export const TIMESHEET_STATUSES = ["open", "submitted", "approved", "rejected", "locked"] as const;

export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const TIME_ENTRY_STATUSES = ["draft", "submitted", "approved", "rejected", "paid"] as const;

export type TimeEntryStatus = (typeof TIME_ENTRY_STATUSES)[number];

export const CLOCK_EVENT_TYPES = ["clock_in", "clock_out", "break_start", "break_end", "manual_adjustment"] as const;

export type ClockEventType = (typeof CLOCK_EVENT_TYPES)[number];

export const CLOCK_EVENT_SOURCES = ["web", "mobile", "kiosk", "system"] as const;

export type ClockEventSource = (typeof CLOCK_EVENT_SOURCES)[number];

export const PAYROLL_EXPORT_STATES = ["not_ready", "ready", "exporting", "exported", "failed"] as const;

export type PayrollExportState = (typeof PAYROLL_EXPORT_STATES)[number];

export const PAYROLL_PROVIDER_NAMES = ["embedded_payroll"] as const;

export type PayrollProviderName = (typeof PAYROLL_PROVIDER_NAMES)[number];

export const PAYROLL_PROFILE_STATUSES = [
  "draft",
  "pending_provider",
  "active",
  "offboarded",
  "sync_failed"
] as const;

export type PayrollProfileStatus = (typeof PAYROLL_PROFILE_STATUSES)[number];

export const PAYROLL_COMPENSATION_TYPES = ["hourly", "salary"] as const;

export type PayrollCompensationType = (typeof PAYROLL_COMPENSATION_TYPES)[number];

export const PAYROLL_PAY_SCHEDULES = ["weekly", "biweekly", "semimonthly", "monthly"] as const;

export type PayrollPaySchedule = (typeof PAYROLL_PAY_SCHEDULES)[number];

export const PAYROLL_RUN_STATUSES = [
  "draft",
  "queued",
  "submitted",
  "processing",
  "completed",
  "failed",
  "canceled"
] as const;

export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_DOCUMENT_CATEGORIES = ["paystub", "tax_form", "provider_notice"] as const;

export type PayrollDocumentCategory = (typeof PAYROLL_DOCUMENT_CATEGORIES)[number];

export const TIMESHEET_AUDIT_ACTIONS = ["submitted", "approved", "rejected"] as const;

export type TimesheetAuditAction = (typeof TIMESHEET_AUDIT_ACTIONS)[number];

export const PAYROLL_RUN_AUDIT_ACTIONS = ["export_started", "status_synced", "completed", "failed"] as const;

export type PayrollRunAuditAction = (typeof PAYROLL_RUN_AUDIT_ACTIONS)[number];

export interface PayPeriodRecord {
  id: string;
  organizationId: string;
  status: PayPeriodStatus;
  periodStart: string;
  periodEnd: string;
  payDate?: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdByUserId: string;
  closedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClockEventRecord {
  id: string;
  organizationId: string;
  employeeUserId: string;
  projectId?: string;
  taskId?: string;
  eventType: ClockEventType;
  eventSource: ClockEventSource;
  occurredAt: string;
  notes?: string;
  recordedByUserId: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
}

export interface TimeEntryRecord {
  id: string;
  organizationId: string;
  employeeUserId: string;
  payPeriodId: string;
  timesheetId: string;
  projectId?: string;
  taskId?: string;
  clockInEventId?: string | null;
  clockOutEventId?: string | null;
  status: TimeEntryStatus;
  workDate: string;
  startedAt: string;
  endedAt: string;
  breakMinutes: number;
  minutesWorked: number;
  notes?: string;
  visibilityFlags: readonly VisibilityFlag[];
  payrollExportState: PayrollExportState;
  externalPayrollReference?: string | null;
  submittedByUserId?: string | null;
  approvedByUserId?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetRecord {
  id: string;
  organizationId: string;
  employeeUserId: string;
  payPeriodId: string;
  status: TimesheetStatus;
  totalMinutes: number;
  visibilityFlags: readonly VisibilityFlag[];
  payrollExportState: PayrollExportState;
  externalPayrollReference?: string | null;
  submittedByUserId?: string | null;
  approvedByUserId?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetAuditRecord {
  id: string;
  timesheetId: string;
  action: TimesheetAuditAction;
  actorUserId: string;
  occurredAt: string;
  snapshot: {
    status: TimesheetStatus;
    totalMinutes: number;
    payrollExportState: PayrollExportState;
    rejectionReason?: string | null;
    timeEntryIds: readonly string[];
  };
}

export interface EmployeePayrollProfileRecord {
  id: string;
  organizationId: string;
  employeeUserId: string;
  providerName: PayrollProviderName;
  providerEmployeeId?: string | null;
  workEmail: string;
  legalName: string;
  status: PayrollProfileStatus;
  compensationType: PayrollCompensationType;
  paySchedule: PayrollPaySchedule;
  overtimeEligible: boolean;
  visibilityFlags: readonly VisibilityFlag[];
  createdByUserId: string;
  updatedByUserId: string;
  onboardedAt?: string | null;
  offboardedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayrollSensitiveProfileRecord {
  id: string;
  profileId: string;
  providerWorkerToken: string;
  providerOnboardingUrl?: string | null;
  maskedTaxId?: string | null;
  bankAccountLast4?: string | null;
  laborCostRateCents: number;
  updatedByUserId: string;
  updatedAt: string;
}

export interface PayrollRunRecord {
  id: string;
  organizationId: string;
  payPeriodId: string;
  providerName: PayrollProviderName;
  providerRunId?: string | null;
  status: PayrollRunStatus;
  approvedTimesheetCount: number;
  approvedTimeEntryCount: number;
  totalMinutes: number;
  totalLaborCostCents: number;
  failureReason?: string | null;
  visibilityFlags: readonly VisibilityFlag[];
  createdByUserId: string;
  submittedAt?: string | null;
  syncedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollDocumentRecord {
  id: string;
  organizationId: string;
  employeeUserId: string;
  payrollRunId?: string | null;
  providerName: PayrollProviderName;
  category: PayrollDocumentCategory;
  title: string;
  fileName: string;
  externalDocumentId: string;
  downloadUrl: string;
  issuedAt: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
}

export interface PayrollLaborCostAllocationRecord {
  id: string;
  organizationId: string;
  payrollRunId: string;
  payPeriodId: string;
  employeeUserId: string;
  timeEntryId: string;
  projectId?: string;
  taskId?: string;
  minutesWorked: number;
  laborCostCents: number;
  createdAt: string;
}

export interface PayrollRunAuditRecord {
  id: string;
  payrollRunId: string;
  action: PayrollRunAuditAction;
  actorUserId: string;
  fromStatus?: PayrollRunStatus | null;
  toStatus: PayrollRunStatus;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActiveClockSession {
  employeeUserId: string;
  organizationId: string;
  clockInEvent: ClockEventRecord;
  projectId?: string;
  taskId?: string;
  breakMinutesAccumulated: number;
  activeBreakStartedAt?: string;
  workedMinutesSoFar: number;
}

export interface TimesheetDetail {
  payPeriod?: PayPeriodRecord;
  timesheet?: TimesheetRecord;
  timeEntries: readonly TimeEntryRecord[];
  clockEvents: readonly ClockEventRecord[];
  auditRecords: readonly TimesheetAuditRecord[];
}

export interface PayrollRunDetail {
  payPeriod?: PayPeriodRecord;
  payrollRun?: PayrollRunRecord;
  timeEntries: readonly TimeEntryRecord[];
  laborCostAllocations: readonly PayrollLaborCostAllocationRecord[];
  documents: readonly PayrollDocumentRecord[];
  auditRecords: readonly PayrollRunAuditRecord[];
}

export interface PayrollRepository {
  createPayPeriod(payPeriod: PayPeriodRecord): void;
  updatePayPeriod(payPeriod: PayPeriodRecord): void;
  getPayPeriodById(payPeriodId: string): PayPeriodRecord | undefined;
  listPayPeriods(): readonly PayPeriodRecord[];
  createTimesheet(timesheet: TimesheetRecord): void;
  updateTimesheet(timesheet: TimesheetRecord): void;
  getTimesheetById(timesheetId: string): TimesheetRecord | undefined;
  findTimesheetByEmployeeAndPayPeriod(employeeUserId: string, payPeriodId: string): TimesheetRecord | undefined;
  listTimesheets(): readonly TimesheetRecord[];
  createClockEvent(clockEvent: ClockEventRecord): void;
  listClockEvents(): readonly ClockEventRecord[];
  listClockEventsByEmployeeUserId(employeeUserId: string): readonly ClockEventRecord[];
  createTimeEntry(timeEntry: TimeEntryRecord): void;
  updateTimeEntry(timeEntry: TimeEntryRecord): void;
  getTimeEntryById(timeEntryId: string): TimeEntryRecord | undefined;
  listTimeEntries(): readonly TimeEntryRecord[];
  listTimeEntriesByEmployeeUserId(employeeUserId: string): readonly TimeEntryRecord[];
  listTimeEntriesByTimesheetId(timesheetId: string): readonly TimeEntryRecord[];
  listTimeEntriesByPayPeriodId(payPeriodId: string): readonly TimeEntryRecord[];
  createTimesheetAuditRecord(record: TimesheetAuditRecord): void;
  listTimesheetAuditRecordsByTimesheetId(timesheetId: string): readonly TimesheetAuditRecord[];
  createEmployeePayrollProfile(profile: EmployeePayrollProfileRecord): void;
  updateEmployeePayrollProfile(profile: EmployeePayrollProfileRecord): void;
  getEmployeePayrollProfileById(profileId: string): EmployeePayrollProfileRecord | undefined;
  getEmployeePayrollProfileByEmployeeUserId(employeeUserId: string): EmployeePayrollProfileRecord | undefined;
  listEmployeePayrollProfiles(): readonly EmployeePayrollProfileRecord[];
  createEmployeePayrollSensitiveProfile(record: EmployeePayrollSensitiveProfileRecord): void;
  updateEmployeePayrollSensitiveProfile(record: EmployeePayrollSensitiveProfileRecord): void;
  getEmployeePayrollSensitiveProfileByProfileId(profileId: string): EmployeePayrollSensitiveProfileRecord | undefined;
  createPayrollRun(record: PayrollRunRecord): void;
  updatePayrollRun(record: PayrollRunRecord): void;
  getPayrollRunById(payrollRunId: string): PayrollRunRecord | undefined;
  findPayrollRunByProviderRunId(providerRunId: string): PayrollRunRecord | undefined;
  listPayrollRuns(): readonly PayrollRunRecord[];
  createPayrollRunAuditRecord(record: PayrollRunAuditRecord): void;
  listPayrollRunAuditRecordsByRunId(payrollRunId: string): readonly PayrollRunAuditRecord[];
  createPayrollDocument(record: PayrollDocumentRecord): void;
  listPayrollDocuments(): readonly PayrollDocumentRecord[];
  listPayrollDocumentsByEmployeeUserId(employeeUserId: string): readonly PayrollDocumentRecord[];
  createPayrollLaborCostAllocation(record: PayrollLaborCostAllocationRecord): void;
  replacePayrollLaborCostAllocationsForRun(
    payrollRunId: string,
    records: readonly PayrollLaborCostAllocationRecord[]
  ): void;
  listPayrollLaborCostAllocations(): readonly PayrollLaborCostAllocationRecord[];
  listPayrollLaborCostAllocationsByRunId(payrollRunId: string): readonly PayrollLaborCostAllocationRecord[];
}
