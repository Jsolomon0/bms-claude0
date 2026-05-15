import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import { InMemoryWorkflowNotificationRepository } from "./repository.ts";
import { NoopWorkflowNotificationTransport, WorkflowNotificationService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface NotificationsRuntime {
  repository: InMemoryWorkflowNotificationRepository;
  service: WorkflowNotificationService;
  auditSink: MemoryAuditSink;
}

function createRuntime(): NotificationsRuntime {
  let counter = 7000;
  const repository = new InMemoryWorkflowNotificationRepository();
  const auditSink = new MemoryAuditSink();
  const service = new WorkflowNotificationService({
    repository,
    auditSink,
    transport: new NoopWorkflowNotificationTransport(),
    now: () => new Date("2026-04-29T10:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    service,
    auditSink
  };
}

let runtime: NotificationsRuntime | undefined;

export function getNotificationsRuntime(): NotificationsRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetNotificationsRuntime(): NotificationsRuntime {
  runtime = createRuntime();
  return runtime;
}

