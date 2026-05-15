import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryWorkflowAutomationRepository } from "../packages/automation/src/repository.ts";
import { resetAutomationRuntime } from "../packages/automation/src/runtime.ts";
import { WorkflowAutomationService } from "../packages/automation/src/workflow.ts";
import { getIntakeRuntime, resetIntakeRuntime } from "../packages/crm/src/index.ts";
import { resetDocumentsRuntime } from "../packages/documents/src/runtime.ts";
import { getNotificationsRuntime, resetNotificationsRuntime } from "../packages/notifications/src/runtime.ts";
import {
  InMemoryWorkflowNotificationRepository,
  WorkflowNotificationService
} from "../packages/notifications/src/index.ts";
import { getPaymentsRuntime, resetPaymentsRuntime } from "../packages/payments/src/index.ts";
import { resetPayrollRuntime } from "../packages/payroll/src/index.ts";
import type {
  AuditEvent,
  AuditSink
} from "../packages/types/src/index.ts";

class MemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }
}

class FlakyNotificationTransport {
  private hasFailed = false;

  async deliver(): Promise<void> {
    if (!this.hasFailed) {
      this.hasFailed = true;
      throw new Error("Transient delivery failure.");
    }
  }
}

function resetAllAutomationSources() {
  resetIntakeRuntime();
  resetDocumentsRuntime();
  resetPaymentsRuntime();
  resetPayrollRuntime();
  resetNotificationsRuntime();
  return resetAutomationRuntime();
}

test("event-driven notifications are idempotent by event id", async () => {
  const runtime = resetAllAutomationSources();
  const notificationsRuntime = getNotificationsRuntime();
  const run = await runtime.service.processEvent({
    id: "event-demo-1",
    organizationId: "org-hq",
    type: "project.progress.created",
    title: "Project update posted",
    body: "A customer-visible update was published.",
    tone: "info",
    audiences: [
      {
        type: "role",
        role: "administrator"
      }
    ],
    occurredAt: "2026-05-26T14:00:00.000Z",
    resourceType: "project",
    resourceId: "project-demo-1"
  });

  assert.equal(run.status, "succeeded");
  assert.equal(run.attemptCount, 1);

  assert.equal(notificationsRuntime.service.listNotifications().length, 1);

  const duplicateRun = await runtime.service.processEvent({
    id: "event-demo-1",
    organizationId: "org-hq",
    type: "project.progress.created",
    title: "Project update posted",
    body: "A customer-visible update was published.",
    tone: "info",
    audiences: [
      {
        type: "role",
        role: "administrator"
      }
    ],
    occurredAt: "2026-05-26T14:00:00.000Z",
    resourceType: "project",
    resourceId: "project-demo-1"
  });

  const deliveredNotifications = notificationsRuntime.service.listNotifications();
  assert.equal(duplicateRun.status, "succeeded");
  assert.equal(duplicateRun.id, run.id);
  assert.equal(deliveredNotifications.length, 1);
});

test("scheduled automation jobs expire short-term requests and send reminders without duplicating daily work", async () => {
  const runtime = resetAllAutomationSources();
  const notificationsRuntime = getNotificationsRuntime();
  const intakeRuntime = getIntakeRuntime();
  const paymentsRuntime = getPaymentsRuntime();
  const now = new Date("2026-05-26T14:00:00.000Z");

  const runs = await runtime.service.runScheduledJobs(now);
  assert.equal(runs.length, 4);
  assert.equal(runs.every((run) => run.status === "succeeded"), true);

  const expiredRequests = intakeRuntime.service.listRequests().filter((request) => request.status === "expired");
  assert.equal(expiredRequests.length, 3);
  assert.equal(expiredRequests.every((request) => Boolean(request.expiredAt)), true);

  assert.equal(
    paymentsRuntime.repository
      .listInvoices()
      .filter((invoice) => invoice.id === "invoice-report-1" || invoice.id === "invoice-report-2")
      .every((invoice) => invoice.status === "overdue"),
    true
  );
  assert.equal(
    paymentsRuntime.repository
      .listRemindersByInvoiceId("invoice-report-1")
      .some((reminder) => reminder.reminderType === "invoice_overdue"),
    true
  );
  assert.equal(
    notificationsRuntime.service.listNotifications().some((notification) => notification.type === "document.expiry.reminder"),
    true
  );
  assert.equal(
    notificationsRuntime.service.listNotifications().some((notification) => notification.type === "timesheet.review.reminder"),
    true
  );
  assert.equal(
    notificationsRuntime.service.listNotifications().some((notification) => notification.type === "crm.short_term_request.expired"),
    true
  );

  const firstNotificationCount = notificationsRuntime.service.listNotifications().length;

  const repeatedRuns = await runtime.service.runScheduledJobs(now);
  assert.deepEqual(
    repeatedRuns.map((run) => run.id),
    runs.map((run) => run.id)
  );
  assert.equal(notificationsRuntime.service.listNotifications().length, firstNotificationCount);
});

