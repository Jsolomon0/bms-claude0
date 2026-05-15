import { getIntakeRuntime } from "../../../packages/crm/src/index.ts";
import type { NotificationDispatch, NotificationPreview } from "../../../packages/types/src/index.ts";

function toNotificationTone(notification: NotificationDispatch): NotificationPreview["tone"] {
  if (notification.type === "intake.review.rejected" || notification.type === "intake.review.request_more_info") {
    return "warning";
  }

  if (notification.type === "intake.review.project_draft_created" || notification.type === "intake.review.long_term_invited") {
    return "success";
  }

  return "info";
}

function toNotificationPreview(notification: NotificationDispatch): NotificationPreview {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    tone: toNotificationTone(notification),
    timestampLabel: notification.createdAt.slice(0, 16).replace("T", " ")
  };
}

export function getCrmHomeData() {
  const runtime = getIntakeRuntime();
  const service = runtime.service;
  const requests = service.listRequests();
  const pipeline = service.listLeadPipelineStages();

  return {
    requests,
    pipeline,
    queuePreview: requests.slice(0, 3).map((request) => ({
      title: request.projectTitle,
      body: `${request.submitterName} - ${request.status.replaceAll("_", " ")}`,
      meta: request.submittedAt.slice(0, 10)
    })),
    notifications: runtime.notificationSink.list().slice(0, 4).map(toNotificationPreview),
    audits: runtime.auditSink.list().slice(0, 4)
  };
}

export function getRequestQueueData() {
  return getIntakeRuntime().service.listRequests();
}

export function getRequestDetailData(requestId: string) {
  return getIntakeRuntime().service.getRequestDetail(requestId);
}
