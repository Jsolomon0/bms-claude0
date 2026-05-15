import { getPaymentsRuntime, viewInvoiceViaPublicLinkServer } from "../../../packages/payments/src/index.ts";

export async function getPublicSharedInvoice(token: string) {
  return viewInvoiceViaPublicLinkServer(getPaymentsRuntime(), token);
}
