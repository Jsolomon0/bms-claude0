import { type PermissionKey, type VisibilityFlag } from "./authz.ts";

export const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "void"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded", "manual_recorded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHOD_TYPES = ["card", "bank_transfer", "manual", "cash", "check"] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const PAYMENT_PROVIDER_NAMES = ["stripe"] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDER_NAMES)[number];

export const PAYMENT_LINK_SCOPES = ["invoice_view", "invoice_payment"] as const;

export type PaymentLinkScope = (typeof PAYMENT_LINK_SCOPES)[number];

export const EXPENSE_STATUSES = ["draft", "submitted", "approved", "rejected", "reimbursed"] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_CLAIMANT_TYPES = ["employee", "subcontractor"] as const;

export type ExpenseClaimantType = (typeof EXPENSE_CLAIMANT_TYPES)[number];

export const BILL_STATUSES = ["draft", "received", "approved", "scheduled", "paid", "void"] as const;

export type BillStatus = (typeof BILL_STATUSES)[number];

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "issued",
  "partially_received",
  "received",
  "closed",
  "cancelled"
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const VENDOR_STATUSES = ["active", "inactive", "blocked"] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export interface VendorRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  linkedOrganizationId?: string;
  displayName: string;
  legalName?: string;
  primaryContactName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  paymentTermsDays: number;
  status: VendorStatus;
  linkedDocumentIds: readonly string[];
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  claimantType: ExpenseClaimantType;
  claimantUserId: string;
  vendorId?: string;
  projectId?: string;
  taskId?: string;
  category: string;
  description: string;
  currency: string;
  amountCents: number;
  expenseDate: string;
  status: ExpenseStatus;
  reimbursementRequested: boolean;
  reimbursable: boolean;
  reimbursedAt?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  receiptDocumentIds: readonly string[];
  linkedDocumentIds: readonly string[];
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineItemRecord {
  id: string;
  purchaseOrderId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitCostCents: number;
  totalAmountCents: number;
}

export interface PurchaseOrderRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  vendorId: string;
  projectId?: string;
  poNumber: string;
  title: string;
  description?: string;
  currency: string;
  totalCents: number;
  expectedAt?: string;
  issuedAt?: string;
  status: PurchaseOrderStatus;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  linkedDocumentIds: readonly string[];
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface BillLineItemRecord {
  id: string;
  billId: string;
  purchaseOrderItemId?: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitCostCents: number;
  totalAmountCents: number;
}

