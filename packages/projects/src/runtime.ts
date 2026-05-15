import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import { createInMemorySecurityContext, resolveRuntimeSecret, type InMemorySecurityContext } from "../../security/src/index.ts";
import {
  DEMO_ASSIGNMENTS,
  DEMO_CHANGE_ORDERS,
  DEMO_CHANGE_REQUESTS,
  DEMO_PHASES,
  DEMO_PROGRESS_UPDATES,
  DEMO_PROJECTS,
  DEMO_TASKS,
  DEMO_TIMELINE_EVENTS
} from "./fixtures.ts";
import { InMemoryProjectRepository } from "./repository.ts";
import { ProjectManagementService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface ProjectsRuntime {
  repository: InMemoryProjectRepository;
  service: ProjectManagementService;
  auditSink: MemoryAuditSink;
  publicLinkSecret: string;
  security: InMemorySecurityContext;
  now: () => Date;
}

function createRuntime(): ProjectsRuntime {
  let counter = 2000;
  const runtimeNow = () => new Date("2026-04-28T13:00:00.000Z");
  const repository = new InMemoryProjectRepository({
    projects: DEMO_PROJECTS,
    phases: DEMO_PHASES,
    tasks: DEMO_TASKS,
    assignments: DEMO_ASSIGNMENTS,
    progressUpdates: DEMO_PROGRESS_UPDATES,
    changeRequests: DEMO_CHANGE_REQUESTS,
    changeOrders: DEMO_CHANGE_ORDERS,
    timelineEvents: DEMO_TIMELINE_EVENTS
  });
  const auditSink = new MemoryAuditSink();
  const security = createInMemorySecurityContext({
    auditSink,
    now: runtimeNow
  });
  const service = new ProjectManagementService({
    repository,
    auditSink,
    now: runtimeNow,
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    repository,
    service,
    auditSink,
    publicLinkSecret: resolveRuntimeSecret({
      envKey: "BMS_PROJECT_PUBLIC_LINK_SECRET",
      fallbackSecret: "projects-demo-secret-2026-hardening",
      auditSink,
      logger: security.logger,
      monitoringHook: security.monitoringHook,
      now: runtimeNow
    }),
    security,
    now: runtimeNow
  };
}

let runtime: ProjectsRuntime | undefined;

export function getProjectsRuntime(): ProjectsRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetProjectsRuntime(): ProjectsRuntime {
  runtime = createRuntime();
  return runtime;
}
