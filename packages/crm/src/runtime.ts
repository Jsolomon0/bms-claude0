import type { AuditEvent, AuditSink, NotificationDispatch, NotificationSink } from "../../types/src/index.ts";
import { DEMO_LEADS, DEMO_PROJECT_REQUESTS } from "./fixtures.ts";
import { InMemoryProjectRequestRepository } from "./repository.ts";
import { IntakeWorkflowService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export class MemoryNotificationSink implements NotificationSink {
  private readonly notifications: NotificationDispatch[] = [];

  write(notification: NotificationDispatch): void {
    this.notifications.push(notification);
  }

  list(): readonly NotificationDispatch[] {
    return [...this.notifications].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}

export interface IntakeRuntime {
  repository: InMemoryProjectRequestRepository;
  service: IntakeWorkflowService;
  auditSink: MemoryAuditSink;
  notificationSink: MemoryNotificationSink;
}

function createRuntime(): IntakeRuntime {
  let counter = 1000;
  const repository = new InMemoryProjectRequestRepository({
    requests: DEMO_PROJECT_REQUESTS,
    leads: DEMO_LEADS
  });
  const auditSink = new MemoryAuditSink();
  const notificationSink = new MemoryNotificationSink();
  const service = new IntakeWorkflowService({
    repository,
    auditSink,
    notificationSink,
    organizationId: "org-hq",
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    service,
    auditSink,
    notificationSink
  };
}

let runtime: IntakeRuntime | undefined;

export function getIntakeRuntime(): IntakeRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetIntakeRuntime(): IntakeRuntime {
  runtime = createRuntime();
  return runtime;
}
