import { NotificationCenter, PageHeader, SectionGrid, SimpleList, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardNotifications } from "../../lib/shell-data.ts";

export default function DashboardNotificationsPage() {
  return (
    <DashboardPageShell activeHref="/notifications" title="Notification center" subtitle="Alerts, prompts, and workflow signals">
      <PageHeader
        eyebrow="Notifications"
        title="A shared alert surface is mounted before live module events arrive."
        description="Modules will be able to emit cards, digests, and prompts into this page without owning their own notification layout."
      />
      <SectionGrid>
        <NotificationCenter
          title="Current alerts"
          description="These placeholder alerts demonstrate the shared notification presentation."
          notifications={getDashboardNotifications()}
          span="8"
        />
        <StatsCard
          title="Delivery channels"
          description="The UI shell is channel-agnostic."
          stats={[
            { label: "In-app", value: "Ready" },
            { label: "Email", value: "Ready" },
            { label: "Push/SMS", value: "Next" }
          ]}
          span="4"
        />
        <SimpleList
          title="Planned behaviors"
          description="The notification center is intentionally modular."
          items={[
            { title: "Unread grouping", body: "Role and module aware alert buckets." },
            { title: "Message links", body: "Thread and document deep links reuse shell routing." },
            { title: "Quiet states", body: "Empty inbox behavior uses the same state component family." }
          ]}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
