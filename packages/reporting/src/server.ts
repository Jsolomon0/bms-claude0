import { authorizeOrThrow, protectRoute } from "../../auth/src/server/index.ts";
import type {
  AuditEvent,
  AuthorizationActor,
  ReportingExportRouteRequest,
  ReportingExportRouteResponse,
  ResourceRecord
} from "../../types/src/index.ts";
import type { ReportingRuntime } from "./runtime.ts";

function toReportingResourceRecord(organizationId: string, resourceId: string): ResourceRecord {
  return {
    resourceType: "report",
    resourceId,
    orgId: organizationId,
    visibility: ["internal"]
  };
}

function buildReportingAuditEvent(
  eventType: AuditEvent["eventType"],
  organizationId: string,
  actorUserId: string | null,
  occurredAt: string,
  metadata?: Record<string, unknown>
): AuditEvent {
  return {
    eventType,
    outcome: "success",
    actorUserId,
    resourceType: "report",
    resourceId: organizationId,
    viaPublicLink: false,
    sensitive: true,
    occurredAt,
    metadata
  };
}

export async function generateReportingSnapshotServer(
  runtime: ReportingRuntime,
  actor: AuthorizationActor | undefined,
  input: {
    organizationId: string;
    actorUserId: string;
    snapshotAt?: string;
  }
) {
  await authorizeOrThrow(
    {
      actor,
      permissionKey: "report.view.org",
      record: toReportingResourceRecord(input.organizationId, "snapshot_generation"),
      now: new Date()
    },
    runtime.auditSink
  );

  const result = runtime.reportingService.generateSnapshot(input);
  runtime.auditSink.write(
    buildReportingAuditEvent(
      "report.snapshot_generated",
      input.organizationId,
      input.actorUserId,
      result.run.snapshotAt,
      {
        snapshotRunId: result.run.id,
        projectCount: result.projectProfitability.length,
        invoiceAgingCount: result.invoiceAging.length,
        billAgingCount: result.billAging.length
      }
    )
  );

  return result;
}

export async function getReportingOverviewForActor(
  runtime: ReportingRuntime,
  actor: AuthorizationActor | undefined,
  organizationId: string
) {
  await authorizeOrThrow(
    {
      actor,
      permissionKey: "report.view.org",
      record: toReportingResourceRecord(organizationId, "overview"),
      now: new Date()
    },
    runtime.auditSink
  );

  return runtime.reportingService.buildOverview(organizationId);
}

export async function getProjectProfitabilityReportForActor(
  runtime: ReportingRuntime,
  actor: AuthorizationActor | undefined,
  organizationId: string
) {
  const overview = await getReportingOverviewForActor(runtime, actor, organizationId);

  return {
    run: overview.run,
    rows: overview.projectProfitability
  };
}

export async function getAgingReportsForActor(
  runtime: ReportingRuntime,
  actor: AuthorizationActor | undefined,
  organizationId: string
) {
  const overview = await getReportingOverviewForActor(runtime, actor, organizationId);

  return {
    run: overview.run,
    invoiceAging: overview.invoiceAging,
    billAging: overview.billAging,
    receivableAgingSummary: overview.receivableAgingSummary,
    payableAgingSummary: overview.payableAgingSummary
  };
}

export async function exportProjectProfitabilityReportServer(
  runtime: ReportingRuntime,
  request: ReportingExportRouteRequest
): Promise<ReportingExportRouteResponse> {
  const handler = protectRoute(
    {
      permissionKey: "report.export.org",
      resolveRecord: async (currentRequest: ReportingExportRouteRequest) =>
        toReportingResourceRecord(currentRequest.organizationId, "project_profitability_export"),
      auditSink: runtime.auditSink
    },
    async ({ request: currentRequest }) => {
      const payload = runtime.reportingService.exportProjectProfitability(
        currentRequest.organizationId,
        currentRequest.format ?? "csv",
        currentRequest.snapshotRunId
      );
      runtime.auditSink.write(
        buildReportingAuditEvent(
          "report.exported",
          currentRequest.organizationId,
          currentRequest.actor?.userId ?? null,
          new Date().toISOString(),
          {
            reportType: "project_profitability",
            format: currentRequest.format ?? "csv",
            snapshotRunId: currentRequest.snapshotRunId ?? null
          }
        )
      );

      return {
        status: 200,
        body: payload
      };
    }
  );

  return handler(request);
}

export async function exportInvoiceAgingReportServer(
  runtime: ReportingRuntime,
  request: ReportingExportRouteRequest
): Promise<ReportingExportRouteResponse> {
  const handler = protectRoute(
    {
      permissionKey: "report.export.org",
      resolveRecord: async (currentRequest: ReportingExportRouteRequest) =>
        toReportingResourceRecord(currentRequest.organizationId, "invoice_aging_export"),
      auditSink: runtime.auditSink
    },
    async ({ request: currentRequest }) => {
      const payload = runtime.reportingService.exportInvoiceAging(
        currentRequest.organizationId,
        currentRequest.format ?? "csv",
        currentRequest.snapshotRunId
      );
      runtime.auditSink.write(
        buildReportingAuditEvent(
          "report.exported",
          currentRequest.organizationId,
          currentRequest.actor?.userId ?? null,
          new Date().toISOString(),
          {
            reportType: "invoice_aging",
            format: currentRequest.format ?? "csv",
            snapshotRunId: currentRequest.snapshotRunId ?? null
          }
        )
      );

      return {
        status: 200,
        body: payload
      };
    }
  );

  return handler(request);
}

export async function exportBillAgingReportServer(
  runtime: ReportingRuntime,
  request: ReportingExportRouteRequest
): Promise<ReportingExportRouteResponse> {
  const handler = protectRoute(
    {
      permissionKey: "report.export.org",
      resolveRecord: async (currentRequest: ReportingExportRouteRequest) =>
        toReportingResourceRecord(currentRequest.organizationId, "bill_aging_export"),
      auditSink: runtime.auditSink
    },
    async ({ request: currentRequest }) => {
      const payload = runtime.reportingService.exportBillAging(
        currentRequest.organizationId,
        currentRequest.format ?? "csv",
        currentRequest.snapshotRunId
      );
      runtime.auditSink.write(
        buildReportingAuditEvent(
          "report.exported",
          currentRequest.organizationId,
          currentRequest.actor?.userId ?? null,
          new Date().toISOString(),
          {
            reportType: "bill_aging",
            format: currentRequest.format ?? "csv",
            snapshotRunId: currentRequest.snapshotRunId ?? null
          }
        )
      );

      return {
        status: 200,
        body: payload
      };
    }
  );

  return handler(request);
}
