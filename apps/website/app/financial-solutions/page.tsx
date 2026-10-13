import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { fmleSite } from "../../lib/siteConfig.ts";

export default function FinancialSolutionsPage() {
  return (
    <WebsitePageShell>
      <main>
        <section className="fmle-hero fmle-inner-hero">
          <div className="fmle-hero-copy">
            <div className="fmle-kicker"><span /> Year-round financial support</div>
            <h1>Financial organization that continues beyond tax season.</h1>
            <p className="fmle-hero-lede">
              FMLE helps businesses and organizations maintain cleaner records, improve recurring financial processes, and prepare useful financial information throughout the year.
            </p>
            <div className="fmle-hero-actions">
              <a className="fmle-button fmle-button-primary" href="/appointments">Discuss your needs</a>
              <a className="fmle-button fmle-button-secondary" href={fmleSite.emailHref}>Email FMLE</a>
            </div>
          </div>
          <aside className="fmle-hero-panel">
            <span className="fmle-panel-label">Financial solutions</span>
            <h2>Better records support better decisions.</h2>
            <p>From bookkeeping and payroll to statements and audit support, FMLE provides practical financial operations assistance.</p>
          </aside>
        </section>

        <section className="fmle-section fmle-section-soft">
          <div className="fmle-section-heading">
            <div>
              <span className="fmle-eyebrow">Services</span>
              <h2>Support for everyday financial operations.</h2>
            </div>
            <p>These services can be used individually or alongside FMLE tax preparation depending on your business or organizational needs.</p>
          </div>
          <div className="fmle-service-grid">
            {fmleSite.financialServices.map((service, index) => (
              <article className="fmle-service-card" key={service.title}>
                <span className="fmle-service-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fmle-contact">
          <div className="fmle-contact-copy">
            <span className="fmle-eyebrow">Work with FMLE</span>
            <h2>Need ongoing bookkeeping, payroll, or reporting support?</h2>
            <p>Tell FMLE what your current process looks like and where you need more structure or assistance.</p>
            <div className="fmle-contact-actions">
              <a className="fmle-button fmle-button-primary" href="/appointments">Book an appointment</a>
              <a className="fmle-text-link" href={fmleSite.phoneHref}>{fmleSite.phone}</a>
            </div>
          </div>
        </section>
      </main>
    </WebsitePageShell>
  );
}
