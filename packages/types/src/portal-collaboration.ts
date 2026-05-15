import { type RoleKey, type VisibilityFlag } from "./authz.ts";

export const MESSAGE_THREAD_STATUSES = ["open", "closed", "archived"] as const;

export type MessageThreadStatus = (typeof MESSAGE_THREAD_STATUSES)[number];

export interface PortalMessageThreadRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  customerAccountId?: string;
  partnerOrgIds: readonly string[];
  subject: string;
  status: MessageThreadStatus;
  visibilityFlags: readonly VisibilityFlag[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalMessageRecord {
  id: string;
  threadId: string;
  senderUserId: string;
  senderRole: RoleKey;
  body: string;
  visibilityFlags: readonly VisibilityFlag[];
  createdAt: string;
}
