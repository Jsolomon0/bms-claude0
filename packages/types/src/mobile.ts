import { type NotificationPreview } from "./app-shell.ts";
import { type AuthorizationActor } from "./authz.ts";
import { type ConsultationPreference, type PublicProjectRequestSubmissionInput } from "./crm-intake.ts";
import { type PaymentCheckoutSession } from "./finance.ts";
import { type ClockEventSource, type ActiveClockSession } from "./payroll.ts";
import { type ProjectAttachment, type ProjectRecord } from "./project-management.ts";

export const MOBILE_SUPPORTED_ROLES = [
  "employee",
  "customer",
  "subcontractor",
  "administrator",
  "owner"
] as const;

export type MobileSupportedRole = (typeof MOBILE_SUPPORTED_ROLES)[number];

export const MOBILE_ROUTE_IDS = [
  "home",
  "projects",
  "project_detail",
  "clock",
  "request",
  "invoices",
  "notifications"
] as const;

export type MobileRouteId = (typeof MOBILE_ROUTE_IDS)[number];

export interface MobileSessionUser {
  userId: string;
  displayName: string;
  role: MobileSupportedRole;
  email: string;
  organizationId?: string | null;
  customerAccountId?: string | null;
  partnerOrgId?: string | null;
}

export interface MobileSession {
  id: string;
  accessToken: string;
  issuedAt: string;
  expiresAt: string;
  actor: AuthorizationActor;
  user: MobileSessionUser;
}

export interface MobileHomeAction {
  id: string;
  label: string;
  route: MobileRouteId;
  description: string;
}

export interface MobileHomeCard {
  id: string;
  title: string;
  value: string;
  description: string;
  tone: "primary" | "accent" | "neutral";
  action?: MobileHomeAction;
}

export interface MobileHomeModel {
  role: MobileSupportedRole;
  title: string;
  subtitle: string;
  cards: readonly MobileHomeCard[];
  actions: readonly MobileHomeAction[];
  notifications: readonly NotificationPreview[];
}

export interface MobilePushRegistration {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android";
  environment: "development" | "production";
  createdAt: string;
  updatedAt: string;
}

export type MobileDraftKind = "project_progress" | "customer_request";

export interface MobileDraftAttachment {
  localUri: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  caption?: string;
}

export interface MobileProjectProgressDraftPayload {
  projectId: string;
  note: string;
  visibilityFlags: readonly ("internal" | "customer" | "subcontractor" | "supercontractor")[];
  attachments: readonly MobileDraftAttachment[];
}

export interface MobileCustomerRequestDraftPayload {
  submitterName: string;
  email: string;
  projectTitle: string;
  projectSummary: string;
  phone?: string;
  consultationPreference: ConsultationPreference;
  imageUpload?: MobileDraftAttachment;
}

export type MobileDraftPayload = MobileProjectProgressDraftPayload | MobileCustomerRequestDraftPayload;

export interface MobileDraftRecord {
  id: string;
  actorUserId: string;
  kind: MobileDraftKind;
  status: "draft" | "syncing" | "synced" | "failed";
  payload: MobileDraftPayload;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
}

export interface MobileSignInInput {
  identifier: string;
  passcode: string;
}

export interface MobileProjectProgressSubmissionInput {
  projectId: string;
  note: string;
  visibilityFlags: readonly ("internal" | "customer" | "subcontractor" | "supercontractor")[];
  attachments?: readonly MobileDraftAttachment[];
}

export interface MobileClockActionInput {
  occurredAt: string;
  eventSource?: ClockEventSource;
  projectId?: string;
  taskId?: string;
  notes?: string;
}

export interface MobileInvoicePaymentResult {
  checkoutSession: PaymentCheckoutSession;
}

export interface MobileWorkspaceSnapshot {
  home: MobileHomeModel;
  projects: readonly ProjectRecord[];
  activeClockSession?: ActiveClockSession;
}

export interface MobileDraftSyncResult {
  draftId: string;
  status: MobileDraftRecord["status"];
  syncedResourceId?: string;
  submittedRequest?: PublicProjectRequestSubmissionInput;
}

export function toProjectAttachmentDraft(attachment: MobileDraftAttachment): ProjectAttachment {
  return {
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    byteSize: attachment.byteSize,
    storageKey: attachment.localUri,
    caption: attachment.caption
  };
}
