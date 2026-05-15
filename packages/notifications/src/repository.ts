import type {
  WorkflowNotificationRecord,
  WorkflowNotificationRepository
} from "../../types/src/index.ts";

export class InMemoryWorkflowNotificationRepository implements WorkflowNotificationRepository {
  private readonly notifications = new Map<string, WorkflowNotificationRecord>();
  private readonly notificationsByDedupeKey = new Map<string, string>();

  constructor(seed?: { notifications?: readonly WorkflowNotificationRecord[] }) {
    seed?.notifications?.forEach((notification) => {
      this.notifications.set(notification.id, notification);

      if (notification.dedupeKey) {
        this.notificationsByDedupeKey.set(notification.dedupeKey, notification.id);
      }
    });
  }

  createNotification(notification: WorkflowNotificationRecord): void {
    this.notifications.set(notification.id, notification);

    if (notification.dedupeKey) {
      this.notificationsByDedupeKey.set(notification.dedupeKey, notification.id);
    }
  }

  updateNotification(notification: WorkflowNotificationRecord): void {
    this.notifications.set(notification.id, notification);

    if (notification.dedupeKey) {
      this.notificationsByDedupeKey.set(notification.dedupeKey, notification.id);
    }
  }

  getNotificationById(notificationId: string): WorkflowNotificationRecord | undefined {
    return this.notifications.get(notificationId);
  }

  findNotificationByDedupeKey(dedupeKey: string): WorkflowNotificationRecord | undefined {
    const notificationId = this.notificationsByDedupeKey.get(dedupeKey);
    return notificationId ? this.notifications.get(notificationId) : undefined;
  }

  listNotifications(): readonly WorkflowNotificationRecord[] {
    return [...this.notifications.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}

