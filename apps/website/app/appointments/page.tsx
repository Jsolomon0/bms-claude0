import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { fmleSite } from "../../lib/siteConfig.ts";
import { requestAppointmentAction } from "./actions.ts";

export default async function AppointmentPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error;

  const errorMessage =
    error === "validation"
      ? "Complete all required fields before submitting."
      : error === "date"
        ? "Choose a future appointment date and time."
        : error === "config"
          ? "Online appointment email is being configured. Please call FMLE for now."
          : error === "send"
            ? "We could not send the request. Please try again or call FMLE directly."
            : null;

  const services = [...fmleSite.taxServices, ...fmleSite.financialServices];

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell">
          <div className="fmle-form-intro">
            <span className="fmle-eyebrow">Appointments</span>
            <h1>Request an appointment with FMLE.</h1>
            <p>
              Choose the service, date, and time that work best for you. Your request is sent directly to the FMLE team by email.
              The appointment is confirmed after the team responds.
            </p>
          </div>

          <div className="fmle-form-layout">
            <section className="fmle-form-card">
              {errorMessage ? <div className="fmle-alert">{errorMessage}</div> : null}
              <form action={requestAppointmentAction}>
                <div className="fmle-form-grid">
                  <div className="fmle-field">
                    <label htmlFor="name">Full name</label>
                    <input id="name" name="name" required autoComplete="name" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" required autoComplete="tel" />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="service">Service</label>
                    <select id="service" name="service" required defaultValue="">
                      <option value="" disabled>Select a service</option>
                      {services.map((service) => (
                        <option key={service.title} value={service.title}>{service.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="date">Preferred date</label>
                    <input id="date" name="date" type="date" required />
                  </div>
                  <div className="fmle-field">
                    <label htmlFor="time">Preferred time</label>
                    <input id="time" name="time" type="time" required />
                  </div>
                  <div className="fmle-field fmle-field-full">
                    <label htmlFor="notes">Anything we should know?</label>
                    <textarea id="notes" name="notes" placeholder="Tell us briefly what you need help with." />
                  </div>
                </div>
                <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">
                  Request appointment
                </button>
              </form>
            </section>

            <aside className="fmle-form-sidebar">
              <h2>What happens next?</h2>
              <ul>
                <li>Your request is emailed directly to FMLE.</li>
                <li>The team reviews your preferred date, time, and service.</li>
                <li>FMLE contacts you to confirm or adjust the appointment.</li>
              </ul>
              <p>
                Need faster help? Call <a href={fmleSite.phoneHref}>{fmleSite.phone}</a>.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </WebsitePageShell>
  );
}
