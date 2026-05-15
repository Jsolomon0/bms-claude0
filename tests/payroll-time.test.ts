import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  clockInServer,
  clockOutServer,
  endBreakServer,
  getActiveClockSessionForActor,
  getTimesheetDetailForActor,
  listOwnTimeEntriesForActor,
  listOwnTimesheetsForActor,
  listVisibleTimesheetsForActor,
  resetPayrollRuntime,
  reviewTimesheetServer,
  startBreakServer,
  submitTimesheetServer
} from "../packages/payroll/src/index.ts";
import { PayrollValidationError } from "../packages/payroll/src/validation.ts";
import type { AuthorizationActor } from "../packages/types/src/index.ts";

function actor(overrides: Partial<AuthorizationActor>): AuthorizationActor {
  return {
    userId: overrides.userId ?? "user-1",
    memberships: overrides.memberships ?? [],
    assignedProjectIds: overrides.assignedProjectIds ?? [],
    managedPartnerOrgIds: overrides.managedPartnerOrgIds ?? []
  };
}

function adminActor(): AuthorizationActor {
  return actor({
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-admin",
        userId: "alex.owner",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1", "project-demo-2"]
  });
}

function employeeActor(userId = "employee-1"): AuthorizationActor {
  return actor({
    userId,
    memberships: [
      {
        id: `membership-${userId}`,
        userId,
        role: "employee",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"]
  });
}

test("invalid clock sequences are rejected", async () => {
  const runtime = resetPayrollRuntime();
  const employee = employeeActor("employee-3");

  await assert.rejects(
    () =>
      startBreakServer(runtime, employee, {
        organizationId: "org-hq",
        employeeUserId: "employee-3",
        actorUserId: "employee-3",
        occurredAt: "2026-04-28T09:00:00.000Z",
        eventSource: "mobile",
        projectId: "project-demo-1",
        taskId: "task-demo-1"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PayrollValidationError);
      return true;
    }
  );

  await clockInServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T09:00:00.000Z",
    eventSource: "mobile",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    notes: "Morning start"
  });

  await assert.rejects(
    () =>
      clockInServer(runtime, employee, {
        organizationId: "org-hq",
        employeeUserId: "employee-3",
        actorUserId: "employee-3",
        occurredAt: "2026-04-28T09:05:00.000Z",
        eventSource: "mobile",
        projectId: "project-demo-1",
        taskId: "task-demo-1"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PayrollValidationError);
      return true;
    }
  );

  await startBreakServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T10:00:00.000Z",
    eventSource: "mobile"
  });

  await assert.rejects(
    () =>
      clockOutServer(runtime, employee, {
        organizationId: "org-hq",
        employeeUserId: "employee-3",
        actorUserId: "employee-3",
        occurredAt: "2026-04-28T10:15:00.000Z",
        eventSource: "mobile"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PayrollValidationError);
      return true;
    }
  );
});

test("clock in/out with breaks creates a project-linked entry and weekly timesheet", async () => {
  const runtime = resetPayrollRuntime();
  const employee = employeeActor("employee-3");

  await clockInServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T09:00:00.000Z",
    eventSource: "mobile",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    notes: "Panel staging"
  });
  await startBreakServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T10:00:00.000Z",
    eventSource: "mobile"
  });
  await endBreakServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T10:15:00.000Z",
    eventSource: "mobile"
  });
  const entry = await clockOutServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T11:45:00.000Z",
    eventSource: "mobile",
    notes: "Panel install"
  });

  const ownTimesheets = await listOwnTimesheetsForActor(runtime, employee);
  const ownEntries = await listOwnTimeEntriesForActor(runtime, employee);

  assert.equal(entry.projectId, "project-demo-1");
  assert.equal(entry.taskId, "task-demo-1");
  assert.equal(entry.breakMinutes, 15);
  assert.equal(entry.minutesWorked, 150);
  assert.equal(entry.notes, "Panel install");
  assert.equal(ownTimesheets.length, 1);
  assert.equal(ownTimesheets[0].totalMinutes, 150);
  assert.deepEqual(ownEntries.map((record) => record.id), [entry.id]);
  assert.equal(getActiveClockSessionForActor(runtime, employee), undefined);
  assert.equal(runtime.auditSink.list().filter((event) => event.eventType === "time.clock.recorded").length, 4);
});

test("employee self view is limited to owned timesheets", async () => {
  const runtime = resetPayrollRuntime();
  const employee = employeeActor("employee-1");
  const visibleTimesheets = await listVisibleTimesheetsForActor(runtime, employee);

  assert.deepEqual(visibleTimesheets.map((record) => record.id), ["timesheet-demo-employee-1"]);

  await assert.rejects(
    () => getTimesheetDetailForActor(runtime, employee, "timesheet-demo-admin"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("approval requires org review permission and marks entries export-ready", async () => {
  const runtime = resetPayrollRuntime();

  await assert.rejects(
    () =>
      reviewTimesheetServer(runtime, employeeActor("employee-1"), {
        timesheetId: "timesheet-demo-employee-1",
        actorUserId: "employee-1",
        action: "approve"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );

  const approved = await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: "timesheet-demo-employee-1",
    actorUserId: "alex.owner",
    action: "approve"
  });
  const detail = await getTimesheetDetailForActor(runtime, adminActor(), "timesheet-demo-employee-1");

  assert.equal(approved.status, "approved");
  assert.equal(approved.payrollExportState, "ready");
  assert.deepEqual(
    detail?.auditRecords.map((record) => record.action),
    ["approved", "submitted"]
  );
  assert.equal(detail?.timeEntries.every((entry) => entry.status === "approved"), true);
  assert.equal(detail?.timeEntries.every((entry) => entry.payrollExportState === "ready"), true);
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "timesheet.approved"), true);
});

test("rejected timesheets keep immutable submission history and require a reason", async () => {
  const runtime = resetPayrollRuntime();
  const employee = employeeActor("employee-3");

  await clockInServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T09:00:00.000Z",
    eventSource: "mobile",
    projectId: "project-demo-1",
    taskId: "task-demo-1"
  });
  await clockOutServer(runtime, employee, {
    organizationId: "org-hq",
    employeeUserId: "employee-3",
    actorUserId: "employee-3",
    occurredAt: "2026-04-28T11:00:00.000Z",
    eventSource: "mobile",
    notes: "Fixture build-out"
  });

  const ownTimesheets = await listOwnTimesheetsForActor(runtime, employee);
  await submitTimesheetServer(runtime, employee, {
    timesheetId: ownTimesheets[0].id,
    actorUserId: "employee-3"
  });

  await assert.rejects(
    () =>
      reviewTimesheetServer(runtime, adminActor(), {
        timesheetId: ownTimesheets[0].id,
        actorUserId: "alex.owner",
        action: "reject"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PayrollValidationError);
      return true;
    }
  );

  const rejected = await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: ownTimesheets[0].id,
    actorUserId: "alex.owner",
    action: "reject",
    rejectionReason: "Missing detail on the project note."
  });
  const detail = await getTimesheetDetailForActor(runtime, adminActor(), ownTimesheets[0].id);

  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.rejectionReason, "Missing detail on the project note.");
  assert.deepEqual(
    detail?.auditRecords.map((record) => record.action),
    ["rejected", "submitted"]
  );
  assert.equal(detail?.timeEntries.every((entry) => entry.status === "rejected"), true);
});
