import { AuthorizationError, authorize, authorizeOrThrow } from "../../auth/src/server/index.ts";
import type {
  AuditSink,
  AuthorizationActor,
  AuthorizationDecision,
  ClockEventRecord,
  EmployeePayrollProfileRecord,
  PermissionKey,
  PayrollDocumentRecord,
  PayrollRunRecord,
  ResourceRecord,
  TimeEntryRecord,
  TimesheetRecord
} from "../../types/src/index.ts";

const TIMESHEET_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "timesheet.view.org",
  "timesheet.view.self",
  "payroll.view.org",
  "payroll.view.self"
] as const;

const TIME_ENTRY_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "time.entry.view.org",
  "time.entry.view.self",
  "payroll.view.org",
  "payroll.view.self"
] as const;

const PAYROLL_PROFILE_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "payroll.profile.view.org",
  "payroll.profile.view.self"
] as const;

const PAYROLL_DOCUMENT_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "payroll.document.view.org",
  "payroll.document.view.self"
] as const;

const PAYROLL_RUN_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "payroll.run.view.org",
  "payroll.run.view.self"
] as const;

export function toTimesheetResourceRecord(timesheet: TimesheetRecord): ResourceRecord {
  return {
    resourceType: "timesheet",
    resourceId: timesheet.id,
    orgId: timesheet.organizationId,
    ownerUserId: timesheet.employeeUserId,
    visibility: timesheet.visibilityFlags
  };
}

export function toTimeEntryResourceRecord(entry: TimeEntryRecord): ResourceRecord {
  return {
    resourceType: "time_entry",
    resourceId: entry.id,
    orgId: entry.organizationId,
    ownerUserId: entry.employeeUserId,
    assignedProjectId: entry.projectId ?? null,
    visibility: entry.visibilityFlags
  };
}

export function toClockEventResourceRecord(input: {
  organizationId: string;
  employeeUserId: string;
  projectId?: string;
}): ResourceRecord {
  return {
    resourceType: "clock_event",
    resourceId: "draft-clock-event",
    orgId: input.organizationId,
    ownerUserId: input.employeeUserId,
    assignedProjectId: input.projectId ?? null,
    visibility: ["internal"]
  };
}

export function toPayrollProfileResourceRecord(profile: EmployeePayrollProfileRecord): ResourceRecord {
  return {
    resourceType: "payroll_profile",
    resourceId: profile.id,
    orgId: profile.organizationId,
    ownerUserId: profile.employeeUserId,
    visibility: profile.visibilityFlags
  };
}

export function toPayrollDocumentResourceRecord(document: PayrollDocumentRecord): ResourceRecord {
  return {
    resourceType: "payroll_document",
    resourceId: document.id,
    orgId: document.organizationId,
    ownerUserId: document.employeeUserId,
    visibility: document.visibilityFlags
  };
}

export function toPayrollRunOrgResourceRecord(run: PayrollRunRecord): ResourceRecord {
  return {
    resourceType: "payroll_run",
    resourceId: run.id,
    orgId: run.organizationId,
    visibility: run.visibilityFlags
  };
}

export function toPayrollRunSelfResourceRecord(run: PayrollRunRecord, employeeUserId: string): ResourceRecord {
  return {
    resourceType: "payroll_run",
    resourceId: `${run.id}:${employeeUserId}`,
    orgId: run.organizationId,
    ownerUserId: employeeUserId,
    visibility: run.visibilityFlags
  };
}

async function authorizeAcrossPermissions(
  actor: AuthorizationActor | undefined,
  record: ResourceRecord,
  permissionKeys: readonly PermissionKey[],
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  let lastDecision: AuthorizationDecision | undefined;

  for (const permissionKey of permissionKeys) {
    const decision = await authorize(
      {
        actor,
        permissionKey,
        record,
        now: new Date()
      },
      auditSink
    );

    if (decision.allowed) {
      return decision;
    }

    lastDecision = decision;
  }

  if (!lastDecision) {
    throw new Error("No permission candidates were provided.");
  }

  return lastDecision;
}

