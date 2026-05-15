import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  createPayrollExportRunServer,
  getPayrollProfileForActor,
  getPayrollRunDetailForActor,
  listPayrollLaborCostAllocationsForActor,
  listVisiblePayrollDocumentsForActor,
  listVisiblePayrollRunsForActor,
  resetPayrollRuntime,
  reviewTimesheetServer,
  syncPayrollRunStatusServer,
  upsertEmployeePayrollProfileServer
} from "../packages/payroll/src/index.ts";
import { PrivilegedActionApprovalError } from "../packages/security/src/index.ts";
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

function employeeActor(userId = "employee-1", assignedProjectIds = ["project-demo-1"]): AuthorizationActor {
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
    assignedProjectIds
  });
}

async function createExportApproval(
  runtime: ReturnType<typeof resetPayrollRuntime>,
  payPeriodId = "pay-period-demo-current",
  actorUserId = "alex.owner"
) {
  return runtime.security.approvals.createApproval({
    actionKey: "payroll.export",
    actorUserId,
    resourceType: "pay_period",
    resourceId: payPeriodId,
    approvedByUserId: "owner.approver",
    justification: "Approve payroll export",
    expiresAt: "2026-05-10T00:00:00.000Z"
  });
}

test("employee self-service sees masked payroll profile and own provider documents only", async () => {
  const runtime = resetPayrollRuntime();
  const employee = employeeActor("employee-2", ["project-demo-2"]);

  const profile = await getPayrollProfileForActor(runtime, employee, "employee-2");
  const documents = await listVisiblePayrollDocumentsForActor(runtime, employee);
  const runs = await listVisiblePayrollRunsForActor(runtime, employee);
  const laborCosts = await listPayrollLaborCostAllocationsForActor(runtime, employee);

  assert.equal(profile?.profile.employeeUserId, "employee-2");
  assert.equal(profile?.sensitiveSummary.maskedTaxId, "***-**-4403");
  assert.equal(profile?.sensitiveSummary.bankAccountLast4, "3303");
  assert.equal(profile?.sensitiveSummary.laborCostRateCents, undefined);
  assert.deepEqual(documents.map((document) => document.id), ["payroll-document-demo-1"]);
  assert.deepEqual(runs.map((run) => run.id), ["payroll-run-demo-history-1"]);
  assert.deepEqual(laborCosts, []);

  await assert.rejects(
    () => getPayrollProfileForActor(runtime, employee, "employee-1"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("admin can upsert payroll profiles, export approved time, and sync a completed provider run", async () => {
  const runtime = resetPayrollRuntime();

  const profileUpdate = await upsertEmployeePayrollProfileServer(runtime, adminActor(), {
    organizationId: "org-hq",
    employeeUserId: "employee-1",
    actorUserId: "alex.owner",
    workEmail: "employee-1@example.com",
    legalName: "Sam Carter",
    compensationType: "hourly",
    paySchedule: "weekly",
    overtimeEligible: true,
    laborCostRateCents: 3600
  });

  assert.equal(profileUpdate.profile.status, "active");
  assert.equal(profileUpdate.sensitive.laborCostRateCents, 3600);

  await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: "timesheet-demo-employee-1",
    actorUserId: "alex.owner",
    action: "approve"
  });
  const approval = await createExportApproval(runtime);

  const run = await createPayrollExportRunServer(runtime, adminActor(), {
    payPeriodId: "pay-period-demo-current",
    actorUserId: "alex.owner",
    approvalId: approval.id
  });

  assert.equal(run.status, "submitted");
  assert.equal(runtime.repository.getTimesheetById("timesheet-demo-employee-1")?.payrollExportState, "exporting");
  assert.equal(runtime.repository.getTimeEntryById("time-entry-demo-1")?.payrollExportState, "exporting");

  runtime.provider.setRunStatus(run.providerRunId!, "processing");
  const processing = await syncPayrollRunStatusServer(runtime, adminActor(), {
    payrollRunId: run.id,
    actorUserId: "alex.owner"
  });
  assert.equal(processing.status, "processing");

  runtime.provider.setRunStatus(run.providerRunId!, "completed");
  const completed = await syncPayrollRunStatusServer(runtime, adminActor(), {
    payrollRunId: run.id,
    actorUserId: "alex.owner"
  });
  const detail = await getPayrollRunDetailForActor(runtime, adminActor(), run.id);
  const laborCosts = await listPayrollLaborCostAllocationsForActor(runtime, adminActor());
  const employeeDocuments = await listVisiblePayrollDocumentsForActor(runtime, employeeActor("employee-1"));

  assert.equal(completed.status, "completed");
  assert.equal(runtime.repository.getTimesheetById("timesheet-demo-employee-1")?.status, "locked");
  assert.equal(runtime.repository.getTimesheetById("timesheet-demo-employee-1")?.payrollExportState, "exported");
  assert.equal(runtime.repository.getTimeEntryById("time-entry-demo-1")?.payrollExportState, "exported");
  assert.equal(detail?.laborCostAllocations.length, 2);
  assert.equal(detail?.documents.length, 1);
  assert.equal(laborCosts.some((allocation) => allocation.payrollRunId === run.id && allocation.projectId === "project-demo-1"), true);
  assert.equal(employeeDocuments.some((document) => document.payrollRunId === run.id), true);
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "payroll.export_started"), true);
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "payroll.run.status_changed"), true);
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "payroll.document_published"), true);
});

