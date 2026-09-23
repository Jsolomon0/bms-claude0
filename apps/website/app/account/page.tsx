import { redirect } from "next/navigation";
import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getCurrentFmleUser } from "../../lib/customer-auth.ts";
import { logoutCustomerAction } from "../login/actions.ts";

export default async function CustomerAccountPage() {
  const user = await getCurrentFmleUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || "FMLE Customer";

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell">
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

          <div className="fmle-account-grid">
            <section className="fmle-account-card">
              <span className="fmle-service-number">01</span>
              <h2>Book an appointment</h2>
              <p>Request a time with the FMLE team for tax preparation or financial services.</p>
              <a className="fmle-text-link" href="/appointments">Request an appointment →</a>
            </section>
            <section className="fmle-account-card">
              <span className="fmle-service-number">02</span>
              <h2>Account status</h2>
              <p>Your customer login is active. Additional customer services can be added here as they are connected.</p>
            </section>
            <section className="fmle-account-card">
              <span className="fmle-service-number">03</span>
              <h2>Documents & tax records</h2>
              <p>Secure document access is not enabled yet. FMLE will only expose records after customer-to-record permissions are wired and tested.</p>
            </section>
          </div>
        </div>
      </main>
    </WebsitePageShell>
  );
}
