import { authorize, authorizeOrThrow } from "../../../packages/auth/src/server/index.ts";
import type {
  AuthorizationActor,
  PortalMessageRecord,
  PortalMessageThreadRecord,
  ResourceRecord
} from "../../../packages/types/src/index.ts";
import { getPortalActor } from "./shell-data.ts";

const MESSAGE_THREADS: readonly PortalMessageThreadRecord[] = [
  {
    id: "thread-customer-1",
    organizationId: "org-hq",
    projectId: "project-demo-1",
    customerAccountId: "customer-aria",
    partnerOrgIds: [],
    subject: "Milestone walkthrough scheduling",
    status: "open",
    visibilityFlags: ["customer"],
    createdByUserId: "alex.owner",
    createdAt: "2026-04-27T10:00:00.000Z",
    updatedAt: "2026-04-28T08:30:00.000Z"
  },
  {
    id: "thread-customer-2",
    organizationId: "org-hq",
    customerAccountId: "customer-logistics",
    partnerOrgIds: [],
    subject: "Warehouse planning handoff",
    status: "open",
    visibilityFlags: ["customer"],
    createdByUserId: "alex.owner",
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-04-25T12:00:00.000Z"
  },
  {
    id: "thread-partner-east-1",
    organizationId: "org-hq",
    projectId: "project-demo-1",
    partnerOrgIds: ["partner-east"],
    subject: "Electrical rough-in coordination",
    status: "open",
    visibilityFlags: ["subcontractor", "supercontractor"],
    createdByUserId: "employee-1",
    createdAt: "2026-04-27T11:00:00.000Z",
    updatedAt: "2026-04-28T09:00:00.000Z"
  },
  {
    id: "thread-partner-east-2",
    organizationId: "org-hq",
    projectId: "project-demo-1",
    partnerOrgIds: ["partner-east"],
    subject: "Crew sequencing review",
    status: "open",
    visibilityFlags: ["supercontractor"],
    createdByUserId: "employee-1",
    createdAt: "2026-04-27T13:00:00.000Z",
    updatedAt: "2026-04-28T07:45:00.000Z"
  },
  {
    id: "thread-partner-west-1",
    organizationId: "org-hq",
    partnerOrgIds: ["partner-west"],
    subject: "West division mobilization",
    status: "open",
    visibilityFlags: ["subcontractor", "supercontractor"],
    createdByUserId: "employee-2",
    createdAt: "2026-04-26T08:30:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z"
  }
] as const;

const MESSAGE_RECORDS: readonly PortalMessageRecord[] = [
  {
    id: "message-customer-1",
    threadId: "thread-customer-1",
    senderUserId: "alex.owner",
    senderRole: "administrator",
    body: "We can walk the milestone items with you on Thursday morning if that works.",
    visibilityFlags: ["customer"],
    createdAt: "2026-04-27T10:05:00.000Z"
  },
  {
    id: "message-customer-2",
    threadId: "thread-customer-1",
    senderUserId: "customer.aria",
    senderRole: "customer",
    body: "Thursday morning works. Please include the updated change-order numbers.",
    visibilityFlags: ["customer"],
    createdAt: "2026-04-28T08:30:00.000Z"
  },
  {
    id: "message-customer-3",
    threadId: "thread-customer-2",
    senderUserId: "alex.owner",
    senderRole: "administrator",
    body: "Planning documents are ready for your warehouse review.",
    visibilityFlags: ["customer"],
    createdAt: "2026-04-25T12:00:00.000Z"
  },
  {
    id: "message-partner-east-1",
    threadId: "thread-partner-east-1",
    senderUserId: "employee-1",
    senderRole: "employee",
    body: "Electrical rough-in starts at 07:00. Confirm crew arrival and material staging.",
    visibilityFlags: ["subcontractor", "supercontractor"],
    createdAt: "2026-04-27T11:10:00.000Z"
  },
  {
    id: "message-partner-east-2",
    threadId: "thread-partner-east-1",
    senderUserId: "sub-user-1",
    senderRole: "subcontractor",
    body: "Crew confirmed. Material drop is scheduled for 06:30 at the side entrance.",
    visibilityFlags: ["subcontractor", "supercontractor"],
    createdAt: "2026-04-28T09:00:00.000Z"
  },
  {
    id: "message-partner-east-3",
    threadId: "thread-partner-east-2",
    senderUserId: "employee-1",
    senderRole: "employee",
    body: "Need supercontractor review on sequence changes before dispatching tomorrow's crews.",
    visibilityFlags: ["supercontractor"],
    createdAt: "2026-04-28T07:45:00.000Z"
  },
  {
    id: "message-partner-west-1",
    threadId: "thread-partner-west-1",
    senderUserId: "employee-2",
    senderRole: "employee",
    body: "West division permit set is ready for pickup.",
    visibilityFlags: ["subcontractor", "supercontractor"],
    createdAt: "2026-04-26T10:00:00.000Z"
  }
] as const;

