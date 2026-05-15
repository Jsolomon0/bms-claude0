import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  DocumentAccessRuleError,
  downloadDocumentViaPublicLinkServer,
  getDocumentDetailForActor,
  InMemoryDocumentRepository,
  issueDocumentPublicShareLinkServer,
  listVisibleDocumentsForActor,
  previewDocumentViaPublicLinkServer,
  prepareDocumentDownloadForActor,
  prepareDocumentPreviewForActor,
  resetDocumentsRuntime,
  revokeDocumentPublicShareLinkServer,
  setDocumentArchiveStateServer,
  uploadDocumentServer,
  uploadDocumentVersionServer,
  updateDocumentVisibilityServer
} from "../packages/documents/src/index.ts";
import { PrivilegedActionApprovalError } from "../packages/security/src/index.ts";
import { DocumentValidationError } from "../packages/documents/src/validation.ts";
import { DocumentManagementService } from "../packages/documents/src/workflow.ts";
import { MemoryMalwareScanHook, MemoryObjectStorageAdapter } from "../packages/storage/src/index.ts";
import type { AuthorizationActor } from "../packages/types/src/index.ts";

function actor(overrides: Partial<AuthorizationActor>): AuthorizationActor {
  return {
    userId: overrides.userId ?? "user-1",
    memberships: overrides.memberships ?? [],
    assignedProjectIds: overrides.assignedProjectIds ?? [],
    managedPartnerOrgIds: overrides.managedPartnerOrgIds ?? []
  };
}

function adminActor(): AuthorizationActor {
  return actor({
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-admin",
        userId: "alex.owner",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"],
    managedPartnerOrgIds: ["partner-east"]
  });
}

function customerActor(): AuthorizationActor {
  return actor({
    userId: "customer.aria",
    memberships: [
      {
        id: "membership-customer",
        userId: "customer.aria",
        role: "customer",
        customerAccountId: "customer-aria",
        active: true
      }
    ]
  });
}

function otherCustomerActor(): AuthorizationActor {
  return actor({
    userId: "customer.other",
    memberships: [
      {
        id: "membership-customer-other",
        userId: "customer.other",
        role: "customer",
        customerAccountId: "customer-other",
        active: true
      }
    ]
  });
}

function subcontractorActor(): AuthorizationActor {
  return actor({
    userId: "sub-user-1",
    memberships: [
      {
        id: "membership-sub",
        userId: "sub-user-1",
        role: "subcontractor",
        partnerOrgId: "partner-east",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"]
  });
}

async function createApproval(
  runtime: ReturnType<typeof resetDocumentsRuntime>,
  actionKey: "public_link.issue" | "document.archive.retained",
  resourceId: string,
  actorUserId = "alex.owner"
) {
  return runtime.security.approvals.createApproval({
    actionKey,
    actorUserId,
    resourceType: "document",
    resourceId,
    approvedByUserId: "owner.approver",
    justification: `Approve ${actionKey}`,
    expiresAt: "2026-05-10T00:00:00.000Z"
  });
}

test("customer only sees documents that match both visibility and access rules", async () => {
  const runtime = resetDocumentsRuntime();
  const documents = await listVisibleDocumentsForActor(runtime, customerActor());

  assert.deepEqual(
    documents.map((document) => document.id).sort(),
    ["document-demo-1", "document-demo-4"]
  );
});

test("subcontractor can access partner-scoped progress photos but not customer-only contracts", async () => {
  const runtime = resetDocumentsRuntime();
  const documents = await listVisibleDocumentsForActor(runtime, subcontractorActor());

  assert.deepEqual(documents.map((document) => document.id), ["document-demo-2"]);

  await assert.rejects(
    () => getDocumentDetailForActor(runtime, subcontractorActor(), "document-demo-1"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError || error instanceof DocumentAccessRuleError);
      return true;
    }
  );
});

test("other customers cannot access a contract tied to a different customer account", async () => {
  const runtime = resetDocumentsRuntime();

  await assert.rejects(
    () => prepareDocumentPreviewForActor(runtime, otherCustomerActor(), "document-demo-1"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError || error instanceof DocumentAccessRuleError);
      return true;
    }
  );
});

test("validated customer upload succeeds for customer_uploads documents", async () => {
  const runtime = resetDocumentsRuntime();

  const document = await uploadDocumentServer(runtime, customerActor(), {
    actorUserId: "customer.aria",
    organizationId: "org-hq",
    ownerUserId: "customer.aria",
    customerAccountId: "customer-aria",
    projectId: "project-demo-1",
    title: "Cabinet hardware reference",
    category: "customer_uploads",
    visibilityFlags: ["internal", "customer"],
    file: {
      fileName: "cabinet-reference.png",
      contentType: "image/png",
      byteSize: 2048
    }
  });

  assert.equal(document.category, "customer_uploads");
  assert.equal(document.latestVersionId.startsWith("document-version-"), true);
});

