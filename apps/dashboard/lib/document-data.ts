import { getDocumentsRuntime } from "../../../packages/documents/src/index.ts";

export function getDashboardDocumentsHomeData() {
  const runtime = getDocumentsRuntime();
  const documents = runtime.service.listDocuments();

  return {
    documents,
    stats: {
      total: documents.length,
      archived: documents.filter((document) => document.archiveState === "archived").length,
      publicShares: documents.reduce(
        (count, document) => count + runtime.service.getDocumentDetail(document.id).publicShareLinks.length,
        0
      ),
      versionCount: documents.reduce(
        (count, document) => count + runtime.service.getDocumentDetail(document.id).versions.length,
        0
      )
    },
    auditPreview: runtime.auditSink.list().slice(0, 4)
  };
}

export function getDashboardDocumentDetail(documentId: string) {
  return getDocumentsRuntime().service.getDocumentDetail(documentId);
}
