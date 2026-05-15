import { KeyValueSummary, PageHeader, SectionGrid, SimpleList } from "../../../../packages/ui/src/react/index.tsx";
import { PortalPageShell } from "../../lib/page-shell.tsx";
import { getApplicantOnboardingData } from "../../lib/hiring-data.ts";

export default async function ApplicantOnboardingPage() {
  const onboarding = await getApplicantOnboardingData();

  return (
    <PortalPageShell activeHref="/onboarding" title="Onboarding" subtitle="Checklist after offer acceptance">
      <PageHeader
        eyebrow="Applicant onboarding"
        title="Onboarding is visible only for your own accepted application."
        description="Checklist creation is triggered by offer acceptance or applicant conversion and preserves hiring history."
        actions={[{ label: "Back to offers", href: "/offers" }]}
      />
      <SectionGrid>
        <KeyValueSummary
          title="Checklist scope"
          description="Accepted applicants can track next steps without exposing internal employee or payroll records."
          items={[
            { label: "Visible checklists", value: String(onboarding.length) },
            { label: "Employee records", value: "Hidden" },
            { label: "Payroll setup", value: "Hidden" }
          ]}
          span="4"
        />
        <SimpleList
          title="Checklist tasks"
          description="Each task remains tied to the accepted application."
          items={onboarding.flatMap((entry) =>
            entry.tasks.map((task) => ({
              title: task.title,
              body: task.description ?? task.status,
              meta: task.dueDate ?? task.updatedAt
            }))
          )}
          span="8"
        />
      </SectionGrid>
    </PortalPageShell>
  );
}
