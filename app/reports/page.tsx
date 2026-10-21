"use client";

import Link from "next/link";
import { useAuth } from "../components/AuthProvider";
import { useCallback, useEffect, useState } from "react";
import {
  getModerationReports,
  getReports,
  searchReports,
  reportStatusLabel,
  type ApiReport,
} from "../lib/reports-api";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const role = user?.role;
  const isLoggedIn = Boolean(user);
  const isModerator = role === "MODERATOR" || role === "ADMIN";
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const reportsRequest = user
        ? role === "MODERATOR" || role === "ADMIN"
          ? getModerationReports({ limit: 100 })
          : getReports({ limit: 100 })
        : searchReports({ limit: 100 });

      const rr = await reportsRequest;
      setReports(rr.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, loadData]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Shabdhan</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-2 text-sm text-slate-600">{isModerator ? "Review and manage reports submitted by all users." : isLoggedIn ? "Create and manage your reports, or browse public reports." : "Browse public reports. Sign in only when you want to create a report."}</p>
          </div>
          {isLoggedIn ? (
            <Link href="/create-report" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              + Create report
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(`/create-report${typeof window !== "undefined" ? window.location.search : ""}`)}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Sign in to create a report
            </Link>
          )}
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <section className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold">{isModerator ? "All reports" : isLoggedIn ? "My reports" : "Public reports"}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? "Loading..." : reports.length + " report" + (reports.length === 1 ? "" : "s")}
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-700">No reports yet</p>
                <p className="mt-1 text-sm text-slate-500">{isModerator ? "No reports have been submitted yet." : "Create your first report to get started."}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <Link key={report.id} href={"/reports/" + report.id} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{report.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{report.category?.name ?? "Uncategorized"}</span>
                        {isModerator && report.reporter?.username && <><span>•</span><span>Reporter: @{report.reporter.username}</span></>}
                        {report.social_account?.id && <>
                          <span>•</span>
                          <span>{report.social_account.platform} · @{report.social_account.username}</span>
                        </>}
                        <span>•</span>
                        <span>{report.incident_type === "OFFLINE" ? "Offline incident" : `Online · ${report.incident_platform ?? "Platform not set"}`}</span>
                        <span>•</span>
                        <span>Updated {new Date(report.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {reportStatusLabel(report.status, report.verification_status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
