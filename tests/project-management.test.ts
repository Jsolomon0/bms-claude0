import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import {
  createProjectFromApprovedRequestServer,
  DEMO_APPROVED_REQUESTS,
  getProjectDetailForActor,
  issueProjectPublicLinkServer,
  listVisibleProjectsForActor,
  publishProjectProgressUpdateServer,
  resetProjectsRuntime,
  reviewProjectChangeRequestServer,
  submitProjectChangeRequestServer,
  updateChangeOrderStatusServer,
  updateProjectStatusServer,
  updateProjectVisibilityServer,
  viewProjectViaPublicLinkServer,
  type ProjectsRuntime
} from "../packages/projects/src/index.ts";
import { PrivilegedActionApprovalError } from "../packages/security/src/index.ts";
import { ProjectTransitionError } from "../packages/projects/src/validation.ts";
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

function supercontractorActor(): AuthorizationActor {
  return actor({
    userId: "super-user-1",
    memberships: [
      {
        id: "membership-super",
        userId: "super-user-1",
        role: "supercontractor",
        partnerOrgId: "partner-east",
        active: true
      }
    ],
    managedPartnerOrgIds: ["partner-east"]
  });
}

function resetRuntime(): ProjectsRuntime {
  return resetProjectsRuntime();
}

async function createApproval(
  runtime: ProjectsRuntime,
  resourceId: string,
  actorUserId = "alex.owner"
) {
  return runtime.security.approvals.createApproval({
    actionKey: "public_link.issue",
    actorUserId,
    resourceType: "project",
    resourceId,
    approvedByUserId: "owner.approver",
    justification: "Approve public project share",
    expiresAt: "2026-05-10T00:00:00.000Z"
  });
}

test("admin can create a project from an approved request and the action is audited", async () => {
  const runtime = resetRuntime();

  const project = await createProjectFromApprovedRequestServer(runtime, adminActor(), {
    request: {
      ...DEMO_APPROVED_REQUESTS[0],
      requestId: "request-approved-2"
    },
    actorUserId: "alex.owner",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-aria",
    partnerOrgIds: ["partner-east"],
    assignedUserIds: ["employee-1"],
    visibilityFlags: ["internal", "customer", "public_link"]
  });

  assert.equal(project.sourceRequestId, "request-approved-2");
  assert.equal(project.status, "draft");
  assert.equal(runtime.auditSink.list().some((event) => event.eventType === "project.created"), true);
});

test("project creation rejects requests that have not reached an approved state", async () => {
  const runtime = resetRuntime();

  await assert.rejects(
    () =>
      createProjectFromApprovedRequestServer(runtime, adminActor(), {
        request: {
          ...DEMO_APPROVED_REQUESTS[0],
          requestStatus: "submitted"
        },
        actorUserId: "alex.owner",
        ownerUserId: "alex.owner"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ProjectTransitionError);
      return true;
    }
  );
});

test("customer portal detail only includes customer-visible project records", async () => {
  const runtime = resetRuntime();
  const visibleProjects = await listVisibleProjectsForActor(runtime, customerActor());

  assert.deepEqual(visibleProjects.map((project) => project.id), ["project-demo-1"]);

  const detail = await getProjectDetailForActor(runtime, customerActor(), "project-demo-1");

  assert.ok(detail?.project);
  assert.deepEqual(detail?.tasks.map((task) => task.id), ["task-demo-1"]);
  assert.deepEqual(detail?.progressUpdates.map((update) => update.id), ["progress-demo-1"]);
});

