import type {
  ClockEventRecord,
  EmployeePayrollProfileRecord,
  EmployeePayrollSensitiveProfileRecord,
  PayPeriodRecord,
  PayrollDocumentRecord,
  PayrollLaborCostAllocationRecord,
  PayrollRepository,
  PayrollRunAuditRecord,
  PayrollRunRecord,
  TimeEntryRecord,
  TimesheetAuditRecord,
  TimesheetRecord
} from "../../types/src/index.ts";

export class InMemoryPayrollRepository implements PayrollRepository {
  private readonly payPeriods = new Map<string, PayPeriodRecord>();
  private readonly timesheets = new Map<string, TimesheetRecord>();
  private readonly clockEvents = new Map<string, ClockEventRecord>();
  private readonly timeEntries = new Map<string, TimeEntryRecord>();
  private readonly timesheetAuditRecords = new Map<string, TimesheetAuditRecord[]>();
  private readonly employeePayrollProfiles = new Map<string, EmployeePayrollProfileRecord>();
  private readonly employeePayrollSensitiveProfiles = new Map<string, EmployeePayrollSensitiveProfileRecord>();
  private readonly payrollRuns = new Map<string, PayrollRunRecord>();
  private readonly payrollRunAudits = new Map<string, PayrollRunAuditRecord[]>();
  private readonly payrollDocuments = new Map<string, PayrollDocumentRecord>();
  private readonly payrollLaborCostAllocations = new Map<string, PayrollLaborCostAllocationRecord>();

  constructor(seed?: {
    payPeriods?: readonly PayPeriodRecord[];
    timesheets?: readonly TimesheetRecord[];
    clockEvents?: readonly ClockEventRecord[];
    timeEntries?: readonly TimeEntryRecord[];
    timesheetAuditRecords?: readonly TimesheetAuditRecord[];
    employeePayrollProfiles?: readonly EmployeePayrollProfileRecord[];
    employeePayrollSensitiveProfiles?: readonly EmployeePayrollSensitiveProfileRecord[];
    payrollRuns?: readonly PayrollRunRecord[];
    payrollRunAudits?: readonly PayrollRunAuditRecord[];
    payrollDocuments?: readonly PayrollDocumentRecord[];
    payrollLaborCostAllocations?: readonly PayrollLaborCostAllocationRecord[];
  }) {
    seed?.payPeriods?.forEach((record) => {
      this.payPeriods.set(record.id, record);
    });
    seed?.timesheets?.forEach((record) => {
      this.timesheets.set(record.id, record);
    });
    seed?.clockEvents?.forEach((record) => {
      this.clockEvents.set(record.id, record);
    });
    seed?.timeEntries?.forEach((record) => {
      this.timeEntries.set(record.id, record);
    });
    seed?.timesheetAuditRecords?.forEach((record) => {
      const current = this.timesheetAuditRecords.get(record.timesheetId) ?? [];
      this.timesheetAuditRecords.set(record.timesheetId, [...current, record]);
    });
    seed?.employeePayrollProfiles?.forEach((record) => {
      this.employeePayrollProfiles.set(record.id, record);
    });
    seed?.employeePayrollSensitiveProfiles?.forEach((record) => {
      this.employeePayrollSensitiveProfiles.set(record.profileId, record);
    });
    seed?.payrollRuns?.forEach((record) => {
      this.payrollRuns.set(record.id, record);
    });
    seed?.payrollRunAudits?.forEach((record) => {
      const current = this.payrollRunAudits.get(record.payrollRunId) ?? [];
      this.payrollRunAudits.set(record.payrollRunId, [...current, record]);
    });
    seed?.payrollDocuments?.forEach((record) => {
      this.payrollDocuments.set(record.id, record);
    });
    seed?.payrollLaborCostAllocations?.forEach((record) => {
      this.payrollLaborCostAllocations.set(record.id, record);
    });
  }

