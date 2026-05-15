import { type PermissionKey, type VisibilityFlag } from "./authz.ts";
import { type ProjectRequestRecord } from "./crm-intake.ts";

export const PROJECT_STATUSES = [
  "draft",
  "planning",
  "active",
  "on_hold",
  "awaiting_change_order_approval",
  "completed",
  "cancelled"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PHASE_STATUSES = ["planned", "in_progress", "blocked", "completed"] as const;

export type ProjectPhaseStatus = (typeof PROJECT_PHASE_STATUSES)[number];

export const PROJECT_TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;

export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

export const PROJECT_CHANGE_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "converted_change_order"
] as const;

export type ProjectChangeRequestStatus = (typeof PROJECT_CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_ORDER_STATUSES = ["draft", "submitted", "approved", "rejected", "implemented"] as const;

export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const PROJECT_ASSIGNMENT_TARGETS = ["employee", "subcontractor", "supercontractor"] as const;

export type ProjectAssignmentTarget = (typeof PROJECT_ASSIGNMENT_TARGETS)[number];

export const PROJECT_TIMELINE_EVENT_TYPES = [
  "project_created",
  "project_status_changed",
  "project_visibility_changed",
  "phase_created",
  "phase_status_changed",
  "task_created",
  "task_status_changed",
  "assignment_created",
  "progress_update_published",
  "change_request_submitted",
  "change_request_status_changed",
  "change_order_created",
  "change_order_status_changed",
  "public_link_issued",
  "public_link_viewed",
  "public_link_revoked"
] as const;

export type ProjectTimelineEventType = (typeof PROJECT_TIMELINE_EVENT_TYPES)[number];

export interface ProjectAttachment {
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageKey?: string;
  caption?: string;
}

export interface ApprovedProjectRequestSnapshot {
  requestId: string;
  organizationId: string;
  requestStatus: ProjectRequestRecord["status"];
  customerAccountId?: string;
  requesterName: string;
  requesterEmail: string;
  projectTitle: string;
  projectSummary: string;
  sourceDraftId?: string;
}

export interface ProjectRecord {
  id: string;
  organizationId: string;
  sourceRequestId: string;
  sourceRequestStatus: ProjectRequestRecord["status"];
  ownerUserId: string;
  customerAccountId?: string;
  partnerOrgIds: readonly string[];
  name: string;
  description: string;
  status: ProjectStatus;
  visibilityFlags: readonly VisibilityFlag[];
  assignedUserIds: readonly string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProjectPhaseRecord {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sequence: number;
  status: ProjectPhaseStatus;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskRecord {
  id: string;
  projectId: string;
  phaseId: string;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  visibilityFlags: readonly VisibilityFlag[];
  assignedUserIds: readonly string[];
  partnerOrgIds: readonly string[];
  attachments: readonly ProjectAttachment[];
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignmentRecord {
  id: string;
  projectId: string;
  taskId?: string;
  target: ProjectAssignmentTarget;
  userId?: string;
  partnerOrgId?: string;
  assignedByUserId: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectProgressUpdateRecord {
  id: string;
  projectId: string;
  authorUserId: string;
  note: string;
  visibilityFlags: readonly VisibilityFlag[];
  attachments: readonly ProjectAttachment[];
  createdAt: string;
}

export interface ProjectChangeRequestRecord {
  id: string;
  projectId: string;
  requesterUserId: string;
  requesterRole: "customer";
  title: string;
  description: string;
  status: ProjectChangeRequestStatus;
  visibilityFlags: readonly VisibilityFlag[];
  attachments: readonly ProjectAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ChangeOrderRecord {
  id: string;
  projectId: string;
  sourceChangeRequestId?: string;
  title: string;
  description: string;
  status: ChangeOrderStatus;
  visibilityFlags: readonly VisibilityFlag[];
  attachments: readonly ProjectAttachment[];
  estimatedAmountDelta?: number;
  estimatedScheduleDeltaDays?: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTimelineEventRecord {
  id: string;
  projectId: string;
  eventType: ProjectTimelineEventType;
  actorUserId?: string | null;
  summary: string;
  visibilityFlags: readonly VisibilityFlag[];
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectPublicShareLinkRecord {
  id: string;
  projectId: string;
  permissionKeys: readonly PermissionKey[];
  tokenHash: string;
  tokenPrefix: string;
  expiresAt: string;
  revokedAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  createdByUserId: string;
  createdAt: string;
}

export interface ProjectDetail {
  project?: ProjectRecord;
  phases: readonly ProjectPhaseRecord[];
  tasks: readonly ProjectTaskRecord[];
  assignments: readonly ProjectAssignmentRecord[];
  progressUpdates: readonly ProjectProgressUpdateRecord[];
  changeRequests: readonly ProjectChangeRequestRecord[];
  changeOrders: readonly ChangeOrderRecord[];
  timeline: readonly ProjectTimelineEventRecord[];
  publicShareLinks: readonly ProjectPublicShareLinkRecord[];
}

export interface ProjectRepository {
  createProject(project: ProjectRecord): void;
  updateProject(project: ProjectRecord): void;
  getProjectById(projectId: string): ProjectRecord | undefined;
  listProjects(): readonly ProjectRecord[];
  createPhase(phase: ProjectPhaseRecord): void;
  updatePhase(phase: ProjectPhaseRecord): void;
  listPhasesByProjectId(projectId: string): readonly ProjectPhaseRecord[];
  getPhaseById(phaseId: string): ProjectPhaseRecord | undefined;
  createTask(task: ProjectTaskRecord): void;
  updateTask(task: ProjectTaskRecord): void;
  listTasksByProjectId(projectId: string): readonly ProjectTaskRecord[];
  getTaskById(taskId: string): ProjectTaskRecord | undefined;
  createAssignment(assignment: ProjectAssignmentRecord): void;
  listAssignmentsByProjectId(projectId: string): readonly ProjectAssignmentRecord[];
  listAssignmentsByTaskId(taskId: string): readonly ProjectAssignmentRecord[];
  createProgressUpdate(update: ProjectProgressUpdateRecord): void;
  listProgressUpdatesByProjectId(projectId: string): readonly ProjectProgressUpdateRecord[];
  createChangeRequest(changeRequest: ProjectChangeRequestRecord): void;
  updateChangeRequest(changeRequest: ProjectChangeRequestRecord): void;
  getChangeRequestById(changeRequestId: string): ProjectChangeRequestRecord | undefined;
  listChangeRequestsByProjectId(projectId: string): readonly ProjectChangeRequestRecord[];
  createChangeOrder(changeOrder: ChangeOrderRecord): void;
  updateChangeOrder(changeOrder: ChangeOrderRecord): void;
  getChangeOrderById(changeOrderId: string): ChangeOrderRecord | undefined;
  listChangeOrdersByProjectId(projectId: string): readonly ChangeOrderRecord[];
  createTimelineEvent(event: ProjectTimelineEventRecord): void;
  listTimelineEventsByProjectId(projectId: string): readonly ProjectTimelineEventRecord[];
  createPublicShareLink(link: ProjectPublicShareLinkRecord): void;
  updatePublicShareLink(link: ProjectPublicShareLinkRecord): void;
  getPublicShareLinkById(linkId: string): ProjectPublicShareLinkRecord | undefined;
  listPublicShareLinksByProjectId(projectId: string): readonly ProjectPublicShareLinkRecord[];
}
