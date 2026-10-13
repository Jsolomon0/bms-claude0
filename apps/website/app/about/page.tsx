import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { fmleSite } from "../../lib/siteConfig.ts";

export default function AboutFmlePage() {
  return (
    <WebsitePageShell>
      <main>
        <section className="fmle-hero fmle-inner-hero">
          <div className="fmle-hero-copy">
            <div className="fmle-kicker"><span /> Why FMLE</div>
            <h1>One relationship for tax preparation and financial organization.</h1>
            <p className="fmle-hero-lede">
              FMLE Tax & Financial Solution Partners combines tax preparation with practical financial support for individuals, businesses, and organizations.
            </p>
            <div className="fmle-hero-actions">
              <a className="fmle-button fmle-button-primary" href="/appointments">Meet with FMLE</a>
              <a className="fmle-button fmle-button-secondary" href="/contact">Contact us</a>
            </div>
          </div>
          <aside className="fmle-hero-panel">
            <img src="/brand/fmle-mark.png" alt="FMLE" width={96} height={96} style={{ width: 96, height: 96, objectFit: "contain", marginBottom: 24 }} />
            <span className="fmle-panel-label">FMLE</span>
            <h2>Tax and financial support with a longer-term perspective.</h2>
          </aside>
        </section>

        <section className="fmle-split">
          <div className="fmle-split-dark">
            <span className="fmle-eyebrow fmle-eyebrow-light">Our approach</span>
            <h2>More than a once-a-year filing interaction.</h2>
            <p>
              FMLE is positioned to help clients prepare taxes while also improving the financial organization that supports future filings, reporting, payroll, and business decisions.
            </p>
            <ul className="fmle-check-list">
              <li>Tax preparation for multiple filing needs</li>
              <li>Business and nonprofit support</li>
              <li>Accounting, bookkeeping, and payroll services</li>
              <li>Financial-statement and audit support</li>
            </ul>
          </div>
          <div className="fmle-split-light">
            <span className="fmle-eyebrow">How it works</span>
            <ol className="fmle-process-list">
              <li><strong>01</strong><div><h3>Start with your need</h3><p>Tell FMLE what you are trying to accomplish.</p></div></li>
              <li><strong>02</strong><div><h3>Organize the information</h3><p>Identify the records, documents, and details required for the service.</p></div></li>
              <li><strong>03</strong><div><h3>Prepare and review</h3><p>Work through preparation with review points before completion.</p></div></li>
              <li><strong>04</strong><div><h3>Stay organized</h3><p>Use year-round services when continued financial support makes sense.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="fmle-contact">
          <div className="fmle-contact-copy">
            <span className="fmle-eyebrow">Miami office</span>
            <h2>Work with the FMLE team.</h2>
            <p>{fmleSite.addressLine1}, {fmleSite.addressLine2}. {fmleSite.parkingNote}.</p>
            <a className="fmle-button fmle-button-primary" href="/contact">View contact information</a>
          </div>
        </section>
      </main>
    </WebsitePageShell>
  );
}
