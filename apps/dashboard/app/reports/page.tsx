import {
  KeyValueSummary,
  PageHeader,
  SectionGrid,
  SimpleList,
  StatsCard
} from "../../../../packages/ui/src/react/index.tsx";
import { DashboardPageShell } from "../../lib/page-shell.tsx";
import { getDashboardReportingData } from "../../lib/reporting-data.ts";

export default async function DashboardReportsPage() {
  const data = await getDashboardReportingData();
  const overview = data.overview;

  return (
    <DashboardPageShell activeHref="/reports" title="Reporting workspace" subtitle="Profitability, aging, and historical snapshots">
      <PageHeader
        eyebrow="Reporting"
        title="Derived reporting runs from snapshot tables instead of live mutable transaction views."
        description="Project profitability, receivables aging, and payables aging are recalculated into historical snapshots so exports stay reproducible even after source records change."
        actions={[
          { label: "Open finance", href: "/finance" },
          { label: "Open audit log", href: "/audit" }
        ]}
        badges={["Snapshot history", "Reproducible calculations", "Export-ready views"]}
      />
      <SectionGrid>
        <StatsCard
          title="Snapshot overview"
          description="The current reporting run summarizes revenue, cost, margin, and aging from the latest derived tables."
          stats={[
            { label: "Snapshot", value: overview?.run?.snapshotAt.slice(0, 16).replace("T", " ") ?? "None" },
            { label: "Projects", value: String(overview?.projectProfitability.length ?? 0) },
            { label: "Receivables", value: String(overview?.invoiceAging.length ?? 0) },
            { label: "Payables", value: String(overview?.billAging.length ?? 0) }
          ]}
          span="4"
        />
        <KeyValueSummary
          title="Portfolio profitability"
          description="Revenue stays separate from cost allocations so margin can be traced back to the exact snapshot run."
          items={[
            { label: "Revenue invoiced", value: data.formatCurrency(overview?.totals.revenueInvoicedCents ?? 0) },
            { label: "Revenue collected", value: data.formatCurrency(overview?.totals.revenueCollectedCents ?? 0) },
            { label: "Total cost", value: data.formatCurrency(overview?.totals.totalCostCents ?? 0) },
            { label: "Gross margin", value: data.formatCurrency(overview?.totals.grossMarginCents ?? 0) },
            { label: "Gross margin %", value: data.formatPercent(overview?.totals.grossMarginPercent ?? 0) },
            { label: "Open commitments", value: data.formatCurrency(overview?.totals.openCommitmentCents ?? 0) }
          ]}
          span="8"
        />
        <SimpleList
          title="Top margin projects"
          description="These project rows come directly from the latest profitability snapshot."
          items={data.topProjects.map((row) => ({
            title: `${row.projectName} | ${data.formatCurrency(row.grossMarginCents)}`,
            body: `Revenue ${data.formatCurrency(row.revenueInvoicedCents)} | Cost ${data.formatCurrency(row.totalCostCents)} | Margin ${data.formatPercent(row.grossMarginPercent)}`,
            meta: `Labor ${data.formatCurrency(row.laborCostCents)} | Material ${data.formatCurrency(row.materialCostCents)} | Subcontractor ${data.formatCurrency(row.subcontractorCostCents)}`
          }))}
          span="8"
        />
        <SimpleList
          title="Margin watchlist"
          description="Lower-margin projects are surfaced here for owner and admin review."
          items={data.weakestProjects.map((row) => ({
            title: `${row.projectName} | ${data.formatPercent(row.grossMarginPercent)}`,
            body: `Open commitments ${data.formatCurrency(row.openCommitmentCents)} | Expenses ${data.formatCurrency(row.expenseCostCents)}`,
            meta: `${row.projectStatus} | snapshot ${row.snapshotAt.slice(0, 10)}`
          }))}
          span="4"
        />
        <SimpleList
          title="Receivables aging"
          description="Outstanding invoices are bucketed by snapshot date rather than recalculated in the UI."
          items={(overview?.receivableAgingSummary ?? []).map((bucket) => ({
            title: `${bucket.bucket} | ${bucket.count} invoices`,
            body: `Outstanding ${data.formatCurrency(bucket.totalOutstandingCents)}`,
            meta: "Derived AR aging bucket"
          }))}
          span="4"
        />
        <SimpleList
          title="Payables aging"
          description="Outstanding vendor bills follow the same derived bucket strategy for AP review."
          items={(overview?.payableAgingSummary ?? []).map((bucket) => ({
            title: `${bucket.bucket} | ${bucket.count} bills`,
            body: `Outstanding ${data.formatCurrency(bucket.totalOutstandingCents)}`,
            meta: "Derived AP aging bucket"
          }))}
          span="4"
        />
        <SimpleList
          title="Aging detail"
          description="The largest open receivables and payables are shown from the current snapshot."
          items={[
            ...(overview?.invoiceAging.slice(0, 3).map((row) => ({
              title: `AR ${row.invoiceNumber} | ${data.formatCurrency(row.outstandingCents)}`,
              body: `${row.agingBucket} | due ${row.dueAt} | ${row.projectId ?? "No project"}`,
              meta: `${row.daysPastDue} days past due`
            })) ?? []),
            ...(overview?.billAging.slice(0, 3).map((row) => ({
              title: `AP ${row.billNumber} | ${data.formatCurrency(row.outstandingCents)}`,
              body: `${row.agingBucket} | due ${row.dueAt} | ${row.projectId ?? "No project"}`,
              meta: `${row.daysPastDue} days past due`
            })) ?? [])
          ]}
          span="8"
        />
        <SimpleList
          title="Export surface"
          description="Report exports use protected server helpers and can serialize either CSV or JSON."
          items={data.exportEndpoints}
          span="4"
        />
      </SectionGrid>
    </DashboardPageShell>
  );
}
