import { KeyValueSummary, PageHeader, SectionGrid, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalActor, getPortalPrimaryRole } from "../../lib/shell-data.ts";

export default function PortalSettingsPage() {
  const actor = getPortalActor();
  const membership = actor.memberships[0];
  const role = getPortalPrimaryRole(actor);

  return (
    <PortalPageShell activeHref="/settings" title="Settings" subtitle="Profile and preferences">
      <PageHeader
        eyebrow="Settings"
        title="Portal settings stay personal and scope-aware."
        description="The external settings surface only exposes profile and access context for the authenticated stakeholder. Global policy and security administration stay in the dashboard."
        badges={["Personal only", "External-safe", "No tenant controls"]}
      />
      <SectionGrid>
        <StatsCard
          title="Current access profile"
          description="The portal role controls which routes and records can ever appear in this surface."
          stats={[
            { label: "Role", value: role },
            { label: "User", value: actor.userId },
            {
              label: "Projects scope",
              value: actor.assignedProjectIds?.length
                ? "Assigned"
                : actor.managedPartnerOrgIds?.length
                  ? "Managed partner"
                  : "Customer self"
            }
          ]}
          span="4"
        />
        <KeyValueSummary
          title="Membership scope"
          description="This summary reflects the exact scope fields used by server-side record authorization."
          items={[
            { label: "Customer account", value: membership.customerAccountId ?? "None" },
            { label: "Partner organization", value: membership.partnerOrgId ?? "None" },
            { label: "Assigned projects", value: String(actor.assignedProjectIds?.length ?? 0) },
            { label: "Managed partner orgs", value: String(actor.managedPartnerOrgIds?.length ?? 0) }
          ]}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
