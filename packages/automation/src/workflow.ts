import type {
  AuditEvent,
  AuditSink,
  AutomationJobActionRecord,
  AutomationJobDefinition,
  AutomationJobKey,
  AutomationJobRunRecord,
  AutomationJobRunStats,
  AutomationJobTrigger,
  DocumentRecord,
  InvoiceActivityRecord,
  InvoiceRecord,
  InvoiceReminderRecord,
  LeadRecord,
  PayPeriodRecord,
  ProjectRequestRecord,
  TimesheetRecord,
  WorkflowAutomationEventInput,
  WorkflowAutomationRepository
} from "../../types/src/index.ts";
import type { WorkflowNotificationService } from "../../notifications/src/index.ts";

function defaultIdGenerator() {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function createStats(): AutomationJobRunStats {
  return {
    processedCount: 0,
    succeededCount: 0,
    skippedCount: 0,
    failedCount: 0
  };
}

function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function addDays(timestamp: string, days: number): string {
  const next = new Date(timestamp);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function audienceKey(
  audience: WorkflowAutomationEventInput["audiences"][number]
): string {
  switch (audience.type) {
    case "role":
      return `role:${audience.role ?? "unknown"}`;
    case "user":
      return `user:${audience.userId ?? "unknown"}`;
    case "customer_account":
      return `customer:${audience.customerAccountId ?? "unknown"}`;
    case "partner_org":
      return `partner:${audience.partnerOrgId ?? "unknown"}`;
    case "email":
      return `email:${audience.email ?? "unknown"}`;
  }
}

function isActiveShortTermRequest(request: ProjectRequestRecord): boolean {
  return (
    request.customerType === "short_term" &&
    request.status !== "rejected" &&
    request.status !== "expired" &&
    request.status !== "project_draft_created" &&
    request.status !== "long_term_invited"
  );
}

function requestExpiredLabel(status: LeadRecord["status"]): string {
  switch (status) {
    case "expired":
      return "Expired";
    case "new":
      return "New";
    case "reviewing":
      return "Under review";
    case "awaiting_customer":
      return "Needs more info";
    case "consultation_scheduled":
      return "Consultation scheduled";
    case "rejected":
      return "Rejected";
    case "converted_project_draft":
      return "Project draft created";
    case "invited_long_term_customer":
      return "Invited long-term";
  }
}

function buildJobAuditEvent(
  eventType: AuditEvent["eventType"],
  occurredAt: string,
  run: AutomationJobRunRecord
): AuditEvent {
  return {
    eventType,
    outcome: eventType === "automation.job.failed" ? "failure" : "success",
    actorUserId: "system.automation",
    resourceType: "automation_job",
    resourceId: run.id,
    viaPublicLink: false,
    sensitive: true,
    occurredAt,
    metadata: {
      jobKey: run.jobKey,
      idempotencyKey: run.idempotencyKey,
      attemptCount: run.attemptCount,
      stats: run.stats,
      lastError: run.lastError ?? null
    }
  };
}

function buildDomainAuditEvent(
  eventType: AuditEvent["eventType"],
  occurredAt: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): AuditEvent {
  return {
    eventType,
    outcome: "success",
    actorUserId: "system.automation",
    resourceType,
    resourceId,
    viaPublicLink: false,
    sensitive: true,
    occurredAt,
    metadata
  };
}

function buildInvoiceActivity(
  id: string,
  invoice: InvoiceRecord,
  occurredAt: string
): InvoiceActivityRecord {
  return {
    id,
    invoiceId: invoice.id,
    eventType: "invoice_status_changed",
    actorUserId: "system.automation",
    summary: `Invoice automatically moved to overdue after passing due date ${invoice.dueAt}.`,
    visibilityFlags: invoice.visibilityFlags,
    occurredAt,
    metadata: {
      previousStatus: invoice.status,
      nextStatus: "overdue"
    }
  };
}

export const AUTOMATION_JOB_DEFINITIONS: readonly AutomationJobDefinition[] = [
  {
    key: "event.notification_dispatch",
    name: "Event notification dispatch",
    description: "Converts domain events into scoped workflow notifications.",
    schedule: "event-driven",
    retryPolicy: "safe to retry with event idempotency key"
  },
  {
    key: "crm.short_term_expiry",
    name: "Short-term customer expiry",
    description: "Expires inactive short-term intake records after 30 days without deleting retained records.",
    schedule: "daily",
    retryPolicy: "safe to retry with request-scoped action keys"
  },
  {
    key: "document.expiry_reminders",
    name: "Document expiry reminders",
    description: "Warns internal owners before active documents reach their expiry date.",
    schedule: "daily",
    retryPolicy: "safe to retry with per-document daily reminder keys"
  },
  {
    key: "invoice.overdue_reminders",
    name: "Invoice overdue reminders",
    description: "Marks eligible invoices overdue and sends customer reminders.",
    schedule: "daily",
    retryPolicy: "safe to retry with per-invoice mutation and reminder keys"
  },
  {
    key: "timesheet.overdue_reminders",
    name: "Timesheet overdue reminders",
    description: "Reminds employees and reviewers about overdue weekly timesheets.",
    schedule: "daily",
    retryPolicy: "safe to retry with per-timesheet daily reminder keys"
  }
] as const;

export interface IntakeAutomationSource {
  listRequests(): readonly ProjectRequestRecord[];
  getLeadById(leadId: string): LeadRecord | undefined;
  updateRequest(request: ProjectRequestRecord): void;
  updateLead(lead: LeadRecord): void;
  auditSink?: AuditSink;
}

export interface DocumentsAutomationSource {
  listDocuments(): readonly DocumentRecord[];
}

export interface PaymentsAutomationSource {
  listInvoices(): readonly InvoiceRecord[];
  updateInvoice(invoice: InvoiceRecord): void;
  createReminder(reminder: InvoiceReminderRecord): void;
  listRemindersByInvoiceId(invoiceId: string): readonly InvoiceReminderRecord[];
  createActivity(activity: InvoiceActivityRecord): void;
  auditSink?: AuditSink;
  nextId(prefix: string): string;
}

export interface PayrollAutomationSource {
  listTimesheets(): readonly TimesheetRecord[];
  getPayPeriodById(payPeriodId: string): PayPeriodRecord | undefined;
}

export interface WorkflowAutomationDependencies {
  repository: WorkflowAutomationRepository;
  notificationsService: WorkflowNotificationService;
  intake: IntakeAutomationSource;
  documents: DocumentsAutomationSource;
  payments: PaymentsAutomationSource;
  payroll: PayrollAutomationSource;
  auditSink?: AuditSink;
  idGenerator?: (prefix: string) => string;
  now?: () => Date;
  systemActorUserId?: string;
}

class AutomationRunContext {
  readonly run: AutomationJobRunRecord;
  readonly stats: AutomationJobRunStats = createStats();
  readonly now: Date;
  private readonly repository: WorkflowAutomationRepository;
  private readonly idGenerator: (prefix: string) => string;

  constructor(
    run: AutomationJobRunRecord,
    repository: WorkflowAutomationRepository,
    now: Date,
    idGenerator: (prefix: string) => string
  ) {
    this.run = run;
    this.repository = repository;
    this.now = now;
    this.idGenerator = idGenerator;
  }

  async executeAction<T>(
    input: {
      actionKey: string;
      summary: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    },
    handler: () => Promise<T>
  ): Promise<T | undefined> {
    this.stats.processedCount += 1;

    if (this.repository.findActionByKey(input.actionKey)) {
      this.stats.skippedCount += 1;
      return undefined;
    }

    try {
      const result = await handler();
      const record: AutomationJobActionRecord = {
        id: this.idGenerator("automation-action"),
        jobRunId: this.run.id,
        jobKey: this.run.jobKey,
        actionKey: input.actionKey,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        summary: input.summary,
        executedAt: this.now.toISOString(),
        metadata: input.metadata
      };
      this.repository.createAction(record);
      this.stats.succeededCount += 1;
      return result;
    } catch (error) {
      this.stats.failedCount += 1;
      throw error;
    }
  }
}

export class WorkflowAutomationService {
  private readonly repository: WorkflowAutomationRepository;
  private readonly notificationsService: WorkflowNotificationService;
  private readonly intake: IntakeAutomationSource;
  private readonly documents: DocumentsAutomationSource;
  private readonly payments: PaymentsAutomationSource;
  private readonly payroll: PayrollAutomationSource;
  private readonly auditSink?: AuditSink;
  private readonly idGenerator: (prefix: string) => string;
  private readonly now: () => Date;
  private readonly systemActorUserId: string;

  constructor(dependencies: WorkflowAutomationDependencies) {
    this.repository = dependencies.repository;
    this.notificationsService = dependencies.notificationsService;
    this.intake = dependencies.intake;
    this.documents = dependencies.documents;
    this.payments = dependencies.payments;
    this.payroll = dependencies.payroll;
    this.auditSink = dependencies.auditSink;
    this.idGenerator = dependencies.idGenerator ?? defaultIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
    this.systemActorUserId = dependencies.systemActorUserId ?? "system.automation";
  }

  listJobDefinitions(): readonly AutomationJobDefinition[] {
    return AUTOMATION_JOB_DEFINITIONS;
  }

  listJobRuns(): readonly AutomationJobRunRecord[] {
    return this.repository.listJobRuns();
  }

  listFailedJobRuns(): readonly AutomationJobRunRecord[] {
    return this.repository.listJobRuns().filter((run) => run.status === "failed");
  }

  listActionRecords(): readonly AutomationJobActionRecord[] {
    return this.repository.listActions();
  }

  async processEvent(input: WorkflowAutomationEventInput): Promise<AutomationJobRunRecord> {
    return this.runJob("event.notification_dispatch", {
      trigger: "event",
      idempotencyKey: input.id,
      metadata: {
        eventType: input.type,
        resourceType: input.resourceType,
        resourceId: input.resourceId
      },
      execute: async (context) => {
        for (const audience of input.audiences) {
          const actionKey = `event-notification:${input.id}:${audienceKey(audience)}`;
          await context.executeAction(
            {
              actionKey,
              summary: `Dispatch ${input.type} notification to ${audienceKey(audience)}.`,
              resourceType: input.resourceType,
              resourceId: input.resourceId
            },
            async () => {
              await this.notificationsService.dispatchNotification({
                organizationId: input.organizationId,
                type: input.type,
                title: input.title,
                body: input.body,
                tone: input.tone,
                channel: audience.type === "email" ? "email" : "in_app",
                audience,
                resourceType: input.resourceType,
                resourceId: input.resourceId,
                dedupeKey: actionKey,
                metadata: {
                  actorUserId: input.actorUserId ?? null,
                  occurredAt: input.occurredAt,
                  ...input.metadata
                }
              });
            }
          );
        }
      }
    });
  }

  async runScheduledJobs(now = this.now()): Promise<readonly AutomationJobRunRecord[]> {
    const currentDate = now.toISOString().slice(0, 10);

    return Promise.all([
      this.runShortTermExpiryJob(now, currentDate),
      this.runDocumentExpiryReminderJob(now, currentDate),
      this.runInvoiceOverdueReminderJob(now, currentDate),
      this.runTimesheetOverdueReminderJob(now, currentDate)
    ]);
  }

  private async runShortTermExpiryJob(now: Date, currentDate: string): Promise<AutomationJobRunRecord> {
    return this.runJob("crm.short_term_expiry", {
      trigger: "schedule",
      idempotencyKey: `crm.short_term_expiry:${currentDate}`,
      metadata: { currentDate },
      execute: async (context) => {
        const nowIso = now.toISOString();

        for (const request of this.intake.listRequests()) {
          if (!isActiveShortTermRequest(request) || request.shortTermExpiresAt > nowIso) {
            continue;
          }

          await context.executeAction(
            {
              actionKey: `crm-expire:${request.id}`,
              summary: `Expire inactive short-term request ${request.id}.`,
              resourceType: "project_request",
              resourceId: request.id
            },
            async () => {
              const latestRequest = this.intake.listRequests().find((record) => record.id === request.id) ?? request;
              const lead = this.intake.getLeadById(request.leadId);

              if (!lead) {
                throw new Error(`Lead ${request.leadId} was not found for request ${request.id}.`);
              }

              if (latestRequest.status !== "expired") {
                this.intake.updateRequest({
                  ...latestRequest,
                  status: "expired",
                  expiredAt: nowIso,
                  lastStatusChangedAt: nowIso,
                  lastActivityAt: nowIso
                });
                this.intake.updateLead({
                  ...lead,
                  status: "expired",
                  expiredAt: nowIso,
                  pipelineLabel: requestExpiredLabel("expired"),
                  updatedAt: nowIso
                });
                await this.intake.auditSink?.write(
                  buildDomainAuditEvent(
                    "intake.project_request.status_changed",
                    nowIso,
                    "project_request",
                    latestRequest.id,
                    {
                      automationAction: "short_term_expiry",
                      actorUserId: this.systemActorUserId,
                      previousStatus: latestRequest.status,
                      nextStatus: "expired"
                    }
                  )
                );
                await this.intake.auditSink?.write(
                  buildDomainAuditEvent("intake.lead.status_changed", nowIso, "lead", lead.id, {
                    automationAction: "short_term_expiry",
                    actorUserId: this.systemActorUserId,
                    previousStatus: lead.status,
                    nextStatus: "expired"
                  })
                );
              }

              await this.notificationsService.dispatchNotification({
                organizationId: latestRequest.organizationId,
                type: "crm.short_term_request.expired",
                title: "Short-term request expired",
                body: `${latestRequest.projectTitle} expired after 30 days of inactivity and remains retained for required records.`,
                tone: "warning",
                channel: "in_app",
                audience: {
                  type: "role",
                  role: "administrator"
                },
                resourceType: "project_request",
                resourceId: latestRequest.id,
                dedupeKey: `crm-expired-admin:${latestRequest.id}`,
                metadata: {
                  automationAction: "short_term_expiry"
                }
              });
              await this.notificationsService.dispatchNotification({
                organizationId: latestRequest.organizationId,
                type: "crm.short_term_request.expired",
                title: "Your short-term request expired",
                body: "Your request expired after 30 days of inactivity. Required legal and accounting records remain retained where applicable.",
                tone: "warning",
                channel: "email",
                audience: {
                  type: "email",
                  email: latestRequest.email
                },
                resourceType: "project_request",
                resourceId: latestRequest.id,
                dedupeKey: `crm-expired-requester:${latestRequest.id}`,
                metadata: {
                  automationAction: "short_term_expiry"
                }
              });
            }
          );
        }
      }
    });
  }

  private async runDocumentExpiryReminderJob(now: Date, currentDate: string): Promise<AutomationJobRunRecord> {
    return this.runJob("document.expiry_reminders", {
      trigger: "schedule",
      idempotencyKey: `document.expiry_reminders:${currentDate}`,
      metadata: { currentDate },
      execute: async (context) => {
        const nowIso = now.toISOString();
        const reminderCutoff = addDays(nowIso, 7);

        for (const document of this.documents.listDocuments()) {
          if (!document.expiresAt || document.archiveState !== "active") {
            continue;
          }

          if (document.expiresAt < nowIso || document.expiresAt > reminderCutoff) {
            continue;
          }

          const actionKey = `document-expiry-reminder:${document.id}:${currentDate}`;
          await context.executeAction(
            {
              actionKey,
              summary: `Send expiry reminder for document ${document.id}.`,
              resourceType: "document",
              resourceId: document.id
            },
            async () => {
              await this.notificationsService.dispatchNotification({
                organizationId: document.organizationId,
                type: "document.expiry.reminder",
                title: "Document expiry approaching",
                body: `${document.title} expires on ${document.expiresAt?.slice(0, 10)}.`,
                tone: "warning",
                channel: "in_app",
                audience: {
                  type: "role",
                  role: "administrator"
                },
                resourceType: "document",
                resourceId: document.id,
                dedupeKey: actionKey,
                metadata: {
                  expiresAt: document.expiresAt
                }
              });
            }
          );
        }
      }
    });
  }

  private async runInvoiceOverdueReminderJob(now: Date, currentDate: string): Promise<AutomationJobRunRecord> {
    return this.runJob("invoice.overdue_reminders", {
      trigger: "schedule",
      idempotencyKey: `invoice.overdue_reminders:${currentDate}`,
      metadata: { currentDate },
      execute: async (context) => {
        const nowIso = now.toISOString();

        for (const invoice of this.payments.listInvoices()) {
          if (invoice.balanceDueCents <= 0 || (invoice.status !== "sent" && invoice.status !== "partial" && invoice.status !== "overdue")) {
            continue;
          }

          if (invoice.dueAt >= currentDate) {
            continue;
          }

          await context.executeAction(
            {
              actionKey: `invoice-overdue:${invoice.id}:${currentDate}`,
              summary: `Mark invoice ${invoice.id} overdue and send reminder.`,
              resourceType: "invoice",
              resourceId: invoice.id
            },
            async () => {
              const latestInvoice = this.payments.listInvoices().find((record) => record.id === invoice.id) ?? invoice;

              if (latestInvoice.status !== "overdue") {
                const updatedInvoice: InvoiceRecord = {
                  ...latestInvoice,
                  status: "overdue",
                  updatedAt: nowIso
                };
                this.payments.updateInvoice(updatedInvoice);
                this.payments.createActivity(
                  buildInvoiceActivity(this.payments.nextId("invoice-activity"), latestInvoice, nowIso)
                );
                await this.payments.auditSink?.write(
                  buildDomainAuditEvent("invoice.status_changed", nowIso, "invoice", latestInvoice.id, {
                    automationAction: "invoice_overdue",
                    actorUserId: this.systemActorUserId,
                    previousStatus: latestInvoice.status,
                    nextStatus: "overdue"
                  })
                );
              }

              const existingReminder = this.payments
                .listRemindersByInvoiceId(latestInvoice.id)
                .find(
                  (reminder) =>
                    reminder.reminderType === "invoice_overdue" && reminder.createdAt.slice(0, 10) === currentDate
                );

              if (!existingReminder) {
                this.payments.createReminder({
                  id: this.payments.nextId("invoice-reminder"),
                  invoiceId: latestInvoice.id,
                  reminderType: "invoice_overdue",
                  recipientEmail: `${latestInvoice.customerAccountId}@portal.local`,
                  subject: `Invoice ${latestInvoice.invoiceNumber} is overdue`,
                  body: `${latestInvoice.title} is overdue with ${latestInvoice.balanceDueCents / 100} ${latestInvoice.currency} outstanding.`,
                  createdAt: nowIso
                });
              }

              await this.notificationsService.dispatchNotification({
                organizationId: latestInvoice.organizationId,
                type: "invoice.overdue.reminder",
                title: "Invoice overdue",
                body: `${latestInvoice.invoiceNumber} is overdue and still has a remaining balance.`,
                tone: "warning",
                channel: "email",
                audience: {
                  type: "customer_account",
                  customerAccountId: latestInvoice.customerAccountId
                },
                resourceType: "invoice",
                resourceId: latestInvoice.id,
                dedupeKey: `invoice-overdue-reminder:${latestInvoice.id}:${currentDate}`,
                metadata: {
                  dueAt: latestInvoice.dueAt,
                  balanceDueCents: latestInvoice.balanceDueCents
                }
              });
            }
          );
        }
      }
    });
  }

  private async runTimesheetOverdueReminderJob(now: Date, currentDate: string): Promise<AutomationJobRunRecord> {
    return this.runJob("timesheet.overdue_reminders", {
      trigger: "schedule",
      idempotencyKey: `timesheet.overdue_reminders:${currentDate}`,
      metadata: { currentDate },
      execute: async (context) => {
        for (const timesheet of this.payroll.listTimesheets()) {
          const payPeriod = this.payroll.getPayPeriodById(timesheet.payPeriodId);

          if (!payPeriod || payPeriod.periodEnd >= currentDate) {
            continue;
          }

          if (timesheet.status === "open") {
            await context.executeAction(
              {
                actionKey: `timesheet-open-reminder:${timesheet.id}:${currentDate}`,
                summary: `Send overdue open timesheet reminder for ${timesheet.id}.`,
                resourceType: "timesheet",
                resourceId: timesheet.id
              },
              async () => {
                await this.notificationsService.dispatchNotification({
                  organizationId: timesheet.organizationId,
                  type: "timesheet.overdue.reminder",
                  title: "Timesheet overdue",
                  body: `Your timesheet for ${payPeriod.periodStart} through ${payPeriod.periodEnd} is still open.`,
                  tone: "warning",
                  channel: "in_app",
                  audience: {
                    type: "user",
                    userId: timesheet.employeeUserId
                  },
                  resourceType: "timesheet",
                  resourceId: timesheet.id,
                  dedupeKey: `timesheet-open-reminder:${timesheet.id}:${currentDate}`,
                  metadata: {
                    payPeriodId: payPeriod.id
                  }
                });
              }
            );
          }

          if (timesheet.status === "submitted") {
            await context.executeAction(
              {
                actionKey: `timesheet-review-reminder:${timesheet.id}:${currentDate}`,
                summary: `Send overdue submitted timesheet review reminder for ${timesheet.id}.`,
                resourceType: "timesheet",
                resourceId: timesheet.id
              },
              async () => {
                await this.notificationsService.dispatchNotification({
                  organizationId: timesheet.organizationId,
                  type: "timesheet.review.reminder",
                  title: "Timesheet approval overdue",
                  body: `Timesheet ${timesheet.id} still needs review for pay period ending ${payPeriod.periodEnd}.`,
                  tone: "warning",
                  channel: "in_app",
                  audience: {
                    type: "role",
                    role: "administrator"
                  },
                  resourceType: "timesheet",
                  resourceId: timesheet.id,
                  dedupeKey: `timesheet-review-reminder:${timesheet.id}:${currentDate}`,
                  metadata: {
                    payPeriodId: payPeriod.id,
                    employeeUserId: timesheet.employeeUserId
                  }
                });
              }
            );
          }
        }
      }
    });
  }

  private async runJob(
    jobKey: AutomationJobKey,
    input: {
      trigger: AutomationJobTrigger;
      idempotencyKey: string;
      metadata?: Record<string, unknown>;
      execute: (context: AutomationRunContext) => Promise<void>;
    }
  ): Promise<AutomationJobRunRecord> {
    const existing = this.repository.findJobRunByIdempotencyKey(jobKey, input.idempotencyKey);

    if (existing?.status === "succeeded") {
      return existing;
    }

    const startedAt = this.now().toISOString();
    const run: AutomationJobRunRecord = existing
      ? {
          ...existing,
          trigger: input.trigger,
          status: "running",
          attemptCount: existing.attemptCount + 1,
          startedAt,
          completedAt: null,
          failedAt: null,
          lastError: null,
          metadata: input.metadata
        }
      : {
          id: this.idGenerator("automation-job-run"),
          jobKey,
          idempotencyKey: input.idempotencyKey,
          trigger: input.trigger,
          status: "running",
          attemptCount: 1,
          startedAt,
          completedAt: null,
          failedAt: null,
          lastError: null,
          stats: createStats(),
          metadata: input.metadata
        };

    if (existing) {
      this.repository.updateJobRun(run);
    } else {
      this.repository.createJobRun(run);
    }

    const context = new AutomationRunContext(run, this.repository, new Date(startedAt), this.idGenerator);

    try {
      await input.execute(context);
      const completedAt = this.now().toISOString();
      const completed: AutomationJobRunRecord = {
        ...run,
        status: "succeeded",
        completedAt,
        failedAt: null,
        lastError: null,
        stats: context.stats
      };
      this.repository.updateJobRun(completed);
      await this.auditSink?.write(buildJobAuditEvent("automation.job.completed", completedAt, completed));
      return completed;
    } catch (error) {
      const failedAt = this.now().toISOString();
      const failed: AutomationJobRunRecord = {
        ...run,
        status: "failed",
        failedAt,
        completedAt: null,
        lastError: error instanceof Error ? error.message : "Automation job failed.",
        stats: context.stats
      };
      this.repository.updateJobRun(failed);
      await this.auditSink?.write(buildJobAuditEvent("automation.job.failed", failedAt, failed));
      throw error;
    }
  }
}
