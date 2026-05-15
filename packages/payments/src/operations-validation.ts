import type {
  BillRecord,
  ExpenseRecord,
  PurchaseOrderLineItemRecord,
  PurchaseOrderRecord
} from "../../types/src/index.ts";

export class FinanceOperationsValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join(" "));
    this.name = "FinanceOperationsValidationError";
    this.issues = issues;
  }
}

export class FinanceOperationsWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceOperationsWorkflowError";
  }
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export function normalizeDocumentIds(values: readonly string[] | undefined): readonly string[] {
  return dedupe((values ?? []).map((value) => value.trim()).filter(Boolean));
}

export function validateVendorInput(input: {
  displayName: string;
  paymentTermsDays: number;
}): readonly string[] {
  const issues: string[] = [];

  if (!input.displayName.trim()) {
    issues.push("Vendors require a display name.");
  }

  if (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0) {
    issues.push("Vendor payment terms must be a whole number of days zero or greater.");
  }

  return issues;
}

export function validateExpenseInput(input: {
  category: string;
  description: string;
  currency: string;
  amountCents: number;
  expenseDate: string;
  reimbursementRequested: boolean;
  reimbursable: boolean;
}): readonly string[] {
  const issues: string[] = [];

  if (!input.category.trim()) {
    issues.push("Expenses require a category.");
  }

  if (!input.description.trim()) {
    issues.push("Expenses require a description.");
  }

  if (!/^[A-Z]{3}$/.test(input.currency.trim())) {
    issues.push("Expenses require a three-letter uppercase currency code.");
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    issues.push("Expenses require a positive integer amount in cents.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) {
    issues.push("Expenses require an ISO expense date in YYYY-MM-DD format.");
  }

  if (input.reimbursementRequested && !input.reimbursable) {
    issues.push("Reimbursement cannot be requested for a non-reimbursable expense.");
  }

  return issues;
}

export function validatePurchaseOrderLineItems(items: readonly {
  description: string;
  quantity: number;
  unitCostCents: number;
}[]): readonly string[] {
  const issues: string[] = [];

  if (items.length === 0) {
    issues.push("Purchase orders require at least one line item.");
  }

  items.forEach((item, index) => {
    if (!item.description.trim()) {
      issues.push(`Purchase order line ${index + 1} requires a description.`);
    }

    if (item.quantity <= 0) {
      issues.push(`Purchase order line ${index + 1} requires quantity greater than zero.`);
    }

    if (!Number.isInteger(item.unitCostCents) || item.unitCostCents < 0) {
      issues.push(`Purchase order line ${index + 1} requires a non-negative integer unit cost in cents.`);
    }
  });

  return issues;
}

export function validateBillLineItems(items: readonly {
  description: string;
  quantity: number;
  unitCostCents: number;
}[]): readonly string[] {
  const issues: string[] = [];

  if (items.length === 0) {
    issues.push("Bills require at least one line item.");
  }

  items.forEach((item, index) => {
    if (!item.description.trim()) {
      issues.push(`Bill line ${index + 1} requires a description.`);
    }

    if (item.quantity <= 0) {
      issues.push(`Bill line ${index + 1} requires quantity greater than zero.`);
    }

    if (!Number.isInteger(item.unitCostCents) || item.unitCostCents < 0) {
      issues.push(`Bill line ${index + 1} requires a non-negative integer unit cost in cents.`);
    }
  });

  return issues;
}

export function ensureExpenseEditable(expense: ExpenseRecord): void {
  if (expense.status !== "draft" && expense.status !== "rejected") {
    throw new FinanceOperationsWorkflowError(`Expense ${expense.id} is not editable while ${expense.status}.`);
  }
}

export function ensureExpenseSubmittable(expense: ExpenseRecord): void {
  if (expense.status !== "draft" && expense.status !== "rejected") {
    throw new FinanceOperationsWorkflowError(`Expense ${expense.id} cannot be submitted while ${expense.status}.`);
  }
}

export function ensureExpenseApprovalable(expense: ExpenseRecord): void {
  if (expense.status !== "submitted") {
    throw new FinanceOperationsWorkflowError(`Expense ${expense.id} cannot be approved while ${expense.status}.`);
  }
}

export function ensureExpenseReimbursable(expense: ExpenseRecord): void {
  if (expense.status !== "approved") {
    throw new FinanceOperationsWorkflowError(`Expense ${expense.id} cannot be reimbursed while ${expense.status}.`);
  }

  if (!expense.reimbursementRequested || !expense.reimbursable) {
    throw new FinanceOperationsWorkflowError(`Expense ${expense.id} is not flagged for reimbursement.`);
  }
}

export function ensurePurchaseOrderEditable(purchaseOrder: PurchaseOrderRecord): void {
  if (purchaseOrder.status !== "draft" && purchaseOrder.status !== "rejected") {
    throw new FinanceOperationsWorkflowError(`Purchase order ${purchaseOrder.id} is not editable while ${purchaseOrder.status}.`);
  }
}

export function ensurePurchaseOrderApprovalable(purchaseOrder: PurchaseOrderRecord): void {
  if (purchaseOrder.status !== "submitted") {
    throw new FinanceOperationsWorkflowError(`Purchase order ${purchaseOrder.id} cannot be reviewed while ${purchaseOrder.status}.`);
  }
}

export function ensurePurchaseOrderIssuable(purchaseOrder: PurchaseOrderRecord): void {
  if (purchaseOrder.status !== "approved") {
    throw new FinanceOperationsWorkflowError(`Purchase order ${purchaseOrder.id} cannot be issued while ${purchaseOrder.status}.`);
  }
}

export function ensureBillEditable(bill: BillRecord): void {
  if (bill.status === "paid" || bill.status === "void") {
    throw new FinanceOperationsWorkflowError(`Bill ${bill.id} is not editable while ${bill.status}.`);
  }
}

export function ensureBillTransitionAllowed(bill: BillRecord, nextStatus: BillRecord["status"]): void {
  const allowedTransitions: Record<BillRecord["status"], readonly BillRecord["status"][]> = {
    draft: ["received", "void"],
    received: ["approved", "void"],
    approved: ["scheduled", "paid", "void"],
    scheduled: ["paid", "void"],
    paid: [],
    void: []
  };

  if (!allowedTransitions[bill.status].includes(nextStatus)) {
    throw new FinanceOperationsWorkflowError(`Bill ${bill.id} cannot move from ${bill.status} to ${nextStatus}.`);
  }
}

export function calculatePurchaseOrderLineItemTotals(
  purchaseOrderId: string,
  items: readonly {
    description: string;
    quantity: number;
    unitCostCents: number;
  }[]
): readonly PurchaseOrderLineItemRecord[] {
  return items.map((item, index) => ({
    id: `${purchaseOrderId}-line-${index + 1}`,
    purchaseOrderId,
    lineNumber: index + 1,
    description: item.description.trim(),
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    totalAmountCents: Math.round(item.quantity * item.unitCostCents)
  }));
}

export function calculateBillLineItemTotals(
  billId: string,
  items: readonly {
    purchaseOrderItemId?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
  }[]
) {
  return items.map((item, index) => ({
    id: `${billId}-line-${index + 1}`,
    billId,
    purchaseOrderItemId: item.purchaseOrderItemId,
    lineNumber: index + 1,
    description: item.description.trim(),
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    totalAmountCents: Math.round(item.quantity * item.unitCostCents)
  }));
}
