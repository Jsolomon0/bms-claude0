import {
  KeyValueSummary,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardProjectsHomeData } from "../../lib/project-data.ts";

export default function DashboardProjectsPage() {
  const data = getDashboardProjectsHomeData();

  return (
    <DashboardPageShell activeHref="/projects" title="Projects workspace" subtitle="Delivery, phases, tasks, and change orders">
      <PageHeader
        eyebrow="Projects"
        title="Project delivery is now backed by a real workflow layer."
        description="Projects can be created from approved requests, broken into phases and tasks, shared with external stakeholders by visibility level, and exposed through signed public links."
        actions={[
          { label: "Open featured project", href: "/projects/project-demo-1" },
          { label: "Open portal view", href: "/projects" }
        ]}
        badges={["Status lifecycle", "Change orders", "Public share links"]}
      />
      <SectionGrid>
        <StatsCard
          title="Project operations"
          description="Runtime counts come from the project service rather than placeholder shell data."
          stats={[
            { label: "Projects", value: String(data.stats.totalProjects) },
            { label: "Active", value: String(data.stats.activeProjects) },
            { label: "Open change requests", value: String(data.stats.openChangeRequests) },
            { label: "Public shares", value: String(data.stats.publicShares) }
          ]}
          span="4"
        />
        <SimpleList
          title="Project roster"
          description="Each project route resolves from the shared project runtime."
          items={data.projects.map((project) => ({
            title: `${project.name} -> /projects/${project.id}`,
            body: `${project.status} | visibility: ${project.visibilityFlags.join(", ")}`,
            meta: `Source request: ${project.sourceRequestId}`
          }))}
          span="8"
        />
        <KeyValueSummary
          title="Featured project"
          description="The seeded demo project shows customer, partner, and public-link visibility on the same record."
          items={
            data.featuredProject?.project
              ? [
                  { label: "Name", value: data.featuredProject.project.name },
                  { label: "Status", value: data.featuredProject.project.status },
                  { label: "Phases", value: String(data.featuredProject.phases.length) },
                  { label: "Tasks", value: String(data.featuredProject.tasks.length) },
                  { label: "Progress updates", value: String(data.featuredProject.progressUpdates.length) },
                  { label: "Change orders", value: String(data.featuredProject.changeOrders.length) }
                ]
              : []
          }
          span="8"
        />
        <SimpleList
          title="Recent audit events"
          description="Status, visibility, and public-link events flow into the shared audit sink."
          items={data.auditPreview.map((event) => ({
            title: event.eventType,
            body: `${event.resourceType ?? "resource"}:${event.resourceId ?? "unknown"}`,
            meta: event.occurredAt.slice(0, 16).replace("T", " ")
          }))}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
