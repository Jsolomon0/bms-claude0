import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { fmleSite } from "../../lib/siteConfig.ts";

export default function TaxServicesPage() {
  return (
    <WebsitePageShell>
      <main>
        <section className="fmle-hero fmle-inner-hero">
          <div className="fmle-hero-copy">
            <div className="fmle-kicker"><span /> Tax preparation services</div>
            <h1>Tax preparation built around your actual filing needs.</h1>
            <p className="fmle-hero-lede">
              FMLE supports individuals, businesses, corporations, nonprofits, and payroll-related filing with an emphasis on accuracy, documentation, and clear communication.
            </p>
            <div className="fmle-hero-actions">
              <a className="fmle-button fmle-button-primary" href="/appointments">Book an appointment</a>
              <a className="fmle-button fmle-button-secondary" href={fmleSite.phoneHref}>Call {fmleSite.phone}</a>
            </div>
          </div>
          <aside className="fmle-hero-panel">
            <span className="fmle-panel-label">Tax services</span>
            <h2>Prepare carefully. Review clearly. File with confidence.</h2>
            <p>FMLE helps clients organize the right information before filing and understand what applies to their specific situation.</p>
          </aside>
        </section>

        <section className="fmle-section">
          <div className="fmle-section-heading">
            <div>
              <span className="fmle-eyebrow">What we handle</span>
              <h2>Tax services for different types of filers.</h2>
            </div>
            <p>Choose the service that best matches your filing situation. FMLE can help determine what documents and information are needed before preparation begins.</p>
          </div>
          <div className="fmle-service-grid fmle-service-grid-four">
            {fmleSite.taxServices.map((service, index) => (
              <article className="fmle-service-card" key={service.title}>
                <span className="fmle-service-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fmle-split">
          <div className="fmle-split-dark">
            <span className="fmle-eyebrow fmle-eyebrow-light">Before you file</span>
            <h2>Start with the right records and questions.</h2>
            <ul className="fmle-check-list">
              <li>Income and tax forms relevant to your filing</li>
              <li>Business or nonprofit records when applicable</li>
              <li>Information related to eligible deductions and credits</li>
              <li>Prior-year information when it helps provide context</li>
            </ul>
          </div>
          <div className="fmle-split-light">
            <span className="fmle-eyebrow">Next step</span>
            <h2>Schedule time with the FMLE team.</h2>
            <p>Use the appointment page to tell FMLE what type of tax help you need and choose your preferred date and time.</p>
            <a className="fmle-button fmle-button-primary" href="/appointments">Book an appointment</a>
          </div>
        </section>
      </main>
    </WebsitePageShell>
  );
}
