import {
  KeyValueSummary,
  PageHeader,
  PipelineBoard,
  SectionGrid,
  SimpleList
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getHiringDashboardData } from "../../lib/hiring-data.ts";

export default async function DashboardHiringPage() {
  const data = await getHiringDashboardData();

  return (
    <DashboardPageShell activeHref="/hiring" title="Hiring pipeline" subtitle="Job posts, applicants, interviews, and offers">
      <PageHeader
        eyebrow="Hiring"
        title="Applicant Tracking & Hiring is isolated behind its own authorization boundary."
        description="Owner and administrator users manage job postings, applications, interviews, offers, and applicant-to-employee conversion here. Applicant records never spill into CRM, projects, payroll, or finance modules."
        actions={[
          { label: "Open first posting", href: data.jobPostings[0] ? `/hiring/jobs/${data.jobPostings[0].id}` : "/hiring" },
          {
            label: "Open first application",
            href: data.applications[0] ? `/hiring/applications/${data.applications[0].id}` : "/hiring"
          }
        ]}
        badges={["Applicant-only scope", "Interview assignments", "Conversion audit trail"]}
      />
      <SectionGrid>
        <PipelineBoard
          title="Application pipeline"
          description="Status counts are derived from the shared hiring workflow service."
          stages={data.pipeline.map((stage) => ({
            title: stage.status.replaceAll("_", " "),
            count: String(stage.count)
          }))}
        />
        <KeyValueSummary
          title="Hiring operations"
          description="The internal dashboard only exposes hiring-safe records."
          items={[
            { label: "Job postings", value: String(data.jobPostings.length) },
            { label: "Applications", value: String(data.applications.length) },
            { label: "Interviews", value: String(data.interviews.length) },
            { label: "Offers", value: String(data.offers.length) }
          ]}
          span="4"
        />
        <SimpleList
          title="Job postings"
          description="Published posts feed the public career board; draft and archived posts remain internal."
          items={data.jobPostings.map((jobPosting) => ({
            title: `${jobPosting.title} -> /hiring/jobs/${jobPosting.id}`,
            body: `${jobPosting.department} | ${jobPosting.location} | ${jobPosting.status}`,
            meta: jobPosting.employmentType.replaceAll("_", " ")
          }))}
          span="8"
        />
        <SimpleList
          title="Applicant queue"
          description="Each application detail route exposes internal notes, documents, interviews, and offer controls."
          items={data.applications.map((application) => ({
            title: `${application.id} -> /hiring/applications/${application.id}`,
            body: `${application.status.replaceAll("_", " ")} | posting: ${application.jobPostingId}`,
            meta: application.submittedAt ?? application.createdAt
          }))}
          span="8"
        />
        <SimpleList
          title="Recent hiring notifications"
          description="Submission and review notifications are emitted from the shared hiring runtime."
          items={data.notifications.map((notification) => ({
            title: notification.title,
            body: notification.body,
            meta: notification.timestampLabel
          }))}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
