"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ProfilePageLayout from "../../components/ProfilePageLayout";
import { getPublicProfile, type PublicProfile } from "../../lib/users-api";

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export default function PublicUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPublicProfile(id)
      .then((response) => { if (!cancelled) setProfile(response.profile); })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load this profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <ProfilePageLayout><div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading profile…</div></ProfilePageLayout>;
  if (error || !profile) return <ProfilePageLayout><section className="rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-semibold text-slate-950">Profile unavailable</h1><p className="mt-2 text-sm text-slate-600">{error || "This profile could not be found."}</p><Link href="/" className="mt-4 inline-flex text-sm font-medium text-teal-900 underline">Back to feed</Link></section></ProfilePageLayout>;

  const initial = profile.username.trim().charAt(0).toUpperCase() || "U";
  const stats = [
    ["Published Reports", profile.stats.published],
    ["Disputes", profile.stats.disputes],
    ["Declined", profile.stats.declined],
    ["Evidences", profile.stats.evidences],
  ] as const;

  return (
    <ProfilePageLayout>
    <div className="mx-auto max-w-5xl space-y-8">
      <section aria-label="Profile activity" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl font-bold text-teal-950 ring-1 ring-inset ring-teal-100">{initial}</div>
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">Profile</p><p className="mt-1 truncate text-xl font-semibold text-slate-950">@{profile.username}</p></div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-5">
          {stats.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{value}</dd></div>)}
        </dl>
      </section>

      <section aria-label="Reports">
        {profile.reports.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">No published reports yet.</div> : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {profile.reports.map((report) => <Link key={report.id} href={`/reports/${report.id}`} className="flex flex-col gap-2 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900">{report.title}</h3><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span>{report.category_name ?? "Uncategorized"}</span><span aria-hidden="true">·</span><span>{report.platform && report.social_account_username ? `${report.platform} · @${report.social_account_username}` : report.incident_type === "OFFLINE" ? "Offline incident" : `Online · ${report.incident_platform}`}</span><span aria-hidden="true">·</span><span>{formatDate(report.published_at ?? report.created_at)}</span></p></div><span className="w-fit shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900">{report.public_report_category_code}-{String(report.public_report_number).padStart(5, "0")}</span></Link>)}
          </div>
        )}
      </section>
    </div>
    </ProfilePageLayout>
  );
}