  createPayPeriod(payPeriod: PayPeriodRecord): void {
    this.payPeriods.set(payPeriod.id, payPeriod);
  }

  updatePayPeriod(payPeriod: PayPeriodRecord): void {
    this.payPeriods.set(payPeriod.id, payPeriod);
  }

  getPayPeriodById(payPeriodId: string): PayPeriodRecord | undefined {
    return this.payPeriods.get(payPeriodId);
  }

  listPayPeriods(): readonly PayPeriodRecord[] {
    return [...this.payPeriods.values()].sort((left, right) => right.periodStart.localeCompare(left.periodStart));
  }

  createTimesheet(timesheet: TimesheetRecord): void {
    this.timesheets.set(timesheet.id, timesheet);
  }

  updateTimesheet(timesheet: TimesheetRecord): void {
    this.timesheets.set(timesheet.id, timesheet);
  }

  getTimesheetById(timesheetId: string): TimesheetRecord | undefined {
    return this.timesheets.get(timesheetId);
  }

  findTimesheetByEmployeeAndPayPeriod(employeeUserId: string, payPeriodId: string): TimesheetRecord | undefined {
    return [...this.timesheets.values()].find(
      (record) => record.employeeUserId === employeeUserId && record.payPeriodId === payPeriodId
    );
  }

