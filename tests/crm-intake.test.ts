import test from "node:test";
import assert from "node:assert/strict";

import {
  getPermissionKeyForReviewAction,
  InMemoryProjectRequestRepository,
  IntakeTransitionError,
  IntakeValidationError,
  IntakeWorkflowService,
  parseProjectRequestReviewActionFormData,
  parsePublicProjectRequestFormData,
  ReviewActionParseError,
  toProjectRequestResourceRecord
} from "../packages/crm/src/index.ts";
import type {
  AuditEvent,
  NotificationDispatch,
  PublicProjectRequestSubmissionInput
} from "../packages/types/src/index.ts";

class MemoryAuditSink {
  events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }
}

class MemoryNotificationSink {
  notifications: NotificationDispatch[] = [];

  write(notification: NotificationDispatch): void {
    this.notifications.push(notification);
  }
}

function createService(seed?: ConstructorParameters<typeof InMemoryProjectRequestRepository>[0]) {
  const auditSink = new MemoryAuditSink();
  const notificationSink = new MemoryNotificationSink();
  let counter = 0;

  const service = new IntakeWorkflowService({
    repository: new InMemoryProjectRequestRepository(seed),
    auditSink,
    notificationSink,
    organizationId: "org-hq",
    now: () => new Date("2026-04-28T12:00:00.000Z"),
    idGenerator: (prefix: string) => {
      counter += 1;
      return `${prefix}-${counter}`;
    }
  });

  return {
    service,
    auditSink,
    notificationSink
  };
}

function validSubmission(overrides: Partial<PublicProjectRequestSubmissionInput> = {}): PublicProjectRequestSubmissionInput {
  return {
    submitterName: overrides.submitterName ?? "Jordan Reed",
    email: overrides.email ?? "jordan@example.com",
    projectTitle: overrides.projectTitle ?? "Kitchen remodel",
    projectSummary: overrides.projectSummary ?? "Need phased design and build guidance.",
    phone: overrides.phone ?? "555-0101",
    consultationPreference: overrides.consultationPreference ?? "within_7_days",
    imageUpload: overrides.imageUpload
  };
}

test("public submission requires name and email for short-term customer requests", async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.submitPublicProjectRequest(
        validSubmission({
          submitterName: "   ",
          email: " "
        })
      ),
    (error: unknown) => {
      assert.ok(error instanceof IntakeValidationError);
      assert.equal(error.issues.length, 2);
      assert.deepEqual(
        error.issues.map((issue) => issue.field).sort(),
        ["email", "submitterName"]
      );
      return true;
    }
  );
});

test("public submission enforces image upload validation", async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.submitPublicProjectRequest(
        validSubmission({
          imageUpload: {
            fileName: "malware.exe",
            mimeType: "application/octet-stream",
            byteSize: 6 * 1024 * 1024
          }
        })
      ),
    (error: unknown) => {
      assert.ok(error instanceof IntakeValidationError);
      assert.equal(error.issues.some((issue) => issue.field === "imageUpload"), true);
      return true;
    }
  );
});

test("public submission creates a short-term request, lead, audit events, and notifications", async () => {
  const { service, auditSink, notificationSink } = createService();

  const result = await service.submitPublicProjectRequest(
    validSubmission({
      imageUpload: {
        fileName: "reference.png",
        mimeType: "image/png",
        byteSize: 1024
      }
    })
  );

  assert.equal(result.request.customerType, "short_term");
  assert.equal(result.request.organizationId, "org-hq");
  assert.equal(result.request.status, "submitted");
  assert.equal(result.request.shortTermRestrictions.length, 4);
  assert.equal(result.request.shortTermExpiresAt, "2026-05-28T12:00:00.000Z");
  assert.equal(result.lead.organizationId, "org-hq");
  assert.equal(result.lead.status, "new");
  assert.equal(auditSink.events.length, 2);
  assert.equal(notificationSink.notifications.length, 2);
  assert.equal(notificationSink.notifications[0]?.type, "intake.submitted");
  assert.equal(notificationSink.notifications[1]?.type, "intake.submission.receipt");
});

test("review actions write audit logs and requester notifications for more info", async () => {
  const { service, auditSink, notificationSink } = createService();
  const submission = await service.submitPublicProjectRequest(validSubmission());

  await service.applyReviewAction(submission.request.id, {
    type: "start_review",
    actorUserId: "admin-1"
  });

  const result = await service.applyReviewAction(submission.request.id, {
    type: "request_more_info",
    actorUserId: "admin-1",
    message: "Please confirm the site address and photos of the current entry."
  });

  assert.equal(result.request.status, "needs_more_info");
  assert.equal(result.lead.status, "awaiting_customer");
  assert.equal(result.notifications.length, 1);
  assert.equal(result.notifications[0]?.audience, "requester");
  assert.equal(auditSink.events.filter((event) => event.eventType === "intake.project_request.status_changed").length, 2);
  assert.equal(notificationSink.notifications.at(-1)?.type, "intake.review.request_more_info");
});

