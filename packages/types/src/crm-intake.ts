import { type RoleKey, type VisibilityFlag } from "./authz.ts";

export const CONSULTATION_PREFERENCES = [
  "asap",
  "within_7_days",
  "within_30_days",
  "undecided"
] as const;

export type ConsultationPreference = (typeof CONSULTATION_PREFERENCES)[number];

export const PROJECT_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "needs_more_info",
  "consultation_scheduled",
  "rejected",
  "expired",
  "project_draft_created",
  "long_term_invited"
] as const;

export type ProjectRequestStatus = (typeof PROJECT_REQUEST_STATUSES)[number];

export const LEAD_STATUSES = [
  "new",
  "reviewing",
  "awaiting_customer",
  "consultation_scheduled",
  "rejected",
  "expired",
  "converted_project_draft",
  "invited_long_term_customer"
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PROJECT_REQUEST_REVIEW_ACTIONS = [
  "start_review",
  "request_more_info",
  "schedule_consultation",
  "reject",
  "convert_to_project_draft",
  "invite_as_long_term_customer"
] as const;

export type ProjectRequestReviewActionType = (typeof PROJECT_REQUEST_REVIEW_ACTIONS)[number];

export interface PublicImageUploadInput {
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export interface PublicProjectRequestSubmissionInput {
  submitterName: string;
  email: string;
  projectTitle: string;
  projectSummary: string;
  phone?: string;
  consultationPreference: ConsultationPreference;
  imageUpload?: PublicImageUploadInput;
}

export interface PublicProjectRequestValidationIssue {
  field:
    | "submitterName"
    | "email"
    | "projectTitle"
    | "projectSummary"
    | "consultationPreference"
    | "imageUpload";
  message: string;
}

export interface ShortTermCustomerRestriction {
  code:
    | "minimal_identity"
    | "no_portal_access"
    | "auto_expire_after_30_days"
    | "legal_and_accounting_retention";
  label: string;
}

export interface ProjectRequestRecord {
  id: string;
  leadId: string;
  shortTermCustomerId: string;
  organizationId: string;
  customerType: "short_term";
  status: ProjectRequestStatus;
  submitterName: string;
  email: string;
  phone?: string;
  projectTitle: string;
  projectSummary: string;
  consultationPreference: ConsultationPreference;
  imageUpload?: PublicImageUploadInput;
  consultationScheduledAt?: string;
  requestedMoreInfoMessage?: string;
  rejectionReason?: string;
  projectDraftId?: string;
  longTermInviteId?: string;
  expiredAt?: string | null;
  visibilityFlags: readonly VisibilityFlag[];
  shortTermRestrictions: readonly ShortTermCustomerRestriction[];
  submittedAt: string;
  lastStatusChangedAt: string;
  lastActivityAt: string;
  shortTermExpiresAt: string;
}

export interface LeadRecord {
  id: string;
  requestId: string;
  organizationId: string;
  status: LeadStatus;
  pipelineLabel: string;
  ownerUserId?: string;
  expiredAt?: string | null;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestReviewActionBase {
  type: ProjectRequestReviewActionType;
  actorUserId: string;
}

export interface StartReviewAction extends RequestReviewActionBase {
  type: "start_review";
}

export interface RequestMoreInfoAction extends RequestReviewActionBase {
  type: "request_more_info";
  message: string;
}

export interface ScheduleConsultationAction extends RequestReviewActionBase {
  type: "schedule_consultation";
  scheduledAt: string;
  note?: string;
}

export interface RejectRequestAction extends RequestReviewActionBase {
  type: "reject";
  reason: string;
}

export interface ConvertToProjectDraftAction extends RequestReviewActionBase {
  type: "convert_to_project_draft";
  projectName?: string;
}

export interface InviteLongTermCustomerAction extends RequestReviewActionBase {
  type: "invite_as_long_term_customer";
  inviteEmail?: string;
}

export type ProjectRequestReviewAction =
  | StartReviewAction
  | RequestMoreInfoAction
  | ScheduleConsultationAction
  | RejectRequestAction
  | ConvertToProjectDraftAction
  | InviteLongTermCustomerAction;

export interface NotificationDispatch {
  id: string;
  type:
    | "intake.submitted"
    | "intake.submission.receipt"
    | "intake.review.request_more_info"
    | "intake.review.consultation_scheduled"
    | "intake.review.rejected"
    | "intake.review.project_draft_created"
    | "intake.review.long_term_invited";
  audience: "internal_review_queue" | "requester" | "project_ops";
  requestId: string;
  leadId: string;
  recipientRole?: RoleKey;
  recipientEmail?: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface NotificationSink {
  write(notification: NotificationDispatch): void | Promise<void>;
}

export interface ProjectRequestRepository {
  createRequest(request: ProjectRequestRecord): void;
  updateRequest(request: ProjectRequestRecord): void;
  getRequestById(requestId: string): ProjectRequestRecord | undefined;
  listRequests(): readonly ProjectRequestRecord[];
  createLead(lead: LeadRecord): void;
  updateLead(lead: LeadRecord): void;
  getLeadById(leadId: string): LeadRecord | undefined;
  listLeads(): readonly LeadRecord[];
}

export interface LeadPipelineStage {
  status: LeadStatus;
  label: string;
  requestCount: number;
}
