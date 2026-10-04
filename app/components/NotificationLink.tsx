"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUnreadNotificationCount } from "../lib/notifications-api";

export default function NotificationLink() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getUnreadNotificationCount()
      .then((response) => {
        if (!cancelled) {
          setUnreadCount(response.unread_count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnreadCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
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
