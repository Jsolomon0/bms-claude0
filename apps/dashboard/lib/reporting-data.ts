import { getReportingOverviewForActor, getReportingRuntime } from "../../../packages/reporting/src/index.ts";
import { actorHasAnyRole, actorHasPermission } from "../../../packages/permissions/src/index.ts";
import { getDashboardActor } from "./shell-data.ts";

function formatCurrency(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export async function getDashboardReportingData() {
  const actor = getDashboardActor();
  const canViewReports =
    actorHasAnyRole(actor, ["owner", "administrator"]) || actorHasPermission(actor, "report.view.org");

  if (!canViewReports) {
    return {
      canViewReports,
      overview: undefined,
      topProjects: [],
      weakestProjects: [],
      exportEndpoints: [],
      formatCurrency,
      formatPercent
    };
  }

  const runtime = getReportingRuntime();
  const overview = await getReportingOverviewForActor(runtime, actor, "org-hq");

  return {
    canViewReports,
    overview,
    topProjects: [...overview.projectProfitability]
      .sort((left, right) => right.grossMarginCents - left.grossMarginCents)
      .slice(0, 3),
    weakestProjects: [...overview.projectProfitability]
      .sort((left, right) => left.grossMarginPercent - right.grossMarginPercent)
      .slice(0, 3),
    exportEndpoints: [
      {
        title: "Project profitability export",
        body: "Server helper: exportProjectProfitabilityReportServer",
        meta: "Formats: csv, json"
      },
      {
        title: "Invoice aging export",
        body: "Server helper: exportInvoiceAgingReportServer",
        meta: "Formats: csv, json"
      },
      {
        title: "Bill aging export",
        body: "Server helper: exportBillAgingReportServer",
        meta: "Formats: csv, json"
      }
    ],
    formatCurrency,
    formatPercent
  };
}
