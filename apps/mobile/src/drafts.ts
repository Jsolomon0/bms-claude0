import type { BmsMobileApiClient } from "../../../packages/api-client/src/index.ts";
import type {
  MobileCustomerRequestDraftPayload,
  MobileDraftRecord,
  MobileDraftSyncResult,
  MobileProjectProgressDraftPayload,
  MobileSession,
  PublicProjectRequestSubmissionInput
} from "../../../packages/types/src/index.ts";
import type { MobileKeyValueStorage } from "./storage.ts";

export class PersistentMobileDraftStore {
  private readonly storage: MobileKeyValueStorage;
  private readonly storageKey: string;
  private readonly now: () => Date;

  constructor(
    storage: MobileKeyValueStorage,
    options?: {
      storageKey?: string;
      now?: () => Date;
    }
  ) {
    this.storage = storage;
    this.storageKey = options?.storageKey ?? "bms.mobile.drafts";
    this.now = options?.now ?? (() => new Date());
  }

  private async readDrafts(): Promise<MobileDraftRecord[]> {
    const serialized = await this.storage.getItem(this.storageKey);

    if (!serialized) {
      return [];
    }

    return JSON.parse(serialized) as MobileDraftRecord[];
  }

  private async writeDrafts(drafts: readonly MobileDraftRecord[]): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(drafts));
  }

  async listDrafts(actorUserId?: string): Promise<readonly MobileDraftRecord[]> {
    const drafts = await this.readDrafts();

    if (!actorUserId) {
      return drafts;
    }

    return drafts.filter((draft) => draft.actorUserId === actorUserId);
  }

  async saveProjectProgressDraft(
    actorUserId: string,
    payload: MobileProjectProgressDraftPayload
  ): Promise<MobileDraftRecord> {
    return this.saveDraft(actorUserId, "project_progress", payload);
  }

  async saveCustomerRequestDraft(
    actorUserId: string,
    payload: MobileCustomerRequestDraftPayload
  ): Promise<MobileDraftRecord> {
    return this.saveDraft(actorUserId, "customer_request", payload);
  }

  private async saveDraft(
    actorUserId: string,
    kind: MobileDraftRecord["kind"],
    payload: MobileDraftRecord["payload"]
  ): Promise<MobileDraftRecord> {
    const drafts = await this.readDrafts();
    const timestamp = this.now().toISOString();
    const draft: MobileDraftRecord = {
      id: `draft_${timestamp}_${drafts.length + 1}`,
      actorUserId,
      kind,
      status: "draft",
      payload,
      createdAt: timestamp,
      updatedAt: timestamp,
      errorMessage: null
    };
    await this.writeDrafts([draft, ...drafts]);
    return draft;
  }

  async deleteDraft(draftId: string): Promise<void> {
    const drafts = await this.readDrafts();
    await this.writeDrafts(drafts.filter((draft) => draft.id !== draftId));
  }

  private async updateDraftRecord(draftId: string, updater: (draft: MobileDraftRecord) => MobileDraftRecord) {
    const drafts = await this.readDrafts();
    const updated = drafts.map((draft) => (draft.id === draftId ? updater(draft) : draft));
    await this.writeDrafts(updated);
    return updated.find((draft) => draft.id === draftId);
  }

  async syncDraft(
    apiClient: BmsMobileApiClient,
    draftId: string,
    session?: MobileSession
  ): Promise<MobileDraftSyncResult> {
    const drafts = await this.readDrafts();
    const draft = drafts.find((record) => record.id === draftId);

    if (!draft) {
      throw new Error(`Draft ${draftId} was not found.`);
    }

    await this.updateDraftRecord(draftId, (current) => ({
      ...current,
      status: "syncing",
      updatedAt: this.now().toISOString(),
      errorMessage: null
    }));

    try {
      if (draft.kind === "project_progress") {
        if (!session) {
          throw new Error("Project progress drafts require an authenticated mobile session.");
        }

        const progressUpdate = await apiClient.submitProjectProgress(session, draft.payload as MobileProjectProgressDraftPayload);
        await this.updateDraftRecord(draftId, (current) => ({
          ...current,
          status: "synced",
          updatedAt: this.now().toISOString(),
          errorMessage: null
        }));
        return {
          draftId,
          status: "synced",
          syncedResourceId: progressUpdate.id
        };
      }

      const payload = draft.payload as MobileCustomerRequestDraftPayload;
      const submittedRequest: PublicProjectRequestSubmissionInput = {
        submitterName: payload.submitterName,
        email: payload.email,
        projectTitle: payload.projectTitle,
        projectSummary: payload.projectSummary,
        phone: payload.phone,
        consultationPreference: payload.consultationPreference,
        imageUpload: payload.imageUpload
          ? {
              fileName: payload.imageUpload.fileName,
              mimeType: payload.imageUpload.mimeType,
              byteSize: payload.imageUpload.byteSize
            }
          : undefined
      };
      await apiClient.submitCustomerRequest(submittedRequest, session);
      await this.updateDraftRecord(draftId, (current) => ({
        ...current,
        status: "synced",
        updatedAt: this.now().toISOString(),
        errorMessage: null
      }));
      return {
        draftId,
        status: "synced",
        submittedRequest
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Draft sync failed.";
      await this.updateDraftRecord(draftId, (current) => ({
        ...current,
        status: "failed",
        updatedAt: this.now().toISOString(),
        errorMessage
      }));
      return {
        draftId,
        status: "failed"
      };
    }
  }

  async syncAll(apiClient: BmsMobileApiClient, session?: MobileSession): Promise<readonly MobileDraftSyncResult[]> {
    const drafts = await this.readDrafts();
    const pending = drafts.filter((draft) => draft.status === "draft" || draft.status === "failed");
    const results: MobileDraftSyncResult[] = [];

    for (const draft of pending) {
      results.push(await this.syncDraft(apiClient, draft.id, session));
    }

    return results;
  }
}
