import type {
  ClockEventRecord,
  TimeEntryRecord,
  TimesheetRecord
} from "../../types/src/index.ts";

export class PayrollValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join(" "));
    this.name = "PayrollValidationError";
    this.issues = issues;
  }
}

export class PayrollWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayrollWorkflowError";
  }
}

function trimToUndefined(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function validateClockContext(input: {
  projectId?: string;
  taskId?: string;
  notes?: string;
}): readonly string[] {
  const issues: string[] = [];
  const notes = trimToUndefined(input.notes);

  if (input.taskId && !input.projectId) {
    issues.push("A task cannot be attached without a project.");
  }

  if (notes && notes.length > 2000) {
    issues.push("Clock notes must be 2000 characters or fewer.");
  }

  return issues;
}

export function validateClockTransition(input: {
  eventType: "clock_in" | "clock_out" | "break_start" | "break_end";
  occurredAt: string;
  lastEvent?: ClockEventRecord;
  activeSession?: {
    activeBreakStartedAt?: string;
  };
}): readonly string[] {
  const issues: string[] = [];

  if (input.lastEvent && input.occurredAt < input.lastEvent.occurredAt) {
    issues.push("Clock events cannot be recorded earlier than the employee's latest event.");
  }

  if (input.eventType === "clock_in" && input.activeSession) {
    issues.push("The employee is already clocked in.");
  }

  if (input.eventType === "break_start" && !input.activeSession) {
    issues.push("A break cannot start before clocking in.");
  }

  if (input.eventType === "break_start" && input.activeSession?.activeBreakStartedAt) {
    issues.push("A break is already active.");
  }

  if (input.eventType === "break_end" && !input.activeSession?.activeBreakStartedAt) {
    issues.push("A break cannot end before it starts.");
  }

  if (input.eventType === "clock_out" && !input.activeSession) {
    issues.push("The employee must clock in before clocking out.");
  }

  if (input.eventType === "clock_out" && input.activeSession?.activeBreakStartedAt) {
    issues.push("An active break must end before clocking out.");
  }

  return issues;
}

export function ensureTimesheetEditable(timesheet: TimesheetRecord): void {
  if (timesheet.status === "submitted" || timesheet.status === "approved" || timesheet.status === "locked") {
    throw new PayrollWorkflowError(`Timesheet ${timesheet.id} is not editable while ${timesheet.status}.`);
  }
}

export function ensureTimesheetSubmittable(timesheet: TimesheetRecord, entries: readonly TimeEntryRecord[]): void {
  const issues: string[] = [];

  if (timesheet.status !== "open" && timesheet.status !== "rejected") {
    issues.push(`Timesheet ${timesheet.id} cannot be submitted while ${timesheet.status}.`);
  }

  if (entries.length === 0) {
    issues.push("Timesheets require at least one time entry before submission.");
  }

  if (issues.length > 0) {
    throw new PayrollWorkflowError(issues.join(" "));
  }
}

export function ensureTimesheetReviewable(timesheet: TimesheetRecord): void {
  if (timesheet.status !== "submitted") {
    throw new PayrollWorkflowError(`Timesheet ${timesheet.id} cannot be reviewed while ${timesheet.status}.`);
  }
}
