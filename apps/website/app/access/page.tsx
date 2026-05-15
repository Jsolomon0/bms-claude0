import { PageHeader, SectionGrid, SimpleList, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { WebsitePageShell } from "../../lib/page-shell.tsx";

export default function WebsiteAccessPage() {
  return (
    <WebsitePageShell>
      <PageHeader
        eyebrow="Access"
        title="Direct each role to the right application."
        description="This public shell can expose clean entry points without leaking internal navigation or portal-only routes."
        actions={[
          { label: "Dashboard sign-in", href: "/dashboard-login" },
          { label: "Portal sign-in", href: "/portal-login" }
        ]}
      />
      <SectionGrid>
        <StatsCard
          title="Audience routing"
          description="The shell clarifies who belongs in which app."
          stats={[
            { label: "Owner/Admin", value: "Dashboard" },
            { label: "Employee", value: "Dashboard" },
            { label: "Customer/Partners", value: "Portal" }
          ]}
          span="4"
        />
        <SimpleList
          title="Planned access flows"
          description="Public routes stay simple, then hand off to secured surfaces."
          items={[
            { title: "Dashboard sign-in", body: "Internal staff authentication and owner/admin tools." },
            { title: "Portal sign-in", body: "Customer and partner workspace entry." },
            { title: "Signed public links", body: "No-login access for approved payment, document, and project views." }
          ]}
          span="8"
        />
      </SectionGrid>
    </WebsitePageShell>
  );
}
