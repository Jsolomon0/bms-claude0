import { cookies } from "next/headers";

const ACCESS_COOKIE = "fmle_access_token";
const REFRESH_COOKIE = "fmle_refresh_token";

export type FmleUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("FMLE customer login is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function getFmleAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getCurrentFmleUser(): Promise<FmleUser | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) return null;
  return (await response.json()) as FmleUser;
}

export async function setFmleSession(accessToken: string, refreshToken: string, expiresIn: number) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, expiresIn)
  });

  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearFmleSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export function getFmleSupabaseConfig() {
  return getSupabaseConfig();
}
