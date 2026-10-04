"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type ApiNotification,
} from "../lib/notifications-api";

function notificationHref(notification: ApiNotification) {
  if (!notification.entity_type || !notification.entity_id) {
    return undefined;
  }

  if (notification.entity_type === "report") {
    return `/reports/${notification.entity_id}`;
  }

  if (notification.entity_type === "dispute") {
    return `/disputes/${notification.entity_id}`;
  }

  if (notification.entity_type === "evidence") {
    return `/evidence`;
  }

  return undefined;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getNotifications()
      .then((response) => setNotifications(response.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkAsRead(id: string) {
    try {
      await markNotificationAsRead(id);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );
    } catch {
      // Keep the current UI state if the API request fails.
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at ?? new Date().toISOString(),
        }))
      );
    } catch {
      // Keep the current UI state if the API request fails.
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Notifications
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Updates about your reports, evidence, and disputes.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="w-fit rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Loading notifications...
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No notifications
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You will see updates here when something happens.
          </p>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const href = notificationHref(notification);

              const content = (
                <div
                  className={`flex gap-4 p-5 transition ${
                    notification.is_read
                      ? "bg-white"
                      : "bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.is_read
                        ? "bg-slate-200"
                        : "bg-slate-900"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-sm font-semibold text-slate-950">
                        {notification.title}
                      </h2>

                      <span className="text-xs text-slate-400">
                        {new Date(
                          notification.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {notification.message}
                    </p>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleMarkAsRead(notification.id);
                        }}
                        className="mt-3 text-xs font-medium text-slate-700 hover:text-slate-950 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );

              if (href) {
                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => {
                      if (!notification.is_read) {
                        void handleMarkAsRead(notification.id);
                      }
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={notification.id}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
