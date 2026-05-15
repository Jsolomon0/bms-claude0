import { EmptyState, ModuleGrid, PageHeader, PlaceholderPanel, SectionGrid, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { dashboardEmptyStates } from "../../lib/shell-data.ts";

export default function DashboardPartnersPage() {
  return (
    <DashboardPageShell activeHref="/partners" title="Partners workspace" subtitle="Subcontractor and supercontractor operations">
      <PageHeader
        eyebrow="Partners"
        title="External delivery partners plug into the same shell without inheriting internal finance access."
        description="This module will eventually host partner qualification, assignments, compliance, and relationship management."
      />
      <SectionGrid>
        <StatsCard
          title="Partner guardrails"
          description="The shell separates partner-safe modules from internal-only settings."
          stats={[
            { label: "Partner lists", value: "Ready" },
            { label: "Compliance cards", value: "Ready" },
            { label: "Assignment views", value: "Ready" }
          ]}
          span="4"
        />
        <ModuleGrid
          title="Partner lanes"
          description="Early placeholder modules for external workforce coordination."
          modules={[
            { title: "Subcontractors", description: "Qualification, contacts, and scoped project work." },
            { title: "Supercontractors", description: "Oversight relationships and managed partner visibility." },
            { title: "Compliance", description: "Insurance, status, and retention-safe records." }
          ]}
        />
        <PlaceholderPanel
          title="Partner roster"
          description="No partner data is rendered yet."
          emptyState={dashboardEmptyStates.partners}
        >
          <EmptyState content={dashboardEmptyStates.partners} />
        </PlaceholderPanel>
      </SectionGrid>
    </DashboardPageShell>
  );
}
