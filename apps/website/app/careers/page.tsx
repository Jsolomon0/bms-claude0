import { PageHeader, SectionGrid, SimpleList, KeyValueSummary } from "../../../../packages/ui/src/react/index.tsx";
import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getPublicJobBoardData } from "../../lib/hiring-data.ts";

export default async function WebsiteCareersPage() {
  const data = await getPublicJobBoardData();

  return (
    <WebsitePageShell>
      <PageHeader
        eyebrow="Careers"
        title="Public job board"
        description="Published hiring posts can be viewed and applied to publicly. Applicant records stay isolated from the rest of the BMS until an applicant signs into the applicant portal."
        actions={data.jobPostings[0] ? [{ label: "Open first posting", href: `/careers/${data.jobPostings[0].id}` }] : []}
        badges={["Public job posts", "Secure resume upload", "Applicant-only portal scope"]}
      />
      <SectionGrid>
        <SimpleList
          title="Open roles"
          description="Only published roles appear on the public career board."
          items={data.jobPostings.map((jobPosting) => ({
            title: `${jobPosting.title} -> /careers/${jobPosting.id}`,
            body: `${jobPosting.department} | ${jobPosting.location}`,
            meta: jobPosting.employmentType.replaceAll("_", " ")
          }))}
          span="8"
        />
        <KeyValueSummary
          title="Application controls"
          description="The public flow is rate-limited and validated server-side."
          items={[
            { label: "Published posts only", value: "Yes" },
            { label: "Resume required", value: "Yes" },
            { label: "Consent required", value: "Yes" },
            { label: "Rate limited", value: "Yes" }
          ]}
          span="4"
        />
      </SectionGrid>
    </WebsitePageShell>
  );
}
