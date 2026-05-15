"use server";

import { redirect } from "next/navigation";
import { getIntakeRuntime, IntakeValidationError, parsePublicProjectRequestFormData } from "../../../../packages/crm/src/index.ts";

function buildValidationRedirect(fields: readonly string[]): never {
  redirect(`/request?error=validation&fields=${encodeURIComponent(fields.join(","))}`);
}

export async function submitProjectRequestAction(formData: FormData): Promise<never> {
  const runtime = getIntakeRuntime();

  try {
    const input = parsePublicProjectRequestFormData(formData);
    const result = await runtime.service.submitPublicProjectRequest(input);
    redirect(`/request/success?requestId=${encodeURIComponent(result.request.id)}`);
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      buildValidationRedirect(error.issues.map((issue) => issue.field));
    }

    redirect("/request?error=submission");
  }
}
