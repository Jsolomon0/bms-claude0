import { WebsitePageShell } from "../lib/page-shell.tsx";
import { fmleSite } from "../lib/siteConfig.ts";

function ServiceCard({ title, description, index }: { title: string; description: string; index: number }) {
  return (
    <article className="fmle-service-card">
      <span className="fmle-service-number">{String(index + 1).padStart(2, "0")}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export default function WebsiteHomePage() {
  return (
    <WebsitePageShell>
      <main>
        <section className="fmle-hero" id="top">
          <div className="fmle-hero-copy">
            <div className="fmle-kicker"><span /> Tax season & year-round financial support</div>
            <h1>Tax preparation with a financial partner mindset.</h1>
            <p className="fmle-hero-lede">
              Experienced tax and financial professionals helping individuals, businesses, and nonprofits file with confidence,
              organize their finances, and prepare for what comes next.
            </p>
            <div className="fmle-hero-actions">
              <a className="fmle-button fmle-button-primary" href="/request">Request a consultation</a>
              <a className="fmle-button fmle-button-secondary" href={fmleSite.phoneHref}>Call {fmleSite.phone}</a>
            </div>
            <div className="fmle-trust-row" aria-label="FMLE service highlights">
              <span>Individual & business filing</span>
              <span>Accounting & bookkeeping</span>
              <span>Payroll support</span>
            </div>
          </div>
          <aside className="fmle-hero-panel">
            <img
              src="/brand/fmle-mark.png"
              alt="FMLE"
              width={96}
              height={96}
              style={{ width: 96, height: 96, objectFit: "contain", marginBottom: 30, position: "relative" }}
            />
            <span className="fmle-panel-label">Tax season is here</span>
            <h2>Prepare accurately. Claim what you’re eligible for. File with clarity.</h2>
            <p>Get tax guidance before filing and a preparation process built around your actual situation.</p>
            <a href="/request">Start with FMLE <span aria-hidden="true">→</span></a>
            <div className="fmle-panel-accent" />
          </aside>
        </section>

        <section className="fmle-strip" aria-label="FMLE service categories">
          <span>Tax Preparation</span><i />
          <span>Financial Solutions</span><i />
          <span>Business Support</span><i />
          <span>Payroll Services</span>
        </section>

        <section className="fmle-section" id="tax-services">
          <div className="fmle-section-heading">
            <div>
              <span className="fmle-eyebrow">Tax services</span>
              <h2>Prepared for individuals, businesses, and organizations.</h2>
            </div>
            <p>
              FMLE combines practical filing support with a focus on accuracy, documentation, and the tax opportunities that apply to your circumstances.
            </p>
          </div>
          <div className="fmle-service-grid fmle-service-grid-four">
            {fmleSite.taxServices.map((service, index) => <ServiceCard key={service.title} {...service} index={index} />)}
          </div>
        </section>

        <section className="fmle-section fmle-section-soft" id="financial-services">
          <div className="fmle-section-heading">
            <div>
              <span className="fmle-eyebrow">Financial solutions</span>
              <h2>Support that continues after the return is filed.</h2>
            </div>
            <p>
              Build cleaner records, more dependable reporting, and stronger financial operations with services designed for ongoing business needs.
            </p>
          </div>
          <div className="fmle-service-grid">
            {fmleSite.financialServices.map((service, index) => <ServiceCard key={service.title} {...service} index={index} />)}
          </div>
        </section>

        <section className="fmle-split" id="about">
          <div className="fmle-split-dark">
            <span className="fmle-eyebrow fmle-eyebrow-light">Why FMLE</span>
            <h2>One relationship for tax preparation and financial organization.</h2>
            <p>
              Instead of treating tax filing as a once-a-year transaction, FMLE can help clients keep the financial side of life and business better organized throughout the year.
            </p>
            <ul className="fmle-check-list">
              <li>Tax preparation for multiple filing needs</li>
              <li>Business and nonprofit support</li>
              <li>Accounting, bookkeeping, and payroll services</li>
              <li>Direct access to a Miami-based team</li>
            </ul>
          </div>
          <div className="fmle-split-light">
            <span className="fmle-eyebrow">A simple process</span>
            <ol className="fmle-process-list">
              <li><strong>01</strong><div><h3>Tell us what you need</h3><p>Start with a consultation request or call the office directly.</p></div></li>
              <li><strong>02</strong><div><h3>Organize the right information</h3><p>FMLE reviews your service need and identifies the records or documents required.</p></div></li>
              <li><strong>03</strong><div><h3>Prepare and review</h3><p>Work through the filing or financial service with clear review points before completion.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="fmle-referral">
          <div>
            <span className="fmle-eyebrow">Personal referrals</span>
            <h2>Know someone who needs tax or financial help?</h2>
            <p>Ask the FMLE team about the current personal-referral incentive and its terms.</p>
          </div>
          <a className="fmle-button fmle-button-light" href={fmleSite.phoneHref}>Ask about referrals</a>
        </section>

        <section className="fmle-contact" id="contact">
          <div className="fmle-contact-copy">
            <span className="fmle-eyebrow">Contact FMLE</span>
            <h2>Get tax advice before you file.</h2>
            <p>Call, email, or request a consultation online. FMLE serves clients from its Miami office with a 24/7 contact line.</p>
            <div className="fmle-contact-actions">
              <a className="fmle-button fmle-button-primary" href="/request">Request a consultation</a>
              <a className="fmle-text-link" href={fmleSite.emailHref}>{fmleSite.email}</a>
            </div>
          </div>
          <div className="fmle-contact-card">
            <div><small>Phone</small><a href={fmleSite.phoneHref}>{fmleSite.phone}</a></div>
            <div><small>Office</small><strong>{fmleSite.addressLine1}<br />{fmleSite.addressLine2}</strong><span>{fmleSite.parkingNote}</span></div>
            <div><small>Fax</small><strong>{fmleSite.fax}</strong></div>
          </div>
        </section>
      </main>
    </WebsitePageShell>
  );
}
