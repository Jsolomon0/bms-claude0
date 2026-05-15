import { AuthorizationError, authorize } from "../../auth/src/server/index.ts";
import type {
  ActiveClockSession,
  AuthorizationActor,
  EmployeePayrollProfileRecord,
  PayrollDocumentRecord,
  PayrollLaborCostAllocationRecord,
  PayrollRunDetail,
  PayrollRunRecord,
  TimeEntryRecord,
  TimesheetDetail,
  TimesheetRecord
} from "../../types/src/index.ts";
import {
  authorizePayrollDocumentView,
  authorizePayrollExportOrThrow,
  authorizePayrollLaborCostViewOrThrow,
  authorizePayrollProfileManageOrThrow,
  authorizePayrollProfileView,
  authorizePayrollRunManageOrThrow,
  authorizePayrollRunViewForOrg,
  authorizePayrollRunViewForSelf,
  authorizeTimeClockOrThrow,
  authorizeTimeEntryView,
  authorizeTimesheetReviewOrThrow,
  authorizeTimesheetSubmitOrThrow,
  authorizeTimesheetView,
  authorizeTimesheetViewOrThrow
} from "./authorization.ts";
import type { PayrollRuntime } from "./runtime.ts";
import type {
  ClockActionInput,
  CreatePayrollExportRunInput,
  ReviewTimesheetInput,
  SubmitTimesheetInput,
  SyncPayrollRunStatusInput,
  UpsertEmployeePayrollProfileInput
} from "./workflow.ts";
import { PayrollWorkflowError } from "./validation.ts";

function actorHasPrivilegedPayrollRole(actor: AuthorizationActor | undefined): boolean {
  if (!actor) {
    return false;
  }

  return actor.memberships.some((membership) => membership.role === "owner" || membership.role === "administrator");
}

function ensureProjectAssignmentIfNeeded(
  actor: AuthorizationActor | undefined,
  input: {
    projectId?: string;
    employeeUserId: string;
  }
): void {
  if (!input.projectId || !actor || actorHasPrivilegedPayrollRole(actor)) {
    return;
  }

  if (actor.userId !== input.employeeUserId) {
    return;
  }

  if (!actor.assignedProjectIds?.includes(input.projectId)) {
    throw new PayrollWorkflowError(`Project ${input.projectId} is not assigned to this actor for self-tracked time.`);
  }
}

function runIncludesEmployee(runtime: PayrollRuntime, run: PayrollRunRecord, employeeUserId: string): boolean {
  const detail = runtime.service.getPayrollRunDetail(run.id);

  return (
    detail.timeEntries.some((entry) => entry.employeeUserId === employeeUserId) ||
    detail.documents.some((document) => document.employeeUserId === employeeUserId)
  );
}

async function actorHasOrgPayrollProfileAccess(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  profile: EmployeePayrollProfileRecord
): Promise<boolean> {
  const orgView = await authorize(
    {
      actor,
      permissionKey: "payroll.profile.view.org",
      record: {
        resourceType: "payroll_profile",
        resourceId: profile.id,
        orgId: profile.organizationId,
        ownerUserId: profile.employeeUserId,
        visibility: profile.visibilityFlags
      },
      now: new Date()
    },
    runtime.auditSink
  );
  const orgManage = await authorize(
    {
      actor,
      permissionKey: "payroll.profile.manage.org",
      record: {
        resourceType: "payroll_profile",
        resourceId: profile.id,
        orgId: profile.organizationId,
        ownerUserId: profile.employeeUserId,
        visibility: profile.visibilityFlags
      },
      now: new Date()
    },
    runtime.auditSink
  );

  return orgView.allowed || orgManage.allowed;
}

export async function listVisibleTimesheetsForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly TimesheetRecord[]> {
  const visible: TimesheetRecord[] = [];

  for (const timesheet of runtime.service.listTimesheets()) {
    const decision = await authorizeTimesheetView(actor, timesheet, runtime.auditSink);

    if (decision.allowed) {
      visible.push(timesheet);
    }
  }

  return visible;
}

export async function listVisibleTimeEntriesForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly TimeEntryRecord[]> {
  const visible: TimeEntryRecord[] = [];

  for (const entry of runtime.service.listTimeEntries()) {
    const decision = await authorizeTimeEntryView(actor, entry, runtime.auditSink);

    if (decision.allowed) {
      visible.push(entry);
    }
  }

  return visible;
}

export async function listOwnTimesheetsForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly TimesheetRecord[]> {
  if (!actor) {
    return [];
  }

  const visible = await listVisibleTimesheetsForActor(runtime, actor);
  return visible.filter((timesheet) => timesheet.employeeUserId === actor.userId);
}

export async function listOwnTimeEntriesForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly TimeEntryRecord[]> {
  if (!actor) {
    return [];
  }

  const visible = await listVisibleTimeEntriesForActor(runtime, actor);
  return visible.filter((entry) => entry.employeeUserId === actor.userId);
}

