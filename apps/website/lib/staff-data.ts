import { getFmleAccessToken, getFmleSupabaseConfig } from "./customer-auth.ts";

export type StaffSnapshot = {
  customers: Array<{
    id: string;
    accountNumber: string | null;
    status: string;
    customerType: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    authLinked: boolean;
    updatedAt: string;
  }>;
  taxReturns: Array<{
    id: string;
    customerId: string;
    taxYear: number;
    returnType: string;
    status: string;
    statusMessage: string | null;
    updatedAt: string;
  }>;
  recentInvoices: Array<{
    id: string;
    customerId: string;
    invoiceNumber: string;
    status: string;
    currencyCode: string;
    totalAmount: string | number;
    balanceDueAmount: string | number;
    issuedAt: string | null;
    dueAt: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    customerId: string;
    status: string;
    paymentMethod: string;
    currencyCode: string;
    grossAmount: string | number;
    settledAt: string | null;
    createdAt: string;
  }>;
  recentDocuments: Array<{
    id: string;
    customerId: string | null;
    title: string;
    category: string;
    status: string;
    updatedAt: string;
  }>;
  recentThreads: Array<{
    id: string;
    customerId: string | null;
    subject: string;
    status: string;
    updatedAt: string;
  }>;
};

export async function callFmleRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const accessToken = await getFmleAccessToken();
  if (!accessToken) throw new Error("not_authenticated");

  const { url, anonKey } = getFmleSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`FMLE RPC ${name} failed`, response.status, detail);
    throw new Error(detail || name);
  }

  return (await response.json()) as T;
}

export async function getStaffSnapshot(): Promise<StaffSnapshot | null> {
  try {
    return await callFmleRpc<StaffSnapshot>("fmle_staff_snapshot", {});
  } catch {
    return null;
  }
}

export async function isFmleStaff(): Promise<boolean> {
  try {
    const id = await callFmleRpc<string | null>("fmle_current_staff_user_id", {});
    return Boolean(id);
  } catch {
    return false;
  }
}
