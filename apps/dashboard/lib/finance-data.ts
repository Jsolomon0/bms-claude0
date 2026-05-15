import {
  getFinanceOperationsRuntime,
  listVisibleBillsForActor,
  listVisibleExpensesForActor,
  listVisiblePurchaseOrdersForActor,
  listVisibleVendorsForActor
} from "../../../packages/payments/src/index.ts";
import type { FinanceOperationActivityRecord } from "../../../packages/types/src/index.ts";
import { getDashboardActor } from "./shell-data.ts";

function formatCurrency(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function activityTimestampSort(left: FinanceOperationActivityRecord, right: FinanceOperationActivityRecord): number {
  return right.occurredAt.localeCompare(left.occurredAt);
}

export async function getDashboardFinanceHomeData() {
  const runtime = getFinanceOperationsRuntime();
  const actor = getDashboardActor();
  const vendors = await listVisibleVendorsForActor(runtime, actor);
  const expenses = await listVisibleExpensesForActor(runtime, actor);
  const purchaseOrders = await listVisiblePurchaseOrdersForActor(runtime, actor);
  const bills = await listVisibleBillsForActor(runtime, actor);

  const pendingExpenseApprovals = expenses.filter((expense) => expense.status === "submitted");
  const reimbursementQueue = expenses.filter(
    (expense) => expense.status === "approved" && expense.reimbursementRequested && !expense.reimbursedAt
  );
  const pendingPurchaseOrders = purchaseOrders.filter((purchaseOrder) => purchaseOrder.status === "submitted");
  const dueBills = bills
    .filter((bill) => bill.status !== "paid" && bill.status !== "void")
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  const projectCostMap = [...new Set([...expenses.map((expense) => expense.projectId ?? "unassigned"), ...bills.map((bill) => bill.projectId ?? "unassigned")])]
    .map((projectId) => {
      const projectExpenses = expenses.filter(
        (expense) => (expense.projectId ?? "unassigned") === projectId && expense.status !== "rejected"
      );
      const projectBills = bills.filter((bill) => (bill.projectId ?? "unassigned") === projectId && bill.status !== "void");
      const projectPurchaseOrders = purchaseOrders.filter(
        (purchaseOrder) => (purchaseOrder.projectId ?? "unassigned") === projectId && purchaseOrder.status !== "rejected"
      );

      return {
        projectId,
        expenseCents: projectExpenses.reduce((sum, expense) => sum + expense.amountCents, 0),
        billCents: projectBills.reduce((sum, bill) => sum + bill.totalCents, 0),
        purchaseOrderCommittedCents: projectPurchaseOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalCents, 0),
        expenseCount: projectExpenses.length,
        billCount: projectBills.length,
        purchaseOrderCount: projectPurchaseOrders.length
      };
    })
    .sort(
      (left, right) =>
        right.expenseCents + right.billCents + right.purchaseOrderCommittedCents -
        (left.expenseCents + left.billCents + left.purchaseOrderCommittedCents)
    );

  const recentActivity = [
    ...vendors.flatMap((vendor) => runtime.repository.listActivitiesByResource("vendor", vendor.id)),
    ...expenses.flatMap((expense) => runtime.repository.listActivitiesByResource("expense", expense.id)),
    ...purchaseOrders.flatMap((purchaseOrder) =>
      runtime.repository.listActivitiesByResource("purchase_order", purchaseOrder.id)
    ),
    ...bills.flatMap((bill) => runtime.repository.listActivitiesByResource("bill", bill.id))
  ]
    .sort(activityTimestampSort)
    .slice(0, 10);

  return {
    vendors,
    expenses,
    purchaseOrders,
    bills,
    pendingExpenseApprovals,
    reimbursementQueue,
    pendingPurchaseOrders,
    dueBills,
    projectCostMap,
    recentActivity,
    stats: {
      vendors: vendors.length,
      expenseApprovals: pendingExpenseApprovals.length,
      purchaseOrderApprovals: pendingPurchaseOrders.length,
      reimbursementQueue: reimbursementQueue.length,
      openBills: dueBills.length,
      projectLinkedExpenses: expenses.filter((expense) => Boolean(expense.projectId)).length
    },
    formatCurrency
  };
}
