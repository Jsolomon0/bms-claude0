import type {
  InvoiceActivityRecord,
  InvoiceLineItemRecord,
  InvoicePublicPaymentLinkRecord,
  InvoiceRecord,
  InvoiceReminderRecord,
  InvoiceRepository,
  PaymentReceiptRecord,
  PaymentRecord
} from "../../types/src/index.ts";

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices = new Map<string, InvoiceRecord>();
  private readonly lineItems = new Map<string, InvoiceLineItemRecord[]>();
  private readonly payments = new Map<string, PaymentRecord[]>();
  private readonly paymentsByWebhookEventId = new Map<string, PaymentRecord>();
  private readonly receipts = new Map<string, PaymentReceiptRecord[]>();
  private readonly reminders = new Map<string, InvoiceReminderRecord[]>();
  private readonly activities = new Map<string, InvoiceActivityRecord[]>();
  private readonly publicLinks = new Map<string, InvoicePublicPaymentLinkRecord>();

  constructor(seed?: {
    invoices?: readonly InvoiceRecord[];
    lineItems?: readonly InvoiceLineItemRecord[];
    payments?: readonly PaymentRecord[];
    receipts?: readonly PaymentReceiptRecord[];
    reminders?: readonly InvoiceReminderRecord[];
    activities?: readonly InvoiceActivityRecord[];
    publicLinks?: readonly InvoicePublicPaymentLinkRecord[];
  }) {
    seed?.invoices?.forEach((invoice) => {
      this.invoices.set(invoice.id, invoice);
    });
    seed?.lineItems?.forEach((item) => {
      const current = this.lineItems.get(item.invoiceId) ?? [];
      this.lineItems.set(item.invoiceId, [...current, item]);
    });
    seed?.payments?.forEach((payment) => {
      this.createPayment(payment);
    });
    seed?.receipts?.forEach((receipt) => {
      const current = this.receipts.get(receipt.invoiceId) ?? [];
      this.receipts.set(receipt.invoiceId, [...current, receipt]);
    });
    seed?.reminders?.forEach((reminder) => {
      const current = this.reminders.get(reminder.invoiceId) ?? [];
      this.reminders.set(reminder.invoiceId, [...current, reminder]);
    });
    seed?.activities?.forEach((activity) => {
      const current = this.activities.get(activity.invoiceId) ?? [];
      this.activities.set(activity.invoiceId, [...current, activity]);
    });
    seed?.publicLinks?.forEach((link) => {
      this.publicLinks.set(link.id, link);
    });
  }

  createInvoice(invoice: InvoiceRecord): void {
    this.invoices.set(invoice.id, invoice);
  }

  updateInvoice(invoice: InvoiceRecord): void {
    this.invoices.set(invoice.id, invoice);
  }

  getInvoiceById(invoiceId: string): InvoiceRecord | undefined {
    return this.invoices.get(invoiceId);
  }

  listInvoices(): readonly InvoiceRecord[] {
    return [...this.invoices.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createLineItems(items: readonly InvoiceLineItemRecord[]): void {
    for (const item of items) {
      const current = this.lineItems.get(item.invoiceId) ?? [];
      this.lineItems.set(item.invoiceId, [...current, item]);
    }
  }

  listLineItemsByInvoiceId(invoiceId: string): readonly InvoiceLineItemRecord[] {
    return [...(this.lineItems.get(invoiceId) ?? [])];
  }

  createPayment(payment: PaymentRecord): void {
    const current = this.payments.get(payment.invoiceId) ?? [];
    this.payments.set(payment.invoiceId, [...current, payment]);

    if (payment.webhookEventId) {
      this.paymentsByWebhookEventId.set(payment.webhookEventId, payment);
    }
  }

  listPaymentsByInvoiceId(invoiceId: string): readonly PaymentRecord[] {
    return [...(this.payments.get(invoiceId) ?? [])].sort((left, right) =>
      left.receivedAt.localeCompare(right.receivedAt)
    );
  }

  getPaymentByWebhookEventId(webhookEventId: string): PaymentRecord | undefined {
    return this.paymentsByWebhookEventId.get(webhookEventId);
  }

  createReceipt(receipt: PaymentReceiptRecord): void {
    const current = this.receipts.get(receipt.invoiceId) ?? [];
    this.receipts.set(receipt.invoiceId, [...current, receipt]);
  }

  listReceiptsByInvoiceId(invoiceId: string): readonly PaymentReceiptRecord[] {
    return [...(this.receipts.get(invoiceId) ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  createReminder(reminder: InvoiceReminderRecord): void {
    const current = this.reminders.get(reminder.invoiceId) ?? [];
    this.reminders.set(reminder.invoiceId, [...current, reminder]);
  }

  listRemindersByInvoiceId(invoiceId: string): readonly InvoiceReminderRecord[] {
    return [...(this.reminders.get(invoiceId) ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  createActivity(activity: InvoiceActivityRecord): void {
    const current = this.activities.get(activity.invoiceId) ?? [];
    this.activities.set(activity.invoiceId, [...current, activity]);
  }

  listActivitiesByInvoiceId(invoiceId: string): readonly InvoiceActivityRecord[] {
    return [...(this.activities.get(invoiceId) ?? [])].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    );
  }

  createPublicPaymentLink(link: InvoicePublicPaymentLinkRecord): void {
    this.publicLinks.set(link.id, link);
  }

  updatePublicPaymentLink(link: InvoicePublicPaymentLinkRecord): void {
    this.publicLinks.set(link.id, link);
  }

  getPublicPaymentLinkById(linkId: string): InvoicePublicPaymentLinkRecord | undefined {
    return this.publicLinks.get(linkId);
  }

  listPublicPaymentLinksByInvoiceId(invoiceId: string): readonly InvoicePublicPaymentLinkRecord[] {
    return [...this.publicLinks.values()]
      .filter((link) => link.invoiceId === invoiceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
