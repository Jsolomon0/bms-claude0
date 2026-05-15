import type {
  InvoiceHtmlRenderModel,
  InvoicePdfRenderModel,
  InvoiceRecord,
  InvoiceLineItemRecord,
  PaymentRecord
} from "../../types/src/index.ts";

function centsToCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountCents / 100);
}

export function renderInvoiceHtml(model: InvoiceHtmlRenderModel): string {
  const lineItemsHtml = model.lineItems
    .map(
      (item) =>
        `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${centsToCurrency(item.unitAmountCents, model.invoice.currency)}</td><td>${centsToCurrency(item.lineTotalCents, model.invoice.currency)}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${model.invoice.invoiceNumber} - ${model.brandName}</title>
    <style>
      body { font-family: Georgia, serif; color: #102033; margin: 32px; }
      .brand { color: ${model.brandAccent}; font-size: 28px; font-weight: 700; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; color: #5d7085; font-size: 12px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { border-bottom: 1px solid #d6dee6; padding: 10px 0; text-align: left; }
      .totals { margin-top: 24px; width: 320px; margin-left: auto; }
      .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
      .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #edf3f8; }
    </style>
  </head>
  <body>
    <div class="eyebrow">${model.organizationLabel}</div>
    <div class="brand">${model.brandName}</div>
    <div class="grid">
      <div>
        <h1>${model.invoice.title}</h1>
        <div>Invoice ${model.invoice.invoiceNumber}</div>
        <div>Customer: ${model.customerLabel}</div>
      </div>
      <div>
        <div class="pill">Status: ${model.invoice.status}</div>
        <div>Due ${model.invoice.dueAt.slice(0, 10)}</div>
        <div>Balance ${centsToCurrency(model.invoice.balanceDueCents, model.invoice.currency)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
      </thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><strong>${centsToCurrency(model.invoice.subtotalCents, model.invoice.currency)}</strong></div>
      <div><span>Tax</span><strong>${centsToCurrency(model.invoice.taxCents, model.invoice.currency)}</strong></div>
      <div><span>Total</span><strong>${centsToCurrency(model.invoice.totalCents, model.invoice.currency)}</strong></div>
      <div><span>Paid</span><strong>${centsToCurrency(model.invoice.paidCents, model.invoice.currency)}</strong></div>
      <div><span>Balance Due</span><strong>${centsToCurrency(model.invoice.balanceDueCents, model.invoice.currency)}</strong></div>
    </div>
  </body>
</html>`;
}

export function renderInvoicePdfModel(
  invoice: InvoiceRecord,
  lineItems: readonly InvoiceLineItemRecord[]
): InvoicePdfRenderModel {
  return {
    fileName: `${invoice.invoiceNumber}.pdf`,
    title: invoice.title,
    sections: [
      {
        heading: "Invoice",
        rows: [
          { label: "Invoice Number", value: invoice.invoiceNumber },
          { label: "Status", value: invoice.status },
          { label: "Due Date", value: invoice.dueAt.slice(0, 10) }
        ]
      },
      {
        heading: "Totals",
        rows: [
          { label: "Subtotal", value: String(invoice.subtotalCents) },
          { label: "Tax", value: String(invoice.taxCents) },
          { label: "Total", value: String(invoice.totalCents) },
          { label: "Balance Due", value: String(invoice.balanceDueCents) }
        ]
      },
      {
        heading: "Line Items",
        rows: lineItems.map((item) => ({
          label: `${item.description} x${item.quantity}`,
          value: String(item.lineTotalCents)
        }))
      }
    ]
  };
}

export function renderPaymentReceiptHtml(invoice: InvoiceRecord, payment: PaymentRecord, receiptNumber: string): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Receipt ${receiptNumber}</title></head>
  <body style="font-family: Georgia, serif; margin: 32px; color: #102033;">
    <div style="text-transform: uppercase; letter-spacing: 0.08em; color: #5d7085; font-size: 12px;">Payment receipt</div>
    <h1>${receiptNumber}</h1>
    <p>Invoice ${invoice.invoiceNumber}</p>
    <p>Payment ${payment.id}</p>
    <p>Amount ${centsToCurrency(payment.amountCents, payment.currency)}</p>
    <p>Status ${payment.status}</p>
    <p>Received ${payment.receivedAt.slice(0, 10)}</p>
  </body>
</html>`;
}
