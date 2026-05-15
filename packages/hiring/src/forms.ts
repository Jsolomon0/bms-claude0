import type {
  DocumentUploadInput,
  EmploymentType,
  InterviewFeedbackRecommendation,
  InterviewType,
  JobApplicationStatus,
  JobOfferStatus,
  JobPostingStatus
} from "../../types/src/index.ts";
import {
  EMPLOYMENT_TYPES,
  INTERVIEW_FEEDBACK_RECOMMENDATIONS,
  INTERVIEW_TYPES,
  JOB_APPLICATION_STATUSES,
  JOB_OFFER_STATUSES,
  JOB_POSTING_STATUSES
} from "../../types/src/index.ts";

export interface FormDataReader {
  get(name: string): unknown;
}

export class HiringFormParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HiringFormParseError";
  }
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalTrimmedString(value: unknown): string | undefined {
  const normalized = readTrimmedString(value);
  return normalized ? normalized : undefined;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function normalizeFile(value: unknown): DocumentUploadInput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as {
    name?: unknown;
    type?: unknown;
    size?: unknown;
  };
  const fileName = readTrimmedString(candidate.name);
  const contentType = readTrimmedString(candidate.type);
  const byteSize =
    typeof candidate.size === "number"
      ? candidate.size
      : typeof candidate.size === "string"
        ? Number(candidate.size)
        : 0;

  if (!fileName || !contentType || !Number.isFinite(byteSize) || byteSize <= 0) {
    return undefined;
  }

  return {
    fileName,
    contentType,
    byteSize
  };
}

function normalizeRecord(value: unknown): Record<string, string> {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).map(([key, entryValue]) => [key, typeof entryValue === "string" ? entryValue.trim() : ""])
      );
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        typeof entryValue === "string" ? entryValue.trim() : ""
      ])
    );
  }

  return {};
}

function isEmploymentType(value: string): value is EmploymentType {
  return EMPLOYMENT_TYPES.includes(value as EmploymentType);
}

function isJobPostingStatus(value: string): value is JobPostingStatus {
  return JOB_POSTING_STATUSES.includes(value as JobPostingStatus);
}

function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return JOB_APPLICATION_STATUSES.includes(value as JobApplicationStatus);
}

function isInterviewType(value: string): value is InterviewType {
  return INTERVIEW_TYPES.includes(value as InterviewType);
}

function isInterviewFeedbackRecommendation(value: string): value is InterviewFeedbackRecommendation {
  return INTERVIEW_FEEDBACK_RECOMMENDATIONS.includes(value as InterviewFeedbackRecommendation);
}

function isJobOfferStatus(value: string): value is JobOfferStatus {
  return JOB_OFFER_STATUSES.includes(value as JobOfferStatus);
}

function readEmploymentType(value: unknown): EmploymentType {
  const normalized = readTrimmedString(value);

  if (!isEmploymentType(normalized)) {
    throw new HiringFormParseError(`Unsupported employment type: ${normalized || "unknown"}.`);
  }

  return normalized;
}

function readJobPostingStatus(value: unknown, fallback: JobPostingStatus = "draft"): JobPostingStatus {
  const normalized = readTrimmedString(value);
  return isJobPostingStatus(normalized) ? normalized : fallback;
}

function readJobApplicationStatus(value: unknown): JobApplicationStatus {
  const normalized = readTrimmedString(value);

  if (!isJobApplicationStatus(normalized)) {
    throw new HiringFormParseError(`Unsupported application status: ${normalized || "unknown"}.`);
  }

  return normalized;
}

function readInterviewType(value: unknown): InterviewType {
  const normalized = readTrimmedString(value);

  if (!isInterviewType(normalized)) {
    throw new HiringFormParseError(`Unsupported interview type: ${normalized || "unknown"}.`);
  }

  return normalized;
}

