import { ALLOWED_DOCUMENT_CONTENT_TYPES, MAX_DOCUMENT_FILE_BYTES } from "../../../packages/documents/src/validation.ts";
import { listPublishedJobPostingsServer, getHiringRuntime } from "../../../packages/hiring/src/index.ts";

export async function getPublicJobBoardData() {
  const runtime = getHiringRuntime();
  const jobPostings = await listPublishedJobPostingsServer(runtime);

  return {
    jobPostings,
    uploadRules: [
      `Allowed file types: ${ALLOWED_DOCUMENT_CONTENT_TYPES.join(", ")}`,
      `Maximum file size: ${Math.round(MAX_DOCUMENT_FILE_BYTES / (1024 * 1024))} MB`,
      "Resume upload is required for submission."
    ],
    consentRules: [
      "Applicants must confirm that the submitted information is accurate.",
      "Internal hiring notes and interviewer feedback are never exposed to applicants."
    ]
  };
}

export async function getPublicJobPostingData(jobPostingId: string) {
  const runtime = getHiringRuntime();
  return runtime.repository.getJobPostingById(jobPostingId)?.status === "published"
    ? runtime.repository.getJobPostingById(jobPostingId)
    : undefined;
}
