import { buildAppShellModel } from "../../../packages/auth/src/shared/index.ts";
import type {
  AppShellModel,
  AuthorizationActor,
  NotificationPreview,
  RoleKey
} from "../../../packages/types/src/index.ts";

export const PORTAL_ROLES = ["applicant", "customer", "subcontractor", "supercontractor"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

type PortalActorVariant = "default" | "other";

function notification(id: string, title: string, body: string, timestampLabel: string): NotificationPreview {
  return {
    id,
    title,
    body,
    tone: "info",
    timestampLabel
  };
}

function resolvePortalRole(input: string | undefined): PortalRole {
  return PORTAL_ROLES.find((role) => role === input) ?? "customer";
}

function buildActorRecord(
  role: PortalRole,
  seed: {
    userId: string;
    customerAccountId?: string;
    partnerOrgId?: string;
    assignedProjectIds?: readonly string[];
    managedPartnerOrgIds?: readonly string[];
  }
): AuthorizationActor {
  return {
    userId: seed.userId,
    memberships: [
      {
        id: `membership-${seed.userId}`,
        userId: seed.userId,
        role,
        customerAccountId: seed.customerAccountId,
        partnerOrgId: seed.partnerOrgId,
        active: true
      }
    ],
    assignedProjectIds: seed.assignedProjectIds ?? [],
    managedPartnerOrgIds: seed.managedPartnerOrgIds ?? []
  };
}

export function buildPortalActor(role: PortalRole, variant: PortalActorVariant = "default"): AuthorizationActor {
  if (role === "applicant") {
    return buildActorRecord(role, {
      userId: variant === "other" ? "applicant.other" : "applicant.jules"
    });
  }

  if (role === "customer") {
    return buildActorRecord(role, {
      userId: variant === "other" ? "customer.logistics" : "customer.aria",
      customerAccountId: variant === "other" ? "customer-logistics" : "customer-aria"
    });
  }

  if (role === "subcontractor") {
    return buildActorRecord(role, {
      userId: variant === "other" ? "sub-user-west" : "sub-user-1",
      partnerOrgId: variant === "other" ? "partner-west" : "partner-east",
      assignedProjectIds: variant === "other" ? [] : ["project-demo-1"]
    });
  }

  return buildActorRecord(role, {
    userId: variant === "other" ? "super-user-west" : "super-user-1",
    partnerOrgId: variant === "other" ? "partner-west" : "partner-east",
    managedPartnerOrgIds: variant === "other" ? ["partner-west"] : ["partner-east"]
  });
}

export function getPortalActor(role = resolvePortalRole(process.env.PORTAL_DEMO_ROLE)): AuthorizationActor {
  return buildPortalActor(role);
}

export function getOtherPortalActor(role: PortalRole): AuthorizationActor {
  return buildPortalActor(role, "other");
}

export function getPortalPrimaryRole(actor = getPortalActor()): PortalRole {
  return resolvePortalRole(actor.memberships[0]?.role);
}

function roleNotifications(role: RoleKey): readonly NotificationPreview[] {
  if (role === "customer") {
    return [
      notification("portal-customer-1", "Invoice ready", "Milestone billing is available for secure review and payment.", "Now"),
      notification("portal-customer-2", "Change order pending", "A submitted change order is waiting for customer approval.", "1 hr ago")
    ];
  }

  if (role === "applicant") {
    return [
      notification("portal-applicant-1", "Application received", "Your hiring application is available in the applicant portal.", "Now"),
      notification("portal-applicant-2", "Interview updates", "Interview scheduling and offer status appear here when they change.", "45 min ago")
    ];
  }

  if (role === "subcontractor") {
    return [
      notification("portal-sub-1", "Crew coordination", "An assigned project thread has new coordination notes.", "Now"),
      notification("portal-sub-2", "Document update", "A partner-visible progress file was published to your workspace.", "45 min ago")
    ];
  }

  return [
    notification("portal-super-1", "Partner oversight", "A managed project thread requires sequencing review.", "Now"),
    notification("portal-super-2", "Shared workspace", "Partner-visible documents remain available across your managed scope.", "2 hr ago")
  ];
}

export function getPortalShellModel(actor = getPortalActor()): AppShellModel {
  const model = buildAppShellModel("portal", actor);
  const role = getPortalPrimaryRole(actor);

  return {
    ...model,
    notifications: roleNotifications(role)
  };
}
