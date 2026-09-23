import { WebsitePageShell } from "../../../lib/page-shell.tsx";
import { fmleSite } from "../../../lib/siteConfig.ts";

export default async function AppointmentSuccessPage({
  searchParams
}: {
  searchParams?: Promise<{ date?: string; time?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell">
          <section className="fmle-form-card fmle-appointment-success">
            <span className="fmle-eyebrow">Request sent</span>
            <h1>Your appointment request is on its way.</h1>
            <p>
              FMLE received your preferred appointment
              {params?.date ? <> for <strong>{params.date}</strong></> : null}
              {params?.time ? <> at <strong>{params.time} ET</strong></> : null}.
              The team will contact you to confirm availability.
            </p>
            <div className="fmle-hero-actions">
              <a className="fmle-button fmle-button-primary" href="/">Return home</a>
              <a className="fmle-button fmle-button-secondary" href={fmleSite.phoneHref}>Call {fmleSite.phone}</a>
            </div>
          </section>
        </div>
      </main>
    </WebsitePageShell>
  );
}
