import type {
  PublicImageUploadInput,
  PublicProjectRequestSubmissionInput,
  PublicProjectRequestValidationIssue
} from "../../types/src/index.ts";

export const MAX_PUBLIC_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PUBLIC_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimToUndefined(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function validatePublicImageUpload(
  imageUpload: PublicImageUploadInput | undefined
): PublicProjectRequestValidationIssue[] {
  if (!imageUpload) {
    return [];
  }

  const issues: PublicProjectRequestValidationIssue[] = [];

  if (!ALLOWED_PUBLIC_IMAGE_MIME_TYPES.includes(imageUpload.mimeType as (typeof ALLOWED_PUBLIC_IMAGE_MIME_TYPES)[number])) {
    issues.push({
      field: "imageUpload",
      message: "Only JPEG, PNG, and WebP images are allowed."
    });
  }

  if (imageUpload.byteSize > MAX_PUBLIC_IMAGE_UPLOAD_BYTES) {
    issues.push({
      field: "imageUpload",
      message: "Image uploads must be 5 MB or smaller."
    });
  }

  if (!trimToUndefined(imageUpload.fileName)) {
    issues.push({
      field: "imageUpload",
      message: "Uploaded images must include a file name."
    });
  }

  return issues;
}

export function validatePublicProjectRequestSubmission(
  input: PublicProjectRequestSubmissionInput
): PublicProjectRequestValidationIssue[] {
  const issues: PublicProjectRequestValidationIssue[] = [];

  if (!trimToUndefined(input.submitterName)) {
    issues.push({
      field: "submitterName",
      message: "Name is required for short-term request submission."
    });
  }

  if (!trimToUndefined(input.email)) {
    issues.push({
      field: "email",
      message: "Email is required for short-term request submission."
    });
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    issues.push({
      field: "email",
      message: "Enter a valid email address."
    });
  }

  if (!trimToUndefined(input.projectTitle)) {
    issues.push({
      field: "projectTitle",
      message: "Project title is required."
    });
  }

  if (!trimToUndefined(input.projectSummary)) {
    issues.push({
      field: "projectSummary",
      message: "Project summary is required."
    });
  }

  issues.push(...validatePublicImageUpload(input.imageUpload));

  return issues;
}
