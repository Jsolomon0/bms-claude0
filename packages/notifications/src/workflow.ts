import type {
  AuditEvent,
  AuditSink,
  NotificationPreview,
  WorkflowNotificationInput,
  WorkflowNotificationRecord,
  WorkflowNotificationRepository
} from "../../types/src/index.ts";

function defaultIdGenerator() {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

function createAuditEvent(
  occurredAt: string,
  outcome: AuditEvent["outcome"],
  notification: WorkflowNotificationRecord,
  metadata?: Record<string, unknown>
): AuditEvent {
  return {
    eventType: "notification.sent",
    outcome,
    actorUserId: null,
    resourceType: notification.resourceType ?? "notification",
    resourceId: notification.resourceId ?? notification.id,
    viaPublicLink: false,
    sensitive: false,
    occurredAt,
    metadata: {
      notificationId: notification.id,
      notificationType: notification.type,
      channel: notification.channel,
      audienceType: notification.audience.type,
      ...metadata
    }
  };
}

export interface WorkflowNotificationTransport {
  deliver(notification: WorkflowNotificationRecord): void | Promise<void>;
}

export class NoopWorkflowNotificationTransport implements WorkflowNotificationTransport {
  deliver(): void {}
}

export interface WorkflowNotificationServiceDependencies {
  repository: WorkflowNotificationRepository;
  auditSink?: AuditSink;
  transport?: WorkflowNotificationTransport;
  idGenerator?: (prefix: string) => string;
  now?: () => Date;
}

export class WorkflowNotificationService {
  private readonly repository: WorkflowNotificationRepository;
  private readonly auditSink?: AuditSink;
  private readonly transport: WorkflowNotificationTransport;
  private readonly idGenerator: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(dependencies: WorkflowNotificationServiceDependencies) {
    this.repository = dependencies.repository;
    this.auditSink = dependencies.auditSink;
    this.transport = dependencies.transport ?? new NoopWorkflowNotificationTransport();
    this.idGenerator = dependencies.idGenerator ?? defaultIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  listNotifications(): readonly WorkflowNotificationRecord[] {
    return this.repository.listNotifications();
  }

  listNotificationsByOrganization(organizationId: string): readonly WorkflowNotificationRecord[] {
    return this.repository
      .listNotifications()
      .filter((notification) => notification.organizationId === organizationId);
  }

  async dispatchNotification(input: WorkflowNotificationInput): Promise<WorkflowNotificationRecord> {
    const existing = input.dedupeKey ? this.repository.findNotificationByDedupeKey(input.dedupeKey) : undefined;

    if (existing?.status === "sent") {
      return existing;
    }

    const nowIso = this.now().toISOString();
    const baseRecord: WorkflowNotificationRecord = existing
      ? {
          ...existing,
          title: input.title,
          body: input.body,
          tone: input.tone,
          channel: input.channel,
          audience: input.audience,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          metadata: input.metadata,
          status: "queued",
          failureReason: null,
          failedAt: null
        }
      : {
          id: this.idGenerator("workflow-notification"),
          organizationId: input.organizationId,
          type: input.type,
          title: input.title,
          body: input.body,
          tone: input.tone,
          channel: input.channel,
          audience: input.audience,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          dedupeKey: input.dedupeKey,
          metadata: input.metadata,
          status: "queued",
          failureReason: null,
          createdAt: nowIso,
          deliveredAt: null,
          failedAt: null
        };

    if (existing) {
      this.repository.updateNotification(baseRecord);
    } else {
      this.repository.createNotification(baseRecord);
    }

    try {
      await this.transport.deliver(baseRecord);
      const deliveredAt = this.now().toISOString();
      const delivered: WorkflowNotificationRecord = {
        ...baseRecord,
        status: "sent",
        deliveredAt,
        failedAt: null,
        failureReason: null
      };
      this.repository.updateNotification(delivered);
      await this.auditSink?.write(createAuditEvent(deliveredAt, "success", delivered));
      return delivered;
    } catch (error) {
      const failedAt = this.now().toISOString();
      const failureReason = error instanceof Error ? error.message : "Notification delivery failed.";
      const failed: WorkflowNotificationRecord = {
        ...baseRecord,
        status: "failed",
        failureReason,
        failedAt
      };
      this.repository.updateNotification(failed);
      await this.auditSink?.write(
        createAuditEvent(failedAt, "failure", failed, {
          failureReason
        })
      );
      throw error;
    }
  }
}

export function toNotificationPreview(notification: WorkflowNotificationRecord): NotificationPreview {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    tone: notification.tone,
    timestampLabel: notification.deliveredAt?.slice(0, 16).replace("T", " ") ?? notification.createdAt.slice(0, 16).replace("T", " ")
  };
}

