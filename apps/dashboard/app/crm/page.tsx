import {
  NotificationCenter,
  PageHeader,
  PipelineBoard,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getCrmHomeData } from "../../lib/crm-data.ts";
import { getDashboardNotifications } from "../../lib/shell-data.ts";

export default function DashboardCrmPage() {
  const data = getCrmHomeData();

  return (
    <DashboardPageShell activeHref="/crm" title="CRM workspace" subtitle="Lead intake and customer review">
      <PageHeader
        eyebrow="CRM"
        title="Lead intake and customer review operations"
        description="This module includes a public project-request entry point, a lead pipeline, short-term customer restrictions, and an internal review queue that can drive consultation, rejection, project-draft conversion, and long-term invitation."
        actions={[
          { label: "Open intake review queue", href: "/crm/requests" },
          { label: "Open public request form", href: "/request" }
        ]}
        badges={["Short-term customer rules", "Audit on status change", "Notification hooks"]}
      />
      <SectionGrid>
        <StatsCard
          title="Pipeline readiness"
          description="The review surface is wired to the intake workflow foundation and can absorb live persistence later."
          stats={[
            { label: "Requests in queue", value: String(data.requests.length) },
            { label: "Short-term only", value: "Yes" },
            { label: "Conversion actions", value: "5" }
          ]}
          span="4"
        />
        <PipelineBoard
          title="Lead status pipeline"
          description="The pipeline is derived from pure workflow state so the shell and tests use the same transitions."
          stages={data.pipeline.map((stage) => ({
            title: stage.label,
            count: String(stage.requestCount)
          }))}
        />
        <SimpleList
          title="Review queue preview"
          description="Recent intake requests waiting for admin review."
          items={data.queuePreview}
          span="8"
        />
        <NotificationCenter
          title="Review alerts"
          description="Submission and review notifications land in the shared center."
          notifications={data.notifications.length > 0 ? data.notifications : getDashboardNotifications()}
          span="4"
        />
        <SimpleList
          title="Recent audit events"
          description="Sensitive review actions generate audit records before the full audit module is wired to live persistence."
          items={data.audits.map((event) => ({
            title: event.eventType,
            body: `${event.reason ?? "workflow"} - ${event.resourceType ?? "resource"}:${event.resourceId ?? "unknown"}`,
            meta: event.occurredAt.slice(0, 16).replace("T", " ")
          }))}
          span="8"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
