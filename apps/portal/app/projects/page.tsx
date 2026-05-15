import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList
} from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getPortalProjectsData } from "../../lib/project-data.ts";

export default async function PortalProjectsPage() {
  const projects = await getPortalProjectsData();

  return (
    <PortalPageShell activeHref="/projects" title="Projects" subtitle="Assigned and shared work">
      <PageHeader
        eyebrow="Projects"
        title="Portal project views are filtered by authorization and visibility."
        description="Customers, subcontractors, and supercontractors see the same route, but only the project records and visibility lanes they are allowed to access."
        actions={[{ label: "Open workspace", href: "/" }]}
        badges={["Customer self scope", "Partner scope", "Public-link safe"]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Scope model"
          description="The seeded runtime is filtered through project-view authorization before it reaches the portal."
          items={[
            { label: "Visible projects", value: String(projects.length) },
            { label: "Customer access", value: "Self" },
            { label: "Partner access", value: "Assigned or partner" },
            { label: "Internal-only data", value: "Excluded" }
          ]}
          span="4"
        />
        {projects.length > 0 ? (
          <SimpleList
            title="Published projects"
            description="Only authorized projects make it into this list."
            items={projects.map((project) => ({
              title: `${project.name} -> /projects/${project.id}`,
              body: `${project.status} | visibility: ${project.visibilityFlags.join(", ")}`,
              meta: `Owner: ${project.ownerUserId}`
            }))}
            span="8"
          />
        ) : (
          <PlaceholderPanel
            title="Shared projects"
            description="No published projects are visible for the current portal actor."
            emptyState={{
              title: "No projects published",
              description: "Projects appear here only when their visibility and record scope allow this actor to see them."
            }}
          >
            <EmptyState
              content={{
                title: "No projects published",
                description: "Projects appear here only when their visibility and record scope allow this actor to see them."
              }}
            />
          </PlaceholderPanel>
        )}
      </SectionGrid>
    </PortalPageShell>
  );
}
