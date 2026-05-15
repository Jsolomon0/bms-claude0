import {
  getActiveClockSessionForActor,
  getPayrollProfileForActor,
  getPayrollRuntime,
  getTimesheetDetailForActor,
  listOwnTimeEntriesForActor,
  listOwnTimesheetsForActor,
  listPayrollLaborCostAllocationsForActor,
  listReviewQueueForActor,
  listVisiblePayrollDocumentsForActor,
  listVisiblePayrollProfilesForActor,
  listVisiblePayrollRunsForActor,
  listVisibleTimesheetsForActor
} from "../../../packages/payroll/src/index.ts";
import { getDashboardActor } from "./shell-data.ts";

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export async function getDashboardPayrollHomeData() {
  const runtime = getPayrollRuntime();
  const actor = getDashboardActor();
  const ownProfile = await getPayrollProfileForActor(runtime, actor, actor.userId);
  const ownTimesheets = await listOwnTimesheetsForActor(runtime, actor);
  const ownEntries = await listOwnTimeEntriesForActor(runtime, actor);
  const reviewQueue = await listReviewQueueForActor(runtime, actor);
  const visibleTimesheets = await listVisibleTimesheetsForActor(runtime, actor);
  const payrollProfiles = await listVisiblePayrollProfilesForActor(runtime, actor);
  const payrollRuns = await listVisiblePayrollRunsForActor(runtime, actor);
  const payrollDocuments = await listVisiblePayrollDocumentsForActor(runtime, actor);
  const laborCosts = await listPayrollLaborCostAllocationsForActor(runtime, actor);
  const activeSession = getActiveClockSessionForActor(runtime, actor);
  const liveSessions = [...new Set(visibleTimesheets.map((timesheet) => timesheet.employeeUserId))]
    .map((employeeUserId) => runtime.service.getActiveClockSession(employeeUserId))
    .filter(isPresent);
  const auditRecords = (
    await Promise.all(visibleTimesheets.map((timesheet) => getTimesheetDetailForActor(runtime, actor, timesheet.id)))
  )
    .flatMap((detail) => detail?.auditRecords ?? [])
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    activeSession,
    liveSessions,
    ownProfile,
    ownTimesheets,
    ownEntries,
    reviewQueue,
    payPeriods: runtime.service.listPayPeriods(),
    payrollProfiles,
    payrollRuns,
    payrollDocuments,
    laborCosts,
    laborCostByProject: [...new Set(laborCosts.map((allocation) => allocation.projectId ?? "unassigned"))]
      .map((projectId) => {
        const allocations = laborCosts.filter((allocation) => (allocation.projectId ?? "unassigned") === projectId);

        return {
          projectId,
          laborCostCents: allocations.reduce((sum, allocation) => sum + allocation.laborCostCents, 0),
          minutesWorked: allocations.reduce((sum, allocation) => sum + allocation.minutesWorked, 0),
          runCount: new Set(allocations.map((allocation) => allocation.payrollRunId)).size
        };
      })
      .sort((left, right) => right.laborCostCents - left.laborCostCents),
    stats: {
      ownMinutes: ownEntries.reduce((sum, entry) => sum + entry.minutesWorked, 0),
      submittedTimesheets: reviewQueue.length,
      liveClockSessions: liveSessions.length,
      exportReadyTimesheets: visibleTimesheets.filter((timesheet) => timesheet.payrollExportState === "ready").length,
      payrollRuns: payrollRuns.length,
      payrollDocuments: payrollDocuments.length,
      activeProfiles: payrollProfiles.filter((entry) => entry.profile.status === "active").length
    },
    auditRecords,
    formatMinutes
  };
}

export async function getDashboardTimesheetDetail(timesheetId: string) {
  const runtime = getPayrollRuntime();
  const actor = getDashboardActor();
  const detail = await getTimesheetDetailForActor(runtime, actor, timesheetId);

  return {
    detail,
    formatMinutes
  };
}
