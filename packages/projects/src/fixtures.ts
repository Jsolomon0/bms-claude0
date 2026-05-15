import type {
  ApprovedProjectRequestSnapshot,
  ChangeOrderRecord,
  ProjectAssignmentRecord,
  ProjectChangeRequestRecord,
  ProjectPhaseRecord,
  ProjectProgressUpdateRecord,
  ProjectRecord,
  ProjectTaskRecord,
  ProjectTimelineEventRecord
} from "../../types/src/index.ts";

export const DEMO_APPROVED_REQUESTS: readonly ApprovedProjectRequestSnapshot[] = [
  {
    requestId: "request-demo-4",
    organizationId: "org-hq",
    requestStatus: "project_draft_created",
    customerAccountId: "customer-aria",
    requesterName: "Taylor Brooks",
    requesterEmail: "taylor@example.com",
    projectTitle: "Basement finishing project",
    projectSummary: "Finished basement scope with utility room partition and staged inspections.",
    sourceDraftId: "project-draft-demo-4"
  }
] as const;

export const DEMO_PROJECTS: readonly ProjectRecord[] = [
  {
    id: "project-demo-1",
    organizationId: "org-hq",
    sourceRequestId: "request-demo-4",
    sourceRequestStatus: "project_draft_created",
    ownerUserId: "alex.owner",
    customerAccountId: "customer-aria",
    partnerOrgIds: ["partner-east"],
    name: "Basement finishing project",
    description: "Customer-visible delivery workspace for the approved basement finishing project.",
    status: "active",
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor", "public_link"],
    assignedUserIds: ["employee-1", "sub-user-1"],
    createdAt: "2026-04-22T09:00:00.000Z",
    updatedAt: "2026-04-27T15:30:00.000Z",
    startedAt: "2026-04-24T08:00:00.000Z"
  },
  {
    id: "project-demo-2",
    organizationId: "org-hq",
    sourceRequestId: "request-internal-1",
    sourceRequestStatus: "long_term_invited",
    ownerUserId: "alex.owner",
    name: "Warehouse fit-out planning",
    description: "Internal planning project not yet published to external stakeholders.",
    status: "planning",
    visibilityFlags: ["internal"],
    partnerOrgIds: [],
    assignedUserIds: ["employee-2"],
    createdAt: "2026-04-18T11:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z"
  }
] as const;

export const DEMO_PHASES: readonly ProjectPhaseRecord[] = [
  {
    id: "phase-demo-1",
    projectId: "project-demo-1",
    name: "Design and permits",
    sequence: 1,
    status: "completed",
    visibilityFlags: ["internal", "customer"],
    createdAt: "2026-04-22T09:05:00.000Z",
    updatedAt: "2026-04-24T09:00:00.000Z"
  },
  {
    id: "phase-demo-2",
    projectId: "project-demo-1",
    name: "Framing and rough-ins",
    sequence: 2,
    status: "in_progress",
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor"],
    createdAt: "2026-04-24T09:10:00.000Z",
    updatedAt: "2026-04-27T12:00:00.000Z"
  }
] as const;

export const DEMO_TASKS: readonly ProjectTaskRecord[] = [
  {
    id: "task-demo-1",
    projectId: "project-demo-1",
    phaseId: "phase-demo-2",
    title: "Electrical rough-in",
    description: "Run basement branch circuits and prep inspection access.",
    status: "in_progress",
    visibilityFlags: ["internal", "customer", "subcontractor", "supercontractor"],
    assignedUserIds: ["employee-1"],
    partnerOrgIds: ["partner-east"],
    attachments: [],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-27T13:15:00.000Z"
  },
  {
    id: "task-demo-2",
    projectId: "project-demo-1",
    phaseId: "phase-demo-2",
    title: "Internal inspection prep",
    description: "Back-office checklist before customer-facing milestone review.",
    status: "todo",
    visibilityFlags: ["internal"],
    assignedUserIds: ["employee-1"],
    partnerOrgIds: [],
    attachments: [],
    createdAt: "2026-04-26T08:00:00.000Z",
    updatedAt: "2026-04-26T08:00:00.000Z"
  }
] as const;

export const DEMO_ASSIGNMENTS: readonly ProjectAssignmentRecord[] = [
  {
    id: "assignment-demo-1",
    projectId: "project-demo-1",
    target: "employee",
    userId: "employee-1",
    assignedByUserId: "alex.owner",
    createdAt: "2026-04-24T08:15:00.000Z"
  },
  {
    id: "assignment-demo-2",
    projectId: "project-demo-1",
    taskId: "task-demo-1",
    target: "subcontractor",
    partnerOrgId: "partner-east",
    assignedByUserId: "alex.owner",
    createdAt: "2026-04-24T10:05:00.000Z"
  }
] as const;

export const DEMO_PROGRESS_UPDATES: readonly ProjectProgressUpdateRecord[] = [
  {
    id: "progress-demo-1",
    projectId: "project-demo-1",
    authorUserId: "employee-1",
    note: "Framing inspection passed and electrical rough-in started.",
    visibilityFlags: ["internal", "customer"],
    attachments: [
      {
        fileName: "inspection-photo.jpg",
        mimeType: "image/jpeg",
        byteSize: 2048000
      }
    ],
    createdAt: "2026-04-27T14:00:00.000Z"
  },
  {
    id: "progress-demo-2",
    projectId: "project-demo-1",
    authorUserId: "sub-user-1",
    note: "Material delivery confirmed for partner crew.",
    visibilityFlags: ["internal", "subcontractor", "supercontractor"],
    attachments: [],
    createdAt: "2026-04-27T15:00:00.000Z"
  }
] as const;

export const DEMO_CHANGE_REQUESTS: readonly ProjectChangeRequestRecord[] = [
  {
    id: "change-request-demo-1",
    projectId: "project-demo-1",
    requesterUserId: "customer.aria",
    requesterRole: "customer",
    title: "Add recessed lighting",
    description: "Customer requested additional recessed lighting in the media area.",
    status: "submitted",
    visibilityFlags: ["internal", "customer"],
    attachments: [],
    createdAt: "2026-04-27T16:00:00.000Z",
    updatedAt: "2026-04-27T16:00:00.000Z"
  }
] as const;

export const DEMO_CHANGE_ORDERS: readonly ChangeOrderRecord[] = [
  {
    id: "change-order-demo-1",
    projectId: "project-demo-1",
    sourceChangeRequestId: "change-request-demo-1",
    title: "Lighting add-on pricing",
    description: "Draft pricing and schedule extension for recessed lighting.",
    status: "submitted",
    visibilityFlags: ["internal", "customer"],
    attachments: [],
    estimatedAmountDelta: 1800,
    estimatedScheduleDeltaDays: 2,
    createdByUserId: "alex.owner",
    createdAt: "2026-04-27T17:00:00.000Z",
    updatedAt: "2026-04-27T17:30:00.000Z"
  }
] as const;

export const DEMO_TIMELINE_EVENTS: readonly ProjectTimelineEventRecord[] = [
  {
    id: "timeline-demo-1",
    projectId: "project-demo-1",
    eventType: "project_created",
    actorUserId: "alex.owner",
    summary: "Project created from approved request.",
    visibilityFlags: ["internal", "customer"],
    occurredAt: "2026-04-22T09:00:00.000Z"
  },
  {
    id: "timeline-demo-2",
    projectId: "project-demo-1",
    eventType: "progress_update_published",
    actorUserId: "employee-1",
    summary: "Customer-visible progress update published.",
    visibilityFlags: ["internal", "customer"],
    occurredAt: "2026-04-27T14:00:00.000Z"
  }
] as const;
