import { getFmleAccessToken, getFmleSupabaseConfig } from "./customer-auth.ts";

export type CustomerPortalSnapshot = {
  customerId: string;
  appointments: Array<{
    id: string;
    status: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  taxReturns: Array<{
    id: string;
    taxYear: number;
    returnType: string;
    status: string;
    statusMessage: string | null;
    filedAt: string | null;
    acceptedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    updatedAt: string;
    versionId: string | null;
    versionNumber: number | null;
    fileName: string | null;
    contentType: string | null;
    byteSize: number | null;
    downloadable: boolean;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    currencyCode: string;
    issuedAt: string | null;
    dueAt: string | null;
    totalAmount: string | number;
    balanceDueAmount: string | number;
  }>;
  payments: Array<{
    id: string;
    status: string;
    paymentMethod: string;
    currencyCode: string;
    grossAmount: string | number;
    netAmount: string | number;
    authorizedAt: string | null;
    settledAt: string | null;
    createdAt: string;
  }>;
  messageThreads: Array<{
    id: string;
    subject: string;
    status: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      fromStaff: boolean;
    }>;
  }>;
};

export async function getCustomerPortalSnapshot(): Promise<CustomerPortalSnapshot | null> {
  const accessToken = await getFmleAccessToken();
  if (!accessToken) return null;

  const { url, anonKey } = getFmleSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/fmle_customer_portal_snapshot`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: "{}",
    cache: "no-store"
  });

  if (!response.ok) {
    console.error("FMLE portal snapshot failed", response.status, await response.text());
    return null;
  }

  return (await response.json()) as CustomerPortalSnapshot;
}

export async function getCustomerDocumentDownload(documentId: string) {
  const accessToken = await getFmleAccessToken();
  if (!accessToken) return null;

  const { url, anonKey } = getFmleSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/fmle_customer_document_download`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_document_id: documentId }),
    cache: "no-store"
  });

  if (!response.ok) return null;

  return (await response.json()) as {
    documentId: string;
    title: string;
    versionId: string;
    fileName: string;
    contentType: string;
    storageKey: string;
  };
}
