import { type NotificationPreview } from "./app-shell.ts";
import { type RoleKey } from "./authz.ts";

export const WORKFLOW_NOTIFICATION_CHANNELS = ["in_app", "email", "push"] as const;

export type WorkflowNotificationChannel = (typeof WORKFLOW_NOTIFICATION_CHANNELS)[number];

export const WORKFLOW_NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;

export type WorkflowNotificationStatus = (typeof WORKFLOW_NOTIFICATION_STATUSES)[number];

export const WORKFLOW_NOTIFICATION_AUDIENCE_TYPES = [
  "role",
  "user",
  "customer_account",
  "partner_org",
  "email"
] as const;

export type WorkflowNotificationAudienceType = (typeof WORKFLOW_NOTIFICATION_AUDIENCE_TYPES)[number];

export interface WorkflowNotificationAudience {
  type: WorkflowNotificationAudienceType;
  role?: RoleKey;
  userId?: string;
  customerAccountId?: string;
  partnerOrgId?: string;
  email?: string;
}

export interface WorkflowNotificationRecord {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  tone: NotificationPreview["tone"];
  channel: WorkflowNotificationChannel;
  audience: WorkflowNotificationAudience;
  resourceType?: string;
  resourceId?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  status: WorkflowNotificationStatus;
  failureReason?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  failedAt?: string | null;
}

export interface WorkflowNotificationInput {
  organizationId: string;
  type: string;
  title: string;
  body: string;
  tone: NotificationPreview["tone"];
  channel: WorkflowNotificationChannel;
  audience: WorkflowNotificationAudience;
  resourceType?: string;
  resourceId?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowNotificationRepository {
  createNotification(notification: WorkflowNotificationRecord): void;
  updateNotification(notification: WorkflowNotificationRecord): void;
  getNotificationById(notificationId: string): WorkflowNotificationRecord | undefined;
  findNotificationByDedupeKey(dedupeKey: string): WorkflowNotificationRecord | undefined;
  listNotifications(): readonly WorkflowNotificationRecord[];
}

