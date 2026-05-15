import { getIntakeRuntime } from "../../crm/src/index.ts";
import { getPaymentsRuntime } from "../../payments/src/runtime.ts";
import {
  getInvoiceDetailForActor,
  listVisibleInvoicesForActor,
  startInvoiceCheckoutSessionForActor
} from "../../payments/src/mobile.ts";
import {
  clockInServer,
  clockOutServer,
  endBreakServer,
  getActiveClockSessionForActor,
  getPayrollRuntime,
  listReviewQueueForActor,
  startBreakServer
} from "../../payroll/src/index.ts";
import { getProjectsRuntime } from "../../projects/src/runtime.ts";
import {
  getProjectDetailForActor,
  listVisibleProjectsForActor,
  publishProjectProgressUpdateForActor
} from "../../projects/src/mobile.ts";
import type {
  ActiveClockSession,
  AuthorizationActor,
  MobileClockActionInput,
  MobileHomeAction,
  MobileHomeCard,
  MobileHomeModel,
  MobileInvoicePaymentResult,
  MobileProjectProgressSubmissionInput,
  MobilePushRegistration,
  MobileSession,
  MobileSignInInput,
  MobileSupportedRole,
  MobileWorkspaceSnapshot,
  NotificationPreview,
  ProjectDetail,
  ProjectRecord,
  PublicProjectRequestSubmissionInput,
  RoleKey
} from "../../types/src/index.ts";
import { toProjectAttachmentDraft } from "../../types/src/index.ts";

interface DemoMobileUserRecord {
  userId: string;
  displayName: string;
  email: string;
  identifier: string;
  passcode: string;
  role: MobileSupportedRole;
  actor: AuthorizationActor;
  organizationId?: string | null;
  customerAccountId?: string | null;
  partnerOrgId?: string | null;
}

