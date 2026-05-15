import { getDocumentsRuntime, previewDocumentViaPublicLinkServer } from "../../../packages/documents/src/index.ts";

export async function getPublicSharedDocumentPreview(token: string) {
  return previewDocumentViaPublicLinkServer(getDocumentsRuntime(), token);
}
