"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getNotifications } from "../lib/notifications";

export default function NotificationLink() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const notifications = getNotifications();

    setUnreadCount(
      notifications.filter(
        (notification) => !notification.read
      ).length
    );
  }, []);

  return (
    <Link
      href="/notifications"
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
    >
      Notifications
      {unreadCount > 0 && (
        <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
