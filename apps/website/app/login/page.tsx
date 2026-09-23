import { redirect } from "next/navigation";
import { WebsitePageShell } from "../../lib/page-shell.tsx";
import { getCurrentFmleUser } from "../../lib/customer-auth.ts";
import { loginCustomerAction } from "./actions.ts";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentFmleUser();
  if (user) redirect("/account");

  const params = searchParams ? await searchParams : undefined;
  const message =
    params?.error === "required"
      ? "Enter your email and password."
      : params?.error === "invalid"
        ? "The email or password was not recognized."
        : null;

  return (
    <WebsitePageShell>
      <main className="fmle-form-page">
        <div className="fmle-form-shell fmle-auth-shell">
          <section className="fmle-form-card fmle-auth-card">
            <span className="fmle-eyebrow">Customer access</span>
            <h1>Customer login</h1>
            <p>
              Existing FMLE customers can sign in to their private account. If you are not a customer yet,
              you can continue browsing the public website without an account.
            </p>
            {message ? <div className="fmle-alert">{message}</div> : null}
            <form action={loginCustomerAction}>
              <div className="fmle-form-grid fmle-auth-grid">
                <div className="fmle-field fmle-field-full">
                  <label htmlFor="email">Email address</label>
                  <input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="fmle-field fmle-field-full">
                  <label htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" required autoComplete="current-password" />
                </div>
              </div>
              <button className="fmle-button fmle-button-primary fmle-form-submit" type="submit">
                Log in
              </button>
            </form>
            <p className="fmle-auth-help">
              Need account access? Contact FMLE at <a href="tel:+13057987661">305-798-7661</a>.
            </p>
          </section>
        </div>
      </main>
    </WebsitePageShell>
  );
}
