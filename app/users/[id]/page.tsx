"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading profile…</div>;
  if (error || !profile) return <section className="rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-semibold text-slate-950">Profile unavailable</h1><p className="mt-2 text-sm text-slate-600">{error || "This profile could not be found."}</p><Link href="/" className="mt-4 inline-flex text-sm font-medium text-emerald-900 underline">Back to feed</Link></section>;

  const initial = profile.username.trim().charAt(0).toUpperCase() || "U";
  const stats = [
    ["Reports", profile.stats.reports],
    ["Disputes", profile.stats.disputes],
    ["Published", profile.stats.published],
    ["Declined", profile.stats.declined],
    ["Evidences", profile.stats.evidences],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Community profile</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">@{profile.username}</h1>
      </div>

      <section aria-label="Profile activity" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-bold text-emerald-950 ring-1 ring-inset ring-emerald-100">{initial}</div>
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Profile</p><p className="mt-1 truncate text-xl font-semibold text-slate-950">@{profile.username}</p></div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-5">
          {stats.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{value}</dd></div>)}
        </dl>
      </section>

      <section aria-labelledby="public-reports-heading" className="space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Public activity</p><h2 id="public-reports-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Published reports</h2><p className="mt-1 text-sm text-slate-500">Only reports visible in the public feed appear here.</p></div>
          <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{profile.reports.length}</span>
        </div>
        {profile.reports.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">No published reports yet.</div> : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {profile.reports.map((report) => <Link key={report.id} href={`/reports/${report.id}`} className="flex flex-col gap-2 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900">{report.title}</h3><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span>{report.category_name ?? "Uncategorized"}</span><span aria-hidden="true">·</span><span>{report.platform} · @{report.social_account_username}</span><span aria-hidden="true">·</span><span>{formatDate(report.published_at ?? report.created_at)}</span></p></div><span className="w-fit shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">{report.public_report_category_code}-{String(report.public_report_number).padStart(5, "0")}</span></Link>)}
          </div>
        )}
      </section>
    </div>
  );
}
