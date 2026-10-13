import { redirect } from "next/navigation";
import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getCurrentFmleUser } from "../../lib/customer-auth.ts";
import { getStaffSnapshot } from "../../lib/staff-data.ts";
import {
  createInvoiceAction,
  recordPaymentAction,
  sendCustomerMessageAction,
  updateTaxReturnAction,
  uploadCustomerDocumentAction
} from "./actions.ts";

function money(value: string | number, currency = "USD") {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
    : String(value);
}

function customerName(data: Awaited<ReturnType<typeof getStaffSnapshot>>, id: string | null) {
  if (!data || !id) return "Unassigned";
  return data.customers.find((customer) => customer.id === id)?.displayName || id;
}

export default async function StaffPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const user = await getCurrentFmleUser();
  if (!user) redirect("/login");

  const data = await getStaffSnapshot();
  const params = searchParams ? await searchParams : undefined;

  if (!data) {
    return (
      <WebsitePageShell>
        <main className="fmle-form-page">
          <div className="fmle-form-shell">
            <section className="fmle-form-card">
              <span className="fmle-eyebrow">FMLE staff</span>
              <h1>Staff access required</h1>
              <p>
                This account is signed in but does not have an active BMS owner or administrator role.
              </p>
              <a className="fmle-button fmle-button-secondary" href="/">Return to website</a>
            </section>
          </div>
        </main>
      </WebsitePageShell>
    );
  }

  const successLabels: Record<string, string> = {
    "tax-status": "Tax-return status updated.",
    invoice: "Invoice created and shared with the customer.",
    payment: "Payment recorded.",
    message: "Customer message sent to the portal.",
    document: "Document uploaded and shared securely."
  };

  const errorLabels: Record<string, string> = {
    "tax-status": "Tax-return status could not be updated.",
    invoice: "Invoice could not be created.",
    payment: "Payment could not be recorded.",
    message: "Message could not be sent.",
    document: "Document could not be uploaded/shared."
  };

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell fmle-staff-shell">
          <div className="fmle-account-header">
            <div>
              <span className="fmle-eyebrow">Internal workspace</span>
              <h1>FMLE staff console</h1>
              <p>Manage customer-facing tax status, files, billing, payments, and portal communications.</p>
            </div>
            <a className="fmle-button fmle-button-secondary" href="/account">My account</a>
          </div>

          {params?.success ? (
            <div className="fmle-staff-success">{successLabels[params.success] || "Update completed."}</div>
          ) : null}
          {params?.error ? (
            <div className="fmle-alert">{errorLabels[params.error] || "The requested update failed."}</div>
          ) : null}

          <div className="fmle-account-summary">
            <div className="fmle-account-summary-card">
              <small>Customers</small>
              <strong>{data.customers.length}</strong>
              <span>{data.customers.filter((customer) => customer.authLinked).length} linked to portal login</span>
            </div>
            <div className="fmle-account-summary-card">
              <small>Tax returns</small>
              <strong>{data.taxReturns.length}</strong>
              <span>Customer-visible status records</span>
            </div>
            <div className="fmle-account-summary-card">
              <small>Invoices</small>
              <strong>{data.recentInvoices.length}</strong>
              <span>Recent billing records</span>
            </div>
            <div className="fmle-account-summary-card">
              <small>Shared documents</small>
              <strong>{data.recentDocuments.length}</strong>
              <span>Recent document records</span>
            </div>
          </div>

          <section className="fmle-account-section">
            <div className="fmle-account-section-heading">
              <div>
                <span className="fmle-eyebrow">Customers</span>
                <h2>Customer directory</h2>
              </div>
            </div>
            {data.customers.length === 0 ? (
              <p className="fmle-account-empty">No customer records are available yet.</p>
            ) : (
              <div className="fmle-account-list">
                {data.customers.map((customer) => (
                  <article className="fmle-account-row" key={customer.id}>
                    <div>
                      <strong>{customer.displayName}</strong>
                      <span>
                        {customer.email || "No email"} · {customer.phone || "No phone"} · {customer.accountNumber || "No account #"}
                      </span>
                    </div>
                    <span className="fmle-status">{customer.authLinked ? "Portal linked" : "Needs login link"}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="fmle-staff-form-grid">
            <section className="fmle-form-card">
              <span className="fmle-eyebrow">Tax preparation</span>
              <h2>Update tax-return status</h2>
              <form action={updateTaxReturnAction}>
                <div className="fmle-form-grid">
                  <StaffCustomerSelect customers={data.customers} />
                  <div className="fmle-field">
                    <label htmlFor="taxYear">Tax year</label>
                    <input id="taxYear" name="taxYear" type="number" min="2000" max="2200" defaultValue={new Date().getFullYear() - 1} required />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="returnType">Return type</label>
                    <select id="returnType" name="returnType" defaultValue="individual">
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="payroll">Payroll</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="taxStatus">Status</label>
                    <select id="taxStatus" name="status" defaultValue="intake">
                      <option value="intake">Intake</option>
                      <option value="documents_needed">Documents needed</option>
                      <option value="in_preparation">In preparation</option>
                      <option value="client_review">Client review</option>
                      <option value="ready_to_file">Ready to file</option>
                      <option value="filed">Filed</option>
                      <option value="accepted">Accepted</option>
                      <option value="action_required">Action required</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="statusMessage">Customer status note</label>
                    <textarea id="statusMessage" name="statusMessage" placeholder="Example: We received your W-2 and are waiting on your 1099." />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Save tax status</button>
              </form>
            </section>

            <section className="fmle-form-card">
              <span className="fmle-eyebrow">Documents</span>
              <h2>Upload & share a file</h2>
              <form action={uploadCustomerDocumentAction}>
                <div className="fmle-form-grid">
                  <StaffCustomerSelect customers={data.customers} id="documentCustomer" />
                  <div className="fmle-field">
                    <label htmlFor="docCategory">Category</label>
                    <select id="docCategory" name="category" defaultValue="tax_document">
                      <option value="tax_document">Tax document</option>
                      <option value="tax_return">Tax return</option>
                      <option value="invoice">Invoice/supporting document</option>
                      <option value="financial_statement">Financial statement</option>
                      <option value="engagement_letter">Engagement letter</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="docTitle">Document title</label>
                    <input id="docTitle" name="title" required placeholder="2026 Individual Tax Return" />
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="file">File</label>
                    <input id="file" name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" />
                    <small>PDF, image, DOCX, or XLSX. Maximum 20 MB.</small>
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Upload & share</button>
              </form>
            </section>

            <section className="fmle-form-card">
              <span className="fmle-eyebrow">Billing</span>
              <h2>Create customer invoice</h2>
              <form action={createInvoiceAction}>
                <div className="fmle-form-grid">
                  <StaffCustomerSelect customers={data.customers} id="invoiceCustomer" />
                  <div className="fmle-field">
                    <label htmlFor="dueAt">Due date</label>
                    <input id="dueAt" name="dueAt" type="date" required />
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="invoiceDescription">Description</label>
                    <input id="invoiceDescription" name="description" required placeholder="2026 tax preparation services" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="invoiceAmount">Subtotal</label>
                    <input id="invoiceAmount" name="amount" type="number" min="0" step="0.01" required />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="taxAmount">Tax/fees</label>
                    <input id="taxAmount" name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Create invoice</button>
              </form>
            </section>

            <section className="fmle-form-card">
              <span className="fmle-eyebrow">Payments</span>
              <h2>Record a payment</h2>
              <form action={recordPaymentAction}>
                <div className="fmle-form-grid">
                  <StaffCustomerSelect customers={data.customers} id="paymentCustomer" />
                  <div className="fmle-field">
                    <label htmlFor="paymentAmount">Amount</label>
                    <input id="paymentAmount" name="amount" type="number" min="0.01" step="0.01" required />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="paymentMethod">Method</label>
                    <select id="paymentMethod" name="paymentMethod" defaultValue="card">
                      <option value="card">Card</option>
                      <option value="ach">ACH</option>
                      <option value="wire">Wire</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="invoiceId">Allocate to invoice</label>
                    <select id="invoiceId" name="invoiceId" defaultValue="">
                      <option value="">No invoice allocation</option>
                      {data.recentInvoices.filter((invoice) => Number(invoice.balanceDueAmount) > 0).map((invoice) => (
                        <option value={invoice.id} key={invoice.id}>
                          {invoice.invoiceNumber} — {customerName(data, invoice.customerId)} — {money(invoice.balanceDueAmount, invoice.currencyCode)} due
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="reference">Reference</label>
                    <input id="reference" name="reference" placeholder="Check number, processor reference, or note" />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Record payment</button>
              </form>
            </section>

            <section className="fmle-form-card fmle-staff-span-two">
              <span className="fmle-eyebrow">Customer portal</span>
              <h2>Send a portal message</h2>
              <form action={sendCustomerMessageAction}>
                <div className="fmle-form-grid">
                  <StaffCustomerSelect customers={data.customers} id="messageCustomer" />
                  <div className="fmle-field">
                    <label htmlFor="threadId">Existing thread (optional)</label>
                    <select id="threadId" name="threadId" defaultValue="">
                      <option value="">Start a new conversation</option>
                      {data.recentThreads.map((thread) => (
                        <option value={thread.id} key={thread.id}>
                          {thread.subject} — {customerName(data, thread.customerId)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="subject">Subject</label>
                    <input id="subject" name="subject" placeholder="Documents needed for your return" />
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="messageBody">Message</label>
                    <textarea id="messageBody" name="body" required placeholder="Write the message the customer should see in their portal." />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Send portal message</button>
              </form>
            </section>
          </div>

          <section className="fmle-account-section">
            <div className="fmle-account-section-heading">
              <div>
                <span className="fmle-eyebrow">Recent activity</span>
                <h2>Customer-facing records</h2>
              </div>
            </div>
            <div className="fmle-staff-activity-grid">
              <div>
                <h3>Tax status</h3>
                {data.taxReturns.slice(0, 8).map((item) => (
                  <div className="fmle-staff-mini-row" key={item.id}>
                    <strong>{customerName(data, item.customerId)}</strong>
                    <span>{item.taxYear} · {item.status.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3>Invoices</h3>
                {data.recentInvoices.slice(0, 8).map((item) => (
                  <div className="fmle-staff-mini-row" key={item.id}>
                    <strong>{item.invoiceNumber}</strong>
                    <span>{customerName(data, item.customerId)} · {money(item.balanceDueAmount, item.currencyCode)} due</span>
                  </div>
                ))}
              </div>
              <div>
                <h3>Payments</h3>
                {data.recentPayments.slice(0, 8).map((item) => (
                  <div className="fmle-staff-mini-row" key={item.id}>
                    <strong>{money(item.grossAmount, item.currencyCode)}</strong>
                    <span>{customerName(data, item.customerId)} · {item.paymentMethod}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </WebsitePageShell>
  );
}

function StaffCustomerSelect({
  customers,
  id = "customerId"
}: {
  customers: Array<{ id: string; displayName: string; email: string | null }>;
  id?: string;
}) {
  return (
    <div className="fmle-field">
      <label htmlFor={id}>Customer</label>
      <select id={id} name="customerId" defaultValue="" required>
        <option value="" disabled>Select customer</option>
        {customers.map((customer) => (
          <option value={customer.id} key={customer.id}>
            {customer.displayName}{customer.email ? ` — ${customer.email}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