export async function authorizeTimesheetView(
  actor: AuthorizationActor | undefined,
  timesheet: TimesheetRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toTimesheetResourceRecord(timesheet), TIMESHEET_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeTimesheetViewOrThrow(
  actor: AuthorizationActor | undefined,
  timesheet: TimesheetRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeTimesheetView(actor, timesheet, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeTimeEntryView(
  actor: AuthorizationActor | undefined,
  entry: TimeEntryRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toTimeEntryResourceRecord(entry), TIME_ENTRY_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizePayrollProfileView(
  actor: AuthorizationActor | undefined,
  profile: EmployeePayrollProfileRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(
    actor,
    toPayrollProfileResourceRecord(profile),
    PAYROLL_PROFILE_VIEW_PERMISSION_CANDIDATES,
    auditSink
  );
}

export async function authorizePayrollDocumentView(
  actor: AuthorizationActor | undefined,
  document: PayrollDocumentRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(
    actor,
    toPayrollDocumentResourceRecord(document),
    PAYROLL_DOCUMENT_VIEW_PERMISSION_CANDIDATES,
    auditSink
  );
}

export async function authorizePayrollRunViewForOrg(
  actor: AuthorizationActor | undefined,
  run: PayrollRunRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toPayrollRunOrgResourceRecord(run), PAYROLL_RUN_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizePayrollRunViewForSelf(
  actor: AuthorizationActor | undefined,
  run: PayrollRunRecord,
  employeeUserId: string,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(
    actor,
    toPayrollRunSelfResourceRecord(run, employeeUserId),
    PAYROLL_RUN_VIEW_PERMISSION_CANDIDATES,
    auditSink
  );
}

export async function authorizeTimeClockOrThrow(
  actor: AuthorizationActor | undefined,
  record: {
    organizationId: string;
    employeeUserId: string;
    projectId?: string;
  },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "time.clock.self",
      record: toClockEventResourceRecord(record),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizeTimesheetSubmitOrThrow(
  actor: AuthorizationActor | undefined,
  timesheet: TimesheetRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "timesheet.submit.self",
      record: toTimesheetResourceRecord(timesheet),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizeTimesheetReviewOrThrow(
  actor: AuthorizationActor | undefined,
  timesheet: TimesheetRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "timesheet.review.org",
      record: toTimesheetResourceRecord(timesheet),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePayrollProfileManageOrThrow(
  actor: AuthorizationActor | undefined,
  record: {
    organizationId: string;
    employeeUserId: string;
  },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "payroll.profile.manage.org",
      record: {
        resourceType: "payroll_profile",
        resourceId: `draft-payroll-profile:${record.employeeUserId}`,
        orgId: record.organizationId,
        ownerUserId: record.employeeUserId,
        visibility: ["internal"]
      },
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePayrollExportOrThrow(
  actor: AuthorizationActor | undefined,
  organizationId: string,
  payPeriodId: string,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "payroll.export.org",
      record: {
        resourceType: "payroll_run",
        resourceId: `export:${payPeriodId}`,
        orgId: organizationId,
        visibility: ["internal"]
      },
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePayrollRunManageOrThrow(
  actor: AuthorizationActor | undefined,
  run: PayrollRunRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "payroll.run.manage.org",
      record: toPayrollRunOrgResourceRecord(run),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePayrollLaborCostViewOrThrow(
  actor: AuthorizationActor | undefined,
  run: PayrollRunRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "payroll.labor_cost.view.org",
      record: toPayrollRunOrgResourceRecord(run),
      now: new Date()
    },
    auditSink
  );
}

export function isClockEventOwnedByUser(event: ClockEventRecord, userId: string): boolean {
  return event.employeeUserId === userId;
}
