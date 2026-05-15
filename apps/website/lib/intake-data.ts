import {
  ALLOWED_PUBLIC_IMAGE_MIME_TYPES,
  CONSULTATION_PREFERENCES,
  MAX_PUBLIC_IMAGE_UPLOAD_BYTES,
  getShortTermCustomerRestrictions
} from "../../../packages/crm/src/index.ts";

export function getPublicRequestFormOptions() {
  return CONSULTATION_PREFERENCES.map((preference) => ({
    value: preference,
    label:
      preference === "asap"
        ? "As soon as possible"
        : preference === "within_7_days"
          ? "Within 7 days"
          : preference === "within_30_days"
            ? "Within 30 days"
            : "Undecided"
  }));
}

export function getPublicRequestUploadRules() {
  return [
    `Allowed formats: ${ALLOWED_PUBLIC_IMAGE_MIME_TYPES.join(", ")}`,
    `Maximum size: ${Math.floor(MAX_PUBLIC_IMAGE_UPLOAD_BYTES / (1024 * 1024))} MB`,
    "Optional image uploads should support the request only and must not include secrets or IDs."
  ];
}

export function getShortTermRestrictionLabels() {
  return getShortTermCustomerRestrictions().map((restriction) => restriction.label);
}
