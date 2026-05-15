import { KeyValueSummary, PageHeader, SectionGrid, SimpleList } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getApplicantInterviewsData } from "../../lib/hiring-data.ts";

export default async function ApplicantInterviewsPage() {
  const interviews = await getApplicantInterviewsData();

  return (
    <PortalPageShell activeHref="/interviews" title="Interviews" subtitle="Your own interview schedule">
      <PageHeader
        eyebrow="Applicant interviews"
        title="Interview access remains limited to your own schedule."
        description="Employees do not see applicant records unless they are explicitly assigned as interviewers. Applicants only see their own interview schedule and response state."
        actions={[{ label: "Back to applications", href: "/applications" }]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Interview scope"
          description="Assigned interviewer access is enforced server-side."
          items={[
            { label: "Visible interviews", value: String(interviews.length) },
            { label: "Internal notes", value: "Hidden" },
            { label: "Interviewer feedback", value: "Hidden" }
          ]}
          span="4"
        />
        <SimpleList
          title="Interview schedule"
          description="Request and schedule states flow from the shared hiring runtime."
          items={interviews.map((interview) => ({
            title: `${interview.interviewType.replaceAll("_", " ")} | ${interview.status}`,
            body: interview.locationOrMeetingUrl,
            meta: interview.scheduledStart ?? interview.createdAt
          }))}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
