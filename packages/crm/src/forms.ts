import type {
  ConsultationPreference,
  ProjectRequestReviewAction,
  PublicImageUploadInput,
  PublicProjectRequestSubmissionInput
} from "../../types/src/index.ts";
import { CONSULTATION_PREFERENCES } from "../../types/src/index.ts";

export interface FormDataReader {
  get(name: string): unknown;
}

export class ReviewActionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewActionParseError";
  }
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalTrimmedString(value: unknown): string | undefined {
  const normalized = readTrimmedString(value);
  return normalized ? normalized : undefined;
}

function isConsultationPreference(value: string): value is ConsultationPreference {
  return CONSULTATION_PREFERENCES.includes(value as ConsultationPreference);
}

function normalizeConsultationPreference(value: unknown): ConsultationPreference {
  const normalized = readTrimmedString(value);
  return isConsultationPreference(normalized) ? normalized : "undecided";
}

function normalizeImageUpload(value: unknown): PublicImageUploadInput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as {
    name?: unknown;
    type?: unknown;
    size?: unknown;
  };
  const fileName = readTrimmedString(candidate.name);
  const mimeType = readTrimmedString(candidate.type);
  const sizeValue =
    typeof candidate.size === "number"
      ? candidate.size
      : typeof candidate.size === "bigint"
        ? Number(candidate.size)
        : typeof candidate.size === "string"
          ? Number(candidate.size)
          : 0;

  if (!fileName || !Number.isFinite(sizeValue) || sizeValue <= 0) {
    return undefined;
  }

  return {
    fileName,
    mimeType,
    byteSize: sizeValue
  };
}

export function parsePublicProjectRequestFormData(formData: FormDataReader): PublicProjectRequestSubmissionInput {
  return {
    submitterName: readTrimmedString(formData.get("submitterName")),
    email: readTrimmedString(formData.get("email")),
    phone: readOptionalTrimmedString(formData.get("phone")),
    projectTitle: readTrimmedString(formData.get("projectTitle")),
    projectSummary: readTrimmedString(formData.get("projectSummary")),
    consultationPreference: normalizeConsultationPreference(formData.get("consultationPreference")),
    imageUpload: normalizeImageUpload(formData.get("imageUpload"))
  };
}

export function parseProjectRequestReviewActionFormData(formData: FormDataReader): ProjectRequestReviewAction {
  const actionType = readTrimmedString(formData.get("actionType"));
  const actorUserId = readTrimmedString(formData.get("actorUserId"));

  if (!actorUserId) {
    throw new ReviewActionParseError("Review actions require an actor user id.");
  }

  switch (actionType) {
    case "start_review":
      return {
        type: "start_review",
        actorUserId
      };
    case "request_more_info":
      return {
        type: "request_more_info",
        actorUserId,
        message: readTrimmedString(formData.get("message"))
      };
    case "schedule_consultation":
      return {
        type: "schedule_consultation",
        actorUserId,
        scheduledAt: readTrimmedString(formData.get("scheduledAt")),
        note: readOptionalTrimmedString(formData.get("note"))
      };
    case "reject":
      return {
        type: "reject",
        actorUserId,
        reason: readTrimmedString(formData.get("reason"))
      };
    case "convert_to_project_draft":
      return {
        type: "convert_to_project_draft",
        actorUserId,
        projectName: readOptionalTrimmedString(formData.get("projectName"))
      };
    case "invite_as_long_term_customer":
      return {
        type: "invite_as_long_term_customer",
        actorUserId,
        inviteEmail: readOptionalTrimmedString(formData.get("inviteEmail"))
      };
    default:
      throw new ReviewActionParseError(`Unsupported review action: ${actionType || "unknown"}.`);
  }
}
