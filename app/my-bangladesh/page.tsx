"use client";

import { useEffect, useState } from "react";
import ProfilePageLayout from "../components/ProfilePageLayout";
import { getPublicReportStatus, type PublicReportStatus } from "../lib/reports-api";

const STAT_ITEMS: { key: keyof PublicReportStatus; label: string; detail: string }[] = [
  { key: "total", label: "All reports", detail: "Reports submitted across Shabdhan" },
  { key: "under_review", label: "Under review", detail: "Waiting for moderator review" },
  { key: "published", label: "Published", detail: "Verified and visible to everyone" },
  { key: "resolved", label: "Resolved", detail: "Verified reports marked resolved" },
  { key: "declined", label: "Declined", detail: "Reports declined during review" },
];

export default function MyBangladeshPage() {
  const [counts, setCounts] = useState<PublicReportStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublicReportStatus()
      .then((result) => {
        if (active) setCounts(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load report status.");
      });
    return () => { active = false; };
  }, []);

  return (
    <ProfilePageLayout>
      <div className="mx-auto max-w-5xl py-5 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-slate-600">Shabdhan · National overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">আমার বাংলাদেশ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A live overview of report activity across the whole website.
          </p>
        </header>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
          </div>
        ) : (
          <section aria-label="Website report status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAT_ITEMS.map((item) => (
              <article key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">{item.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">
                  {counts ? counts[item.key].toLocaleString() : <span className="text-slate-300">—</span>}
                </p>
                <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
              </article>
            ))}
          </section>
        )}
        <p className="mt-5 text-xs text-slate-500">
          Counts include submitted reports. Drafts are private and are not included.
        </p>
      </div>
    </ProfilePageLayout>
  );
}