test("schedule consultation transition records the requested time and resets short-term expiry", async () => {
  const { service } = createService();
  const submission = await service.submitPublicProjectRequest(validSubmission());

  const result = await service.applyReviewAction(submission.request.id, {
    type: "schedule_consultation",
    actorUserId: "admin-1",
    scheduledAt: "2026-05-02T14:30:00.000Z"
  });

  assert.equal(result.request.status, "consultation_scheduled");
  assert.equal(result.request.consultationScheduledAt, "2026-05-02T14:30:00.000Z");
  assert.equal(result.lead.status, "consultation_scheduled");
  assert.equal(result.request.shortTermExpiresAt, "2026-05-28T12:00:00.000Z");
});

test("rejected requests cannot later convert to project drafts", async () => {
  const { service } = createService();
  const submission = await service.submitPublicProjectRequest(validSubmission());

  await service.applyReviewAction(submission.request.id, {
    type: "reject",
    actorUserId: "admin-1",
    reason: "The request is outside current service territory."
  });

  await assert.rejects(
    () =>
      service.applyReviewAction(submission.request.id, {
        type: "convert_to_project_draft",
        actorUserId: "admin-1"
      }),
    (error: unknown) => {
      assert.ok(error instanceof IntakeTransitionError);
      assert.match(error.message, /not allowed/i);
      return true;
    }
  );
});

test("convert to project draft emits project ops notification and allows later long-term invite", async () => {
  const { service, notificationSink } = createService();
  const submission = await service.submitPublicProjectRequest(validSubmission());

  const converted = await service.applyReviewAction(submission.request.id, {
    type: "convert_to_project_draft",
    actorUserId: "admin-1",
    projectName: "Kitchen remodel draft"
  });

  assert.equal(converted.request.status, "project_draft_created");
  assert.ok(converted.request.projectDraftId);
  assert.equal(converted.lead.status, "converted_project_draft");
  assert.equal(converted.notifications[0]?.audience, "project_ops");

  const invited = await service.applyReviewAction(submission.request.id, {
    type: "invite_as_long_term_customer",
    actorUserId: "admin-1",
    inviteEmail: "jordan@example.com"
  });

  assert.equal(invited.request.status, "long_term_invited");
  assert.ok(invited.request.longTermInviteId);
  assert.equal(invited.lead.status, "invited_long_term_customer");
  assert.equal(notificationSink.notifications.at(-1)?.type, "intake.review.long_term_invited");
});

test("public form parser trims values and normalizes image uploads", () => {
  const parsed = parsePublicProjectRequestFormData({
    get(name: string) {
      const fields: Record<string, unknown> = {
        submitterName: "  Jordan Reed  ",
        email: "  jordan@example.com  ",
        phone: " 555-0101 ",
        projectTitle: "  Kitchen remodel ",
        projectSummary: " Need phased design and build guidance. ",
        consultationPreference: "within_30_days",
        imageUpload: {
          name: " reference.png ",
          type: "image/png",
          size: 1024
        }
      };

      return fields[name];
    }
  });

  assert.equal(parsed.submitterName, "Jordan Reed");
  assert.equal(parsed.email, "jordan@example.com");
  assert.equal(parsed.consultationPreference, "within_30_days");
  assert.deepEqual(parsed.imageUpload, {
    fileName: "reference.png",
    mimeType: "image/png",
    byteSize: 1024
  });
});

test("review action parser maps payloads and permission keys for authorization", () => {
  const action = parseProjectRequestReviewActionFormData({
    get(name: string) {
      const fields: Record<string, unknown> = {
        actionType: "convert_to_project_draft",
        actorUserId: "admin-1",
        projectName: "Kitchen remodel draft"
      };

      return fields[name];
    }
  });

  assert.equal(action.type, "convert_to_project_draft");
  assert.equal(getPermissionKeyForReviewAction(action.type), "lead.convert.org");
});

test("review action parser rejects unsupported action payloads", () => {
  assert.throws(
    () =>
      parseProjectRequestReviewActionFormData({
        get(name: string) {
          const fields: Record<string, unknown> = {
            actionType: "archive_request",
            actorUserId: "admin-1"
          };

          return fields[name];
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ReviewActionParseError);
      return true;
    }
  );
});

test("project request resource records preserve organization and visibility for authorization", async () => {
  const { service } = createService();
  const result = await service.submitPublicProjectRequest(validSubmission());
  const record = toProjectRequestResourceRecord(result.request);

  assert.equal(record.orgId, "org-hq");
  assert.deepEqual(record.visibility, ["internal", "customer"]);
});
