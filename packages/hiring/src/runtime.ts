import { InMemoryWorkflowNotificationRepository, WorkflowNotificationService } from "../../notifications/src/index.ts";
import { createInMemorySecurityContext, type InMemorySecurityContext } from "../../security/src/index.ts";
import { MemoryObjectStorageAdapter, NoopMalwareScanHook } from "../../storage/src/index.ts";
import type { AuditEvent, AuditSink } from "../../types/src/index.ts";
import {
  DEMO_APPLICANT_DOCUMENTS,
  DEMO_APPLICANT_PROFILES,
  DEMO_APPLICANT_STATUS_HISTORY,
  DEMO_HIRING_EMPLOYEES,
  DEMO_HIRING_INTERNAL_NOTES,
  DEMO_INTERVIEW_FEEDBACK,
  DEMO_INTERVIEWS,
  DEMO_JOB_APPLICATIONS,
  DEMO_JOB_OFFERS,
  DEMO_JOB_POSTINGS,
  DEMO_ONBOARDING_CHECKLISTS,
  DEMO_ONBOARDING_TASKS
} from "./fixtures.ts";
import { InMemoryHiringRepository } from "./repository.ts";
import { HiringManagementService } from "./workflow.ts";

export class MemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }

  list(): readonly AuditEvent[] {
    return [...this.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

export interface HiringRuntime {
  repository: InMemoryHiringRepository;
  service: HiringManagementService;
  auditSink: MemoryAuditSink;
  notifications: WorkflowNotificationService;
  security: InMemorySecurityContext;
  storage: MemoryObjectStorageAdapter;
  now: () => Date;
}

function createRuntime(): HiringRuntime {
  let counter = 9000;
  const runtimeNow = () => new Date("2026-04-29T12:00:00.000Z");
  const auditSink = new MemoryAuditSink();
  const security = createInMemorySecurityContext({
    auditSink,
    now: runtimeNow
  });
  const repository = new InMemoryHiringRepository({
    jobPostings: DEMO_JOB_POSTINGS,
    applicantProfiles: DEMO_APPLICANT_PROFILES,
    jobApplications: DEMO_JOB_APPLICATIONS,
    applicantDocuments: DEMO_APPLICANT_DOCUMENTS,
    applicantStatusHistory: DEMO_APPLICANT_STATUS_HISTORY,
    internalNotes: DEMO_HIRING_INTERNAL_NOTES,
    interviews: DEMO_INTERVIEWS,
    interviewFeedback: DEMO_INTERVIEW_FEEDBACK,
    jobOffers: DEMO_JOB_OFFERS,
    onboardingChecklists: DEMO_ONBOARDING_CHECKLISTS,
    onboardingTasks: DEMO_ONBOARDING_TASKS,
    employees: DEMO_HIRING_EMPLOYEES
  });
  const storage = new MemoryObjectStorageAdapter(runtimeNow);

  for (const document of DEMO_APPLICANT_DOCUMENTS) {
    storage.putObject({
      key: document.storageKey,
      contentType: document.contentType,
      byteSize: document.byteSize,
      originalFileName: document.fileName
    });
  }

  const notifications = new WorkflowNotificationService({
    repository: new InMemoryWorkflowNotificationRepository(),
    auditSink,
    now: runtimeNow,
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });
  const service = new HiringManagementService({
    repository,
    storage,
    auditSink,
    notifications,
    malwareScanHook: new NoopMalwareScanHook(),
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
    notifications,
    security,
    storage,
    now: runtimeNow
  };
}

let runtime: HiringRuntime | undefined;

export function getHiringRuntime(): HiringRuntime {
  runtime ??= createRuntime();
  return runtime;
}

export function resetHiringRuntime(): HiringRuntime {
  runtime = createRuntime();
  return runtime;
}
