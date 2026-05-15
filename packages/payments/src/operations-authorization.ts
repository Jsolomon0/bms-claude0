import { AuthorizationError, authorize, authorizeOrThrow } from "../../auth/src/server/index.ts";
import type {
  AuditSink,
  AuthorizationActor,
  AuthorizationDecision,
  BillRecord,
  ExpenseRecord,
  PermissionKey,
  PurchaseOrderRecord,
  ResourceRecord,
  VendorRecord
} from "../../types/src/index.ts";

const EXPENSE_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["expense.view.org", "expense.view.self"] as const;
const EXPENSE_EDIT_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["expense.manage.org", "expense.create.self"] as const;
const EXPENSE_CREATE_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["expense.manage.org", "expense.create.self"] as const;
const BILL_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["bill.view.org", "finance.view.org"] as const;
const PURCHASE_ORDER_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = [
  "purchase_order.view.org",
  "finance.view.org"
] as const;
const VENDOR_VIEW_PERMISSION_CANDIDATES: readonly PermissionKey[] = ["vendor.view.org", "finance.view.org"] as const;

function toInternalVisibilityRecord(record: ResourceRecord): ResourceRecord {
  return {
    ...record,
    visibility: ["internal"]
  };
}

export function toExpenseResourceRecord(expense: ExpenseRecord): ResourceRecord {
  return toInternalVisibilityRecord({
    resourceType: "expense",
    resourceId: expense.id,
    orgId: expense.organizationId,
    ownerUserId: expense.claimantUserId,
    assignedProjectId: expense.projectId ?? null,
    visibility: expense.visibilityFlags
  });
}

export function toVendorResourceRecord(vendor: VendorRecord): ResourceRecord {
  return toInternalVisibilityRecord({
    resourceType: "vendor",
    resourceId: vendor.id,
    orgId: vendor.organizationId,
    ownerUserId: vendor.ownerUserId,
    visibility: vendor.visibilityFlags
  });
}

export function toPurchaseOrderResourceRecord(purchaseOrder: PurchaseOrderRecord): ResourceRecord {
  return toInternalVisibilityRecord({
    resourceType: "purchase_order",
    resourceId: purchaseOrder.id,
    orgId: purchaseOrder.organizationId,
    ownerUserId: purchaseOrder.ownerUserId,
    assignedProjectId: purchaseOrder.projectId ?? null,
    visibility: purchaseOrder.visibilityFlags
  });
}

export function toBillResourceRecord(bill: BillRecord): ResourceRecord {
  return toInternalVisibilityRecord({
    resourceType: "bill",
    resourceId: bill.id,
    orgId: bill.organizationId,
    ownerUserId: bill.ownerUserId,
    assignedProjectId: bill.projectId ?? null,
    visibility: bill.visibilityFlags
  });
}

async function authorizeAcrossPermissions(
  actor: AuthorizationActor | undefined,
  record: ResourceRecord,
  permissionKeys: readonly PermissionKey[],
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
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
}

