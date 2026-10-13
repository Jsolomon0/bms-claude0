import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { fmleSite } from "../../lib/siteConfig.ts";

export default function ContactPage() {
  return (
    <WebsitePageShell>
      <main>
        <section className="fmle-contact fmle-contact-page">
          <div className="fmle-contact-copy">
            <span className="fmle-eyebrow">Contact FMLE</span>
            <h1>Talk with FMLE about your tax or financial needs.</h1>
            <p>Call, email, or book an appointment online. FMLE serves clients from its Miami office and provides a 24/7 contact line.</p>
            <div className="fmle-contact-actions">
              <a className="fmle-button fmle-button-primary" href="/appointments">Book an appointment</a>
              <a className="fmle-button fmle-button-secondary" href={fmleSite.phoneHref}>Call {fmleSite.phone}</a>
            </div>
          </div>
          <div className="fmle-contact-card">
            <div><small>Phone</small><a href={fmleSite.phoneHref}>{fmleSite.phone}</a><span>{fmleSite.contactAvailability}</span></div>
            <div><small>Email</small><a href={fmleSite.emailHref}>{fmleSite.email}</a></div>
            <div><small>Office</small><strong>{fmleSite.addressLine1}<br />{fmleSite.addressLine2}</strong><span>{fmleSite.parkingNote}</span></div>
            <div><small>Fax</small><strong>{fmleSite.fax}</strong></div>
          </div>
        </section>

        <section className="fmle-section fmle-section-soft">
          <div className="fmle-section-heading">
            <div>
              <span className="fmle-eyebrow">Choose your next step</span>
              <h2>Need an appointment or have a general question?</h2>
            </div>
            <p>For a specific service discussion, booking an appointment gives FMLE the information needed to prepare for the conversation.</p>
          </div>
          <div className="fmle-service-grid fmle-service-grid-four">
            <article className="fmle-service-card">
              <span className="fmle-service-number">01</span>
              <h3>Book an appointment</h3>
              <p>Choose a service, preferred date, and preferred time.</p>
              <a className="fmle-text-link" href="/appointments">Book appointment →</a>
            </article>
            <article className="fmle-service-card">
              <span className="fmle-service-number">02</span>
              <h3>Call FMLE</h3>
              <p>Speak with the office directly at {fmleSite.phone}.</p>
              <a className="fmle-text-link" href={fmleSite.phoneHref}>Call now →</a>
            </article>
            <article className="fmle-service-card">
              <span className="fmle-service-number">03</span>
              <h3>Email FMLE</h3>
              <p>Send a general inquiry to {fmleSite.email}.</p>
              <a className="fmle-text-link" href={fmleSite.emailHref}>Send email →</a>
            </article>
            <article className="fmle-service-card">
              <span className="fmle-service-number">04</span>
              <h3>Customer account</h3>
              <p>Existing customers can sign in to view their private FMLE account.</p>
              <a className="fmle-text-link" href="/login">Customer login →</a>
            </article>
          </div>
        </section>
      </main>
    </WebsitePageShell>
  );
}
