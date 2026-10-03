"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getReport, reportStatusLabel, type ApiReport } from "../../lib/reports-api";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    void getReport(id)
      .then((response) => setReport(response.report))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading report...</div>;
  }

  if (error || !report) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Link href="/reports" className="text-sm font-medium text-slate-600 hover:text-slate-950">← Back to reports</Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-950">Report not found</h1>
          <p className="mt-2 text-sm text-red-800">{error || "The report does not exist."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <Link href="/reports" className="text-sm font-medium text-slate-600 hover:text-slate-950">← Back to reports</Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Report #{report.id}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{report.title}</h1>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {reportStatusLabel(report.status, report.verification_status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">Report details</h2>
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</p>
                <p className="mt-1 text-sm text-slate-900">{report.category?.name ?? "Uncategorized"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Verification</p>
                <p className="mt-1 text-sm text-slate-900">{report.verification_status}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-1 text-sm text-slate-900">{new Date(report.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last updated</p>
                <p className="mt-1 text-sm text-slate-900">{new Date(report.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">Reported account</h2>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Platform</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{report.social_account?.platform}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Username</p>
              <p className="mt-1 text-sm text-slate-900">@{report.social_account?.username}</p>
            </div>
            {report.social_account?.display_name && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Display name</p>
                <p className="mt-1 text-sm text-slate-900">{report.social_account.display_name}</p>
              </div>
            )}
            {report.social_account?.profile_url && (
              <a href={report.social_account.profile_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-slate-700 underline">
                Open profile
              </a>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Next steps</h2>
        <p className="mt-2 text-sm text-slate-500">
          Evidence upload and dispute actions will be connected to this API-backed report in the next integration batches.
        </p>
      </section>
    </div>
  );
}
