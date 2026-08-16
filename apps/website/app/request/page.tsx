import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getPublicRequestFormOptions } from "../../lib/intake-data.ts";
import { fmleSite } from "../../lib/siteConfig.ts";
import { submitProjectRequestAction } from "./actions.ts";

function getAlert(searchParams?: { error?: string; fields?: string }) {
  if (searchParams?.error === "validation") {
    return "Please review the required fields and try again.";
  }
  if (searchParams?.error === "submission") {
    return "Your request could not be submitted. Please try again or call the FMLE office directly.";
  }
  return null;
}

export default async function WebsiteRequestPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; fields?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const alert = getAlert(resolved);
  const consultationOptions = getPublicRequestFormOptions();

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell">
          <div className="fmle-form-intro">
            <span className="fmle-eyebrow">Consultation request</span>
            <h1>Tell FMLE how we can help.</h1>
            <p>
              Request a conversation about tax preparation, accounting, bookkeeping, payroll, business filing, nonprofit filing, or another financial service.
            </p>
          </div>

          <div className="fmle-form-layout">
            <section className="fmle-form-card">
              {alert ? <div className="fmle-alert">{alert}</div> : null}
              <form action={submitProjectRequestAction} encType="multipart/form-data">
                <div className="fmle-form-grid">
                  <div className="fmle-field">
                    <label htmlFor="submitterName">Full name</label>
                    <input id="submitterName" name="submitterName" required placeholder="Your full name" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required placeholder="you@example.com" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" placeholder="Best number to reach you" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="projectTitle">Service needed</label>
                    <input id="projectTitle" name="projectTitle" required placeholder="Tax filing, bookkeeping, payroll…" />
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="projectSummary">How can we help?</label>
                    <textarea id="projectSummary" name="projectSummary" required placeholder="Briefly describe your tax or financial service needs." />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="consultationPreference">Preferred timing</label>
                    <select id="consultationPreference" name="consultationPreference" defaultValue="within_7_days">
                      {consultationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="imageUpload">Optional reference image</label>
                    <input id="imageUpload" name="imageUpload" type="file" accept="image/jpeg,image/png,image/webp" />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">Send consultation request</button>
              </form>
            </section>

            <aside className="fmle-form-sidebar">
              <h2>Prefer to speak directly?</h2>
              <p>FMLE lists a 24/7 contact line for clients who would rather discuss their needs by phone.</p>
              <p><a href={fmleSite.phoneHref}><strong>{fmleSite.phone}</strong></a></p>
              <p><a href={fmleSite.emailHref}>{fmleSite.email}</a></p>
              <ul>
                <li>{fmleSite.addressLine1}</li>
                <li>{fmleSite.addressLine2}</li>
                <li>{fmleSite.parkingNote}</li>
              </ul>
              <p><small>Do not upload Social Security numbers, tax IDs, bank details, or other sensitive documents through this initial public form.</small></p>
            </aside>
          </div>
        </div>
      </main>
    </WebsitePageShell>
  );
}
