import type {
  BillLineItemRecord,
  BillRecord,
  ExpenseRecord,
  FinanceOperationActivityRecord,
  FinanceOperationsRepository,
  PurchaseOrderLineItemRecord,
  PurchaseOrderRecord,
  VendorRecord
} from "../../types/src/index.ts";

export class InMemoryFinanceOperationsRepository implements FinanceOperationsRepository {
  private readonly vendors = new Map<string, VendorRecord>();
  private readonly expenses = new Map<string, ExpenseRecord>();
  private readonly purchaseOrders = new Map<string, PurchaseOrderRecord>();
  private readonly purchaseOrderLineItems = new Map<string, PurchaseOrderLineItemRecord[]>();
  private readonly bills = new Map<string, BillRecord>();
  private readonly billLineItems = new Map<string, BillLineItemRecord[]>();
  private readonly activities = new Map<string, FinanceOperationActivityRecord[]>();

  constructor(seed?: {
    vendors?: readonly VendorRecord[];
    expenses?: readonly ExpenseRecord[];
    purchaseOrders?: readonly PurchaseOrderRecord[];
    purchaseOrderLineItems?: readonly PurchaseOrderLineItemRecord[];
    bills?: readonly BillRecord[];
    billLineItems?: readonly BillLineItemRecord[];
    activities?: readonly FinanceOperationActivityRecord[];
  }) {
    seed?.vendors?.forEach((vendor) => {
      this.vendors.set(vendor.id, vendor);
    });
    seed?.expenses?.forEach((expense) => {
      this.expenses.set(expense.id, expense);
    });
    seed?.purchaseOrders?.forEach((purchaseOrder) => {
      this.purchaseOrders.set(purchaseOrder.id, purchaseOrder);
    });
    seed?.purchaseOrderLineItems?.forEach((item) => {
      const current = this.purchaseOrderLineItems.get(item.purchaseOrderId) ?? [];
      this.purchaseOrderLineItems.set(item.purchaseOrderId, [...current, item]);
    });
    seed?.bills?.forEach((bill) => {
      this.bills.set(bill.id, bill);
    });
    seed?.billLineItems?.forEach((item) => {
      const current = this.billLineItems.get(item.billId) ?? [];
      this.billLineItems.set(item.billId, [...current, item]);
    });
    seed?.activities?.forEach((activity) => {
      const key = `${activity.resourceType}:${activity.resourceId}`;
      const current = this.activities.get(key) ?? [];
      this.activities.set(key, [...current, activity]);
    });
  }

  createVendor(vendor: VendorRecord): void {
    this.vendors.set(vendor.id, vendor);
  }

  updateVendor(vendor: VendorRecord): void {
    this.vendors.set(vendor.id, vendor);
  }

  getVendorById(vendorId: string): VendorRecord | undefined {
    return this.vendors.get(vendorId);
  }

  listVendors(): readonly VendorRecord[] {
    return [...this.vendors.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  createExpense(expense: ExpenseRecord): void {
    this.expenses.set(expense.id, expense);
  }

  updateExpense(expense: ExpenseRecord): void {
    this.expenses.set(expense.id, expense);
  }

  getExpenseById(expenseId: string): ExpenseRecord | undefined {
    return this.expenses.get(expenseId);
  }

  listExpenses(): readonly ExpenseRecord[] {
    return [...this.expenses.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createPurchaseOrder(purchaseOrder: PurchaseOrderRecord): void {
    this.purchaseOrders.set(purchaseOrder.id, purchaseOrder);
  }

  updatePurchaseOrder(purchaseOrder: PurchaseOrderRecord): void {
    this.purchaseOrders.set(purchaseOrder.id, purchaseOrder);
  }

  getPurchaseOrderById(purchaseOrderId: string): PurchaseOrderRecord | undefined {
    return this.purchaseOrders.get(purchaseOrderId);
  }

  listPurchaseOrders(): readonly PurchaseOrderRecord[] {
    return [...this.purchaseOrders.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createPurchaseOrderLineItems(items: readonly PurchaseOrderLineItemRecord[]): void {
    for (const item of items) {
      const current = this.purchaseOrderLineItems.get(item.purchaseOrderId) ?? [];
      this.purchaseOrderLineItems.set(item.purchaseOrderId, [...current, item]);
    }
  }

  replacePurchaseOrderLineItems(
    purchaseOrderId: string,
    items: readonly PurchaseOrderLineItemRecord[]
  ): void {
    this.purchaseOrderLineItems.set(purchaseOrderId, [...items]);
  }

  listPurchaseOrderLineItemsByPurchaseOrderId(purchaseOrderId: string): readonly PurchaseOrderLineItemRecord[] {
    return [...(this.purchaseOrderLineItems.get(purchaseOrderId) ?? [])].sort((left, right) => left.lineNumber - right.lineNumber);
  }

  createBill(bill: BillRecord): void {
    this.bills.set(bill.id, bill);
  }

  updateBill(bill: BillRecord): void {
    this.bills.set(bill.id, bill);
  }

  getBillById(billId: string): BillRecord | undefined {
    return this.bills.get(billId);
  }

  listBills(): readonly BillRecord[] {
    return [...this.bills.values()].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  }

  createBillLineItems(items: readonly BillLineItemRecord[]): void {
    for (const item of items) {
      const current = this.billLineItems.get(item.billId) ?? [];
      this.billLineItems.set(item.billId, [...current, item]);
    }
  }

  replaceBillLineItems(billId: string, items: readonly BillLineItemRecord[]): void {
    this.billLineItems.set(billId, [...items]);
  }

  listBillLineItemsByBillId(billId: string): readonly BillLineItemRecord[] {
    return [...(this.billLineItems.get(billId) ?? [])].sort((left, right) => left.lineNumber - right.lineNumber);
  }

  createActivity(activity: FinanceOperationActivityRecord): void {
    const key = `${activity.resourceType}:${activity.resourceId}`;
    const current = this.activities.get(key) ?? [];
    this.activities.set(key, [...current, activity]);
  }

  listActivitiesByResource(
    resourceType: FinanceOperationActivityRecord["resourceType"],
    resourceId: string
  ): readonly FinanceOperationActivityRecord[] {
    return [...(this.activities.get(`${resourceType}:${resourceId}`) ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    );
  }
}
