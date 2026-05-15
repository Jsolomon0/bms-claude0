"use server";

import { redirect } from "next/navigation";
import { authorizeOrThrow } from "../../../../../packages/auth/src/server/index.ts";
import {
  getIntakeRuntime,
  getPermissionKeyForReviewAction,
  IntakeTransitionError,
  parseProjectRequestReviewActionFormData,
  ReviewActionParseError,
  toProjectRequestResourceRecord
} from "../../../../../packages/crm/src/index.ts";
import { getDashboardActor } from "../../../lib/shell-data.ts";

export async function applyProjectRequestReviewAction(formData: FormData): Promise<never> {
  const requestId = typeof formData.get("requestId") === "string" ? String(formData.get("requestId")).trim() : "";

  if (!requestId) {
    redirect("/crm/requests?error=missing_request");
  }

  const runtime = getIntakeRuntime();

  try {
    const action = parseProjectRequestReviewActionFormData(formData);
    const detail = runtime.service.getRequestDetail(requestId);

    if (!detail.request) {
      redirect(`/crm/requests?error=missing_request&requestId=${encodeURIComponent(requestId)}`);
    }

    await authorizeOrThrow(
      {
        actor: getDashboardActor(),
        permissionKey: getPermissionKeyForReviewAction(action.type),
        record: toProjectRequestResourceRecord(detail.request),
        now: new Date()
      },
      runtime.auditSink
    );

    await runtime.service.applyReviewAction(requestId, action);
    redirect(`/crm/requests/${encodeURIComponent(requestId)}?result=${encodeURIComponent(action.type)}`);
  } catch (error) {
    if (error instanceof ReviewActionParseError) {
      redirect(`/crm/requests/${encodeURIComponent(requestId)}?error=parse`);
    }

    if (error instanceof IntakeTransitionError) {
      redirect(`/crm/requests/${encodeURIComponent(requestId)}?error=transition`);
    }

    redirect(`/crm/requests/${encodeURIComponent(requestId)}?error=authorization`);
  }
}
