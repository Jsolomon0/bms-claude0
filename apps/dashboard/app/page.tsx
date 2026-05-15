import {
  KeyValueSummary,
  ModuleGrid,
  NotificationCenter,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../lib/page-shell.tsx";
import { getDashboardReportingData } from "../lib/reporting-data.ts";
import {
  dashboardModules,
  dashboardReadinessItems,
  dashboardSummaryStats,
  getDashboardNotifications
} from "../lib/shell-data.ts";

export default async function DashboardHomePage() {
  const reporting = await getDashboardReportingData();

  return (
    <DashboardPageShell activeHref="/" title="Operations cockpit" subtitle="Role-aware command surface">
      <PageHeader
        eyebrow="Application shell"
        title="One frame for CRM, delivery, finance, and compliance."
        description="This dashboard surface is intentionally thin: navigation, protected routes, shared states, and layout are in place so each module can land without rebuilding the chrome."
        actions={[
          { label: "Open notifications", href: "/notifications" },
          { label: "Review audit page", href: "/audit" }
        ]}
        badges={["Protected routes", "Shared design system", "Test-friendly navigation"]}
      />
      <SectionGrid>
        <StatsCard
          title="Shell readiness"
          description="The dashboard frame is wired before business logic so modules can plug into stable surfaces."
          stats={dashboardSummaryStats}
          span="8"
        />
        <NotificationCenter
          title="Notification center"
          description="Shared alert stream for system status and workflow events."
          notifications={getDashboardNotifications()}
          span="4"
        />
        {reporting.canViewReports && reporting.overview ? (
          <>
            <KeyValueSummary
              title="Owner/admin reporting pulse"
              description="Derived snapshot tables now surface profitability and aging directly on the dashboard home."
              items={[
                {
                  label: "Revenue invoiced",
                  value: reporting.formatCurrency(reporting.overview.totals.revenueInvoicedCents)
                },
                {
                  label: "Gross margin",
                  value: reporting.formatCurrency(reporting.overview.totals.grossMarginCents)
                },
                {
                  label: "Gross margin %",
                  value: reporting.formatPercent(reporting.overview.totals.grossMarginPercent)
                },
                {
                  label: "Open commitments",
                  value: reporting.formatCurrency(reporting.overview.totals.openCommitmentCents)
                },
                {
                  label: "AR outstanding",
                  value: reporting.formatCurrency(
                    reporting.overview.receivableAgingSummary.reduce(
                      (sum, bucket) => sum + bucket.totalOutstandingCents,
                      0
                    )
                  )
                },
                {
                  label: "AP outstanding",
                  value: reporting.formatCurrency(
                    reporting.overview.payableAgingSummary.reduce(
                      (sum, bucket) => sum + bucket.totalOutstandingCents,
                      0
                    )
                  )
                }
              ]}
              span="8"
            />
            <SimpleList
              title="Reporting watchlist"
              description="The latest snapshot highlights the projects and aging buckets that need executive attention."
              items={[
                ...reporting.topProjects.slice(0, 2).map((row) => ({
                  title: `${row.projectName} | ${reporting.formatPercent(row.grossMarginPercent)}`,
                  body: `Margin ${reporting.formatCurrency(row.grossMarginCents)} | Revenue ${reporting.formatCurrency(row.revenueInvoicedCents)}`,
                  meta: `Open commitments ${reporting.formatCurrency(row.openCommitmentCents)}`
                })),
                ...reporting.overview.receivableAgingSummary
                  .filter((bucket) => bucket.bucket !== "current" && bucket.totalOutstandingCents > 0)
                  .slice(0, 1)
                  .map((bucket) => ({
                    title: `Receivables ${bucket.bucket}`,
                    body: `${bucket.count} invoices | ${reporting.formatCurrency(bucket.totalOutstandingCents)}`,
                    meta: "Latest aging snapshot"
                  }))
              ]}
              span="4"
            />
          </>
        ) : null}
        <ModuleGrid
          title="Mounted placeholder modules"
          description="Each card maps to a protected route and shared empty-state shell."
          modules={dashboardModules}
        />
        <SimpleList
          title="Implementation notes"
          description="The shell keeps state handling and access rules centralized."
          items={dashboardReadinessItems}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
