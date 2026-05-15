import { ModuleGrid, PageHeader, SectionGrid, SimpleList, StatsCard } from "../../../packages/ui/src/react/index.tsx";
import { WebsitePageShell } from "../lib/page-shell.tsx";
import { websiteHighlights } from "../lib/shell-data.ts";

export default function WebsiteHomePage() {
  return (
    <WebsitePageShell>
      <PageHeader
        eyebrow="BMS Website"
        title="A public shell that points people into the right workspace."
        description="This website surface is intentionally separate from the dashboard and portal. It can host headless WordPress content, intake entry points, and access CTAs without becoming the system of record."
        actions={[
          { label: "Request a project", href: "/request" },
          { label: "Explore solutions", href: "/solutions" }
        ]}
        badges={["Public surface", "Headless-ready", "Shared design system"]}
      />
      <SectionGrid>
        <StatsCard
          title="Public-facing shell"
          description="The website shares visual language with the app shells while staying lighter and unprotected."
          stats={[
            { label: "Marketing pages", value: "Ready" },
            { label: "Access CTAs", value: "Ready" },
            { label: "Intake mount points", value: "Ready" }
          ]}
          span="4"
        />
        <ModuleGrid
          title="Platform story"
          description="Short modules that explain how the three BMS app surfaces fit together."
          modules={websiteHighlights}
        />
        <SimpleList
          title="Public integration notes"
          description="The website stays a presentation layer."
          items={[
            {
              title: "Headless WordPress compatible",
              body: "Public content can flow through this shell without duplicating operational records."
            },
            {
              title: "Signed-link handoff ready",
              body: "Public document, project, and payment views can land on separate scoped routes later."
            },
            {
              title: "Role-aware entry points",
              body: "Customers, partners, and internal teams can be directed into the correct secured app."
            }
          ]}
          span="4"
        />
      </SectionGrid>
    </WebsitePageShell>
  );
}
