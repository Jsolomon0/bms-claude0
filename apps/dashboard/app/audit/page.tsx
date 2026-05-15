import { NotificationCenter, PageHeader, SectionGrid, SimpleList, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { dashboardAuditPreview, getDashboardNotifications } from "../../lib/shell-data.ts";

export default function DashboardAuditPage() {
  return (
    <DashboardPageShell activeHref="/audit" title="Audit log" subtitle="Sensitive access and policy events">
      <PageHeader
        eyebrow="Audit"
        title="Owner and administrator audit surface"
        description="This page is present now so authorization, public-link, and finance-sensitive events already have a destination before final business workflows are implemented."
        badges={["Owner/Admin only", "Append-only event stream", "Test-friendly route"]}
      />
      <SectionGrid>
        <StatsCard
          title="Audit readiness"
          description="The event stream is prepared for security-critical workflows."
          stats={[
            { label: "Sensitive actions", value: "Tracked" },
            { label: "Public link events", value: "Tracked" },
            { label: "Finance events", value: "Next" }
          ]}
          span="4"
        />
        <SimpleList
          title="Recent audit event placeholders"
          description="These items represent the stream that the authorization foundation already emits."
          items={dashboardAuditPreview}
          span="8"
        />
        <NotificationCenter
          title="Alert lane"
          description="Operational security alerts will share the same shell card styles."
          notifications={getDashboardNotifications()}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
