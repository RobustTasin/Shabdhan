"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthProvider";
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, type ApiNotification } from "../lib/notifications-api";

function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function notificationHref(notification: ApiNotification) {
  if (!notification.entity_type || !notification.entity_id) return undefined;
  if (notification.entity_type === "report") return `/reports/${notification.entity_id}`;
  if (notification.entity_type === "dispute") return `/disputes/${notification.entity_id}`;
  if (notification.entity_type === "evidence") return "/evidence";
  return undefined;
}

function NotificationItems({ items, onSelect }: { items: ApiNotification[]; onSelect: (item: ApiNotification) => void }) {
  if (items.length === 0) return <p className="px-4 py-8 text-center text-sm text-[#617573]">No notifications yet.</p>;
  return <div className="divide-y divide-[#e3eeec]">
    {items.map((item) => {
      const href = notificationHref(item);
      const row = <div className={`flex gap-3 px-4 py-4 transition ${item.is_read ? "bg-white" : "bg-[#f0f7f6]"}`}>
        <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? "bg-[#cbd8d6]" : "bg-[#16847d]"}`} />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1d3837]">{item.title}</span><span className="mt-1 block text-sm leading-5 text-[#617573]">{item.message}</span><span className="mt-2 block text-xs text-[#81918d]">{new Date(item.created_at).toLocaleString()}</span></span>
      </div>;
      return href ? <Link key={item.id} href={href} onClick={() => onSelect(item)} className="block hover:bg-[#f8fbfa]">{row}</Link> : <button key={item.id} type="button" onClick={() => onSelect(item)} className="block w-full text-left hover:bg-[#f8fbfa]">{row}</button>;
    })}
  </div>;
}

export default function FeedNotifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getUnreadNotificationCount().then((result) => { if (!cancelled) setUnreadCount(result.unread_count); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void getNotifications().then((result) => { if (!cancelled) setItems(result.notifications.slice(0, 5)); }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load notifications."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const outside = (event: PointerEvent) => { if (window.innerWidth >= 768 && !rootRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    const previousOverflow = document.body.style.overflow;
    if (window.innerWidth < 768) document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); document.body.style.overflow = previousOverflow; };
  }, [open]);

  if (!user) return null;

  async function handleSelect(item: ApiNotification) {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true, read_at: new Date().toISOString() } : entry));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch { /* Keep the preview usable if marking it read fails. */ }
    }
    setOpen(false);
  }

  return <div className="relative" ref={rootRef}>
    <button type="button" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#455e5c] transition hover:bg-[#e7f1ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#32948e]">
      <BellIcon />{unreadCount > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c13e4e] px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>

    {open && typeof document !== "undefined" && createPortal(<section role="dialog" aria-modal="true" aria-label="Notifications" className="fixed inset-0 z-[90] flex flex-col bg-[#f2f6f5] md:hidden">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#dbe7e5] bg-[#fbfdfd] px-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4e817d]">Your updates</p><h2 className="text-lg font-semibold text-[#1d3837]">Notifications</h2></div><button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#455e5c] hover:bg-[#e7f1ef]">×</button></header>
      <div className="flex-1 overflow-y-auto p-4">{loading ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#617573]">Loading notifications…</p> : error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : <div className="overflow-hidden rounded-2xl border border-[#dbe7e5] bg-white"><NotificationItems items={items} onSelect={(item) => void handleSelect(item)} /></div>}
        <Link href="/notifications" onClick={() => setOpen(false)} className="mt-4 block rounded-xl bg-[#123d3b] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#1e615b]">View all notifications</Link>
      </div>
    </section>, document.body)}

    {open && <section role="dialog" aria-label="Notifications" className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] hidden w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#dbe7e5] bg-white shadow-[0_18px_50px_rgba(20,36,26,.18)] md:block">
      <header className="flex items-center justify-between border-b border-[#e3eeec] px-4 py-4"><div><h2 className="text-base font-semibold text-[#1d3837]">Notifications</h2><p className="mt-0.5 text-xs text-[#718481]">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p></div><Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#24716c] hover:underline">View all</Link></header>
      <div className="max-h-[min(65vh,28rem)] overflow-y-auto">{loading ? <p className="p-8 text-center text-sm text-[#617573]">Loading notifications…</p> : error ? <p role="alert" className="m-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : <NotificationItems items={items} onSelect={(item) => void handleSelect(item)} />}</div>
      <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-[#e3eeec] px-4 py-3 text-center text-sm font-semibold text-[#24716c] hover:bg-[#f0f7f6]">View all notifications</Link>
    </section>}
  </div>;
}
