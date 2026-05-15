import {
  NotificationCenter,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getAutomationDashboardData } from "../../lib/automation-data.ts";

export default function DashboardAutomationPage() {
  const data = getAutomationDashboardData();

  return (
    <DashboardPageShell activeHref="/automation" title="Workflow automation" subtitle="Jobs, reminders, and failures">
      <PageHeader
        eyebrow="Automation"
        title="Scheduled processing is isolated from user-driven module writes."
        description="Automation jobs keep their own idempotency keys, retry counts, failure state, and reminder outputs so owner and administrator users can inspect what happened without opening raw logs."
        badges={["Idempotent jobs", "Retry-safe actions", "Automated audit trail"]}
      />
      <SectionGrid>
        <StatsCard
          title="Runtime summary"
          description="The automation layer exposes its own execution ledger."
          stats={[
            { label: "Defined jobs", value: String(data.summary.definedJobs) },
            { label: "Recorded runs", value: String(data.summary.recentRuns) },
            { label: "Failed runs", value: String(data.summary.failedRuns) },
            { label: "Executed actions", value: String(data.summary.executedActions) }
          ]}
          span="8"
        />
        <NotificationCenter
          title="Recent automated notifications"
          description="Reminder and event notifications emitted by the automation layer appear here once jobs run."
          notifications={
            data.notifications.length > 0
              ? data.notifications
              : [
                  {
                    id: "automation-no-notifications",
                    title: "No automated notifications yet",
                    body: "Scheduled or event-driven workflows will populate this once they execute.",
                    tone: "info",
                    timestampLabel: "Now"
                  }
                ]
          }
          span="4"
        />
        <SimpleList
          title="Job definitions"
          description="Each job publishes its schedule and retry policy."
          items={data.jobDefinitions.map((job) => ({
            title: job.name,
            body: `${job.description} Schedule: ${job.schedule}. Retry: ${job.retryPolicy}.`,
            meta: job.key
          }))}
          span="8"
        />
        <SimpleList
          title="Latest runs"
          description="Runs stay visible even when they are safe to replay."
          items={
            data.latestRuns.length > 0
              ? data.latestRuns.map((run) => ({
                  title: `${run.jobKey} (${run.status})`,
                  body: `Attempts: ${run.attemptCount}. Processed ${run.stats.processedCount}, succeeded ${run.stats.succeededCount}, skipped ${run.stats.skippedCount}, failed ${run.stats.failedCount}.`,
                  meta: run.startedAt.slice(0, 16).replace("T", " ")
                }))
              : [
                  {
                    title: "No runs recorded yet",
                    body: "The execution ledger will populate when a scheduled sweep or event dispatch occurs.",
                    meta: "Idle"
                  }
                ]
          }
          span="4"
        />
        <SimpleList
          title="Failure reporting"
          description="Failed runs persist their last error until the next retry succeeds."
          items={
            data.failedRuns.length > 0
              ? data.failedRuns.map((run) => ({
                  title: run.jobKey,
                  body: run.lastError ?? "Unknown automation failure.",
                  meta: run.failedAt?.slice(0, 16).replace("T", " ") ?? "Failed"
                }))
              : [
                  {
                    title: "No failures recorded",
                    body: "Job failures will remain visible here for admin review.",
                    meta: "Healthy"
                  }
                ]
          }
          span="4"
        />
        <SimpleList
          title="Recent action ledger"
          description="Resource-scoped action keys prevent duplicate reminder sends and duplicate automated transitions."
          items={
            data.actionRecords.length > 0
              ? data.actionRecords.map((record) => ({
                  title: record.summary,
                  body: `${record.resourceType ?? "automation"} ${record.resourceId ?? record.actionKey}`,
                  meta: record.executedAt.slice(0, 16).replace("T", " ")
                }))
              : [
                  {
                    title: "No automated actions executed",
                    body: "Action records are written after each successful idempotent step.",
                    meta: "Idle"
                  }
                ]
          }
          span="8"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}

