import { ModuleGrid, PageHeader, SectionGrid, StatsCard } from "../../../../packages/ui/src/react/index.tsx";
import { WebsitePageShell } from "../../lib/page-shell.tsx";

export default function WebsiteSolutionsPage() {
  return (
    <WebsitePageShell>
      <PageHeader
        eyebrow="Solutions"
        title="Three surfaces, one operating model."
        description="The website, dashboard, and portal are intentionally separate so content, operations, and external collaboration do not collapse into one overloaded app."
      />
      <SectionGrid>
        <StatsCard
          title="Surface split"
          description="Each app is optimized for a different audience and security posture."
          stats={[
            { label: "Website", value: "Public" },
            { label: "Dashboard", value: "Internal" },
            { label: "Portal", value: "External" }
          ]}
          span="4"
        />
        <ModuleGrid
          title="What lands where"
          description="The shell helps keep domain boundaries clean."
          modules={[
            { title: "Website", description: "Marketing, intake, and access entry points." },
            { title: "Dashboard", description: "Full internal operations with side-nav and audit tooling." },
            { title: "Portal", description: "Role-scoped external collaboration and billing visibility." }
          ]}
        />
      </SectionGrid>
    </WebsitePageShell>
  );
}