test("supercontractor can see partner-scoped projects while unrelated customers cannot", async () => {
  const runtime = resetRuntime();
  const partnerProjects = await listVisibleProjectsForActor(runtime, supercontractorActor());

  assert.equal(partnerProjects.some((project) => project.id === "project-demo-1"), true);

  await assert.rejects(
    () => getProjectDetailForActor(runtime, otherCustomerActor(), "project-demo-2"),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("assigned subcontractor can publish a progress update with attachment metadata", async () => {
  const runtime = resetRuntime();

  const update = await publishProjectProgressUpdateServer(runtime, subcontractorActor(), {
    projectId: "project-demo-1",
    actorUserId: "sub-user-1",
    note: "Partner crew completed conduit rough-in.",
    visibilityFlags: ["internal", "subcontractor", "supercontractor"],
    attachments: [
      {
        fileName: "rough-in-photo.png",
        mimeType: "image/png",
        byteSize: 2048
      }
    ]
  });

  assert.equal(update.authorUserId, "sub-user-1");
  assert.equal(update.attachments.length, 1);
});

test("customer can submit change requests only for their own visible project", async () => {
  const runtime = resetRuntime();

  const changeRequest = await submitProjectChangeRequestServer(runtime, customerActor(), {
    projectId: "project-demo-1",
    requesterUserId: "customer.aria",
    title: "Shift media wall outlet",
    description: "Move the outlet two feet to the left before drywall."
  });

  assert.equal(changeRequest.status, "submitted");

  await assert.rejects(
    () =>
      submitProjectChangeRequestServer(runtime, otherCustomerActor(), {
        projectId: "project-demo-1",
        requesterUserId: "customer.other",
        title: "Unauthorized request",
        description: "This customer should not be able to file against another account."
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      return true;
    }
  );
});

test("status and visibility changes write audit events", async () => {
  const runtime = resetRuntime();

  await updateProjectStatusServer(runtime, adminActor(), {
    projectId: "project-demo-1",
    actorUserId: "alex.owner",
    status: "on_hold"
  });

  await updateProjectVisibilityServer(runtime, adminActor(), {
    projectId: "project-demo-1",
    actorUserId: "alex.owner",
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor"]
  });

  const events = runtime.auditSink.list().map((event) => event.eventType);

  assert.equal(events.includes("project.status_changed"), true);
  assert.equal(events.includes("project.visibility_changed"), true);
});

test("change request conversion and change order lifecycle return the project to active", async () => {
  const runtime = resetRuntime();

  const submittedRequest = await submitProjectChangeRequestServer(runtime, customerActor(), {
    projectId: "project-demo-1",
    requesterUserId: "customer.aria",
    title: "Add wall niche",
    description: "Please price a recessed media niche on the north wall."
  });

  const reviewed = await reviewProjectChangeRequestServer(runtime, adminActor(), {
    changeRequestId: submittedRequest.id,
    actorUserId: "alex.owner",
    action: "convert_to_change_order",
    changeOrderTitle: "Media niche add-on",
    changeOrderDescription: "Pricing and framing change for recessed media niche."
  });

  assert.equal(reviewed.changeRequest.status, "converted_change_order");
  assert.equal(reviewed.changeOrder?.status, "draft");

  await updateChangeOrderStatusServer(runtime, adminActor(), {
    changeOrderId: reviewed.changeOrder!.id,
    actorUserId: "alex.owner",
    status: "submitted"
  });
  await updateChangeOrderStatusServer(runtime, adminActor(), {
    changeOrderId: reviewed.changeOrder!.id,
    actorUserId: "alex.owner",
    status: "approved"
  });
  await updateChangeOrderStatusServer(runtime, adminActor(), {
    changeOrderId: reviewed.changeOrder!.id,
    actorUserId: "alex.owner",
    status: "implemented"
  });

  const project = runtime.repository.getProjectById("project-demo-1");
  assert.equal(project?.status, "active");
});

test("signed public links allow a limited project view and enforce max-use limits", async () => {
  const runtime = resetRuntime();
  const approval = await createApproval(runtime, "project-demo-1");

  const issued = await issueProjectPublicLinkServer(runtime, adminActor(), {
    projectId: "project-demo-1",
    actorUserId: "alex.owner",
    expiresAt: "2026-05-28T13:00:00.000Z",
    maxUses: 1,
    approvalId: approval.id
  });

  const firstView = await viewProjectViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T13:00:00.000Z"));

  assert.equal(firstView.project.id, "project-demo-1");
  assert.equal(runtime.repository.getPublicShareLinkById(issued.link.id)?.useCount, 1);

  await assert.rejects(
    () => viewProjectViaPublicLinkServer(runtime, issued.token, new Date("2026-04-28T13:05:00.000Z")),
    /public_link_use_limit_exceeded|invalid|authorization/i
  );
});

test("project public link issuance requires privileged approval", async () => {
  const runtime = resetRuntime();

  await assert.rejects(
    () =>
      issueProjectPublicLinkServer(runtime, adminActor(), {
        projectId: "project-demo-1",
        actorUserId: "alex.owner",
        expiresAt: "2026-05-28T13:00:00.000Z"
      }),
    (error: unknown) => {
      assert.ok(error instanceof PrivilegedActionApprovalError);
      assert.equal(error.reason, "approval_required");
      return true;
    }
  );
});