  listTimesheets(): readonly TimesheetRecord[] {
    return [...this.timesheets.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  createClockEvent(clockEvent: ClockEventRecord): void {
    this.clockEvents.set(clockEvent.id, clockEvent);
  }

  listClockEvents(): readonly ClockEventRecord[] {
    return [...this.clockEvents.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }

  listClockEventsByEmployeeUserId(employeeUserId: string): readonly ClockEventRecord[] {
    return [...this.clockEvents.values()]
      .filter((record) => record.employeeUserId === employeeUserId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }

  createTimeEntry(timeEntry: TimeEntryRecord): void {
    this.timeEntries.set(timeEntry.id, timeEntry);
  }

  updateTimeEntry(timeEntry: TimeEntryRecord): void {
    this.timeEntries.set(timeEntry.id, timeEntry);
  }

  getTimeEntryById(timeEntryId: string): TimeEntryRecord | undefined {
    return this.timeEntries.get(timeEntryId);
  }

  listTimeEntries(): readonly TimeEntryRecord[] {
    return [...this.timeEntries.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  listTimeEntriesByEmployeeUserId(employeeUserId: string): readonly TimeEntryRecord[] {
    return [...this.timeEntries.values()]
      .filter((record) => record.employeeUserId === employeeUserId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  listTimeEntriesByTimesheetId(timesheetId: string): readonly TimeEntryRecord[] {
    return [...this.timeEntries.values()]
      .filter((record) => record.timesheetId === timesheetId)
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }

  listTimeEntriesByPayPeriodId(payPeriodId: string): readonly TimeEntryRecord[] {
    return [...this.timeEntries.values()]
      .filter((record) => record.payPeriodId === payPeriodId)
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }

  createTimesheetAuditRecord(record: TimesheetAuditRecord): void {
    const current = this.timesheetAuditRecords.get(record.timesheetId) ?? [];
    this.timesheetAuditRecords.set(record.timesheetId, [...current, record]);
  }

  listTimesheetAuditRecordsByTimesheetId(timesheetId: string): readonly TimesheetAuditRecord[] {
    return [...(this.timesheetAuditRecords.get(timesheetId) ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    );
  }

  createEmployeePayrollProfile(profile: EmployeePayrollProfileRecord): void {
    this.employeePayrollProfiles.set(profile.id, profile);
  }

  updateEmployeePayrollProfile(profile: EmployeePayrollProfileRecord): void {
    this.employeePayrollProfiles.set(profile.id, profile);
  }

  getEmployeePayrollProfileById(profileId: string): EmployeePayrollProfileRecord | undefined {
    return this.employeePayrollProfiles.get(profileId);
  }

  getEmployeePayrollProfileByEmployeeUserId(employeeUserId: string): EmployeePayrollProfileRecord | undefined {
    return [...this.employeePayrollProfiles.values()].find((record) => record.employeeUserId === employeeUserId);
  }

  listEmployeePayrollProfiles(): readonly EmployeePayrollProfileRecord[] {
    return [...this.employeePayrollProfiles.values()].sort((left, right) => left.legalName.localeCompare(right.legalName));
  }

  createEmployeePayrollSensitiveProfile(record: EmployeePayrollSensitiveProfileRecord): void {
    this.employeePayrollSensitiveProfiles.set(record.profileId, record);
  }

  updateEmployeePayrollSensitiveProfile(record: EmployeePayrollSensitiveProfileRecord): void {
    this.employeePayrollSensitiveProfiles.set(record.profileId, record);
  }

  getEmployeePayrollSensitiveProfileByProfileId(profileId: string): EmployeePayrollSensitiveProfileRecord | undefined {
    return this.employeePayrollSensitiveProfiles.get(profileId);
  }

  createPayrollRun(record: PayrollRunRecord): void {
    this.payrollRuns.set(record.id, record);
  }

  updatePayrollRun(record: PayrollRunRecord): void {
    this.payrollRuns.set(record.id, record);
  }

  getPayrollRunById(payrollRunId: string): PayrollRunRecord | undefined {
    return this.payrollRuns.get(payrollRunId);
  }

  findPayrollRunByProviderRunId(providerRunId: string): PayrollRunRecord | undefined {
    return [...this.payrollRuns.values()].find((record) => record.providerRunId === providerRunId);
  }

  listPayrollRuns(): readonly PayrollRunRecord[] {
    return [...this.payrollRuns.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createPayrollRunAuditRecord(record: PayrollRunAuditRecord): void {
    const current = this.payrollRunAudits.get(record.payrollRunId) ?? [];
    this.payrollRunAudits.set(record.payrollRunId, [...current, record]);
  }

  listPayrollRunAuditRecordsByRunId(payrollRunId: string): readonly PayrollRunAuditRecord[] {
    return [...(this.payrollRunAudits.get(payrollRunId) ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    );
  }

  createPayrollDocument(record: PayrollDocumentRecord): void {
    this.payrollDocuments.set(record.id, record);
  }

  listPayrollDocuments(): readonly PayrollDocumentRecord[] {
    return [...this.payrollDocuments.values()].sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  }

  listPayrollDocumentsByEmployeeUserId(employeeUserId: string): readonly PayrollDocumentRecord[] {
    return [...this.payrollDocuments.values()]
      .filter((record) => record.employeeUserId === employeeUserId)
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));
  }

  createPayrollLaborCostAllocation(record: PayrollLaborCostAllocationRecord): void {
    this.payrollLaborCostAllocations.set(record.id, record);
  }

  replacePayrollLaborCostAllocationsForRun(
    payrollRunId: string,
    records: readonly PayrollLaborCostAllocationRecord[]
  ): void {
    for (const [allocationId, allocation] of this.payrollLaborCostAllocations.entries()) {
      if (allocation.payrollRunId === payrollRunId) {
        this.payrollLaborCostAllocations.delete(allocationId);
      }
    }

    records.forEach((record) => {
      this.payrollLaborCostAllocations.set(record.id, record);
    });
  }

  listPayrollLaborCostAllocations(): readonly PayrollLaborCostAllocationRecord[] {
    return [...this.payrollLaborCostAllocations.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  listPayrollLaborCostAllocationsByRunId(payrollRunId: string): readonly PayrollLaborCostAllocationRecord[] {
    return [...this.payrollLaborCostAllocations.values()]
      .filter((record) => record.payrollRunId === payrollRunId)
      .sort((left, right) => left.projectId?.localeCompare(right.projectId ?? "") ?? 0);
  }
}
