"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfilePageLayout from "../components/ProfilePageLayout";
import {
  getCategories,
  reportStatusLabel,
  searchReports,
  type ApiReport,
  type Category,
} from "../lib/reports-api";
import ReportLocationSelector from "../components/ReportLocationSelector";
import type { ReportLocationValue } from "../../shared/report-location";

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState<ReportLocationValue>({ scope: "", countryCode: "", division: "", district: "", subDistrict: "", cityCorporation: "", area: "" });
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const requestedQuery = new URLSearchParams(window.location.search).get("q");
    const requestedCategory = new URLSearchParams(window.location.search).get("category_id");
    if (requestedQuery) setSearch(requestedQuery);
    if (requestedCategory) setCategoryId(requestedCategory);
    setInitialized(true);
  }, []);

  useEffect(() => {
    void getCategories()
      .then((response) => setCategories(response.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const timer = window.setTimeout(() => {
      void loadResults();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [initialized, search, categoryId, page, location.countryCode, location.division, location.district, location.subDistrict, location.area, fromMonth, toMonth]);

  async function loadResults() {
    try {
      setLoading(true);
      setError("");

      const response = await searchReports({
        search: search.trim(),
        categoryId,
        countryCode: location.countryCode || undefined,
        division: location.division || undefined,
        district: location.district || undefined,
        subDistrict: location.subDistrict || undefined,
        cityCorporation: location.cityCorporation || undefined,
        area: location.area.trim() || undefined,
        fromMonth: fromMonth || undefined,
        toMonth: toMonth || undefined,
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
    <ProfilePageLayout>
      <div className="mx-auto max-w-6xl py-6 lg:py-8">
        <div>
          <h1 className="sr-only">Advanced search</h1>
          <p className="text-sm text-slate-600">
            Find reports by report name, social-media username, person, brand,
            company, or category.
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Search
              </label>

              <div className="relative mt-2">
                <input
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Report name or ID, username, brand or company..."
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
                <option value="uncategorized">Uncategorized</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <ReportLocationSelector value={location} onChange={(value)=>{setLocation(value);setPage(1);}} label="Filter by location" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">From month<input type="month" value={fromMonth} onChange={(e)=>{setFromMonth(e.target.value);setPage(1);}} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
              <label className="text-sm font-medium text-slate-700">To month<input type="month" value={toMonth} onChange={(e)=>{setToMonth(e.target.value);setPage(1);}} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
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
                        {report.social_account?.id ? (
                          <>
                            <span>{report.social_account.platform}</span>
                            <span>•</span>
                            <span>@{report.social_account.username}</span>
                          </>
                        ) : (
                          <span>{report.incident_type === "OFFLINE" ? "Offline incident" : `Online · ${report.incident_platform}`}</span>
                        )}

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
                      {report.location_country_name && <p className="mt-2 text-xs font-medium text-teal-800">{[report.location_area, report.location_city_corporation, report.location_sub_district, report.location_district, report.location_division, report.location_country_name].filter(Boolean).join(" · ")}</p>}
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
    </ProfilePageLayout>
  );
}