export async function authorizeExpenseView(
  actor: AuthorizationActor | undefined,
  expense: ExpenseRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toExpenseResourceRecord(expense), EXPENSE_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeExpenseViewOrThrow(
  actor: AuthorizationActor | undefined,
  expense: ExpenseRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeExpenseView(actor, expense, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeExpenseCreateOrThrow(
  actor: AuthorizationActor | undefined,
  record: {
    organizationId: string;
    claimantUserId: string;
    projectId?: string;
  },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeAcrossPermissions(
    actor,
    toInternalVisibilityRecord({
      resourceType: "expense",
      resourceId: "draft-expense",
      orgId: record.organizationId,
      ownerUserId: record.claimantUserId,
      assignedProjectId: record.projectId ?? null,
      visibility: ["internal"]
    }),
    EXPENSE_CREATE_PERMISSION_CANDIDATES,
    auditSink
  );

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeExpenseEditOrThrow(
  actor: AuthorizationActor | undefined,
  expense: ExpenseRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeAcrossPermissions(actor, toExpenseResourceRecord(expense), EXPENSE_EDIT_PERMISSION_CANDIDATES, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeExpenseApprovalOrThrow(
  actor: AuthorizationActor | undefined,
  expense: ExpenseRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "expense.approve.org",
      record: toExpenseResourceRecord(expense),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizeVendorView(
  actor: AuthorizationActor | undefined,
  vendor: VendorRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toVendorResourceRecord(vendor), VENDOR_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeVendorViewOrThrow(
  actor: AuthorizationActor | undefined,
  vendor: VendorRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeVendorView(actor, vendor, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeVendorManageOrThrow(
  actor: AuthorizationActor | undefined,
  vendor: VendorRecord | { organizationId: string; ownerUserId: string },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "vendor.manage.org",
      record: toInternalVisibilityRecord({
        resourceType: "vendor",
        resourceId: "id" in vendor ? vendor.id : "draft-vendor",
        orgId: vendor.organizationId,
        ownerUserId: vendor.ownerUserId,
        visibility: ["internal"]
      }),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePurchaseOrderView(
  actor: AuthorizationActor | undefined,
  purchaseOrder: PurchaseOrderRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(
    actor,
    toPurchaseOrderResourceRecord(purchaseOrder),
    PURCHASE_ORDER_VIEW_PERMISSION_CANDIDATES,
    auditSink
  );
}

export async function authorizePurchaseOrderViewOrThrow(
  actor: AuthorizationActor | undefined,
  purchaseOrder: PurchaseOrderRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizePurchaseOrderView(actor, purchaseOrder, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizePurchaseOrderManageOrThrow(
  actor: AuthorizationActor | undefined,
  purchaseOrder: PurchaseOrderRecord | { organizationId: string; ownerUserId: string; projectId?: string },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "purchase_order.manage.org",
      record: toInternalVisibilityRecord({
        resourceType: "purchase_order",
        resourceId: "id" in purchaseOrder ? purchaseOrder.id : "draft-purchase-order",
        orgId: purchaseOrder.organizationId,
        ownerUserId: purchaseOrder.ownerUserId,
        assignedProjectId: purchaseOrder.projectId ?? null,
        visibility: ["internal"]
      }),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizePurchaseOrderApprovalOrThrow(
  actor: AuthorizationActor | undefined,
  purchaseOrder: PurchaseOrderRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "purchase_order.approve.org",
      record: toPurchaseOrderResourceRecord(purchaseOrder),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizeBillView(
  actor: AuthorizationActor | undefined,
  bill: BillRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeAcrossPermissions(actor, toBillResourceRecord(bill), BILL_VIEW_PERMISSION_CANDIDATES, auditSink);
}

export async function authorizeBillViewOrThrow(
  actor: AuthorizationActor | undefined,
  bill: BillRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  const decision = await authorizeBillView(actor, bill, auditSink);

  if (!decision.allowed) {
    throw new AuthorizationError(decision);
  }

  return decision;
}

export async function authorizeBillManageOrThrow(
  actor: AuthorizationActor | undefined,
  bill: BillRecord | { organizationId: string; ownerUserId: string; projectId?: string },
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "bill.manage.org",
      record: toInternalVisibilityRecord({
        resourceType: "bill",
        resourceId: "id" in bill ? bill.id : "draft-bill",
        orgId: bill.organizationId,
        ownerUserId: bill.ownerUserId,
        assignedProjectId: bill.projectId ?? null,
        visibility: ["internal"]
      }),
      now: new Date()
    },
    auditSink
  );
}

export async function authorizeBillApprovalOrThrow(
  actor: AuthorizationActor | undefined,
  bill: BillRecord,
  auditSink?: AuditSink
): Promise<AuthorizationDecision> {
  return authorizeOrThrow(
    {
      actor,
      permissionKey: "bill.approve.org",
      record: toBillResourceRecord(bill),
      now: new Date()
    },
    auditSink
  );
}
