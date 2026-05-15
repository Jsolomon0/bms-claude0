import { KeyValueSummary, PageHeader, SectionGrid, SimpleList } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getApplicantApplicationsData } from "../../lib/hiring-data.ts";

export default async function ApplicantApplicationsPage() {
  const applications = await getApplicantApplicationsData();

  return (
    <PortalPageShell activeHref="/applications" title="Applications" subtitle="Your hiring application records">
      <PageHeader
        eyebrow="Applicant portal"
        title="Only your own applications appear here."
        description="Applicant records are isolated from projects, customers, payroll, finance, partner data, and internal admin surfaces."
        actions={[{ label: "Open workspace", href: "/" }]}
        badges={["Self-only access", "Server-side authorization", "Hiring-only scope"]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Applicant scope"
          description="The applicant portal is limited to hiring records tied to the authenticated applicant."
          items={[
            { label: "Visible applications", value: String(applications.length) },
            { label: "Projects", value: "Not available" },
            { label: "Payroll", value: "Not available" },
            { label: "Admin dashboards", value: "Not available" }
          ]}
          span="4"
        />
        <SimpleList
          title="Application records"
          description="Each detail route hides internal notes, interview feedback, and unsent offers."
          items={applications.map((application) => ({
            title: `${application.id} -> /applications/${application.id}`,
            body: application.status.replaceAll("_", " "),
            meta: application.submittedAt ?? application.createdAt
          }))}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
