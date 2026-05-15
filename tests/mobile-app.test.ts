import test from "node:test";
import assert from "node:assert/strict";

import { createBmsMobileApiClient } from "../packages/api-client/src/index.ts";
import { getIntakeRuntime, resetIntakeRuntime } from "../packages/crm/src/index.ts";
import { resetPaymentsRuntime } from "../packages/payments/src/index.ts";
import { resetPayrollRuntime } from "../packages/payroll/src/index.ts";
import { resetProjectsRuntime } from "../packages/projects/src/index.ts";
import { PersistentMobileDraftStore } from "../apps/mobile/src/drafts.ts";
import { MobilePushController } from "../apps/mobile/src/push.ts";
import { MobileSessionController } from "../apps/mobile/src/session.ts";
import { MemoryMobileKeyValueStorage } from "../apps/mobile/src/storage.ts";

function resetAll() {
  resetProjectsRuntime();
  resetPayrollRuntime();
  resetIntakeRuntime();
  resetPaymentsRuntime();
}

test("mobile session controller signs in, persists, restores, and signs out", async () => {
  resetAll();
  const apiClient = createBmsMobileApiClient();
  const storage = new MemoryMobileKeyValueStorage();
  const controller = new MobileSessionController(apiClient, storage);

  const session = await controller.signIn({
    identifier: "employee@bms.local",
    passcode: "111111"
  });

  assert.equal(controller.getState().status, "signed_in");
  assert.equal(controller.getState().session?.user.role, "employee");

  const restoredController = new MobileSessionController(apiClient, storage);
  const restoredState = await restoredController.restore();

  assert.equal(restoredState.status, "signed_in");
  assert.equal(restoredState.session?.accessToken, session.accessToken);

  await restoredController.signOut();
  assert.equal(restoredController.getState().status, "signed_out");
  assert.equal(await storage.getItem("bms.mobile.session"), null);
});

test("employee mobile flow exposes clock actions and records a clock in/out cycle", async () => {
  resetAll();
  const apiClient = createBmsMobileApiClient();
  const session = await apiClient.signIn({
    identifier: "employee@bms.local",
    passcode: "111111"
  });

  const home = await apiClient.getHomeModel(session);

  assert.equal(home.role, "employee");
  assert.ok(home.actions.some((item) => item.route === "clock"));
  assert.ok(home.actions.some((item) => item.route === "projects"));

  await apiClient.clockIn(session, {
    occurredAt: "2026-04-29T10:00:00.000Z",
    projectId: "project-demo-1",
    notes: "Starting framing inspection walk."
  });

  const activeSession = apiClient.getActiveClockSession(session);
  assert.equal(activeSession?.projectId, "project-demo-1");

  await apiClient.clockOut(session, {
    occurredAt: "2026-04-29T12:00:00.000Z",
    projectId: "project-demo-1",
    notes: "Inspection walk complete."
  });

  assert.equal(apiClient.getActiveClockSession(session), undefined);
});

test("employee progress drafts save offline and sync into project progress updates", async () => {
  resetAll();
  const apiClient = createBmsMobileApiClient();
  const session = await apiClient.signIn({
    identifier: "employee@bms.local",
    passcode: "111111"
  });
  const draftStore = new PersistentMobileDraftStore(new MemoryMobileKeyValueStorage(), {
    now: () => new Date("2026-04-29T11:00:00.000Z")
  });

  const draft = await draftStore.saveProjectProgressDraft(session.user.userId, {
    projectId: "project-demo-1",
    note: "Mobile draft queued while offline.",
    visibilityFlags: ["internal", "customer"],
    attachments: [
      {
        localUri: "draft://photo-1",
        fileName: "photo-1.jpg",
        mimeType: "image/jpeg",
        byteSize: 1900000,
        caption: "Queued from the field"
      }
    ]
  });

  const beforeSync = await draftStore.listDrafts(session.user.userId);
  assert.equal(beforeSync.length, 1);
  assert.equal(beforeSync[0]?.status, "draft");

  const results = await draftStore.syncAll(apiClient, session);
  assert.equal(results[0]?.status, "synced");

  const detail = await apiClient.getProjectDetail(session, "project-demo-1");
  assert.ok(detail?.progressUpdates.some((update) => update.note === "Mobile draft queued while offline."));

  const afterSync = await draftStore.listDrafts(session.user.userId);
  assert.equal(afterSync[0]?.status, "synced");
  assert.equal(draft.id, afterSync[0]?.id);
});

test("customer request drafts sync through intake and customer mobile can start invoice payment", async () => {
  resetAll();
  const apiClient = createBmsMobileApiClient();
  const session = await apiClient.signIn({
    identifier: "customer@bms.local",
    passcode: "222222"
  });
  const draftStore = new PersistentMobileDraftStore(new MemoryMobileKeyValueStorage(), {
    now: () => new Date("2026-04-29T11:15:00.000Z")
  });

  await draftStore.saveCustomerRequestDraft(session.user.userId, {
    submitterName: "Aria Customer",
    email: "customer@bms.local",
    phone: "555-222-1000",
    projectTitle: "Patio enclosure",
    projectSummary: "Need an estimate and timeline for enclosing the rear patio.",
    consultationPreference: "within_7_days",
    imageUpload: {
      localUri: "draft://patio-photo",
      fileName: "patio.jpg",
      mimeType: "image/jpeg",
      byteSize: 1750000
    }
  });

  const syncResults = await draftStore.syncAll(apiClient, session);
  assert.equal(syncResults[0]?.status, "synced");
  assert.ok(
    getIntakeRuntime().service.listRequests().some((request) => request.projectTitle === "Patio enclosure")
  );

  const invoices = await apiClient.listInvoices(session);
  assert.equal(invoices.length >= 1, true);

  const payment = await apiClient.startInvoicePayment(session, invoices[0]!.id);
  assert.match(payment.checkoutSession.checkoutUrl, /checkout\.stripe\.local/);
});

test("administrator mobile home remains limited and push registration is stored per session", async () => {
  resetAll();
  const apiClient = createBmsMobileApiClient();
  const session = await apiClient.signIn({
    identifier: "administrator@bms.local",
    passcode: "444444"
  });
  const home = await apiClient.getHomeModel(session);
  const pushController = new MobilePushController(apiClient);

  assert.equal(home.role, "administrator");
  assert.ok(home.actions.some((item) => item.route === "projects"));
  assert.ok(home.actions.some((item) => item.route === "notifications"));
  assert.equal(home.actions.some((item) => item.route === "clock"), false);
  assert.equal(home.actions.some((item) => item.route === "invoices"), false);
  assert.equal(home.actions.some((item) => item.route === "request"), false);

  const registration = await pushController.register(session, {
    token: "expo-demo-admin",
    platform: "ios",
    environment: "development"
  });
  const registrations = await pushController.listForSession(session);

  assert.equal(registrations.length, 1);
  assert.equal(registrations[0]?.id, registration.id);
});
