"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import ProfilePageLayout from "../components/ProfilePageLayout";
import { getMyDisputes } from "../lib/disputes-api";
import { getReports, reportStatusLabel, type ApiReport } from "../lib/reports-api";
import { getPublicProfile, type PublicProfile } from "../lib/users-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function MePage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [profileStats, setProfileStats] = useState<PublicProfile["stats"] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setReportsLoading(false);
      return;
    }

    let cancelled = false;
    void Promise.allSettled([
      getReports({ limit: 100 }),
      getPublicProfile(user.id),
      getMyDisputes(),
    ])
      .then(([reportsResult, profileResult, disputesResult]) => {
        if (cancelled) return;
        if (reportsResult.status === "fulfilled") {
          const ownReports = reportsResult.value.reports;
          setReports(ownReports);
          setProfileStats({
            reports: reportsResult.value.pagination.total,
            published: ownReports.filter((report) => report.status === "PUBLISHED" && report.verification_status === "VERIFIED").length,
            declined: ownReports.filter((report) => report.status === "REJECTED" || report.verification_status === "REJECTED").length,
            disputes: 0,
            evidences: 0,
          });
        } else {
          setError(reportsResult.reason instanceof Error ? reportsResult.reason.message : "Could not load your reports.");
        }
        if (profileResult.status === "fulfilled") setProfileStats(profileResult.value.profile.stats);
        if (disputesResult.status === "fulfilled") {
          setProfileStats((current) => current ? { ...current, disputes: disputesResult.value.disputes.length } : current);
        }
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading) {
    return <ProfilePageLayout><div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading your profile…</div></ProfilePageLayout>;
  }

  if (!user) {
    return (
      <ProfilePageLayout>
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">Me</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to see your profile and reports.</p>
        <Link href="/login?next=%2Fme" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Sign in</Link>
      </section>
      </ProfilePageLayout>
    );
  }

  const initial = user.username.trim().charAt(0).toUpperCase() || "U";

  return (
    <ProfilePageLayout>
    <div className="mx-auto max-w-5xl space-y-10">
      <section aria-label="Profile details" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-bold text-emerald-950 ring-1 ring-inset ring-emerald-100">{initial}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Profile</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">@{user.username}</h2>
              <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
              <Link href={`/users/${user.id}`} className="mt-1 inline-flex text-xs font-medium text-emerald-900 hover:underline">View public profile</Link>
            </div>
          </div>
          <Link href="/reports" className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900">+ Create report</Link>
        </div>
        <dl aria-label="Profile activity statistics" className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-5">
          {([
            ["Published Reports", profileStats?.published],
            ["Disputes", profileStats?.disputes],
            ["Declined", profileStats?.declined],
            ["Evidences", profileStats?.evidences],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="my-reports-heading" className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="my-reports-heading" className="text-2xl font-semibold tracking-tight text-slate-950">Reports &amp; Status</h2>
          </div>
          {!reportsLoading && <span className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{reports.length} {reports.length === 1 ? "report" : "reports"}</span>}
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
        ) : reportsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading your reports…</div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center sm:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-900">S</div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">No reports yet</h3>
            <p className="mt-1 text-sm text-slate-500">When you create a report, it will appear here.</p>
            <Link href="/reports" className="mt-5 inline-flex rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Create your first report</Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {reports.map((report) => (
              <Link key={report.id} href={`/reports/${report.id}`} className="flex flex-col gap-3 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{report.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>{report.category?.name ?? "Uncategorized"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{report.social_account?.platform} · @{report.social_account?.username}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(report.created_at)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                  <span className="text-xs font-medium tabular-nums text-slate-500">{report.public_report_category_code}-{String(report.public_report_number).padStart(5, "0")}</span>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{reportStatusLabel(report.status, report.verification_status)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
    </ProfilePageLayout>
  );
}
