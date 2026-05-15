import { EmptyState, PageHeader, PlaceholderPanel, SectionGrid, SimpleList, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { dashboardEmptyStates } from "../../lib/shell-data.ts";

export default function DashboardSettingsPage() {
  return (
    <DashboardPageShell activeHref="/settings" title="Settings workspace" subtitle="Policies, access, and integration controls">
      <PageHeader
        eyebrow="Settings"
        title="Owner and administrator controls stay isolated."
        description="The shell is already separated from business modules so policy, access, and environment configuration can be introduced gradually."
        actions={[
          { label: "Open audit log", href: "/audit" },
          { label: "Open notifications", href: "/notifications" }
        ]}
      />
      <SectionGrid>
        <StatsCard
          title="Admin surfaces"
          description="This page is intentionally protected by both role and permission-aware routing."
          stats={[
            { label: "Policy panels", value: "Ready" },
            { label: "User access", value: "Ready" },
            { label: "Integrations", value: "Placeholder" }
          ]}
          span="4"
        />
        <SimpleList
          title="Planned settings areas"
          description="Modules can land independently as the platform grows."
          items={[
            { title: "Access policy", body: "Role and permission tooling." },
            { title: "Retention policy", body: "Archive, delete, and legal-hold controls." },
            { title: "Integrations", body: "Provider configuration and environment wiring." }
          ]}
          span="8"
        />
        <PlaceholderPanel
          title="Settings panels"
          description="No mutable settings are active yet."
          emptyState={dashboardEmptyStates.settings}
        >
          <EmptyState content={dashboardEmptyStates.settings} />
        </PlaceholderPanel>
      </SectionGrid>
    </DashboardPageShell>
  );
}
