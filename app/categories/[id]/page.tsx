"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ProfilePageLayout from "../../components/ProfilePageLayout";
import { getCategories, searchReports, type ApiReport, type Category } from "../../lib/reports-api";
import { formatPublicReportId } from "../../../shared/report-id";

const PAGE_SIZE = 12;

export default function CategoryReportsPage() {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      getCategories(),
      searchReports({ categoryId: id, page, limit: PAGE_SIZE }),
    ]).then(([categoryResponse, reportResponse]) => {
      if (!active) return;
      const matched = id === "uncategorized"
        ? { id, name: "Uncategorized", description: "Published reports that have not been assigned a category.", is_active: true }
        : categoryResponse.categories.find((item) => item.id === id) ?? null;
      setCategory(matched);
      setReports(reportResponse.reports);
      setTotal(reportResponse.pagination.total);
      setTotalPages(reportResponse.pagination.total_pages);
      if (!matched) setError("This category could not be found.");
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load category reports.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, page]);

  return (
    <ProfilePageLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/categories" className="inline-flex text-sm font-semibold text-[#24716c] hover:underline">← All categories</Link>

        <section className="rounded-3xl border border-[#dbe7e5] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,37,0.06)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#24716c]">Category</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d3837]">{category?.name ?? (loading ? "Loading category…" : "Category reports")}</h1>
          {category?.description && <p className="mt-2 text-sm leading-6 text-[#617573]">{category.description}</p>}
          <p className="mt-3 text-sm text-[#718481]">{loading ? "Loading reports…" : `${total.toLocaleString()} ${total === 1 ? "report" : "reports"}`}</p>
        </section>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        {loading ? (
          <div className="rounded-3xl border border-[#dbe7e5] bg-white p-12 text-center text-sm text-[#718481]">Loading reports…</div>
        ) : !error && reports.length === 0 ? (
          <div className="rounded-3xl border border-[#dbe7e5] bg-white px-6 py-14 text-center">
            <h2 className="font-semibold text-[#1d3837]">No reports in this category yet</h2>
            <p className="mt-2 text-sm text-[#718481]">Published reports will appear here.</p>
          </div>
        ) : !error && (
          <section aria-label={`${category?.name ?? "Category"} reports`} className="overflow-hidden rounded-3xl border border-[#dbe7e5] bg-white shadow-sm">
            <div className="divide-y divide-[#e3eeec]">
              {reports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} className="block px-5 py-5 transition hover:bg-[#f4f9f8] sm:px-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#1d3837]">{report.title}</h2>
                      <p className="mt-1 text-xs text-[#718481]">
                        {report.social_account?.id
                          ? `${report.social_account.platform} · @${report.social_account.username}`
                          : report.incident_type === "OFFLINE" ? "Offline incident" : `Online · ${report.incident_platform}`}
                        {report.published_at && <> · <time dateTime={report.published_at}>{new Date(report.published_at).toLocaleDateString()}</time></>}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#506764]">{report.description}</p>
                    </div>
                    <span className="w-fit shrink-0 rounded-full bg-[#edf8f6] px-3 py-1.5 text-xs font-semibold text-[#24716c]">
                      {formatPublicReportId(report.public_report_category_code, report.public_report_number)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-[#cbdedb] px-4 py-2.5 text-sm font-semibold text-[#245c58] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="text-sm tabular-nums text-[#718481]">Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-[#cbdedb] px-4 py-2.5 text-sm font-semibold text-[#245c58] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </ProfilePageLayout>
  );
}
