"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReports, reportStatusLabel, type ApiReport } from "../lib/reports-api";
import { getDisputes, getEvidence, type Dispute, type EvidenceFile } from "../lib/reports";
import { getNotifications, type Notification } from "../lib/notifications";

export default function DashboardPage() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    void getReports({ limit: 100 })
      .then((response) => setReports(response.reports))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));

    setDisputes(getDisputes());
    setEvidence(getEvidence());
    setNotifications(getNotifications());
  }, []);

  const openDisputes = disputes.filter((dispute) => dispute.status === "Open");
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const recentReports = reports.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">Track your reports, verification progress, and disputes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/reports" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
          <p className="text-sm font-medium text-slate-500">My reports</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{loadingReports ? "…" : reports.length}</p>
          <p className="mt-2 text-xs text-slate-400">Total reports</p>
        </Link>
        <Link href="/evidence" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
          <p className="text-sm font-medium text-slate-500">Evidence</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{evidence.length}</p>
          <p className="mt-2 text-xs text-slate-400">Files across reports</p>
        </Link>
        <Link href="/disputes" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending disputes</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{openDisputes.length}</p>
          <p className="mt-2 text-xs text-slate-400">Currently open</p>
        </Link>
        <Link href="/notifications" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
          <p className="text-sm font-medium text-slate-500">Notifications</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{unreadNotifications}</p>
          <p className="mt-2 text-xs text-slate-400">
            {unreadNotifications === 1 ? "1 unread notification" : unreadNotifications + " unread notifications"}
          </p>
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recent reports</h2>
            <p className="mt-1 text-sm text-slate-500">Your most recently created reports.</p>
          </div>
          <Link href="/reports" className="text-sm font-medium text-slate-700 hover:text-slate-950">View all</Link>
        </div>

        {loadingReports ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Loading reports...</div>
        ) : recentReports.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No reports yet.</div>
        ) : (
          <div className="mt-6 divide-y divide-slate-100">
            {recentReports.map((report) => (
              <Link key={report.id} href={"/reports/" + report.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{report.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {report.category?.name ?? "Uncategorized"} · {report.social_account?.platform} · @{report.social_account?.username}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {reportStatusLabel(report.status, report.verification_status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
        <div className="mt-5 space-y-3">
          <Link href="/reports" className="block rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-slate-800">Create a report</Link>
          <Link href="/disputes" className="block rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">View disputes</Link>
          <Link href="/evidence" className="block rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Manage evidence</Link>
        </div>
      </section>
    </div>
  );
}
