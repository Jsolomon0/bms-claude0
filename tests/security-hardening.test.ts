import test from "node:test";
import assert from "node:assert/strict";

import { resetPaymentsRuntime } from "../packages/payments/src/index.ts";
import { resetProjectsRuntime } from "../packages/projects/src/index.ts";
import { PrivilegedActionApprovalError } from "../packages/security/src/index.ts";

test("runtime secret fallback usage is logged without exposing raw secret values", () => {
  const runtime = resetPaymentsRuntime();
  const fallbackEvents = runtime.security.logger
    .list()
    .filter((event) => event.eventName === "security.secret.fallback_used");

  assert.equal(fallbackEvents.length >= 2, true);
  assert.equal(
    fallbackEvents.some((event) => event.metadata?.envKey === "BMS_STRIPE_WEBHOOK_SECRET"),
    true
  );
  assert.equal(
    fallbackEvents.some((event) => event.metadata?.envKey === "BMS_PAYMENT_PUBLIC_LINK_SECRET"),
    true
  );
  assert.equal(JSON.stringify(fallbackEvents).includes("payments-demo-secret-2026-hardening"), false);
  assert.equal(JSON.stringify(fallbackEvents).includes("stripe-demo-secret-2026-hardening"), false);
});

test("approval subject mismatch is denied and audited", async () => {
  const runtime = resetProjectsRuntime();
  const approval = await runtime.security.approvals.createApproval({
    actionKey: "public_link.issue",
    actorUserId: "alex.owner",
    resourceType: "project",
    resourceId: "project-demo-1",
    approvedByUserId: "owner.approver",
    justification: "Approve project share link",
    expiresAt: "2026-05-10T00:00:00.000Z"
  });

  await assert.rejects(
    () =>
      runtime.security.approvals.assertApproved({
        approvalId: approval.id,
        actionKey: "public_link.issue",
        actorUserId: "alex.owner",
        resourceType: "project",
        resourceId: "project-demo-2",
        now: new Date("2026-04-28T13:00:00.000Z")
      }),
    (error: unknown) => {
      assert.ok(error instanceof PrivilegedActionApprovalError);
      assert.equal(error.reason, "approval_subject_mismatch");
      return true;
    }
  );

  assert.equal(
    runtime.auditSink.list().some((event) => event.eventType === "security.privileged_approval.denied"),
    true
  );
  assert.equal(
    runtime.security.monitoringHook
      .list()
      .some((event) => event.eventName === "security.privileged_approval.denied"),
    true
  );
});