test("document upload rejects unsupported file types and oversize payloads", async () => {
  const runtime = resetDocumentsRuntime();

  await assert.rejects(
    () =>
      uploadDocumentServer(runtime, adminActor(), {
        actorUserId: "alex.owner",
        organizationId: "org-hq",
        ownerUserId: "alex.owner",
        title: "Bad upload",
        category: "contracts",
        visibilityFlags: ["internal", "customer"],
        file: {
          fileName: "script.exe",
          contentType: "application/octet-stream",
          byteSize: 30 * 1024 * 1024
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentValidationError);
      return true;
    }
  );
});

test("malware scan hook blocks infected uploads before document creation", async () => {
  const repository = new InMemoryDocumentRepository();
  const storage = new MemoryObjectStorageAdapter(() => new Date("2026-04-28T14:00:00.000Z"));
  const service = new DocumentManagementService({
    repository,
    storage,
    malwareScanHook: new MemoryMalwareScanHook(["documents/document-1/v1/infected.pdf"]),
    now: () => new Date("2026-04-28T14:00:00.000Z"),
    idGenerator: (() => {
      let counter = 0;
      return (prefix: string) => {
        counter += 1;
        return `${prefix}-${counter}`;
      };
    })()
  });

  await assert.rejects(
    () =>
      service.uploadDocument({
        actorUserId: "alex.owner",
        organizationId: "org-hq",
        ownerUserId: "alex.owner",
        title: "Malware sample",
        category: "contracts",
        visibilityFlags: ["internal", "customer"],
        file: {
          fileName: "infected.pdf",
          contentType: "application/pdf",
          byteSize: 1024
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentValidationError);
      return true;
    }
  );
});

test("authorized actors can upload new document versions and generate downloads", async () => {
  const runtime = resetDocumentsRuntime();

  const version = await uploadDocumentVersionServer(runtime, adminActor(), {
    documentId: "document-demo-1",
    actorUserId: "alex.owner",
    file: {
      fileName: "basement-contract-v3.pdf",
      contentType: "application/pdf",
      byteSize: 400000
    }
  });

  const download = await prepareDocumentDownloadForActor(runtime, customerActor(), "document-demo-1");

  assert.equal(version.versionNumber, 3);
  assert.equal(download.version.versionNumber, 3);
  assert.match(download.downloadUrl, /^memory:\/\/download\//);
});

test("visibility updates are audited and affect external access", async () => {
  const runtime = resetDocumentsRuntime();

  await updateDocumentVisibilityServer(runtime, adminActor(), {
    documentId: "document-demo-2",
    actorUserId: "alex.owner",
    visibilityFlags: ["internal", "subcontractor", "supercontractor"]
  });

  const documents = await listVisibleDocumentsForActor(runtime, customerActor());

  assert.equal(documents.some((document) => document.id === "document-demo-2"), false);
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "document.visibility_changed"), true);
});

test("signed public links honor share scope, expiry, and revocation", async () => {
  const runtime = resetDocumentsRuntime();
  const approval = await createApproval(runtime, "public_link.issue", "document-demo-2");

  const issued = await issueDocumentPublicShareLinkServer(runtime, adminActor(), {
    documentId: "document-demo-2",
    actorUserId: "alex.owner",
    shareScope: "preview",
    expiresAt: "2026-05-01T00:00:00.000Z",
    maxUses: 2,
    approvalId: approval.id
  });

  const preview = await previewDocumentViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T14:00:00.000Z"));
  assert.equal(preview.document.id, "document-demo-2");

  await assert.rejects(
    () => downloadDocumentViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T14:05:00.000Z")),
    /scope/i
  );

  await revokeDocumentPublicShareLinkServer(runtime, adminActor(), {
    linkId: issued.link.id,
    actorUserId: "alex.owner"
  });

  await assert.rejects(
    () => previewDocumentViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T14:10:00.000Z")),
    /revoked|invalid|authorization/i
  );
});

test("expired document public links are rejected", async () => {
  const runtime = resetDocumentsRuntime();
  const approval = await createApproval(runtime, "public_link.issue", "document-demo-2");

  const issued = await issueDocumentPublicShareLinkServer(runtime, adminActor(), {
    documentId: "document-demo-2",
    actorUserId: "alex.owner",
    shareScope: "preview_download",
    expiresAt: "2026-04-28T13:00:00.000Z",
    maxUses: 1,
    approvalId: approval.id
  });

  await assert.rejects(
    () => previewDocumentViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T14:00:00.000Z")),
    /expired|invalid|authorization/i
  );
});

test("retained documents require privileged approval before archival", async () => {
  const runtime = resetDocumentsRuntime();

  await assert.rejects(
    () =>
      setDocumentArchiveStateServer(runtime, adminActor(), {
        documentId: "document-demo-1",
        actorUserId: "alex.owner",
        archiveState: "archived"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PrivilegedActionApprovalError);
      assert.equal(error.reason, "approval_required");
      return true;
    }
  );

  const approval = await createApproval(runtime, "document.archive.retained", "document-demo-1");
  const archived = await setDocumentArchiveStateServer(runtime, adminActor(), {
    documentId: "document-demo-1",
    actorUserId: "alex.owner",
    archiveState: "archived",
    approvalId: approval.id
  });

  assert.equal(archived.archiveState, "archived");
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "security.retention_policy.enforced"), true);
});
