import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationError } from "../packages/auth/src/server/index.ts";
import { createPathAccessMiddleware } from "../packages/auth/src/server/index.ts";
import {
  getApplicationDetailForActor,
  getInterviewDetailForActor,
  resetHiringRuntime,
  submitInterviewFeedbackServer,
  submitPublicJobApplicationServer,
  updateApplicationStatusServer,
  convertApplicantToEmployeeServer
} from "../packages/hiring/src/index.ts";
import { DASHBOARD_PROTECTED_ROUTES } from "../packages/auth/src/shared/index.ts";
import { ROLE_DEFAULT_GRANTS } from "../packages/permissions/src/index.ts";
import { ROLE_KEYS } from "../packages/types/src/index.ts";
import { evaluateAuthorization } from "../packages/permissions/src/index.ts";
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
    ]
  });
}

function applicantActor(userId = "applicant.jules"): AuthorizationActor {
  return actor({
    userId,
    memberships: [
      {
        id: `membership-${userId}`,
        userId,
        role: "applicant",
        active: true
      }
    ]
  });
}

function interviewerActor(userId: string): AuthorizationActor {
  return actor({
    userId,
    memberships: [
      {
        id: `membership-${userId}`,
        userId,
        role: "employee",
        orgId: "org-hq",
        active: true,
        grantedPermissionKeys: [
          "hiring.interview.view.assigned",
          "hiring.interview.feedback.submit.assigned"
        ]
      }
    ]
  });
}

test("applicant role exists in the role registry and default grants", () => {
  assert.equal(ROLE_KEYS.includes("applicant"), true);
  assert.equal(Array.isArray(ROLE_DEFAULT_GRANTS.applicant), true);
  assert.equal(ROLE_DEFAULT_GRANTS.applicant.includes("hiring.application.view.self"), true);
  assert.equal(ROLE_DEFAULT_GRANTS.applicant.includes("hiring.offer.view.self"), true);
});

test("applicant cannot access admin dashboard routes", () => {
  const middleware = createPathAccessMiddleware(DASHBOARD_PROTECTED_ROUTES, {
    signInPath: "/login",
    forbiddenPath: "/forbidden"
  });
  const result = middleware({
    pathname: "/hiring",
    actor: applicantActor()
  });

  assert.equal(result.status, 403);
  assert.equal(result.redirectTo, "/forbidden");
});

test("applicant cannot access projects, payroll, finance, or CRM records", () => {
  const currentActor = applicantActor();

  const decisions = [
    evaluateAuthorization({
      actor: currentActor,
      permissionKey: "project.view.self",
      record: {
        resourceType: "project",
        resourceId: "project-1",
        ownerUserId: currentActor.userId,
        visibility: "customer"
      }
    }),
    evaluateAuthorization({
      actor: currentActor,
      permissionKey: "payroll.view.self",
      record: {
        resourceType: "payroll_profile",
        resourceId: "payroll-1",
        ownerUserId: currentActor.userId,
        visibility: "internal"
      }
    }),
    evaluateAuthorization({
      actor: currentActor,
      permissionKey: "invoice.view.self",
      record: {
        resourceType: "invoice",
        resourceId: "invoice-1",
        ownerUserId: currentActor.userId,
        visibility: "customer"
      }
    }),
    evaluateAuthorization({
      actor: currentActor,
      permissionKey: "crm.view.org",
      record: {
        resourceType: "customer",
        resourceId: "customer-1",
        orgId: "org-hq",
        visibility: "internal"
      }
    })
  ];

  assert.deepEqual(
    decisions.map((decision) => decision.allowed),
    [false, false, false, false]
  );
});

