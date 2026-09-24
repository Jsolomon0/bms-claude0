import { redirect } from "next/navigation";
import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getCurrentFmleUser } from "../../lib/customer-auth.ts";
import { getCustomerPortalSnapshot } from "../../lib/portal-data.ts";
import { logoutCustomerAction } from "../login/actions.ts";

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(date);
}

function formatMoney(value: string | number, currency = "USD") {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function CustomerAccountPage() {
  const user = await getCurrentFmleUser();
  if (!user) redirect("/login");

  const data = await getCustomerPortalSnapshot();
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || "FMLE Customer";

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell fmle-account-shell">
          <div className="fmle-account-header">
            <div>
              <span className="fmle-eyebrow">Private customer area</span>
              <h1>Welcome, {displayName}.</h1>
              <p>{user.email}</p>
            </div>
            <form action={logoutCustomerAction}>
              <button className="fmle-button fmle-button-secondary" type="submit">Log out</button>
            </form>
          </div>

          {!data ? (
            <section className="fmle-form-card">
              <h2>Customer record not linked yet</h2>
              <p>
                Your login is valid, but it has not yet been linked to an FMLE customer record. Contact FMLE so the account can be connected.
              </p>
            </section>
          ) : (
            <>
              <div className="fmle-account-summary">
                <a className="fmle-account-summary-card" href="/appointments">
                  <small>Appointments</small>
                  <strong>{data.appointments.length}</strong>
                  <span>Request or review appointments</span>
                </a>
                <div className="fmle-account-summary-card">
                  <small>Tax returns</small>
                  <strong>{data.taxReturns.length}</strong>
                  <span>Current filing status</span>
                </div>
                <div className="fmle-account-summary-card">
                  <small>Documents</small>
                  <strong>{data.documents.length}</strong>
                  <span>Customer-visible files</span>
                </div>
                <div className="fmle-account-summary-card">
                  <small>Open balance</small>
                  <strong>{formatMoney(data.invoices.reduce((sum, item) => sum + Number(item.balanceDueAmount || 0), 0))}</strong>
                  <span>Across visible invoices</span>
                </div>
              </div>

              <section className="fmle-account-section">
                <div className="fmle-account-section-heading">
                  <div>
                    <span className="fmle-eyebrow">Appointments</span>
                    <h2>Your appointments</h2>
                  </div>
                  <a className="fmle-button fmle-button-primary" href="/appointments">Request appointment</a>
                </div>
                {data.appointments.length === 0 ? (
                  <p className="fmle-account-empty">No appointment records are available yet.</p>
                ) : (
                  <div className="fmle-account-list">
                    {data.appointments.map((appointment) => (
                      <article className="fmle-account-row" key={appointment.id}>
                        <div>
                          <strong>{formatDate(appointment.scheduledStartAt || appointment.createdAt)}</strong>
                          <span>{appointment.notes || "FMLE consultation"}</span>
                        </div>
                        <span className="fmle-status">{titleCase(appointment.status)}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="fmle-account-section">
                <div className="fmle-account-section-heading">
                  <div>
                    <span className="fmle-eyebrow">Tax filing</span>
                    <h2>Tax-return status</h2>
                  </div>
                </div>
                {data.taxReturns.length === 0 ? (
                  <p className="fmle-account-empty">No customer-visible tax-return status has been posted yet.</p>
                ) : (
                  <div className="fmle-account-grid">
                    {data.taxReturns.map((item) => (
                      <article className="fmle-account-card" key={item.id}>
                        <span className="fmle-service-number">{item.taxYear}</span>
                        <h2>{titleCase(item.returnType)} return</h2>
                        <p className="fmle-status-line">{titleCase(item.status)}</p>
                        <p>{item.statusMessage || "No additional status note has been posted."}</p>
                        <small>Updated {formatDate(item.updatedAt)}</small>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="fmle-account-section">
                <div className="fmle-account-section-heading">
                  <div>
                    <span className="fmle-eyebrow">Documents</span>
                    <h2>Your files</h2>
                  </div>
                </div>
                {data.documents.length === 0 ? (
                  <p className="fmle-account-empty">No documents are currently shared with your account.</p>
                ) : (
                  <div className="fmle-account-list">
                    {data.documents.map((document) => (
                      <article className="fmle-account-row" key={document.id}>
                        <div>
                          <strong>{document.title}</strong>
                          <span>{titleCase(document.category)}{document.fileName ? ` · ${document.fileName}` : ""}</span>
                        </div>
                        {document.downloadable && document.versionId ? (
                          <a className="fmle-text-link" href={`/account/documents/${document.id}`}>Download</a>
                        ) : (
                          <span className="fmle-status">View only</span>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="fmle-account-section">
                <div className="fmle-account-section-heading">
                  <div>
                    <span className="fmle-eyebrow">Billing</span>
                    <h2>Invoices & payments</h2>
                  </div>
                </div>
                <div className="fmle-account-two-column">
                  <div>
                    <h3>Invoices</h3>
                    {data.invoices.length === 0 ? (
                      <p className="fmle-account-empty">No invoices are visible.</p>
                    ) : (
                      <div className="fmle-account-list">
                        {data.invoices.map((invoice) => (
                          <article className="fmle-account-row" key={invoice.id}>
                            <div>
                              <strong>{invoice.invoiceNumber}</strong>
                              <span>Due {invoice.dueAt || "not set"}</span>
                            </div>
                            <div className="fmle-account-money">
                              <strong>{formatMoney(invoice.totalAmount, invoice.currencyCode)}</strong>
                              <span>{formatMoney(invoice.balanceDueAmount, invoice.currencyCode)} due</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3>Payments</h3>
                    {data.payments.length === 0 ? (
                      <p className="fmle-account-empty">No payments are visible.</p>
                    ) : (
                      <div className="fmle-account-list">
                        {data.payments.map((payment) => (
                          <article className="fmle-account-row" key={payment.id}>
                            <div>
                              <strong>{formatMoney(payment.grossAmount, payment.currencyCode)}</strong>
                              <span>{titleCase(payment.paymentMethod)} · {formatDate(payment.settledAt || payment.authorizedAt || payment.createdAt)}</span>
                            </div>
                            <span className="fmle-status">{titleCase(payment.status)}</span>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="fmle-account-section">
                <div className="fmle-account-section-heading">
                  <div>
                    <span className="fmle-eyebrow">Messages</span>
                    <h2>FMLE conversations</h2>
                  </div>
                </div>
                {data.messageThreads.length === 0 ? (
                  <p className="fmle-account-empty">No customer-visible messages are available.</p>
                ) : (
                  <div className="fmle-message-threads">
                    {data.messageThreads.map((thread) => (
                      <article className="fmle-message-thread" key={thread.id}>
                        <div className="fmle-message-thread-header">
                          <div>
                            <strong>{thread.subject}</strong>
                            <span>Updated {formatDate(thread.updatedAt)}</span>
                          </div>
                          <span className="fmle-status">{titleCase(thread.status)}</span>
                        </div>
                        <div className="fmle-message-list">
                          {thread.messages.length === 0 ? (
                            <p className="fmle-account-empty">No customer-visible messages in this thread.</p>
                          ) : thread.messages.map((message) => (
                            <div className={`fmle-message ${message.fromStaff ? "fmle-message-staff" : "fmle-message-customer"}`} key={message.id}>
                              <small>{message.fromStaff ? "FMLE" : "You"} · {formatDate(message.createdAt)}</small>
                              <p>{message.body}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </WebsitePageShell>
  );
}
