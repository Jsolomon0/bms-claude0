import { toNotificationPreview } from "../../../packages/notifications/src/workflow.ts";
import {
  getApplicationDetailForActor,
  getHiringRuntime,
  listManagedJobPostingsForActor,
  listVisibleApplicationsForActor
} from "../../../packages/hiring/src/index.ts";
import { getDashboardActor } from "./shell-data.ts";

export async function getHiringDashboardData() {
  const runtime = getHiringRuntime();
  const actor = getDashboardActor();
  const [jobPostings, applications] = await Promise.all([
    listManagedJobPostingsForActor(runtime, actor),
    listVisibleApplicationsForActor(runtime, actor)
  ]);
  const pipelineOrder = [
    "draft",
    "submitted",
    "under_review",
    "interview_requested",
    "interview_scheduled",
    "offer_pending",
    "offer_accepted",
    "converted_to_employee",
    "rejected",
    "withdrawn"
  ] as const;

  return {
    jobPostings,
    applications,
    pipeline: pipelineOrder.map((status) => ({
      status,
      count: applications.filter((application) => application.status === status).length
    })),
    interviews: applications.flatMap((application) => runtime.repository.listInterviewsByApplicationId(application.id)),
    offers: applications.flatMap((application) => runtime.repository.listJobOffersByApplicationId(application.id)),
    notifications: runtime.notifications.listNotifications().slice(0, 6).map(toNotificationPreview),
    audits: runtime.auditSink.list().filter((event) => event.eventType.startsWith("hiring.")).slice(0, 8)
  };
}

export async function getHiringApplicationDetailData(applicationId: string) {
  return getApplicationDetailForActor(getHiringRuntime(), getDashboardActor(), applicationId);
}

export async function getHiringJobPostingDetailData(jobPostingId: string) {
  const runtime = getHiringRuntime();
  const actor = getDashboardActor();
  const jobPosting = runtime.repository.getJobPostingById(jobPostingId);

  if (!jobPosting) {
    return undefined;
  }

  const applications = (await listVisibleApplicationsForActor(runtime, actor)).filter(
    (application) => application.jobPostingId === jobPostingId
  );

  return {
    jobPosting,
    applications
  };
}
