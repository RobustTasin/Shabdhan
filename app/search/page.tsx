"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCategories,
  reportStatusLabel,
  searchReports,
  type ApiReport,
  type Category,
} from "../lib/reports-api";

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCategories()
      .then((response) => setCategories(response.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const hasSearchCriteria = search.trim() !== "" || categoryId !== "";

    if (!hasSearchCriteria) {
      setReports([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      setError("");
      return;
    }

    const timer = window.setTimeout(() => {
      void loadResults();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, categoryId, page]);

  async function loadResults() {
    try {
      setLoading(true);
      setError("");

      const response = await searchReports({
        search: search.trim(),
        categoryId,
        page,
        limit: PAGE_SIZE,
      });

      setReports(response.reports);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to search reports"
      );
      setReports([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-medium text-slate-500">Shabdhan</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Search reports
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Find reports by report name, social-media username, person, brand,
            company, or category.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Search
              </label>

              <div className="relative mt-2">
                <input
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Report name, username, brand or company..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Category
              </label>

              <select
                value={categoryId}
                onChange={(event) =>
                  handleCategoryChange(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">All categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Search results
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Searching..."
                  : `${total} published verified report${
                      total === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Searching reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No matching reports
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another name, username, brand, company, or category.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-950">
                        {report.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {report.social_account?.platform}
                        </span>

                        <span>•</span>

                        <span>
                          @{report.social_account?.username}
                        </span>

                        {report.social_account?.display_name && (
                          <>
                            <span>•</span>
                            <span>
                              {report.social_account.display_name}
                            </span>
                          </>
                        )}

                        <span>•</span>

                        <span>
                          {report.category?.name ?? "Uncategorized"}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {report.description}
                      </p>
                    </div>

                    <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {reportStatusLabel(
                        report.status,
                        report.verification_status
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