export async function listReviewQueueForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly TimesheetRecord[]> {
  const visible = await listVisibleTimesheetsForActor(runtime, actor);
  return visible.filter((timesheet) => timesheet.status === "submitted");
}

export async function getTimesheetDetailForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  timesheetId: string
): Promise<TimesheetDetail | undefined> {
  const detail = runtime.service.getTimesheetDetail(timesheetId);

  if (!detail.timesheet) {
    return undefined;
  }

  await authorizeTimesheetViewOrThrow(actor, detail.timesheet, runtime.auditSink);
  return detail;
}

export function getActiveClockSessionForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): ActiveClockSession | undefined {
  if (!actor) {
    return undefined;
  }

  return runtime.service.getActiveClockSession(actor.userId);
}

export async function listVisiblePayrollProfilesForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<
  readonly {
    profile: EmployeePayrollProfileRecord;
    sensitiveSummary: {
      maskedTaxId?: string | null;
      bankAccountLast4?: string | null;
      providerOnboardingUrl?: string | null;
      laborCostRateCents?: number;
    };
  }[]
> {
  const visible: {
    profile: EmployeePayrollProfileRecord;
    sensitiveSummary: {
      maskedTaxId?: string | null;
      bankAccountLast4?: string | null;
      providerOnboardingUrl?: string | null;
      laborCostRateCents?: number;
    };
  }[] = [];

  for (const profile of runtime.service.listEmployeePayrollProfiles()) {
    const decision = await authorizePayrollProfileView(actor, profile, runtime.auditSink);

    if (!decision.allowed) {
      continue;
    }

    const sensitive = runtime.repository.getEmployeePayrollSensitiveProfileByProfileId(profile.id);
    const includeOrgSensitive = await actorHasOrgPayrollProfileAccess(runtime, actor, profile);
    visible.push({
      profile,
      sensitiveSummary: {
        maskedTaxId: sensitive?.maskedTaxId ?? null,
        bankAccountLast4: sensitive?.bankAccountLast4 ?? null,
        providerOnboardingUrl: includeOrgSensitive || actor?.userId === profile.employeeUserId ? sensitive?.providerOnboardingUrl ?? null : null,
        laborCostRateCents: includeOrgSensitive ? sensitive?.laborCostRateCents : undefined
      }
    });
  }

  return visible;
}

export async function getPayrollProfileForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  employeeUserId: string
): Promise<
  | {
      profile: EmployeePayrollProfileRecord;
      sensitiveSummary: {
        maskedTaxId?: string | null;
        bankAccountLast4?: string | null;
        providerOnboardingUrl?: string | null;
        laborCostRateCents?: number;
      };
    }
  | undefined
> {
  const profile = runtime.repository.getEmployeePayrollProfileByEmployeeUserId(employeeUserId);

  if (!profile) {
    return undefined;
  }

  const decision = await authorizePayrollProfileView(actor, profile, runtime.auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  const sensitive = runtime.repository.getEmployeePayrollSensitiveProfileByProfileId(profile.id);
  const includeOrgSensitive = await actorHasOrgPayrollProfileAccess(runtime, actor, profile);

  return {
    profile,
    sensitiveSummary: {
      maskedTaxId: sensitive?.maskedTaxId ?? null,
      bankAccountLast4: sensitive?.bankAccountLast4 ?? null,
      providerOnboardingUrl: includeOrgSensitive || actor?.userId === profile.employeeUserId ? sensitive?.providerOnboardingUrl ?? null : null,
      laborCostRateCents: includeOrgSensitive ? sensitive?.laborCostRateCents : undefined
    }
  };
}

export async function listVisiblePayrollDocumentsForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly PayrollDocumentRecord[]> {
  const visible: PayrollDocumentRecord[] = [];

  for (const document of runtime.service.listPayrollDocuments()) {
    const decision = await authorizePayrollDocumentView(actor, document, runtime.auditSink);

    if (decision.allowed) {
      visible.push(document);
    }
  }

  return visible;
}

export async function listVisiblePayrollRunsForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly PayrollRunRecord[]> {
  const visible: PayrollRunRecord[] = [];

  for (const run of runtime.service.listPayrollRuns()) {
    const orgDecision = await authorizePayrollRunViewForOrg(actor, run, runtime.auditSink);

    if (orgDecision.allowed) {
      visible.push(run);
      continue;
    }

    if (actor && runIncludesEmployee(runtime, run, actor.userId)) {
      const selfDecision = await authorizePayrollRunViewForSelf(actor, run, actor.userId, runtime.auditSink);

      if (selfDecision.allowed) {
        visible.push(run);
      }
    }
  }

  return visible;
}

export async function getPayrollRunDetailForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  payrollRunId: string
): Promise<PayrollRunDetail | undefined> {
  const detail = runtime.service.getPayrollRunDetail(payrollRunId);

  if (!detail.payrollRun) {
    return undefined;
  }

  const orgDecision = await authorizePayrollRunViewForOrg(actor, detail.payrollRun, runtime.auditSink);

  if (orgDecision.allowed) {
    return detail;
  }

  if (actor && runIncludesEmployee(runtime, detail.payrollRun, actor.userId)) {
    const selfDecision = await authorizePayrollRunViewForSelf(actor, detail.payrollRun, actor.userId, runtime.auditSink);

    if (selfDecision.allowed) {
      return {
        payPeriod: detail.payPeriod,
        payrollRun: detail.payrollRun,
        timeEntries: [],
        laborCostAllocations: [],
        documents: detail.documents.filter((document) => document.employeeUserId === actor.userId),
        auditRecords: []
      };
    }

    throw new AuthorizationError(selfDecision);
  }

  throw new AuthorizationError(orgDecision);
}

