import {
  NotificationCenter,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../lib/page-shell.tsx";
import { getPortalHomeData } from "../lib/home-data.ts";

export default async function PortalHomePage() {
  const data = await getPortalHomeData();

  return (
    <PortalPageShell activeHref="/" title="Workspace" subtitle="Stakeholder summary">
      <PageHeader
        eyebrow="Portal"
        title={data.copy.title}
        description={data.copy.description}
        actions={data.copy.actions}
        badges={data.copy.badges}
      />
      <SectionGrid>
        <StatsCard
          title="Scoped workspace"
          description="Portal cards collapse to only the modules that apply to the current external role."
          stats={data.stats}
          span="4"
        />
        <SimpleList
          title="Role focus"
          description="The simplified portal shell keeps only stakeholder-safe modules in view."
          items={data.spotlight}
          span="4"
        />
        <NotificationCenter
          title="Current alerts"
          description="Cross-module notifications remain filtered by the same record scope rules as the source modules."
          notifications={data.notifications}
          span="4"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
