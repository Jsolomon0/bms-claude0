import type {
  HiringValidationIssue,
  InterviewStatus,
  JobApplicationStatus,
  JobOfferStatus,
  JobPostingRecord
} from "../../types/src/index.ts";

export class HiringValidationError extends Error {
  readonly issues: readonly HiringValidationIssue[];

  constructor(issues: readonly HiringValidationIssue[]) {
    super("Hiring validation failed.");
    this.name = "HiringValidationError";
    this.issues = issues;
  }
}

export class HiringTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HiringTransitionError";
  }
}

export function validateJobPostingFields(input: {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  requirements: string;
}): readonly HiringValidationIssue[] {
  const issues: HiringValidationIssue[] = [];

  if (!input.title.trim()) {
    issues.push({ field: "title", message: "Job posting title is required." });
  }

  if (!input.department.trim()) {
    issues.push({ field: "department", message: "Department is required." });
  }

  if (!input.location.trim()) {
    issues.push({ field: "location", message: "Location is required." });
  }

  if (!input.employmentType.trim()) {
    issues.push({ field: "employmentType", message: "Employment type is required." });
  }

  if (!input.description.trim()) {
    issues.push({ field: "description", message: "Description is required." });
  }

  if (!input.requirements.trim()) {
    issues.push({ field: "requirements", message: "Requirements are required." });
  }

  return issues;
}

export function validatePublicApplicationInput(input: {
  firstName: string;
  lastName: string;
  email: string;
  consentGranted: boolean;
  resumeFile?: { fileName: string; contentType: string; byteSize: number } | undefined;
  screeningAnswers: Record<string, string>;
  jobPosting: JobPostingRecord;
}): readonly HiringValidationIssue[] {
  const issues: HiringValidationIssue[] = [];

  if (!input.firstName.trim()) {
    issues.push({ field: "firstName", message: "First name is required." });
  }

  if (!input.lastName.trim()) {
    issues.push({ field: "lastName", message: "Last name is required." });
  }

  if (!input.email.trim()) {
    issues.push({ field: "email", message: "Email is required." });
  }

  if (!input.resumeFile) {
    issues.push({ field: "resumeUpload", message: "Resume upload is required." });
  }

  if (!input.consentGranted) {
    issues.push({ field: "consentGranted", message: "Consent is required before submission." });
  }

  for (const question of input.jobPosting.screeningQuestions) {
    if (question.required && !input.screeningAnswers[question.id]?.trim()) {
      issues.push({
        field: `screeningAnswer:${question.id}`,
        message: `Answer required for: ${question.prompt}`
      });
    }
  }

  return issues;
}

export function ensureApplicantSubmitAllowed(status: JobApplicationStatus): void {
  if (status !== "draft") {
    throw new HiringTransitionError(`Only draft applications can be submitted. Current status: ${status}.`);
  }
}

export function ensureDraftUpdateAllowed(status: JobApplicationStatus): void {
  if (status !== "draft") {
    throw new HiringTransitionError(`Only draft applications can be updated. Current status: ${status}.`);
  }
}

export function ensureWithdrawAllowed(status: JobApplicationStatus): void {
  if (status === "withdrawn" || status === "rejected" || status === "converted_to_employee") {
    throw new HiringTransitionError(`Application cannot be withdrawn from status ${status}.`);
  }
}

const INTERNAL_APPLICATION_TRANSITIONS: Record<JobApplicationStatus, readonly JobApplicationStatus[]> = {
  draft: ["submitted", "rejected"],
  submitted: ["under_review", "interview_requested", "interview_scheduled", "offer_pending", "rejected"],
  under_review: ["interview_requested", "interview_scheduled", "offer_pending", "rejected"],
  interview_requested: ["interview_scheduled", "rejected", "withdrawn"],
  interview_scheduled: ["offer_pending", "rejected"],
  offer_pending: ["offer_accepted", "rejected", "withdrawn"],
  offer_accepted: ["converted_to_employee"],
  rejected: [],
  withdrawn: [],
  converted_to_employee: []
};

export function ensureInternalApplicationTransition(
  currentStatus: JobApplicationStatus,
  nextStatus: JobApplicationStatus
): void {
  if (!INTERNAL_APPLICATION_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new HiringTransitionError(`Application status cannot move from ${currentStatus} to ${nextStatus}.`);
  }
}

export function ensureInterviewSchedulingInput(input: {
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  locationOrMeetingUrl: string;
  interviewerUserIds: readonly string[];
}): readonly HiringValidationIssue[] {
  const issues: HiringValidationIssue[] = [];

  if (!input.locationOrMeetingUrl.trim()) {
    issues.push({ field: "locationOrMeetingUrl", message: "Interview location or meeting url is required." });
  }

  if (!input.scheduledStart || Number.isNaN(Date.parse(input.scheduledStart))) {
    issues.push({ field: "scheduledStart", message: "Interview start time is required." });
  }

  if (!input.scheduledEnd || Number.isNaN(Date.parse(input.scheduledEnd))) {
    issues.push({ field: "scheduledEnd", message: "Interview end time is required." });
  }

  if (input.scheduledStart && input.scheduledEnd && new Date(input.scheduledEnd) <= new Date(input.scheduledStart)) {
    issues.push({ field: "scheduledEnd", message: "Interview end must be after the start time." });
  }

  if (input.interviewerUserIds.length === 0) {
    issues.push({ field: "interviewerUserIds", message: "At least one interviewer must be assigned." });
  }

  return issues;
}

export function ensureInterviewStatusTransition(currentStatus: InterviewStatus, nextStatus: InterviewStatus): void {
  const transitions: Record<InterviewStatus, readonly InterviewStatus[]> = {
    requested: ["scheduled", "cancelled"],
    scheduled: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: []
  };

  if (currentStatus === nextStatus) {
    return;
  }

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new HiringTransitionError(`Interview status cannot move from ${currentStatus} to ${nextStatus}.`);
  }
}

export function ensureOfferStatusTransition(currentStatus: JobOfferStatus, nextStatus: JobOfferStatus): void {
  const transitions: Record<JobOfferStatus, readonly JobOfferStatus[]> = {
    draft: ["sent", "withdrawn"],
    sent: ["accepted", "declined", "withdrawn"],
    accepted: [],
    declined: [],
    withdrawn: []
  };

  if (currentStatus === nextStatus) {
    return;
  }

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new HiringTransitionError(`Offer status cannot move from ${currentStatus} to ${nextStatus}.`);
  }
}