interface MobileApiRuntime {
  sessions: Map<string, MobileSession>;
  pushRegistrations: Map<string, MobilePushRegistration>;
  counter: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function addHours(timestamp: string, hours: number): string {
  return new Date(Date.parse(timestamp) + hours * 60 * 60 * 1000).toISOString();
}

function organizationIdForActor(actor: AuthorizationActor): string {
  return actor.memberships.find((membership) => membership.orgId)?.orgId ?? "org-hq";
}

function customerAccountIdForActor(actor: AuthorizationActor): string | null {
  return actor.memberships.find((membership) => membership.customerAccountId)?.customerAccountId ?? null;
}

function partnerOrgIdForActor(actor: AuthorizationActor): string | null {
  return actor.memberships.find((membership) => membership.partnerOrgId)?.partnerOrgId ?? null;
}

function notification(
  id: string,
  title: string,
  body: string,
  tone: NotificationPreview["tone"],
  timestampLabel: string
): NotificationPreview {
  return {
    id,
    title,
    body,
    tone,
    timestampLabel
  };
}

function action(id: string, label: string, route: MobileHomeAction["route"], description: string): MobileHomeAction {
  return {
    id,
    label,
    route,
    description
  };
}

function card(
  id: string,
  title: string,
  value: string,
  description: string,
  tone: MobileHomeCard["tone"],
  nextAction?: MobileHomeAction
): MobileHomeCard {
  return {
    id,
    title,
    value,
    description,
    tone,
    action: nextAction
  };
}

function formatCurrency(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function nextRuntimeId(runtime: MobileApiRuntime, prefix: string): string {
  runtime.counter += 1;
  return `${prefix}_${runtime.counter}`;
}

function buildDemoUsers(): readonly DemoMobileUserRecord[] {
  const employeeActor: AuthorizationActor = {
    userId: "employee-mobile",
    memberships: [
      {
        id: "membership-mobile-employee",
        userId: "employee-mobile",
        role: "employee",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"]
  };
  const customerActor: AuthorizationActor = {
    userId: "customer.aria",
    memberships: [
      {
        id: "membership-mobile-customer",
        userId: "customer.aria",
        role: "customer",
        customerAccountId: "customer-aria",
        active: true
      }
    ]
  };
  const subcontractorActor: AuthorizationActor = {
    userId: "sub-user-1",
    memberships: [
      {
        id: "membership-mobile-subcontractor",
        userId: "sub-user-1",
        role: "subcontractor",
        partnerOrgId: "partner-east",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"]
  };
  const administratorActor: AuthorizationActor = {
    userId: "admin.mobile",
    memberships: [
      {
        id: "membership-mobile-admin",
        userId: "admin.mobile",
        role: "administrator",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"],
    managedPartnerOrgIds: ["partner-east"]
  };
  const ownerActor: AuthorizationActor = {
    userId: "alex.owner",
    memberships: [
      {
        id: "membership-mobile-owner",
        userId: "alex.owner",
        role: "owner",
        orgId: "org-hq",
        active: true
      }
    ],
    assignedProjectIds: ["project-demo-1"],
    managedPartnerOrgIds: ["partner-east"]
  };

  return [
    {
      userId: employeeActor.userId,
      displayName: "Avery Field",
      email: "employee@bms.local",
      identifier: "employee@bms.local",
      passcode: "111111",
      role: "employee",
      actor: employeeActor,
      organizationId: organizationIdForActor(employeeActor)
    },
    {
      userId: customerActor.userId,
      displayName: "Aria Customer",
      email: "customer@bms.local",
      identifier: "customer@bms.local",
      passcode: "222222",
      role: "customer",
      actor: customerActor,
      customerAccountId: customerAccountIdForActor(customerActor)
    },
    {
      userId: subcontractorActor.userId,
      displayName: "Sam Crew Lead",
      email: "subcontractor@bms.local",
      identifier: "subcontractor@bms.local",
      passcode: "333333",
      role: "subcontractor",
      actor: subcontractorActor,
      partnerOrgId: partnerOrgIdForActor(subcontractorActor)
    },
    {
      userId: administratorActor.userId,
      displayName: "Morgan Admin",
      email: "administrator@bms.local",
      identifier: "administrator@bms.local",
      passcode: "444444",
      role: "administrator",
      actor: administratorActor,
      organizationId: organizationIdForActor(administratorActor)
    },
    {
      userId: ownerActor.userId,
      displayName: "Alex Owner",
      email: "owner@bms.local",
      identifier: "owner@bms.local",
      passcode: "555555",
      role: "owner",
      actor: ownerActor,
      organizationId: organizationIdForActor(ownerActor)
    }
  ] as const;
}

async function buildNotifications(session: MobileSession): Promise<readonly NotificationPreview[]> {
  const projectsRuntime = getProjectsRuntime();
  const projects = await listVisibleProjectsForActor(projectsRuntime, session.actor);
  const latestProject = projects[0];
  const notifications: NotificationPreview[] = [];

  if (latestProject) {
    const latestProjectDetail = await getProjectDetailForActor(projectsRuntime, session.actor, latestProject.id);
    const latestUpdate = latestProjectDetail?.progressUpdates[0];

    if (latestUpdate) {
      notifications.push(
        notification(
          `project-${latestUpdate.id}`,
          "Project update posted",
          `${latestProject.name}: ${latestUpdate.note}`,
          "info",
          latestUpdate.createdAt.slice(5, 16).replace("T", " ")
        )
      );
    }
  }

  if (session.user.role === "customer") {
    const paymentsRuntime = getPaymentsRuntime();
    const invoices = await listVisibleInvoicesForActor(paymentsRuntime, session.actor);
    const dueInvoice = invoices.find((invoice) => invoice.balanceDueCents > 0);

    if (dueInvoice) {
      notifications.push(
        notification(
          `invoice-${dueInvoice.id}`,
          "Payment ready",
          `${dueInvoice.invoiceNumber} has ${formatCurrency(dueInvoice.balanceDueCents)} outstanding.`,
          dueInvoice.status === "overdue" ? "warning" : "success",
          dueInvoice.dueAt
        )
      );
    }
  }

  if (session.user.role === "employee") {
    const activeClock = getActiveClockSessionForActor(getPayrollRuntime(), session.actor);
    notifications.push(
      notification(
        "clock-status",
        activeClock ? "Clock running" : "Ready to clock in",
        activeClock
          ? `${activeClock.projectId ?? "General work"} has ${activeClock.workedMinutesSoFar} minutes logged so far.`
          : "Open the clock screen before starting field work.",
        activeClock ? "success" : "info",
        "Now"
      )
    );
  }

  if (session.user.role === "administrator" || session.user.role === "owner") {
    const intake = getIntakeRuntime();
    const newLeadCount = intake.service.listLeadPipelineStages().find((stage) => stage.status === "new")?.requestCount ?? 0;
    const reviewQueueCount = (await listReviewQueueForActor(getPayrollRuntime(), session.actor)).length;

    notifications.push(
      notification(
        "ops-review",
        "Field queues",
        `${newLeadCount} new intake requests and ${reviewQueueCount} submitted timesheets need review.`,
        "warning",
        "Now"
      )
    );
  }

  return notifications.slice(0, 4);
}

async function buildHomeModel(session: MobileSession): Promise<MobileHomeModel> {
  const projectsRuntime = getProjectsRuntime();
  const projects = await listVisibleProjectsForActor(projectsRuntime, session.actor);
  const notifications = await buildNotifications(session);
  const commonProjectsAction = action("projects", "Projects", "projects", "Open field-friendly project workspaces.");
  const notificationAction = action("notifications", "Alerts", "notifications", "Review the mobile notification feed.");
  const limitedActions = [commonProjectsAction, notificationAction];

  if (session.user.role === "employee") {
    const activeClock = getActiveClockSessionForActor(getPayrollRuntime(), session.actor);
    return {
      role: session.user.role,
      title: "Field work first",
      subtitle: "Projects, clock, uploads, and alerts stay one tap away.",
      cards: [
        card("assigned-projects", "Assigned projects", String(projects.length), "Only assigned field work is published here.", "primary", commonProjectsAction),
        card(
          "clock-status",
          "Clock status",
          activeClock ? "Running" : "Ready",
          activeClock ? `${activeClock.workedMinutesSoFar} minutes on the current session.` : "Clock in before work starts.",
          "accent",
          action("clock", "Clock", "clock", "Open the time clock.")
        ),
        card("alerts", "Alerts", String(notifications.length), "Project and time prompts that matter in the field.", "neutral", notificationAction)
      ],
      actions: [
        commonProjectsAction,
        action("clock", "Clock", "clock", "Clock in, break, and clock out."),
        notificationAction
      ],
      notifications
    };
  }

  if (session.user.role === "subcontractor") {
    return {
      role: session.user.role,
      title: "Crew coordination",
      subtitle: "Assigned work, progress notes, and shared field updates only.",
      cards: [
        card("partner-projects", "Assigned work", String(projects.length), "Partner workspaces are filtered before they reach mobile.", "primary", commonProjectsAction),
        card("upload-ready", "Upload ready", "Yes", "Progress notes and photo attachments stay draftable offline.", "accent", commonProjectsAction),
        card("alerts", "Alerts", String(notifications.length), "Crew coordination and document alerts only.", "neutral", notificationAction)
      ],
      actions: [commonProjectsAction, notificationAction],
      notifications
    };
  }

  if (session.user.role === "customer") {
    const paymentsRuntime = getPaymentsRuntime();
    const invoices = await listVisibleInvoicesForActor(paymentsRuntime, session.actor);
    const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDueCents, 0);

    return {
      role: session.user.role,
      title: "Customer workspace",
      subtitle: "Projects, requests, invoices, and updates stay lighter than the portal web app.",
      cards: [
        card("customer-projects", "Visible projects", String(projects.length), "Only projects linked to your account appear here.", "primary", commonProjectsAction),
        card("invoice-balance", "Outstanding", formatCurrency(outstanding), "Customer payment flow is available from mobile.", "accent", action("invoices", "Invoices", "invoices", "Review invoices and start payment.")),
        card("request-flow", "New request", "Ready", "Submit a new project request without leaving mobile.", "neutral", action("request", "Request", "request", "Open the request form."))
      ],
      actions: [
        commonProjectsAction,
        action("invoices", "Invoices", "invoices", "Review invoices and pay."),
        action("request", "Request", "request", "Submit a new project request."),
        notificationAction
      ],
      notifications
    };
  }

  const intake = getIntakeRuntime();
  const newLeadCount = intake.service.listLeadPipelineStages().find((stage) => stage.status === "new")?.requestCount ?? 0;

  return {
    role: session.user.role,
    title: session.user.role === "owner" ? "Mobile leadership pulse" : "Mobile admin pulse",
    subtitle: "This surface is intentionally narrower than the dashboard and focuses on field visibility only.",
    cards: [
      card("projects", "Projects in motion", String(projects.length), "Project visibility only, not full project administration.", "primary", commonProjectsAction),
      card("intake-queue", "New intake", String(newLeadCount), "High-signal queue counts without full CRM management.", "accent", notificationAction),
      card("alerts", "Alerts", String(notifications.length), "Operational prompts and field exceptions.", "neutral", notificationAction)
    ],
    actions: limitedActions,
    notifications
  };
}

export class BmsMobileApiClient {
  private readonly demoUsers = buildDemoUsers();
  private readonly runtime: MobileApiRuntime = {
    sessions: new Map<string, MobileSession>(),
    pushRegistrations: new Map<string, MobilePushRegistration>(),
    counter: 0
  };
  private readonly now: () => Date;

  constructor(options?: { now?: () => Date }) {
    this.now = options?.now ?? (() => new Date());
  }

  private getDemoUser(input: MobileSignInInput): DemoMobileUserRecord | undefined {
    const identifier = input.identifier.trim().toLowerCase();
    return this.demoUsers.find((user) => user.identifier === identifier && user.passcode === input.passcode);
  }

  private requireSession(accessToken: string): MobileSession {
    const session = this.runtime.sessions.get(accessToken);

    if (!session) {
      throw new Error("Mobile session was not found.");
    }

    if (this.now() > new Date(session.expiresAt)) {
      this.runtime.sessions.delete(accessToken);
      throw new Error("Mobile session expired.");
    }

    return session;
  }

  async signIn(input: MobileSignInInput): Promise<MobileSession> {
    const user = this.getDemoUser(input);

    if (!user) {
      throw new Error("Invalid mobile credentials.");
    }

    const issuedAt = this.now().toISOString();
    const accessToken = nextRuntimeId(this.runtime, "mobile_token");
    const session: MobileSession = {
      id: nextRuntimeId(this.runtime, "session"),
      accessToken,
      issuedAt,
      expiresAt: addHours(issuedAt, SESSION_TTL_MS / (60 * 60 * 1000)),
      actor: user.actor,
      user: {
        userId: user.userId,
        displayName: user.displayName,
        role: user.role,
        email: user.email,
        organizationId: user.organizationId,
        customerAccountId: user.customerAccountId,
        partnerOrgId: user.partnerOrgId
      }
    };

    this.runtime.sessions.set(accessToken, session);
    return session;
  }

  async restoreSession(accessToken: string): Promise<MobileSession | undefined> {
    try {
      return this.requireSession(accessToken);
    } catch {
      return undefined;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    this.runtime.sessions.delete(accessToken);
  }

  async getHomeModel(session: MobileSession): Promise<MobileHomeModel> {
    this.requireSession(session.accessToken);
    return buildHomeModel(session);
  }

  async getWorkspaceSnapshot(session: MobileSession): Promise<MobileWorkspaceSnapshot> {
    this.requireSession(session.accessToken);
    return {
      home: await this.getHomeModel(session),
      projects: await this.listProjects(session),
      activeClockSession: this.getActiveClockSession(session)
    };
  }

  async listProjects(session: MobileSession): Promise<readonly ProjectRecord[]> {
    this.requireSession(session.accessToken);
    return listVisibleProjectsForActor(getProjectsRuntime(), session.actor);
  }

  async getProjectDetail(session: MobileSession, projectId: string): Promise<ProjectDetail | undefined> {
    this.requireSession(session.accessToken);
    return getProjectDetailForActor(getProjectsRuntime(), session.actor, projectId);
  }

  async submitProjectProgress(
    session: MobileSession,
    input: MobileProjectProgressSubmissionInput
  ) {
    this.requireSession(session.accessToken);
    return publishProjectProgressUpdateForActor(getProjectsRuntime(), session.actor, {
      projectId: input.projectId,
      actorUserId: session.user.userId,
      note: input.note,
      visibilityFlags: input.visibilityFlags,
      attachments: input.attachments?.map(toProjectAttachmentDraft)
    });
  }

  getActiveClockSession(session: MobileSession): ActiveClockSession | undefined {
    this.requireSession(session.accessToken);
    return getActiveClockSessionForActor(getPayrollRuntime(), session.actor);
  }

  async clockIn(session: MobileSession, input: MobileClockActionInput) {
    this.requireSession(session.accessToken);

    if (session.user.role !== "employee") {
      throw new Error("Clock actions are limited to employee mobile sessions.");
    }

    return clockInServer(getPayrollRuntime(), session.actor, {
      organizationId: session.user.organizationId ?? "org-hq",
      employeeUserId: session.user.userId,
      actorUserId: session.user.userId,
      occurredAt: input.occurredAt,
      eventSource: input.eventSource ?? "mobile",
      projectId: input.projectId,
      taskId: input.taskId,
      notes: input.notes
    });
  }

  async startBreak(session: MobileSession, input: MobileClockActionInput) {
    this.requireSession(session.accessToken);

    if (session.user.role !== "employee") {
      throw new Error("Break actions are limited to employee mobile sessions.");
    }

    return startBreakServer(getPayrollRuntime(), session.actor, {
      organizationId: session.user.organizationId ?? "org-hq",
      employeeUserId: session.user.userId,
      actorUserId: session.user.userId,
      occurredAt: input.occurredAt,
      eventSource: input.eventSource ?? "mobile",
      projectId: input.projectId,
      taskId: input.taskId,
      notes: input.notes
    });
  }

  async endBreak(session: MobileSession, input: MobileClockActionInput) {
    this.requireSession(session.accessToken);

    if (session.user.role !== "employee") {
      throw new Error("Break actions are limited to employee mobile sessions.");
    }

    return endBreakServer(getPayrollRuntime(), session.actor, {
      organizationId: session.user.organizationId ?? "org-hq",
      employeeUserId: session.user.userId,
      actorUserId: session.user.userId,
      occurredAt: input.occurredAt,
      eventSource: input.eventSource ?? "mobile",
      projectId: input.projectId,
      taskId: input.taskId,
      notes: input.notes
    });
  }

  async clockOut(session: MobileSession, input: MobileClockActionInput) {
    this.requireSession(session.accessToken);

    if (session.user.role !== "employee") {
      throw new Error("Clock actions are limited to employee mobile sessions.");
    }

    return clockOutServer(getPayrollRuntime(), session.actor, {
      organizationId: session.user.organizationId ?? "org-hq",
      employeeUserId: session.user.userId,
      actorUserId: session.user.userId,
      occurredAt: input.occurredAt,
      eventSource: input.eventSource ?? "mobile",
      projectId: input.projectId,
      taskId: input.taskId,
      notes: input.notes
    });
  }

  async submitCustomerRequest(
    input: PublicProjectRequestSubmissionInput,
    session?: MobileSession
  ) {
    if (session) {
      this.requireSession(session.accessToken);

      if (session.user.role !== "customer") {
        throw new Error("Customer request submission is limited to customer mobile sessions.");
      }
    }

    return getIntakeRuntime().service.submitPublicProjectRequest(input);
  }

  async listInvoices(session: MobileSession) {
    this.requireSession(session.accessToken);
    return listVisibleInvoicesForActor(getPaymentsRuntime(), session.actor);
  }

  async getInvoiceDetail(session: MobileSession, invoiceId: string) {
    this.requireSession(session.accessToken);
    return getInvoiceDetailForActor(getPaymentsRuntime(), session.actor, invoiceId);
  }

  async startInvoicePayment(session: MobileSession, invoiceId: string): Promise<MobileInvoicePaymentResult> {
    this.requireSession(session.accessToken);

    if (session.user.role !== "customer") {
      throw new Error("Mobile invoice payment is limited to customer sessions.");
    }

    return {
      checkoutSession: await startInvoiceCheckoutSessionForActor(getPaymentsRuntime(), session.actor, {
        invoiceId,
        successUrl: "bms://payments/success",
        cancelUrl: "bms://payments/cancel",
        customerEmail: session.user.email
      })
    };
  }

  async listNotifications(session: MobileSession): Promise<readonly NotificationPreview[]> {
    this.requireSession(session.accessToken);
    return buildNotifications(session);
  }

  async registerPushToken(
    session: MobileSession,
    input: {
      token: string;
      platform: MobilePushRegistration["platform"];
      environment: MobilePushRegistration["environment"];
    }
  ): Promise<MobilePushRegistration> {
    this.requireSession(session.accessToken);
    const existing = [...this.runtime.pushRegistrations.values()].find(
      (registration) => registration.userId === session.user.userId && registration.token === input.token
    );
    const timestamp = this.now().toISOString();

    if (existing) {
      const updated: MobilePushRegistration = {
        ...existing,
        platform: input.platform,
        environment: input.environment,
        updatedAt: timestamp
      };
      this.runtime.pushRegistrations.set(updated.id, updated);
      return updated;
    }

    const registration: MobilePushRegistration = {
      id: nextRuntimeId(this.runtime, "push"),
      userId: session.user.userId,
      token: input.token,
      platform: input.platform,
      environment: input.environment,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.runtime.pushRegistrations.set(registration.id, registration);
    return registration;
  }

  async listPushRegistrations(session: MobileSession): Promise<readonly MobilePushRegistration[]> {
    this.requireSession(session.accessToken);
    return [...this.runtime.pushRegistrations.values()].filter((registration) => registration.userId === session.user.userId);
  }

  reset(): void {
    this.runtime.sessions.clear();
    this.runtime.pushRegistrations.clear();
  }
}

export function createBmsMobileApiClient(): BmsMobileApiClient {
  return new BmsMobileApiClient();
}