test("employees cannot export approved time or sync payroll runs", async () => {
  const runtime = resetPayrollRuntime();

  await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: "timesheet-demo-employee-1",
    actorUserId: "alex.owner",
    action: "approve"
  });

  await assert.rejects(
    () =>
      createPayrollExportRunServer(runtime, employeeActor("employee-1"), {
        payPeriodId: "pay-period-demo-current",
        actorUserId: "employee-1"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );

  const approval = await createExportApproval(runtime);
  const run = await createPayrollExportRunServer(runtime, adminActor(), {
    payPeriodId: "pay-period-demo-current",
    actorUserId: "alex.owner",
    approvalId: approval.id
  });

  await assert.rejects(
    () =>
      syncPayrollRunStatusServer(runtime, employeeActor("employee-1"), {
        payrollRunId: run.id,
        actorUserId: "employee-1"
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("failed provider runs move exported records into failed state and preserve restricted run detail", async () => {
  const runtime = resetPayrollRuntime();

  await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: "timesheet-demo-employee-1",
    actorUserId: "alex.owner",
    action: "approve"
  });

  const approval = await createExportApproval(runtime);
  const run = await createPayrollExportRunServer(runtime, adminActor(), {
    payPeriodId: "pay-period-demo-current",
    actorUserId: "alex.owner",
    approvalId: approval.id
  });

  runtime.provider.setRunStatus(run.providerRunId!, "failed", {
    failureReason: "Provider validation rejected one worker record."
  });

  const failed = await syncPayrollRunStatusServer(runtime, adminActor(), {
    payrollRunId: run.id,
    actorUserId: "alex.owner"
  });
  const adminDetail = await getPayrollRunDetailForActor(runtime, adminActor(), run.id);
  const employeeDetail = await getPayrollRunDetailForActor(runtime, employeeActor("employee-1"), run.id);

  assert.equal(failed.status, "failed");
  assert.equal(failed.failureReason, "Provider validation rejected one worker record.");
  assert.equal(runtime.repository.getTimesheetById("timesheet-demo-employee-1")?.status, "approved");
  assert.equal(runtime.repository.getTimesheetById("timesheet-demo-employee-1")?.payrollExportState, "failed");
  assert.equal(runtime.repository.getTimeEntryById("time-entry-demo-1")?.payrollExportState, "failed");
  assert.equal(adminDetail?.laborCostAllocations.length, 0);
  assert.equal(employeeDetail?.documents.length, 0);
  assert.deepEqual(employeeDetail?.laborCostAllocations, []);
});

test("payroll export requires privileged approval even for admins", async () => {
  const runtime = resetPayrollRuntime();

  await reviewTimesheetServer(runtime, adminActor(), {
    timesheetId: "timesheet-demo-employee-1",
    actorUserId: "alex.owner",
    action: "approve"
  });

  await assert.rejects(
    () =>
      createPayrollExportRunServer(runtime, adminActor(), {
        payPeriodId: "pay-period-demo-current",
        actorUserId: "alex.owner"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PrivilegedActionApprovalError);
      assert.equal(error.reason, "approval_required");
      return true;
    }
  );
});