function readInterviewFeedbackRecommendation(value: unknown): InterviewFeedbackRecommendation {
  const normalized = readTrimmedString(value);

  if (!isInterviewFeedbackRecommendation(normalized)) {
    throw new HiringFormParseError(`Unsupported interview recommendation: ${normalized || "unknown"}.`);
  }

  return normalized;
}

function readJobOfferStatus(value: unknown): JobOfferStatus {
  const normalized = readTrimmedString(value);

  if (!isJobOfferStatus(normalized)) {
    throw new HiringFormParseError(`Unsupported offer status: ${normalized || "unknown"}.`);
  }

  return normalized;
}

function readScreeningQuestions(value: unknown): readonly { id: string; prompt: string; required: boolean }[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as readonly Record<string, unknown>[];
    return parsed
      .map((question, index) => ({
        id: readTrimmedString(question.id) || `question-${index + 1}`,
        prompt: readTrimmedString(question.prompt),
        required: Boolean(question.required)
      }))
      .filter((question) => question.prompt);
  } catch {
    throw new HiringFormParseError("Screening questions payload must be valid JSON.");
  }
}

export function parseJobPostingFormData(formData: FormDataReader) {
  return {
    title: readTrimmedString(formData.get("title")),
    department: readTrimmedString(formData.get("department")),
    location: readTrimmedString(formData.get("location")),
    employmentType: readEmploymentType(formData.get("employmentType")),
    description: readTrimmedString(formData.get("description")),
    requirements: readTrimmedString(formData.get("requirements")),
    compensationRange: readOptionalTrimmedString(formData.get("compensationRange")),
    status: readJobPostingStatus(formData.get("status")),
    screeningQuestions: readScreeningQuestions(formData.get("screeningQuestions"))
  };
}

export function parsePublicJobApplicationFormData(formData: FormDataReader) {
  return {
    firstName: readTrimmedString(formData.get("firstName")),
    lastName: readTrimmedString(formData.get("lastName")),
    email: readTrimmedString(formData.get("email")),
    phone: readOptionalTrimmedString(formData.get("phone")),
    portfolioUrl: readOptionalTrimmedString(formData.get("portfolioUrl")),
    linkedinUrl: readOptionalTrimmedString(formData.get("linkedinUrl")),
    coverLetter: readOptionalTrimmedString(formData.get("coverLetter")),
    screeningAnswers: normalizeRecord(formData.get("screeningAnswers")),
    consentGranted: normalizeBoolean(formData.get("consentGranted")),
    resumeFile: normalizeFile(formData.get("resumeUpload"))
  };
}

export function parseApplicationStatusUpdateFormData(formData: FormDataReader) {
  return {
    status: readJobApplicationStatus(formData.get("status")),
    reason: readOptionalTrimmedString(formData.get("reason"))
  };
}

export function parseInterviewScheduleFormData(formData: FormDataReader) {
  const interviewerUserIds = readTrimmedString(formData.get("interviewerUserIds"))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    scheduledStart: readOptionalTrimmedString(formData.get("scheduledStart")),
    scheduledEnd: readOptionalTrimmedString(formData.get("scheduledEnd")),
    locationOrMeetingUrl: readTrimmedString(formData.get("locationOrMeetingUrl")),
    interviewType: readInterviewType(formData.get("interviewType")),
    interviewerUserIds
  };
}

export function parseInterviewFeedbackFormData(formData: FormDataReader) {
  const ratingRaw = readOptionalTrimmedString(formData.get("rating"));

  return {
    rating: ratingRaw ? Number(ratingRaw) : undefined,
    feedback: readTrimmedString(formData.get("feedback")),
    recommendation: readInterviewFeedbackRecommendation(formData.get("recommendation"))
  };
}

export function parseOfferStatusFormData(formData: FormDataReader) {
  return {
    status: readJobOfferStatus(formData.get("status")),
    offerDetails: normalizeRecord(formData.get("offerDetails"))
  };
}