class PortalMessagingStore {
  private readonly threads = new Map<string, PortalMessageThreadRecord>();
  private readonly messages = new Map<string, PortalMessageRecord[]>();
  private counter = 0;

  constructor() {
    for (const thread of MESSAGE_THREADS) {
      this.threads.set(thread.id, thread);
    }

    for (const message of MESSAGE_RECORDS) {
      const current = this.messages.get(message.threadId) ?? [];
      this.messages.set(message.threadId, [...current, message]);
    }
  }

  listThreads(): readonly PortalMessageThreadRecord[] {
    return [...this.threads.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getThreadById(threadId: string): PortalMessageThreadRecord | undefined {
    return this.threads.get(threadId);
  }

  listMessagesByThreadId(threadId: string): readonly PortalMessageRecord[] {
    return [...(this.messages.get(threadId) ?? [])].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createMessage(input: {
    threadId: string;
    senderUserId: string;
    senderRole: PortalMessageRecord["senderRole"];
    body: string;
    visibilityFlags: PortalMessageRecord["visibilityFlags"];
    createdAt: string;
  }): PortalMessageRecord {
    this.counter += 1;

    const message: PortalMessageRecord = {
      id: `message-runtime-${this.counter}`,
      threadId: input.threadId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      body: input.body,
      visibilityFlags: input.visibilityFlags,
      createdAt: input.createdAt
    };
    const current = this.messages.get(input.threadId) ?? [];
    this.messages.set(input.threadId, [...current, message]);

    const thread = this.threads.get(input.threadId);

    if (thread) {
      this.threads.set(input.threadId, {
        ...thread,
        updatedAt: input.createdAt
      });
    }

    return message;
  }
}

export interface PortalMessagingRuntime {
  store: PortalMessagingStore;
}

function toThreadResourceRecord(thread: PortalMessageThreadRecord): ResourceRecord {
  return {
    resourceType: "message_thread",
    resourceId: thread.id,
    orgId: thread.organizationId,
    customerAccountId: thread.customerAccountId ?? null,
    partnerOrgId: thread.partnerOrgIds[0] ?? null,
    partnerOrgIds: thread.partnerOrgIds,
    assignedProjectId: thread.projectId ?? null,
    visibility: thread.visibilityFlags
  };
}

function nowIso(): string {
  return new Date("2026-04-28T16:45:00.000Z").toISOString();
}

function requireThread(runtime: PortalMessagingRuntime, threadId: string): PortalMessageThreadRecord {
  const thread = runtime.store.getThreadById(threadId);

  if (!thread) {
    throw new Error(`Message thread ${threadId} was not found.`);
  }

  return thread;
}

async function authorizeThread(
  actor: AuthorizationActor | undefined,
  permissionKey: "message.view.self" | "message.reply.self",
  thread: PortalMessageThreadRecord
) {
  return authorizeOrThrow({
    actor,
    permissionKey,
    record: toThreadResourceRecord(thread),
    now: new Date("2026-04-28T16:45:00.000Z")
  });
}

let runtime: PortalMessagingRuntime | undefined;

export function getPortalMessagingRuntime(): PortalMessagingRuntime {
  runtime ??= {
    store: new PortalMessagingStore()
  };

  return runtime;
}

export function resetPortalMessagingRuntime(): PortalMessagingRuntime {
  runtime = {
    store: new PortalMessagingStore()
  };

  return runtime;
}

export async function listPortalMessageThreads(actor: AuthorizationActor = getPortalActor()) {
  const visible: PortalMessageThreadRecord[] = [];
  const runtime = getPortalMessagingRuntime();

  for (const thread of runtime.store.listThreads()) {
    const decision = await authorize({
      actor,
      permissionKey: "message.view.self",
      record: toThreadResourceRecord(thread),
      now: new Date("2026-04-28T16:45:00.000Z")
    });

    if (decision.allowed) {
      visible.push(thread);
    }
  }

  return visible;
}

export async function getPortalMessageThreadDetail(
  threadId: string,
  actor: AuthorizationActor = getPortalActor()
) {
  const runtime = getPortalMessagingRuntime();
  const thread = requireThread(runtime, threadId);

  await authorizeThread(actor, "message.view.self", thread);

  return {
    thread,
    messages: runtime.store.listMessagesByThreadId(threadId)
  };
}

export async function replyToPortalMessageThread(
  input: {
    threadId: string;
    body: string;
  },
  actor: AuthorizationActor = getPortalActor()
) {
  const runtime = getPortalMessagingRuntime();
  const thread = requireThread(runtime, input.threadId);

  await authorizeThread(actor, "message.reply.self", thread);

  const body = input.body.trim();

  if (!body) {
    throw new Error("Message body is required.");
  }

  return runtime.store.createMessage({
    threadId: thread.id,
    senderUserId: actor.userId,
    senderRole: actor.memberships[0]?.role ?? "customer",
    body,
    visibilityFlags: thread.visibilityFlags,
    createdAt: nowIso()
  });
}
