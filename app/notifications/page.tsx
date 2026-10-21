"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProfilePageLayout from "../components/ProfilePageLayout";
import { useAuth } from "../components/AuthProvider";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, type ApiNotification } from "../lib/notifications-api";

type NotificationFilter = "ALL" | "REPORTS" | "COMMENTS" | "CORROBORATIONS" | "EVIDENCE" | "DISPUTES";
const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "REPORTS", label: "Reports" },
  { id: "COMMENTS", label: "Comments" },
  { id: "CORROBORATIONS", label: "Corroborations" },
  { id: "EVIDENCE", label: "Evidence" },
  { id: "DISPUTES", label: "Disputes" },
];

function matchesFilter(notification: ApiNotification, filter: NotificationFilter) {
  if (filter === "ALL") return true;
  if (filter === "COMMENTS") return notification.type === "REPORT_COMMENTED" || notification.type === "REPORT_COMMENT_REPLY";
  if (filter === "CORROBORATIONS") return notification.type === "REPORT_CORROBORATED";
  if (filter === "EVIDENCE") return notification.type.startsWith("EVIDENCE_");
  if (filter === "DISPUTES") return notification.type.startsWith("DISPUTE_");
  return notification.type.startsWith("REPORT_") && !["REPORT_COMMENTED", "REPORT_COMMENT_REPLY", "REPORT_CORROBORATED"].includes(notification.type);
}

function notificationHref(notification: ApiNotification) {
  if (!notification.entity_type || !notification.entity_id) return undefined;
  if (notification.entity_type === "report") return `/reports/${notification.entity_id}`;
  if (notification.entity_type === "dispute") return `/disputes/${notification.entity_id}`;
  if (notification.entity_type === "evidence") return "/evidence";
  return undefined;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getNotifications()
      .then((response) => { if (!cancelled) setNotifications(response.notifications); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load notifications."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleMarkAsRead(id: string) {
    try {
      await markNotificationAsRead(id);
      setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, is_read: true, read_at: new Date().toISOString() } : notification));
    } catch { /* Keep the current list if the update fails. */ }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true, read_at: notification.read_at ?? new Date().toISOString() })));
    } catch { setError("Could not mark notifications as read. Please try again."); }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const filteredNotifications = useMemo(() => notifications.filter((notification) => matchesFilter(notification, filter)), [notifications, filter]);

  return <ProfilePageLayout><div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-3xl border border-[#dbe7e5] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,37,0.06)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#24716c]">Your updates</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d3837]">Notifications</h1><p className="mt-2 text-sm leading-6 text-[#617573]">Updates about your reports, comments, evidence, and disputes.</p></div>
        {unreadCount > 0 && <button type="button" onClick={() => void handleMarkAllAsRead()} className="w-fit rounded-xl border border-[#cbdedb] px-4 py-2.5 text-sm font-semibold text-[#245c58] transition hover:bg-[#f0f7f6]">Mark all as read</button>}
      </div>
      <div className="mt-6 overflow-x-auto pb-1"><div role="group" aria-label="Filter notifications by type" className="flex min-w-max gap-2">
        {FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item.id ? "bg-[#123d3b] text-white" : "bg-[#edf4f2] text-[#455e5c] hover:bg-[#e0eeec]"}`}>{item.label}</button>)}
      </div></div>
    </section>

    {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <section aria-label="Notification list" className="overflow-hidden rounded-3xl border border-[#dbe7e5] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e3eeec] px-5 py-4 sm:px-7"><div><h2 className="font-semibold text-[#1d3837]">{FILTERS.find((item) => item.id === filter)?.label} notifications</h2><p className="mt-1 text-sm text-[#718481]">{loading ? "Loading…" : `${filteredNotifications.length} ${filteredNotifications.length === 1 ? "notification" : "notifications"}`}</p></div>{user && <Link href="/me" className="text-sm font-semibold text-[#24716c] hover:underline">Me</Link>}</div>
      {loading ? <p className="p-10 text-center text-sm text-[#718481]">Loading notifications…</p> : filteredNotifications.length === 0 ? <div className="px-6 py-14 text-center"><h3 className="font-semibold text-[#1d3837]">{notifications.length ? "No notifications in this category" : "No notifications yet"}</h3><p className="mt-2 text-sm text-[#718481]">{notifications.length ? "Choose another type to see more updates." : "You will see updates here when something happens."}</p></div> : <div className="divide-y divide-[#e3eeec]">
        {filteredNotifications.map((notification) => {
          const href = notificationHref(notification);
          const content = <div className={`flex gap-4 p-5 transition sm:px-7 ${notification.is_read ? "bg-white" : "bg-[#f0f7f6]"}`}><span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? "bg-[#cbd8d6]" : "bg-[#16847d]"}`} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><h3 className="text-sm font-semibold text-[#1d3837]">{notification.title}</h3><time className="shrink-0 text-xs text-[#81918d]">{new Date(notification.created_at).toLocaleString()}</time></div><p className="mt-1 text-sm leading-6 text-[#617573]">{notification.message}</p>{!notification.is_read && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleMarkAsRead(notification.id); }} className="mt-3 text-xs font-semibold text-[#24716c] hover:underline">Mark as read</button>}</div></div>;
          return href ? <Link key={notification.id} href={href} onClick={() => { if (!notification.is_read) void handleMarkAsRead(notification.id); }} className="block hover:bg-[#f8fbfa]">{content}</Link> : <div key={notification.id}>{content}</div>;
        })}
      </div>}
    </section>
  </div></ProfilePageLayout>;
}
