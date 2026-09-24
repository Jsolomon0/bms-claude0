import { WebsitePageShell } from "../../../lib/page-shell.tsx";
import { fmleSite } from "../../../lib/siteConfig.ts";

export default async function WebsiteRequestSuccessPage({
  searchParams
}: {
  searchParams?: Promise<{ requestId?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const requestId = resolved?.requestId;

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell">
          <div className="fmle-form-intro">
            <span className="fmle-eyebrow">Request received</span>
            <h1>Thank you for contacting FMLE.</h1>
            <p>Your consultation request has been submitted for review. The team can follow up using the contact information you provided.</p>
          </div>
          <div className="fmle-form-layout">
            <section className="fmle-form-card">
              <h2>What happens next</h2>
              <p>FMLE will review your request and determine the appropriate next step for your tax or financial service need.</p>
              <ul>
                <li>Your request is recorded for internal review.</li>
                <li>The team may contact you for additional information.</li>
                <li>Sensitive tax or banking documents should be shared only through an approved secure method.</li>
              </ul>
              {requestId ? <p><strong>Reference ID:</strong> {requestId}</p> : null}
              <div className="fmle-hero-actions">
                <a className="fmle-button fmle-button-primary" href="/">Return home</a>
                <a className="fmle-button fmle-button-secondary" href={fmleSite.phoneHref}>Call {fmleSite.phone}</a>
              </div>
            </section>
            <aside className="fmle-form-sidebar">
              <h2>Need immediate help?</h2>
              <p>Call the FMLE contact line directly.</p>
              <p><a href={fmleSite.phoneHref}><strong>{fmleSite.phone}</strong></a></p>
              <p><a href={fmleSite.emailHref}>{fmleSite.email}</a></p>
            </aside>
          </div>
        </div>
      </main>
    </WebsitePageShell>
  );
}