export async function listPayrollLaborCostAllocationsForActor(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined
): Promise<readonly PayrollLaborCostAllocationRecord[]> {
  const visibleRuns = await listVisiblePayrollRunsForActor(runtime, actor);
  const orgRuns: PayrollRunRecord[] = [];

  for (const run of visibleRuns) {
    try {
      await authorizePayrollLaborCostViewOrThrow(actor, run, runtime.auditSink);
      orgRuns.push(run);
    } catch {
      continue;
    }
  }

  const runIds = new Set(orgRuns.map((run) => run.id));
  return runtime.service.listPayrollLaborCostAllocations().filter((allocation) => runIds.has(allocation.payrollRunId));
}

export async function clockInServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: ClockActionInput
) {
  await authorizeTimeClockOrThrow(actor, input, runtime.auditSink);
  ensureProjectAssignmentIfNeeded(actor, input);
  return runtime.service.clockIn(input);
}

export async function startBreakServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: ClockActionInput
) {
  await authorizeTimeClockOrThrow(actor, input, runtime.auditSink);
  ensureProjectAssignmentIfNeeded(actor, input);
  return runtime.service.startBreak(input);
}

export async function endBreakServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: ClockActionInput
) {
  await authorizeTimeClockOrThrow(actor, input, runtime.auditSink);
  ensureProjectAssignmentIfNeeded(actor, input);
  return runtime.service.endBreak(input);
}

export async function clockOutServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: ClockActionInput
) {
  await authorizeTimeClockOrThrow(actor, input, runtime.auditSink);
  ensureProjectAssignmentIfNeeded(actor, input);
  return runtime.service.clockOut(input);
}

export async function submitTimesheetServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: SubmitTimesheetInput
) {
  const timesheet = runtime.repository.getTimesheetById(input.timesheetId);

  if (!timesheet) {
    throw new PayrollWorkflowError(`Timesheet ${input.timesheetId} was not found.`);
  }

  await authorizeTimesheetSubmitOrThrow(actor, timesheet, runtime.auditSink);
  return runtime.service.submitTimesheet(input);
}

export async function reviewTimesheetServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: ReviewTimesheetInput
) {
  const timesheet = runtime.repository.getTimesheetById(input.timesheetId);

  if (!timesheet) {
    throw new PayrollWorkflowError(`Timesheet ${input.timesheetId} was not found.`);
  }

  await authorizeTimesheetReviewOrThrow(actor, timesheet, runtime.auditSink);
  return runtime.service.reviewTimesheet(input);
}

export async function upsertEmployeePayrollProfileServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: UpsertEmployeePayrollProfileInput
) {
  await authorizePayrollProfileManageOrThrow(
    actor,
    {
      organizationId: input.organizationId,
      employeeUserId: input.employeeUserId
    },
    runtime.auditSink
  );
  return runtime.service.upsertEmployeePayrollProfile(input);
}

export async function createPayrollExportRunServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: CreatePayrollExportRunInput & {
    approvalId?: string;
  }
) {
  const payPeriod = runtime.repository.getPayPeriodById(input.payPeriodId);

  if (!payPeriod) {
    throw new PayrollWorkflowError(`Pay period ${input.payPeriodId} was not found.`);
  }

  await authorizePayrollExportOrThrow(actor, payPeriod.organizationId, payPeriod.id, runtime.auditSink);
  await runtime.security.approvals.assertApproved({
    approvalId: input.approvalId,
    actionKey: "payroll.export",
    actorUserId: input.actorUserId,
    resourceType: "pay_period",
    resourceId: payPeriod.id,
    now: new Date()
  });
  return runtime.service.createPayrollExportRun(input);
}

export async function syncPayrollRunStatusServer(
  runtime: PayrollRuntime,
  actor: AuthorizationActor | undefined,
  input: SyncPayrollRunStatusInput
) {
  const run = runtime.repository.getPayrollRunById(input.payrollRunId);

  if (!run) {
    throw new PayrollWorkflowError(`Payroll run ${input.payrollRunId} was not found.`);
  }

  await authorizePayrollRunManageOrThrow(actor, run, runtime.auditSink);
  return runtime.service.syncPayrollRunStatus(input);
}
