import { getAutomationRuntime } from "../../../packages/automation/src/index.ts";
import { getNotificationsRuntime, toNotificationPreview } from "../../../packages/notifications/src/index.ts";

export function getAutomationDashboardData() {
  const automationRuntime = getAutomationRuntime();
  const notificationsRuntime = getNotificationsRuntime();
  const jobDefinitions = automationRuntime.service.listJobDefinitions();
  const jobRuns = automationRuntime.service.listJobRuns();
  const failedRuns = automationRuntime.service.listFailedJobRuns();
  const actions = automationRuntime.service.listActionRecords();
  const notificationPreviews = notificationsRuntime.service
    .listNotifications()
    .slice(0, 6)
    .map(toNotificationPreview);

  return {
    summary: {
      definedJobs: jobDefinitions.length,
      recentRuns: jobRuns.length,
      failedRuns: failedRuns.length,
      executedActions: actions.length,
      notifications: notificationPreviews.length
    },
    jobDefinitions,
    latestRuns: jobRuns.slice(0, 8),
    failedRuns: failedRuns.slice(0, 5),
    actionRecords: actions.slice(0, 8),
    notifications: notificationPreviews
  };
}

