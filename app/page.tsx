"use client";

import Link from "next/link";
import "./landing.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategories,
  searchReports,
  reportStatusLabel,
  type ApiReport,
  type Category,
} from "./lib/reports-api";

export default function Home() {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("Everything");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");

  const PAGE_SIZE = 20;

  const loadData = useCallback(async (search = "", categoryId = "") => {
    setLoading(true);
    setError("");
    setLoadMoreError("");
    setPage(1);

    try {
      const [reportResponse, categoryResponse] = await Promise.all([
        searchReports({
          page: 1,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          categoryId: categoryId || undefined,
        }),
        getCategories(),
      ]);

      setReports(reportResponse.reports);
      setTotal(reportResponse.pagination.total);
      setCategories(categoryResponse.categories);
    } catch {
      setError("We couldn't load public reports. Please try again.");
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || reports.length >= total) return;

    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const response = await searchReports({
        page: nextPage,
        limit: PAGE_SIZE,
        search: query.trim() || undefined,
        categoryId: activeType === "Everything" ? undefined : activeType,
      });

      setReports((current) => {
        const existingIds = new Set(current.map((report) => report.id));
        return [
          ...current,
          ...response.reports.filter((report) => !existingIds.has(report.id)),
        ];
      });

      setPage(nextPage);
      setTotal(response.pagination.total);
    } catch {
      setLoadMoreError("We couldn't load more reports. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, reports, total, page, query, activeType]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const groupedReports = useMemo(() => {
    const activeCategories = categories.filter((category) => category.is_active);
    const groups = activeCategories
      .map((category) => ({
        ...category,
        reports: reports.filter(
          (report) => (report.category?.id ?? report.category_id) === category.id
        ),
      }))
      .filter((category) => category.reports.length > 0);
    const activeCategoryIds = new Set(activeCategories.map((category) => category.id));
    const uncategorizedReports = reports.filter((report) => {
      const categoryId = report.category?.id ?? report.category_id;
      return !categoryId || !activeCategoryIds.has(categoryId);
    });

    if (uncategorizedReports.length > 0) {
      groups.push({
        id: "other-reports",
        name: "Other reports",
        description: null,
        is_active: true,
        reports: uncategorizedReports,
      });
    }

    return groups;
  }, [categories, reports]);

  const topCategory = useMemo(() => {
    const counts = new Map<string, number>();

    reports.forEach((report) => {
      const name = report.category?.name;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      ?? "Not available";
  }, [reports]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadData(query, activeType === "Everything" ? "" : activeType);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-xl text-white">
              ◈
            </span>
            <span className="text-xl font-bold tracking-tight">Shabdhan</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#discover" className="hover:text-blue-800">Explore</a>
            <a href="#categories" className="hover:text-blue-800">Categories</a>
            <a href="#about" className="hover:text-blue-800">About</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-100">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
              Safer communities. Stronger together.
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Find information. Understand incidents. Stay informed.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Explore public reports, discover patterns, and review available
              verification information. No account is needed to browse.
            </p>

            <form onSubmit={submitSearch} className="mt-7 flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <label className="sr-only" htmlFor="public-search">Search Shabdhan</label>
              <input
                id="public-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search incidents, accounts, keywords..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                Search
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Everything", ...categories.filter((item) => item.is_active).map((item) => item.id)].slice(0, 6).map((item) => {
                const label = item === "Everything"
                  ? item
                  : categories.find((category) => category.id === item)?.name ?? item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setActiveType(item);
                      void loadData(query, item === "Everything" ? "" : item);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      activeType === item
                        ? "border-blue-900 bg-blue-900 text-white"
                        : "border-slate-200 bg-white/80 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative hidden min-h-64 items-center justify-center md:flex">
            <div className="absolute h-64 w-64 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[3rem] border border-white bg-white/80 shadow-xl shadow-blue-900/10">
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-blue-900 text-7xl text-white">
                ✓
              </div>
              <span className="absolute -right-10 top-8 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold shadow-lg">
                Discover
              </span>
              <span className="absolute -bottom-3 -left-10 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold shadow-lg">
                Verify · Understand
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Community statistics" className="overflow-hidden border-b border-slate-200 bg-white py-4">
        <div className="stats-marquee mx-auto max-w-7xl px-4 sm:px-6">
          <div className="stats-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="stats-group">
{[
  {
    label: "Matching verified reports",
    value: total.toLocaleString(),
    icon: "▤",
  },
  {
    label: "Active categories",
    value: categories.filter((item) => item.is_active).length.toString(),
    icon: "◉",
  },
  {
    label: "Reports loaded",
    value: reports.length.toString(),
    icon: "↗",
  },
  {
    label: "Leading category in loaded results",
    value: topCategory,
    icon: "◇",
  },
].map((stat) => (

                  <div key={stat.label} className="mx-3 flex min-w-56 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-900">
                      {stat.icon}
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                      <p className="max-w-52 truncate text-base font-bold text-slate-900">{loading ? "…" : stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-7xl px-4 text-xs text-slate-400 sm:px-6">
          Statistics reflect the data returned by the public API. The leading category is based on the current results.
        </p>
      </section>

      <section id="discover" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-800">Explore the community</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Public report feed</h2>
            <p className="mt-2 text-sm text-slate-500">Scroll through categories and swipe sideways to explore reports.</p>
          </div>
          <Link href="/search" className="text-sm font-semibold text-blue-800 hover:text-blue-950">
            Browse all reports →
          </Link>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
            <button onClick={() => void loadData(query, activeType === "Everything" ? "" : activeType)} className="ml-2 font-semibold underline">Try again</button>
          </div>
        )}

        {loading && (
          <p className="py-12 text-center text-sm text-slate-500">Loading public reports…</p>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="font-semibold">No matching public reports</h3>
            <p className="mt-2 text-sm text-slate-500">Try another search or category.</p>
          </div>
        )}

        {!loading && !error && (
          <div id="categories" className="mt-8 space-y-10">
            {groupedReports.map((category) => (
              <section key={category.id} className="min-w-0">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{category.name}</h3>
                    {category.description && (
                      <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {category.reports.length} shown
                  </span>
                </div>

                <div className="report-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
                  {category.reports.map((report) => (
                    <article key={report.id} className="w-[82%] max-w-sm shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[48%] lg:w-[31%]">
                      <div className="flex h-28 items-center justify-between bg-gradient-to-br from-blue-50 to-slate-100 px-5">
                        <span className="rounded-full border border-white bg-white/90 px-3 py-1 text-xs font-semibold text-blue-900">
                          {category.name}
                        </span>
                        <span className="text-3xl text-blue-200">◈</span>
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-slate-500">
                          {report.social_account?.platform ?? "Public report"}
                          {report.created_at
                            ? ` · ${new Date(report.created_at).toLocaleDateString()}`
                            : ""}
                        </p>
                        <h4 className="mt-2 line-clamp-2 text-base font-bold leading-6">
                          {report.title}
                        </h4>
                        <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                          {report.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            report.verification_status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700"
                              : report.verification_status === "REJECTED"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-800"
                          }`}>
                            {reportStatusLabel(report.status, report.verification_status)}
                          </span>
                          <Link href={`/reports/${report.id}`} className="text-sm font-semibold text-blue-800 hover:underline">
                            View report →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!loading && !error && reports.length > 0 && reports.length < total && (
          <div className="mt-8 flex flex-col items-center gap-2">
            {loadMoreError && (
              <p role="alert" className="text-sm text-red-700">{loadMoreError}</p>
            )}
            <p className="text-sm text-slate-500">
              Showing {reports.length} of {total} matching reports
            </p>
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading reports…" : loadMoreError ? "Try again" : "Load more reports"}
            </button>
          </div>
        )}

        {!loading && !error && reports.length > 0 && reports.length >= total && (
          <p className="mt-8 text-center text-sm text-slate-500">
            Showing all {total} matching reports
          </p>
        )}
      </section>

      <section id="about" className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">Help build a safer community.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Browsing is open to everyone. Sign in when you are ready to submit a report or participate.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
              Log in
            </Link>
            <Link href="/register" className="rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">
              Join Shabdhan
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Shabdhan</span>
          <span>Explore openly. Verify carefully. Participate responsibly.</span>
        </div>
      </footer>
    </main>
  );
}