test("failed notification delivery can be retried safely without duplicate records", async () => {
  const repository = new InMemoryWorkflowAutomationRepository();
  const notificationRepository = new InMemoryWorkflowNotificationRepository();
  const notificationAuditSink = new MemoryAuditSink();
  const automationAuditSink = new MemoryAuditSink();
  const transport = new FlakyNotificationTransport();
  let counter = 9100;

  const notificationsService = new WorkflowNotificationService({
    repository: notificationRepository,
    auditSink: notificationAuditSink,
    transport,
    now: () => new Date("2026-05-26T15:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  const service = new WorkflowAutomationService({
    repository,
    notificationsService,
    intake: {
      listRequests: () => [],
      getLeadById: () => undefined,
      updateRequest: () => {},
      updateLead: () => {}
    },
    documents: {
      listDocuments: () => []
    },
    payments: {
      listInvoices: () => [],
      updateInvoice: () => {},
      createReminder: () => {},
      listRemindersByInvoiceId: () => [],
      createActivity: () => {},
      nextId: (prefix: string) => {
        counter += 1;
        return `${prefix}-${counter}`;
      }
    },
    payroll: {
      listTimesheets: () => [],
      getPayPeriodById: () => undefined
    },
    auditSink: automationAuditSink,
    now: () => new Date("2026-05-26T15:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  await assert.rejects(
    () =>
      service.processEvent({
        id: "event-flaky-1",
        organizationId: "org-hq",
        type: "timesheet.review.reminder",
        title: "Approval pending",
        body: "A timesheet is waiting for review.",
        tone: "warning",
        audiences: [
          {
            type: "role",
            role: "administrator"
          }
        ],
        occurredAt: "2026-05-26T15:00:00.000Z",
        resourceType: "timesheet",
        resourceId: "timesheet-demo-employee-1"
      }),
    /Transient delivery failure/
  );

  assert.equal(repository.listJobRuns()[0]?.status, "failed");
  assert.equal(notificationRepository.listNotifications()[0]?.status, "failed");

  const successfulRun = await service.processEvent({
    id: "event-flaky-1",
    organizationId: "org-hq",
    type: "timesheet.review.reminder",
    title: "Approval pending",
    body: "A timesheet is waiting for review.",
    tone: "warning",
    audiences: [
      {
        type: "role",
        role: "administrator"
      }
    ],
    occurredAt: "2026-05-26T15:00:00.000Z",
    resourceType: "timesheet",
    resourceId: "timesheet-demo-employee-1"
  });

  const notifications = notificationRepository.listNotifications();
  assert.equal(successfulRun.status, "succeeded");
  assert.equal(successfulRun.attemptCount, 2);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.status, "sent");
  assert.equal(repository.listActions().length, 1);
  assert.equal(
    automationAuditSink.events.some((event) => event.eventType === "automation.job.failed"),
    true
  );
  assert.equal(
    automationAuditSink.events.some((event) => event.eventType === "automation.job.completed"),
    true
  );
  assert.equal(
    notificationAuditSink.events.filter((event) => event.eventType === "notification.sent").length,
    2
  );
});
