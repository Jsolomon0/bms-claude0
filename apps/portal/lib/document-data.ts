import type { AuthorizationActor } from "../../../packages/types/src/index.ts";
import { getDocumentDetailForActor, getDocumentsRuntime, listVisibleDocumentsForActor } from "../../../packages/documents/src/index.ts";
import { getPortalActor } from "./shell-data.ts";

export async function getPortalDocumentsData(actor: AuthorizationActor = getPortalActor()) {
  return listVisibleDocumentsForActor(getDocumentsRuntime(), actor);
}

export async function getPortalDocumentDetail(documentId: string, actor: AuthorizationActor = getPortalActor()) {
  return getDocumentDetailForActor(getDocumentsRuntime(), actor, documentId);
}
