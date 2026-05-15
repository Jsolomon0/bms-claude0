import { EmptyState, PageHeader, PlaceholderPanel, SectionGrid, SimpleList, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { dashboardEmptyStates } from "../../lib/shell-data.ts";

export default function DashboardInventoryPage() {
  return (
    <DashboardPageShell activeHref="/inventory" title="Inventory workspace" subtitle="Stock and material allocation">
      <PageHeader
        eyebrow="Inventory"
        title="Inventory screens inherit the same internal shell and audit posture."
        description="Stock levels, movement history, and project material allocations can arrive incrementally without changing navigation or loading states."
      />
      <SectionGrid>
        <StatsCard
          title="Warehouse shell"
          description="Operational placeholders for stock-aware modules."
          stats={[
            { label: "Stock cards", value: "Ready" },
            { label: "Movement feed", value: "Ready" },
            { label: "Project allocation", value: "Ready" }
          ]}
          span="4"
        />
        <SimpleList
          title="Planned inventory views"
          description="These views map to the normalized schema already in the repo."
          items={[
            { title: "Item index", body: "Catalog with reorder and status surfaces." },
            { title: "Movement journal", body: "Append-only movement timeline for audit-safe stock tracking." },
            { title: "Project allocations", body: "Material requests and fulfillment states." }
          ]}
          span="8"
        />
        <PlaceholderPanel
          title="Inventory records"
          description="No stock records are connected yet."
          emptyState={dashboardEmptyStates.inventory}
        >
          <EmptyState content={dashboardEmptyStates.inventory} />
        </PlaceholderPanel>
      </SectionGrid>
    </DashboardPageShell>
  );
}
