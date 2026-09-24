"use server";

import { redirect } from "next/navigation";
import { clearFmleSession, getFmleSupabaseConfig, setFmleSession } from "../../lib/customer-auth.ts";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function loginCustomerAction(formData: FormData): Promise<never> {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");

  if (!email || !password) redirect("/login?error=required");

  const { url, anonKey } = getFmleSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirect("/login?error=invalid");
  }

  const session = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await setFmleSession(session.access_token, session.refresh_token, session.expires_in);
  redirect("/account");
}

export async function logoutCustomerAction(): Promise<never> {
  await clearFmleSession();
  redirect("/");
}
