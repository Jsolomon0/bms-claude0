import { AuthorizationError, authorize, authorizeOrThrow } from "../../auth/src/server/index.ts";
import type {
  AuditSink,
  AuthorizationActor,
  AuthorizationDecision,
  InvoiceRecord,
  PermissionKey,
  ResourceRecord
} from "../../types/src/index.ts";

const INVOICE_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["invoice.view.org", "invoice.view.self"] as const;

function authorizeAcrossPermissions(
  actor: AuthorizationActor | undefined,
  record: ResourceRecord,
  permissionKeys: readonly PermissionKey[],
  auditSink?: AuditSink
) {
  return (async () => {
    let lastDecision: AuthorizationDecision | undefined;

    for (const permissionKey of permissionKeys) {
      const decision = await authorize(
        {
          actor,
          permissionKey,
          record,
          now: new Date()
        },
        auditSink
      );

      if (decision.allowed) {
        return decision;
      }

      lastDecision = decision;
    }

    if (!lastDecision) {
      throw new Error("No permission candidates were provided.");
    }

    return lastDecision;
  })();
}

export function toInvoiceResourceRecord(invoice: InvoiceRecord): ResourceRecord {
  return {
    resourceType: "invoice",
    resourceId: invoice.id,
    orgId: invoice.organizationId,
    ownerUserId: invoice.ownerUserId,
    customerAccountId: invoice.customerAccountId,
    assignedProjectId: invoice.projectId ?? null,
    visibility: invoice.visibilityFlags
  };
}

export async function authorizeInvoiceView(
  actor: AuthorizationActor | undefined,
  invoice: InvoiceRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toInvoiceResourceRecord(invoice), INVOICE_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeInvoiceViewOrThrow(
  actor: AuthorizationActor | undefined,
  invoice: InvoiceRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeInvoiceView(actor, invoice, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeInvoiceMutationOrThrow(
  actor: AuthorizationActor | undefined,
  permissionKey: PermissionKey,
  invoice: InvoiceRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey,
      record: toInvoiceResourceRecord(invoice),
      now: new Date()
    },
    auditSink
  );
}
