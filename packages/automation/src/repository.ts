import type {
  AutomationJobActionRecord,
  AutomationJobKey,
  AutomationJobRunRecord,
  WorkflowAutomationRepository
} from "../../types/src/index.ts";

export class InMemoryWorkflowAutomationRepository implements WorkflowAutomationRepository {
  private readonly jobRuns = new Map<string, AutomationJobRunRecord>();
  private readonly jobRunsByIdempotencyKey = new Map<string, string>();
  private readonly actions = new Map<string, AutomationJobActionRecord>();

  createJobRun(run: AutomationJobRunRecord): void {
    this.jobRuns.set(run.id, run);
    this.jobRunsByIdempotencyKey.set(this.idempotencyLookupKey(run.jobKey, run.idempotencyKey), run.id);
  }

  updateJobRun(run: AutomationJobRunRecord): void {
    this.jobRuns.set(run.id, run);
    this.jobRunsByIdempotencyKey.set(this.idempotencyLookupKey(run.jobKey, run.idempotencyKey), run.id);
  }

  getJobRunById(jobRunId: string): AutomationJobRunRecord | undefined {
    return this.jobRuns.get(jobRunId);
  }

  findJobRunByIdempotencyKey(jobKey: AutomationJobKey, idempotencyKey: string): AutomationJobRunRecord | undefined {
    const jobRunId = this.jobRunsByIdempotencyKey.get(this.idempotencyLookupKey(jobKey, idempotencyKey));
    return jobRunId ? this.jobRuns.get(jobRunId) : undefined;
  }

  listJobRuns(): readonly AutomationJobRunRecord[] {
    return [...this.jobRuns.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  createAction(action: AutomationJobActionRecord): void {
    this.actions.set(action.actionKey, action);
  }

  findActionByKey(actionKey: string): AutomationJobActionRecord | undefined {
    return this.actions.get(actionKey);
  }

  listActions(): readonly AutomationJobActionRecord[] {
    return [...this.actions.values()].sort((left, right) => right.executedAt.localeCompare(left.executedAt));
  }

  private idempotencyLookupKey(jobKey: AutomationJobKey, idempotencyKey: string): string {
    return `${jobKey}:${idempotencyKey}`;
  }
}

