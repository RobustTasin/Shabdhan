export type Notification = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

const NOTIFICATIONS_STORAGE_KEY = "shabdhan-notifications";

export const defaultNotifications: Notification[] = [];

export function getNotifications(): Notification[] {
  if (typeof window === "undefined") {
    return defaultNotifications;
  }

  const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(defaultNotifications)
    );

    return defaultNotifications;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return defaultNotifications;
  }
}

export function saveNotifications(
  notifications: Notification[]
) {
  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(notifications)
  );
}

export function addNotification(
  notification: Omit<Notification, "id" | "read">
) {
  const notifications = getNotifications();

  const newNotification: Notification = {
    ...notification,
    id: Date.now(),
    read: false,
  };

  saveNotifications([
    newNotification,
    ...notifications,
  ]);

  return newNotification;
}

export function markNotificationAsRead(
  notificationId: number
) {
  const notifications = getNotifications();

  saveNotifications(
    notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    )
  );
}

export function markAllNotificationsAsRead() {
  const notifications = getNotifications();

  saveNotifications(
    notifications.map((notification) => ({
      ...notification,
      read: true,
    }))
  );
}
