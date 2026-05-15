import type {
  LeadRecord,
  PermissionKey,
  ProjectRequestRecord,
  ProjectRequestReviewActionType,
  ResourceRecord
} from "../../types/src/index.ts";

export function toProjectRequestResourceRecord(request: ProjectRequestRecord): ResourceRecord {
  return {
    resourceType: "project_request",
    resourceId: request.id,
    orgId: request.organizationId,
    visibility: request.visibilityFlags
  };
}

export function toLeadResourceRecord(lead: LeadRecord): ResourceRecord {
  return {
    resourceType: "lead",
    resourceId: lead.id,
    orgId: lead.organizationId,
    ownerUserId: lead.ownerUserId,
    visibility: lead.visibilityFlags
  };
}

export function getPermissionKeyForReviewAction(actionType: ProjectRequestReviewActionType): PermissionKey {
  switch (actionType) {
    case "schedule_consultation":
      return "consultation.schedule.org";
    case "convert_to_project_draft":
      return "lead.convert.org";
    case "invite_as_long_term_customer":
      return "customer.invite.org";
    case "start_review":
    case "request_more_info":
    case "reject":
      return "intake.review.org";
  }
}
