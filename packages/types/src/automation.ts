import { type NotificationPreview } from "./app-shell.ts";
import { type WorkflowNotificationAudience } from "./notifications.ts";

export const AUTOMATION_JOB_KEYS = [
  "event.notification_dispatch",
  "crm.short_term_expiry",
  "document.expiry_reminders",
  "invoice.overdue_reminders",
  "timesheet.overdue_reminders"
] as const;

export type AutomationJobKey = (typeof AUTOMATION_JOB_KEYS)[number];

export const AUTOMATION_JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;

export type AutomationJobStatus = (typeof AUTOMATION_JOB_STATUSES)[number];

export const AUTOMATION_JOB_TRIGGERS = ["event", "schedule", "manual", "retry"] as const;

export type AutomationJobTrigger = (typeof AUTOMATION_JOB_TRIGGERS)[number];

export interface AutomationJobDefinition {
  key: AutomationJobKey;
  name: string;
  description: string;
  schedule: string;
  retryPolicy: string;
}

export interface AutomationJobRunStats {
  processedCount: number;
  succeededCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface AutomationJobRunRecord {
  id: string;
  jobKey: AutomationJobKey;
  idempotencyKey: string;
  trigger: AutomationJobTrigger;
  status: AutomationJobStatus;
  attemptCount: number;
  startedAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
  lastError?: string | null;
  stats: AutomationJobRunStats;
  metadata?: Record<string, unknown>;
}

export interface AutomationJobActionRecord {
  id: string;
  jobRunId: string;
  jobKey: AutomationJobKey;
  actionKey: string;
  resourceType?: string;
  resourceId?: string;
  summary: string;
  executedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowAutomationEventInput {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  tone: NotificationPreview["tone"];
  audiences: readonly WorkflowNotificationAudience[];
  occurredAt: string;
  actorUserId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowAutomationRepository {
  createJobRun(run: AutomationJobRunRecord): void;
  updateJobRun(run: AutomationJobRunRecord): void;
  getJobRunById(jobRunId: string): AutomationJobRunRecord | undefined;
  findJobRunByIdempotencyKey(jobKey: AutomationJobKey, idempotencyKey: string): AutomationJobRunRecord | undefined;
  listJobRuns(): readonly AutomationJobRunRecord[];
  createAction(action: AutomationJobActionRecord): void;
  findActionByKey(actionKey: string): AutomationJobActionRecord | undefined;
  listActions(): readonly AutomationJobActionRecord[];
}

