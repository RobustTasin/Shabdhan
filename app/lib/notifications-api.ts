import { apiFetch } from "./api";
import { getToken } from "./auth";

export type ApiNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export async function getNotifications() {
  return apiFetch<{
    status: string;
    count: number;
    notifications: ApiNotification[];
  }>("/notifications", {
    token: getToken() ?? undefined,
  });
}

export async function getUnreadNotificationCount() {
  return apiFetch<{
    status: string;
    unread_count: number;
  }>("/notifications/unread-count", {
    token: getToken() ?? undefined,
  });
}

export async function markNotificationAsRead(id: string) {
  return apiFetch<{
    status: string;
    message: string;
    notification: ApiNotification;
  }>(`/notifications/${id}/read`, {
    method: "PATCH",
    token: getToken() ?? undefined,
  });
}

export async function markAllNotificationsAsRead() {
  return apiFetch<{
    status: string;
    message: string;
    updated_count: number;
  }>("/notifications/read-all", {
    method: "PATCH",
    token: getToken() ?? undefined,
  });
}