test("public submission creates an application and applicant can view only their own record", async () => {
  const runtime = resetHiringRuntime();
  const submission = await submitPublicJobApplicationServer(
    runtime,
    {
      jobPostingId: "job-posting-demo-1",
      actorUserId: "applicant.new",
      firstName: "Riley",
      lastName: "Stone",
      email: "riley.stone@example.com",
      phone: "617-555-0123",
      coverLetter: "I have coordinated field reporting and vendor scheduling.",
      screeningAnswers: {
        "screening-question-1": "I coordinated field teams and subcontractor schedules.",
        "screening-question-2": "Buildertrend, Procore, and spreadsheet reporting."
      },
      consentGranted: true,
      resumeFile: {
        fileName: "riley-stone-resume.pdf",
        contentType: "application/pdf",
        byteSize: 125_000
      }
    },
    {
      rateLimitKey: "test-public-submission"
    }
  );

  const ownDetail = await getApplicationDetailForActor(runtime, applicantActor("applicant.new"), submission.application.id);

  assert.equal(submission.application.status, "submitted");
  assert.equal(submission.documents.length, 1);
  assert.equal(ownDetail?.application?.id, submission.application.id);

  await assert.rejects(
    () => getApplicationDetailForActor(runtime, applicantActor("applicant.other"), submission.application.id),
    AuthorizationError
  );
});

test("owner/admin can review applications and change status", async () => {
  const runtime = resetHiringRuntime();
  const updated = await updateApplicationStatusServer(runtime, adminActor(), {
    jobApplicationId: "job-application-demo-2",
    actorUserId: "alex.owner",
    nextStatus: "under_review",
    reason: "Queue moved into screening."
  });

  assert.equal(updated.status, "under_review");
  assert.equal(
    runtime.auditSink.list().some((event) => event.eventType === "hiring.application.status_changed"),
    true
  );
});

test("employee cannot review applicant records unless explicitly assigned as interviewer", async () => {
  const runtime = resetHiringRuntime();

  await assert.rejects(
    () => getApplicationDetailForActor(runtime, interviewerActor("employee-1"), "job-application-demo-1"),
    AuthorizationError
  );

  const interviewDetail = await getInterviewDetailForActor(runtime, interviewerActor("employee-1"), "interview-demo-1");
  assert.equal(interviewDetail.interview.id, "interview-demo-1");
});

test("assigned interviewer can submit feedback and unassigned interviewer cannot", async () => {
  const runtime = resetHiringRuntime();

  const feedback = await submitInterviewFeedbackServer(runtime, interviewerActor("employee-1"), {
    interviewId: "interview-demo-1",
    interviewerUserId: "employee-1",
    rating: 4,
    feedback: "Prepared, clear communication, and relevant field examples.",
    recommendation: "proceed"
  });

  assert.equal(feedback.interviewerUserId, "employee-1");

  await assert.rejects(
    () =>
      submitInterviewFeedbackServer(runtime, interviewerActor("employee-2"), {
        interviewId: "interview-demo-1",
        interviewerUserId: "employee-2",
        rating: 2,
        feedback: "Not assigned to this interview.",
        recommendation: "hold"
      }),
    AuthorizationError
  );
});

test("applicant cannot see internal hiring notes or interviewer feedback", async () => {
  const runtime = resetHiringRuntime();
  const detail = await getApplicationDetailForActor(runtime, applicantActor("applicant.offer"), "job-application-demo-3");

  assert.equal(detail?.internalNotes.length, 0);
  assert.equal(detail?.interviewFeedback.length, 0);
});

test("conversion creates employee record, writes audit log, and preserves history", async () => {
  const runtime = resetHiringRuntime();
  const converted = await convertApplicantToEmployeeServer(runtime, adminActor(), {
    jobApplicationId: "job-application-demo-3",
    actorUserId: "alex.owner",
    employeeUserId: "employee.newhire"
  });

  const detail = await getApplicationDetailForActor(runtime, adminActor(), "job-application-demo-3");

  assert.equal(converted.application.status, "converted_to_employee");
  assert.equal(converted.employee.userId, "employee.newhire");
  assert.equal(detail?.employee?.sourceApplicationId, "job-application-demo-3");
  assert.equal(
    runtime.auditSink.list().some((event) => event.eventType === "hiring.applicant.converted"),
    true
  );
  assert.equal(detail?.statusHistory.some((entry) => entry.newStatus === "offer_accepted"), true);
  assert.equal(detail?.statusHistory.some((entry) => entry.newStatus === "converted_to_employee"), true);
});
