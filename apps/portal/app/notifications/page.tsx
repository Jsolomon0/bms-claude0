import { NotificationCenter, PageHeader, SectionGrid, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalNotificationsData } from "../../lib/notifications-data.ts";

export default async function PortalNotificationsPage() {
  const data = await getPortalNotificationsData();

  return (
    <PortalPageShell activeHref="/notifications" title="Notifications" subtitle="Messages and alerts">
      <PageHeader
        eyebrow="Notifications"
        title="Stakeholder alerts converge here after scope filtering."
        description="Notifications remain simplified, but they now aggregate project, document, message, approval, and finance prompts that the current external actor is actually allowed to see."
        badges={["Role-specific", "Scoped records only", "Portal-safe"]}
      />
      <SectionGrid>
        <NotificationCenter
          title="Current alerts"
          description="Each alert here is derived from server-filtered module data."
          notifications={data.notifications}
          span="8"
        />
        <StatsCard
          title="Alert mix"
          description="Project, document, finance, message, and approval counts stay bounded to the portal actor."
          stats={[
            { label: "Projects", value: String(data.stats.visibleProjects) },
            { label: "Documents", value: String(data.stats.visibleDocuments) },
            { label: "Threads", value: String(data.stats.activeThreads) },
            { label: "Pending approvals", value: String(data.stats.pendingApprovals) },
            { label: "Finance alerts", value: String(data.stats.financeAlerts) }
          ]}
          span="4"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
