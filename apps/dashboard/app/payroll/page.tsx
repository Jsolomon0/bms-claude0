import {
  EmptyState,
  KeyValueSummary,
  PageHeader,
  PlaceholderPanel,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardPayrollHomeData } from "../../lib/payroll-data.ts";

export default async function DashboardPayrollPage() {
  const data = await getDashboardPayrollHomeData();

  return (
    <DashboardPageShell activeHref="/payroll" title="Payroll workspace" subtitle="Attendance, exports, and provider runs">
      <PageHeader
        eyebrow="Payroll"
        title="Payroll now runs as an embedded-provider integration instead of an in-house engine."
        description="Attendance approval still happens here, but employee profiles, approved-time exports, payroll runs, documents, and labor-cost mapping are all tracked as provider-backed records."
        actions={[
          { label: "Open submitted review", href: data.reviewQueue[0] ? `/payroll/${data.reviewQueue[0].id}` : "/payroll" },
          { label: "Review permissions", href: "/settings" }
        ]}
        badges={["Provider abstraction", "Sensitive-field isolation", "Project cost mapping"]}
      />
      <SectionGrid>
        <StatsCard
          title="Payroll pulse"
          description="Operational counts combine time approval with provider-run visibility."
          stats={[
            { label: "My hours", value: data.formatMinutes(data.stats.ownMinutes) },
            { label: "Review queue", value: String(data.stats.submittedTimesheets) },
            { label: "Runs", value: String(data.stats.payrollRuns) },
            { label: "Docs", value: String(data.stats.payrollDocuments) }
          ]}
          span="4"
        />
        <KeyValueSummary
          title="My payroll profile"
          description="Only masked self-service details are shown here; export rates remain restricted to org-level payroll viewers."
          items={[
            { label: "Profile status", value: data.ownProfile?.profile.status ?? "No profile" },
            { label: "Provider", value: data.ownProfile?.profile.providerName ?? "Not linked" },
            { label: "Masked tax id", value: data.ownProfile?.sensitiveSummary.maskedTaxId ?? "Not available" },
            { label: "Bank last4", value: data.ownProfile?.sensitiveSummary.bankAccountLast4 ?? "Not available" },
            { label: "Onboarding", value: data.ownProfile?.sensitiveSummary.providerOnboardingUrl ? "Embedded link ready" : "Not available" },
            { label: "Active profiles", value: String(data.stats.activeProfiles) }
          ]}
          span="8"
        />
        {data.ownTimesheets.length > 0 ? (
          <SimpleList
            title="My weekly timesheets"
            description="Approved timesheets become the export handoff boundary for the embedded payroll provider."
            items={data.ownTimesheets.map((timesheet) => ({
              title: `${timesheet.id} -> /payroll/${timesheet.id}`,
              body: `${timesheet.status} | total ${data.formatMinutes(timesheet.totalMinutes)} | export ${timesheet.payrollExportState}`,
              meta: `Pay period ${timesheet.payPeriodId}`
            }))}
            span="8"
          />
        ) : (
          <PlaceholderPanel
            title="My weekly timesheets"
            description="A new timesheet opens automatically when the first valid clock session lands in the current pay period."
            emptyState={{
              title: "No personal timesheets",
              description: "Clock into a project or task to start building the current week's attendance record."
            }}
          >
            <EmptyState
              content={{
                title: "No personal timesheets",
                description: "Clock into a project or task to start building the current week's attendance record."
              }}
            />
          </PlaceholderPanel>
        )}
        <SimpleList
          title="My recent entries"
          description="Project-linked entries keep notes and export state, but they do not store tax or payout data."
          items={data.ownEntries.map((entry) => ({
            title: `${entry.workDate} | ${data.formatMinutes(entry.minutesWorked)}`,
            body: `${entry.projectId ?? "No project"} | ${entry.taskId ?? "No task"} | ${entry.status}`,
            meta: entry.notes ?? "No notes"
          }))}
          span="4"
        />
        <SimpleList
          title="Admin review queue"
          description="Only submitted timesheets appear here for approval before export."
          items={data.reviewQueue.map((timesheet) => ({
            title: `${timesheet.employeeUserId} -> /payroll/${timesheet.id}`,
            body: `${timesheet.status} | ${data.formatMinutes(timesheet.totalMinutes)} | submitted ${timesheet.submittedAt?.slice(0, 16).replace("T", " ") ?? "n/a"}`,
            meta: `Export ${timesheet.payrollExportState}`
          }))}
          span="4"
        />
        <SimpleList
          title="Payroll profiles"
          description="Provider-backed employee profiles keep onboarding state and masked tax/bank indicators separate from labor-cost rates."
          items={data.payrollProfiles.map((entry) => ({
            title: `${entry.profile.legalName} | ${entry.profile.status}`,
            body: `${entry.profile.employeeUserId} | ${entry.profile.compensationType} | ${entry.profile.paySchedule}`,
            meta: `Masked tax ${entry.sensitiveSummary.maskedTaxId ?? "n/a"}${typeof entry.sensitiveSummary.laborCostRateCents === "number" ? ` | rate $${(entry.sensitiveSummary.laborCostRateCents / 100).toFixed(2)}/hr` : ""}`
          }))}
          span="4"
        />
        <SimpleList
          title="Payroll run history"
          description="Approved time exports create tracked provider runs instead of calculating payroll in-house."
          items={data.payrollRuns.map((run) => ({
            title: `${run.id} | ${run.status}`,
            body: `${run.approvedTimeEntryCount} entries | ${data.formatMinutes(run.totalMinutes)} | labor $${(run.totalLaborCostCents / 100).toFixed(2)}`,
            meta: `Provider ${run.providerRunId ?? "pending"}`
          }))}
          span="4"
        />
        <SimpleList
          title="Payroll documents"
          description="Self-service payroll files are provider-issued records, not general document workflow files."
          items={data.payrollDocuments.map((document) => ({
            title: `${document.employeeUserId} | ${document.category}`,
            body: `${document.title} | ${document.fileName}`,
            meta: document.issuedAt.slice(0, 10)
          }))}
          span="4"
        />
        <SimpleList
          title="Live attendance"
          description="Open clock sessions stay visible for manager review without exposing public or external routes."
          items={data.liveSessions.map((session) => ({
            title: session.employeeUserId,
            body: `${session.projectId ?? "No project"} | ${data.formatMinutes(session.workedMinutesSoFar)} so far`,
            meta: session.activeBreakStartedAt ? "Currently on break" : "Working"
          }))}
          span="4"
        />
        <SimpleList
          title="Immutable review history"
          description="Submitted and approved timesheets append immutable snapshots that remain separate from provider run history."
          items={data.auditRecords.slice(0, 6).map((record) => ({
            title: `${record.action} | ${record.timesheetId}`,
            body: `${record.actorUserId} | ${data.formatMinutes(record.snapshot.totalMinutes)} | export ${record.snapshot.payrollExportState}`,
            meta: record.occurredAt.slice(0, 16).replace("T", " ")
          }))}
          span="8"
        />
        <SimpleList
          title="Project labor cost map"
          description="Completed provider runs allocate labor cost back to project work for later margin and reporting views."
          items={data.laborCostByProject.map((entry) => ({
            title: `${entry.projectId} | $${(entry.laborCostCents / 100).toFixed(2)}`,
            body: `${data.formatMinutes(entry.minutesWorked)} | ${entry.runCount} payroll runs`,
            meta: "Provider-completed allocations"
          }))}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
