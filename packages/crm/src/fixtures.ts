import type { LeadRecord, ProjectRequestRecord } from "../../types/src/index.ts";
import { InMemoryProjectRequestRepository } from "./repository.ts";
import { getShortTermCustomerRestrictions, IntakeWorkflowService } from "./workflow.ts";

export const DEMO_PROJECT_REQUESTS: readonly ProjectRequestRecord[] = [
  {
    id: "request-demo-1",
    leadId: "lead-demo-1",
    shortTermCustomerId: "short-term-demo-1",
    organizationId: "org-hq",
    customerType: "short_term",
    status: "submitted",
    submitterName: "Jordan Reed",
    email: "jordan@example.com",
    phone: "555-0101",
    projectTitle: "Kitchen and entry remodel",
    projectSummary: "Need phased remodel planning with photo references and a short consultation.",
    consultationPreference: "within_7_days",
    imageUpload: {
      fileName: "entryway-reference.jpg",
      mimeType: "image/jpeg",
      byteSize: 1840000
    },
    visibilityFlags: ["internal", "customer"],
    shortTermRestrictions: getShortTermCustomerRestrictions(),
    submittedAt: "2026-04-20T10:15:00.000Z",
    lastStatusChangedAt: "2026-04-20T10:15:00.000Z",
    lastActivityAt: "2026-04-20T10:15:00.000Z",
    shortTermExpiresAt: "2026-05-20T10:15:00.000Z"
  },
  {
    id: "request-demo-2",
    leadId: "lead-demo-2",
    shortTermCustomerId: "short-term-demo-2",
    organizationId: "org-hq",
    customerType: "short_term",
    status: "needs_more_info",
    submitterName: "Aria Simmons",
    email: "aria@example.com",
    projectTitle: "Studio office fit-out",
    projectSummary: "Looking for a small office conversion with material options and a budget guardrail.",
    consultationPreference: "undecided",
    visibilityFlags: ["internal", "customer"],
    shortTermRestrictions: getShortTermCustomerRestrictions(),
    submittedAt: "2026-04-18T14:20:00.000Z",
    lastStatusChangedAt: "2026-04-21T09:05:00.000Z",
    lastActivityAt: "2026-04-21T09:05:00.000Z",
    shortTermExpiresAt: "2026-05-21T09:05:00.000Z",
    requestedMoreInfoMessage: "Please confirm target square footage and whether weekend access is available."
  },
  {
    id: "request-demo-3",
    leadId: "lead-demo-3",
    shortTermCustomerId: "short-term-demo-3",
    organizationId: "org-hq",
    customerType: "short_term",
    status: "consultation_scheduled",
    submitterName: "Morgan Patel",
    email: "morgan@example.com",
    projectTitle: "Retail front refresh",
    projectSummary: "Exploring a storefront refresh with phased execution to avoid downtime.",
    consultationPreference: "asap",
    visibilityFlags: ["internal", "customer"],
    shortTermRestrictions: getShortTermCustomerRestrictions(),
    submittedAt: "2026-04-16T12:00:00.000Z",
    lastStatusChangedAt: "2026-04-22T15:40:00.000Z",
    lastActivityAt: "2026-04-22T15:40:00.000Z",
    shortTermExpiresAt: "2026-05-22T15:40:00.000Z",
    consultationScheduledAt: "2026-04-30T16:00:00.000Z"
  },
  {
    id: "request-demo-4",
    leadId: "lead-demo-4",
    shortTermCustomerId: "short-term-demo-4",
    organizationId: "org-hq",
    customerType: "short_term",
    status: "project_draft_created",
    submitterName: "Taylor Brooks",
    email: "taylor@example.com",
    projectTitle: "Basement finishing project",
    projectSummary: "Moving ahead with a draft scope for a finished basement and utility room partition.",
    consultationPreference: "within_30_days",
    visibilityFlags: ["internal", "customer"],
    shortTermRestrictions: getShortTermCustomerRestrictions(),
    submittedAt: "2026-04-10T09:30:00.000Z",
    lastStatusChangedAt: "2026-04-25T11:10:00.000Z",
    lastActivityAt: "2026-04-25T11:10:00.000Z",
    shortTermExpiresAt: "2026-05-25T11:10:00.000Z",
    projectDraftId: "project-draft-demo-4"
  }
] as const;

export const DEMO_LEADS: readonly LeadRecord[] = [
  {
    id: "lead-demo-1",
    requestId: "request-demo-1",
    organizationId: "org-hq",
    status: "new",
    pipelineLabel: "New",
    ownerUserId: "alex.owner",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-20T10:15:00.000Z",
    updatedAt: "2026-04-20T10:15:00.000Z"
  },
  {
    id: "lead-demo-2",
    requestId: "request-demo-2",
    organizationId: "org-hq",
    status: "awaiting_customer",
    pipelineLabel: "Needs more info",
    ownerUserId: "alex.owner",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-18T14:20:00.000Z",
    updatedAt: "2026-04-21T09:05:00.000Z"
  },
  {
    id: "lead-demo-3",
    requestId: "request-demo-3",
    organizationId: "org-hq",
    status: "consultation_scheduled",
    pipelineLabel: "Consultation scheduled",
    ownerUserId: "alex.owner",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-16T12:00:00.000Z",
    updatedAt: "2026-04-22T15:40:00.000Z"
  },
  {
    id: "lead-demo-4",
    requestId: "request-demo-4",
    organizationId: "org-hq",
    status: "converted_project_draft",
    pipelineLabel: "Project draft created",
    ownerUserId: "alex.owner",
    visibilityFlags: ["internal"],
    createdAt: "2026-04-10T09:30:00.000Z",
    updatedAt: "2026-04-25T11:10:00.000Z"
  }
] as const;

export function createDemoIntakeService() {
  const repository = new InMemoryProjectRequestRepository({
    requests: DEMO_PROJECT_REQUESTS,
    leads: DEMO_LEADS
  });

  return new IntakeWorkflowService({
    repository,
    organizationId: "org-hq",
    now: () => new Date("2026-04-28T10:00:00.000Z"),
    idGenerator: (() => {
      let counter = 100;
      return (prefix: string) => {
        counter += 1;
        return `${prefix}-${counter}`;
      };
    })()
  });
}