export interface BillRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  vendorId: string;
  purchaseOrderId?: string;
  projectId?: string;
  billNumber: string;
  title: string;
  currency: string;
  totalCents: number;
  paidCents: number;
  dueAt: string;
  issuedAt?: string;
  status: BillStatus;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  linkedDocumentIds: readonly string[];
  receiptDocumentIds: readonly string[];
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceOperationActivityRecord {
  id: string;
  resourceType: "vendor" | "expense" | "purchase_order" | "bill";
  resourceId: string;
  eventType:
    | "vendor_created"
    | "vendor_updated"
    | "expense_created"
    | "expense_updated"
    | "expense_status_changed"
    | "purchase_order_created"
    | "purchase_order_updated"
    | "purchase_order_status_changed"
    | "bill_created"
    | "bill_updated"
    | "bill_status_changed";
  actorUserId?: string | null;
  summary: string;
  visibilityFlags: readonly VisibilityFlag[];
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceLineItemRecord {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  lineTotalCents: number;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  ownerUserId: string;
  customerAccountId: string;
  projectId?: string;
  invoiceNumber: string;
  title: string;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  balanceDueCents: number;
  status: InvoiceStatus;
  dueAt: string;
  sentAt?: string;
  paidAt?: string;
  voidedAt?: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  organizationId: string;
  customerAccountId: string;
  provider: PaymentProviderName | "manual";
  providerReference: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  methodType: PaymentMethodType;
  receivedAt: string;
  recordedByUserId?: string;
  webhookEventId?: string;
  note?: string;
}

export interface PaymentReceiptRecord {
  id: string;
  invoiceId: string;
  paymentId: string;
  receiptNumber: string;
  html: string;
  createdAt: string;
}

export interface InvoiceReminderRecord {
  id: string;
  invoiceId: string;
  reminderType: "invoice_sent" | "invoice_overdue" | "payment_received";
  recipientEmail: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface InvoicePublicPaymentLinkRecord {
  id: string;
  invoiceId: string;
  permissionKeys: readonly PermissionKey[];
  scope: PaymentLinkScope;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  createdByUserId: string;
  createdAt: string;
}

export interface InvoiceActivityRecord {
  id: string;
  invoiceId: string;
  eventType:
    | "invoice_created"
    | "invoice_sent"
    | "invoice_status_changed"
    | "payment_session_created"
    | "payment_recorded"
    | "receipt_generated"
    | "reminder_created"
    | "public_link_issued"
    | "public_link_revoked"
    | "public_link_accessed"
    | "webhook_processed";
  actorUserId?: string | null;
  summary: string;
  visibilityFlags: readonly VisibilityFlag[];
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceHtmlRenderModel {
  brandName: string;
  brandAccent: string;
  organizationLabel: string;
  invoice: InvoiceRecord;
  lineItems: readonly InvoiceLineItemRecord[];
  customerLabel: string;
}

export interface InvoicePdfRenderModel {
  fileName: string;
  title: string;
  sections: readonly {
    heading: string;
    rows: readonly { label: string; value: string }[];
  }[];
}

export interface PaymentCheckoutSession {
  id: string;
  provider: PaymentProviderName;
  checkoutUrl: string;
  clientReference: string;
  amountCents: number;
  currency: string;
  invoiceId: string;
  expiresAt: string;
}

export interface PaymentProviderWebhookEvent {
  id: string;
  provider: PaymentProviderName;
  type: "payment_intent.succeeded" | "payment_intent.payment_failed";
  invoiceId: string;
  amountReceivedCents: number;
  currency: string;
  providerReference: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceRepository {
  createInvoice(invoice: InvoiceRecord): void;
  updateInvoice(invoice: InvoiceRecord): void;
  getInvoiceById(invoiceId: string): InvoiceRecord | undefined;
  listInvoices(): readonly InvoiceRecord[];
  createLineItems(items: readonly InvoiceLineItemRecord[]): void;
  listLineItemsByInvoiceId(invoiceId: string): readonly InvoiceLineItemRecord[];
  createPayment(payment: PaymentRecord): void;
  listPaymentsByInvoiceId(invoiceId: string): readonly PaymentRecord[];
  getPaymentByWebhookEventId(webhookEventId: string): PaymentRecord | undefined;
  createReceipt(receipt: PaymentReceiptRecord): void;
  listReceiptsByInvoiceId(invoiceId: string): readonly PaymentReceiptRecord[];
  createReminder(reminder: InvoiceReminderRecord): void;
  listRemindersByInvoiceId(invoiceId: string): readonly InvoiceReminderRecord[];
  createActivity(activity: InvoiceActivityRecord): void;
  listActivitiesByInvoiceId(invoiceId: string): readonly InvoiceActivityRecord[];
  createPublicPaymentLink(link: InvoicePublicPaymentLinkRecord): void;
  updatePublicPaymentLink(link: InvoicePublicPaymentLinkRecord): void;
  getPublicPaymentLinkById(linkId: string): InvoicePublicPaymentLinkRecord | undefined;
  listPublicPaymentLinksByInvoiceId(invoiceId: string): readonly InvoicePublicPaymentLinkRecord[];
}

export interface FinanceOperationsRepository {
  createVendor(vendor: VendorRecord): void;
  updateVendor(vendor: VendorRecord): void;
  getVendorById(vendorId: string): VendorRecord | undefined;
  listVendors(): readonly VendorRecord[];
  createExpense(expense: ExpenseRecord): void;
  updateExpense(expense: ExpenseRecord): void;
  getExpenseById(expenseId: string): ExpenseRecord | undefined;
  listExpenses(): readonly ExpenseRecord[];
  createPurchaseOrder(purchaseOrder: PurchaseOrderRecord): void;
  updatePurchaseOrder(purchaseOrder: PurchaseOrderRecord): void;
  getPurchaseOrderById(purchaseOrderId: string): PurchaseOrderRecord | undefined;
  listPurchaseOrders(): readonly PurchaseOrderRecord[];
  createPurchaseOrderLineItems(items: readonly PurchaseOrderLineItemRecord[]): void;
  replacePurchaseOrderLineItems(
    purchaseOrderId: string,
    items: readonly PurchaseOrderLineItemRecord[]
  ): void;
  listPurchaseOrderLineItemsByPurchaseOrderId(purchaseOrderId: string): readonly PurchaseOrderLineItemRecord[];
  createBill(bill: BillRecord): void;
  updateBill(bill: BillRecord): void;
  getBillById(billId: string): BillRecord | undefined;
  listBills(): readonly BillRecord[];
  createBillLineItems(items: readonly BillLineItemRecord[]): void;
  replaceBillLineItems(billId: string, items: readonly BillLineItemRecord[]): void;
  listBillLineItemsByBillId(billId: string): readonly BillLineItemRecord[];
  createActivity(activity: FinanceOperationActivityRecord): void;
  listActivitiesByResource(resourceType: FinanceOperationActivityRecord["resourceType"], resourceId: string): readonly FinanceOperationActivityRecord[];
}
