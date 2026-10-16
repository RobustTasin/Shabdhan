"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./components/AuthProvider";
import {
  getCategories,
  reportStatusLabel,
  searchReports,
  type ApiReport,
  type Category,
} from "./lib/reports-api";
import "./landing.css";

const PAGE_SIZE = 12;

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M3.5 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function statusClasses(status: ApiReport["verification_status"]) {
  if (status === "VERIFIED") return "border-[#c5dfd0] bg-[#edf6f0] text-[#286044]";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function Home() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");

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
      setError("We couldn’t load public reports. Please try again.");
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || reports.length >= total) return;
    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const response = await searchReports({
        page: page + 1,
        limit: PAGE_SIZE,
        search: query.trim() || undefined,
        categoryId: activeCategory || undefined,
      });
      setReports((current) => {
        const ids = new Set(current.map((report) => report.id));
        return [...current, ...response.reports.filter((report) => !ids.has(report.id))];
      });
      setPage(page + 1);
      setTotal(response.pagination.total);
    } catch {
      setLoadMoreError("We couldn’t load more reports. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [activeCategory, loading, loadingMore, page, query, reports, total]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadData(query, activeCategory);
  }

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId);
    void loadData(query, categoryId);
  }

  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <main className="landing-page min-h-screen bg-[#f7f7f3] text-[#1e2924]">
      <header className="sticky top-0 z-40 border-b border-[#e6e8e1] bg-[#f7f7f3]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" aria-label="Shabdhan home" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#183a2c] text-lg font-bold text-[#eaf1d7] shadow-sm transition group-hover:bg-[#24543e]">S</span>
            <span className="text-[1.2rem] font-semibold tracking-[-0.04em]">shabdhan<span className="text-[#65846e]">.</span></span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-[#59635d] md:flex">
            <a className="transition hover:text-[#183a2c]" href="#public-feed">Explore reports</a>
            <a className="transition hover:text-[#183a2c]" href="#how-it-works">How it works</a>
            <a className="transition hover:text-[#183a2c]" href="#about">About Shabdhan</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#34453b] transition hover:bg-[#e9ece5] sm:inline-flex">Dashboard</Link>
                <Link href="/reports" className="inline-flex items-center gap-2 rounded-full bg-[#183a2c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24543e] sm:px-5">Submit a report <ArrowIcon diagonal /></Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#34453b] transition hover:bg-[#e9ece5] sm:inline-flex">Log in</Link>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#183a2c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24543e] sm:px-5">Join the community <ArrowIcon diagonal /></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#183a2c] text-white">
        <div aria-hidden="true" className="hero-grain pointer-events-none absolute inset-0 opacity-40" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-44 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-[26rem] w-[26rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute right-20 top-16 h-3 w-3 rounded-full bg-[#d4e39b] shadow-[0_0_36px_12px_rgba(212,227,155,0.26)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-medium tracking-wide text-[#d9e3cf]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8dc82]" />
              PUBLIC INFORMATION. COMMUNITY POWERED.
            </div>
            <h1 className="max-w-2xl text-[2.8rem] font-medium leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[4.35rem]">
              Clarity for the things that <span className="font-serif italic text-[#d4e39b]">matter.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#d1ddd5] sm:text-lg sm:leading-8">
              Find public reports, understand what’s been reviewed, and make more informed decisions together. Browsing is open to everyone.
            </p>

            <form onSubmit={submitSearch} className="mt-9 flex max-w-2xl flex-col gap-2 rounded-[1.1rem] bg-white p-2 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor="public-search">Search public reports</label>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
                <span className="text-[#77857c]"><SearchIcon /></span>
                <input
                  id="public-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search reports, accounts, or keywords"
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#1e2924] outline-none placeholder:text-[#8a938d] sm:text-base"
                />
              </div>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[0.8rem] bg-[#d4e39b] px-6 text-sm font-semibold text-[#193629] transition hover:bg-[#e1ecb7]">Search reports <ArrowIcon /></button>
            </form>

            <p className="mt-3 text-xs text-[#bdcec1]">No account needed to search or read public reports.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[29rem] lg:ml-auto">
            <div className="hero-report-art relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#244b3a] p-5 shadow-2xl shadow-black/20 sm:p-7">
              <div aria-hidden="true" className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-[linear-gradient(35deg,transparent_48%,rgba(218,230,201,.14)_49%,transparent_50%),linear-gradient(145deg,transparent_48%,rgba(218,230,201,.12)_49%,transparent_50%)] bg-[length:64px_64px]" />
                <div className="absolute left-1/2 top-0 h-full w-px rotate-[28deg] bg-white/20" />
                <div className="absolute left-1/3 top-0 h-full w-px -rotate-[25deg] bg-white/15" />
              </div>
              <div className="relative flex items-center justify-between text-xs text-[#d1ddd5]">
                <span className="font-medium tracking-wide">THE PUBLIC FEED</span>
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#d4e39b]" /> Public index</span>
              </div>
              <div className="relative mt-8 flex h-48 items-center justify-center sm:h-56">
                <div className="absolute h-40 w-40 rounded-full border border-dashed border-[#c9d9b5]/30 sm:h-48 sm:w-48" />
                <div className="absolute h-28 w-28 rounded-full border border-[#c9d9b5]/30 sm:h-36 sm:w-36" />
                <div className="absolute h-3 w-3 translate-x-12 -translate-y-14 rounded-full bg-[#d4e39b] shadow-[0_0_0_8px_rgba(212,227,155,.12)]" />
                <div className="absolute h-2.5 w-2.5 -translate-x-16 translate-y-4 rounded-full bg-[#f1d49a] shadow-[0_0_0_7px_rgba(241,212,154,.12)]" />
                <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl border border-white/20 bg-[#d4e39b] text-2xl font-semibold text-[#183a2c] shadow-xl shadow-black/20">S</div>
                <div className="absolute bottom-1 left-1 rounded-xl border border-white/10 bg-[#183a2c]/80 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#dce6d8]">Community signals</div>
                <div className="absolute right-0 top-4 rounded-xl border border-white/10 bg-[#183a2c]/80 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#dce6d8]">Reviewed with care</div>
              </div>
              <div className="relative mt-3 rounded-2xl border border-white/10 bg-[#173728]/85 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b5c8b8]">A clearer picture</p>
                    <p className="mt-1.5 text-sm font-medium text-white">Read the report. Check its status.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#abcba8]/25 bg-[#6c9c79]/15 px-2.5 py-1 text-[10px] font-semibold text-[#d4e8d4]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9bd2a5]" /> Status visible
                  </span>
                </div>
                <div className="mt-4 flex gap-1.5" aria-hidden="true">
                  <span className="h-1 flex-1 rounded-full bg-[#d4e39b]" />
                  <span className="h-1 flex-1 rounded-full bg-[#d4e39b]/60" />
                  <span className="h-1 flex-1 rounded-full bg-white/15" />
                  <span className="h-1 flex-1 rounded-full bg-white/15" />
                </div>
              </div>
              <p className="relative mt-4 text-center text-[10px] leading-4 text-[#c0d0c4]">Verification describes a review status; always read the report details and available evidence.</p>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-[#e8e9e2] bg-[#fbfbf8] px-4 py-3 text-xs font-medium text-[#3e5145] shadow-lg sm:block">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#719d79]" />Open access, thoughtful review
            </div>
          </div>
        </div>
      </section>

      <section aria-label="About public access" className="border-b border-[#e5e7df] bg-[#fbfbf8]">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-8 md:grid-cols-3">
          <div className="flex items-center gap-4 border-b border-[#e5e7df] py-6 md:border-b-0 md:border-r md:py-7 md:pr-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8eee4] text-[#315d43]">01</span>
            <div><p className="text-sm font-semibold">Open to everyone</p><p className="mt-1 text-xs text-[#737d75]">Read public reports without an account</p></div>
          </div>
          <div className="flex items-center gap-4 border-b border-[#e5e7df] py-6 md:border-b-0 md:border-r md:px-8 md:py-7">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8eee4] text-[#315d43]">02</span>
            <div><p className="text-sm font-semibold">Review status is visible</p><p className="mt-1 text-xs text-[#737d75]">See what has been verified by moderators</p></div>
          </div>
          <div className="flex items-center gap-4 py-6 md:py-7 md:pl-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8eee4] text-[#315d43]">03</span>
            <div><p className="text-sm font-semibold">People make the difference</p><p className="mt-1 text-xs text-[#737d75]">Contribute responsibly when you’re ready</p></div>
          </div>
        </div>
      </section>

      <section id="public-feed" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65846e]">Explore openly</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] text-[#1d3025] sm:text-4xl">The public report feed</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6a756d]">Reports appear here after review. Explore by category or search for a topic that matters to you.</p>
          </div>
          <Link href="/search" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9ded5] px-4 py-2.5 text-sm font-semibold text-[#344c3b] transition hover:border-[#a9b9aa] hover:bg-white">Browse all reports <ArrowIcon diagonal /></Link>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filter reports by category">
          <button type="button" aria-pressed={!activeCategory} onClick={() => selectCategory("")} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${!activeCategory ? "bg-[#254a36] text-white" : "border border-[#dfe3db] bg-white text-[#5b675f] hover:border-[#aebcaf]"}`}>All reports</button>
          {activeCategories.map((category) => (
            <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => selectCategory(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${activeCategory === category.id ? "bg-[#254a36] text-white" : "border border-[#dfe3db] bg-white text-[#5b675f] hover:border-[#aebcaf]"}`}>
              {category.name}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{error}</p>
            <button type="button" onClick={() => void loadData(query, activeCategory)} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </div>
        )}

        {loading && (
          <div aria-label="Loading reports" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl border border-[#e7e9e2] bg-white" />)}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-[#e1e5dc] bg-white">
            <div className="grid items-center gap-8 p-7 sm:p-10 md:grid-cols-[1fr_auto]">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full bg-[#edf2e8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4d7257]">A new community starts somewhere</span>
                <h3 className="mt-4 text-2xl font-medium tracking-[-0.04em] text-[#20362a]">No public reports here yet.</h3>
                <p className="mt-2 text-sm leading-6 text-[#707b72]">{query || activeCategory ? "Try a different search or category. Public reports are shown after they have been reviewed." : "When a report is reviewed and published, you’ll find it here. You can still explore the app or help the community get started."}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => { setQuery(""); selectCategory(""); }} className="rounded-full border border-[#d9ded5] px-4 py-2.5 text-sm font-semibold text-[#344c3b] transition hover:bg-[#f7f7f3]">Clear filters</button>
                  {user ? (
                    <Link href="/reports" className="inline-flex items-center gap-2 rounded-full bg-[#254a36] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#315d43]">Submit a report <ArrowIcon /></Link>
                  ) : (
                    <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#254a36] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#315d43]">Join the community <ArrowIcon /></Link>
                  )}
                </div>
              </div>
              <div aria-hidden="true" className="empty-feed-art relative hidden h-48 w-48 items-center justify-center rounded-full border border-[#e3e8dc] bg-[#f4f6ef] md:flex">
                <div className="absolute h-32 w-32 rounded-full border border-dashed border-[#b9c8b3]" />
                <div className="absolute h-20 w-20 rounded-full border border-[#cfdbca]" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dce8d4] text-lg font-semibold text-[#355b40]">S</div>
                <span className="absolute right-7 top-8 h-2.5 w-2.5 rounded-full bg-[#9bb881]" />
                <span className="absolute bottom-8 left-7 h-2 w-2 rounded-full bg-[#d1b777]" />
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <>
            <p className="mt-6 text-xs text-[#778178]">Showing {reports.length} of {total} public {total === 1 ? "report" : "reports"}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => {
                const categoryName = report.category?.name ?? categories.find((category) => category.id === report.category_id)?.name ?? "Community report";
                return (
                  <article key={report.id} className="group flex min-h-[20rem] flex-col rounded-[1.5rem] border border-[#e3e6de] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#c5d0c4] hover:shadow-[0_18px_44px_rgba(38,65,46,.08)] sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#f0f3ed] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#52705a]">{categoryName}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses(report.verification_status)}`}>{reportStatusLabel(report.status, report.verification_status)}</span>
                    </div>
                    <p className="mt-5 text-xs text-[#818a82]">{report.social_account?.platform ?? "Public report"}{report.created_at ? ` · ${new Date(report.created_at).toLocaleDateString()}` : ""}</p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-6 tracking-[-0.025em] text-[#25372b]">{report.title}</h3>
                    <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-[#6a756d]">{report.description}</p>
                    <Link href={`/reports/${report.id}`} className="mt-6 inline-flex w-fit items-center gap-2 border-t border-[#edf0e9] pt-4 text-sm font-semibold text-[#315d43] transition group-hover:text-[#183a2c]">Read report <ArrowIcon /></Link>
                  </article>
                );
              })}
            </div>
            {reports.length < total && (
              <div className="mt-9 flex flex-col items-center gap-3">
                {loadMoreError && <p role="alert" className="text-sm text-rose-700">{loadMoreError}</p>}
                <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-full border border-[#d4dbd1] bg-white px-6 py-3 text-sm font-semibold text-[#35543e] transition hover:border-[#aebfaf] hover:bg-[#f6f8f3] disabled:cursor-not-allowed disabled:opacity-60">{loadingMore ? "Loading…" : loadMoreError ? "Try again" : "Load more reports"} {!loadingMore && <ArrowIcon />}</button>
              </div>
            )}
          </>
        )}
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-[#e5e7df] bg-[#eff2ea]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65846e]">A considered process</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] text-[#1d3025] sm:text-4xl">Information with context.</h2>
            <p className="mt-3 text-sm leading-6 text-[#6a756d]">Shabdhan helps communities share reports and see where each report stands in the review process.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { number: "01", title: "A report is submitted", body: "A community member shares an incident and the context they have available." },
              { number: "02", title: "A moderator reviews it", body: "The report is assessed and its verification status is updated." },
              { number: "03", title: "The community can read", body: "Published, verified reports become visible to everyone in the public feed." },
            ].map((step) => (
              <article key={step.number} className="rounded-[1.5rem] border border-[#dfe4d9] bg-[#fbfbf8] p-6 sm:p-7">
                <span className="text-xs font-semibold tracking-[0.16em] text-[#7d927e]">{step.number}</span>
                <h3 className="mt-7 text-lg font-semibold tracking-[-0.02em] text-[#273b2e]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6a756d]">{step.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[#7a857c]">A verification label reflects the platform’s review status. It is not a guarantee about events outside the information reviewed.</p>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 bg-[#fbfbf8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65846e]">Take part</p>
            <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#1d3025] sm:text-3xl">Better information starts with people.</h2>
            <p className="mt-3 text-sm leading-6 text-[#6a756d]">Explore without an account. Join when you’re ready to contribute, discuss, or report an incident.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-full border border-[#d9ded5] px-5 py-3 text-sm font-semibold text-[#344c3b] transition hover:bg-[#f3f5ef]">Go to dashboard</Link>
                <Link href="/reports" className="inline-flex items-center gap-2 rounded-full bg-[#183a2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24543e]">Submit a report <ArrowIcon /></Link>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-[#d9ded5] px-5 py-3 text-sm font-semibold text-[#344c3b] transition hover:bg-[#f3f5ef]">Log in</Link>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#183a2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24543e]">Create an account <ArrowIcon /></Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5e7df] bg-[#f7f7f3]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-[#778178] sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex w-fit items-center gap-2 font-semibold text-[#354b3b]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#183a2c] text-[11px] text-white">S</span> shabdhan</Link>
          <p>Explore openly. Read carefully. Participate responsibly.</p>
          <p>© {new Date().getFullYear()} Shabdhan</p>
        </div>
      </footer>
    </main>
  );
}
