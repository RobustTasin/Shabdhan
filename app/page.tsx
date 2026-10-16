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

type CategoryFeed = {
  reports: ApiReport[];
  total: number;
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      {direction === "left" ? (
        <path d="m12.5 4.5-5.5 5.5 5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function statusClasses(status: ApiReport["verification_status"]) {
  if (status === "VERIFIED") return "bg-[#e8f2e9] text-[#286044]";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-800";
}

export default function Home() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [feeds, setFeeds] = useState<Record<string, CategoryFeed>>({});
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let active: Category[];
      try {
        const response = await getCategories();
        active = response.categories.filter((category) => category.is_active);
      } catch (categoryError) {
        console.warn("Could not load categories; deriving them from public reports.", categoryError);
        const recent = await searchReports({ limit: 100 });
        const derived = new Map<string, Category>();
        for (const report of recent.reports) {
          const category = report.category;
          if (category?.id && !derived.has(category.id)) {
            derived.set(category.id, {
              id: category.id,
              name: category.name,
              description: category.description,
              is_active: true,
            });
          }
        }
        active = Array.from(derived.values());
      }
      const results = await Promise.all(
        active.map(async (category) => {
          try {
            const result = await searchReports({ categoryId: category.id, limit: 8 });
            return [category.id, { reports: result.reports, total: result.pagination.total }] as const;
          } catch {
            return [category.id, { reports: [], total: 0 }] as const;
          }
        })
      );
      setCategories(active);
      setFeeds(Object.fromEntries(results));
      setActiveIndexes({});
    } catch {
      setError("We couldn’t load the public feed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  function moveReport(categoryId: string, direction: -1 | 1) {
    const count = feeds[categoryId]?.reports.length ?? 0;
    setActiveIndexes((current) => {
      const index = current[categoryId] ?? 0;
      return { ...current, [categoryId]: Math.max(0, Math.min(count - 1, index + direction)) };
    });
  }

  const visibleCategories = categories.filter((category) => feeds[category.id]?.reports.length);

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#1e2924]">
      <header className="sticky top-0 z-40 border-b border-[#e5e8e1] bg-[#fbfcf9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Shabdhan feed" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#183a2c] text-sm font-bold text-[#eaf1d7]">S</span>
            <span className="text-lg font-semibold tracking-[-0.04em]">shabdhan<span className="text-[#65846e]">.</span></span>
          </Link>

          <nav aria-label="Main navigation" className="ml-auto flex items-center gap-1.5">
            <a href="#public-feed" className="rounded-full bg-[#edf1e9] px-3.5 py-2 text-sm font-semibold text-[#244a34]">Feed</a>
            <Link href="/search" aria-label="Search reports" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#48594e] transition hover:bg-[#edf1e9]">
              <SearchIcon />
            </Link>
            {user && (
              <Link href="/reports" aria-label="Create a report" className="inline-flex h-10 items-center justify-center rounded-full bg-[#183a2c] px-3.5 text-sm font-semibold text-white transition hover:bg-[#24543e] sm:px-4">
                <span className="sm:hidden">+</span><span className="hidden sm:inline">+ Create</span>
              </Link>
            )}
            <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#48594e] transition hover:bg-[#edf1e9]">
              <MenuIcon open={menuOpen} />
            </button>
          </nav>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e8ebe5] bg-[#fbfcf9] px-4 py-4 sm:px-6">
            <nav aria-label="More navigation" className="mx-auto flex max-w-5xl flex-col gap-1">
              <a href="#public-feed" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">Browse categories</a>
              <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">Search all reports</Link>
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">Dashboard</Link>
                  <Link href="/reports" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">My reports</Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">Log in</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#f0f2ed]">Join Shabdhan</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-5 pt-7 sm:px-6 sm:pt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#718174]">Community reports</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-[#1e3326] sm:text-4xl">Your feed</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#68756b]">Browse recent, reviewed reports by category. You can read everything here without signing in.</p>
          </div>
          <Link href="/search" className="hidden shrink-0 rounded-full border border-[#d8ded5] bg-white px-4 py-2.5 text-sm font-semibold text-[#38523e] transition hover:bg-[#f0f3ed] sm:inline-flex">Search reports</Link>
        </div>
      </section>

      <section id="public-feed" aria-label="Recent reports by category" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{error}</p>
            <button type="button" onClick={() => void loadFeed()} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </div>
        )}

        {loading && (
          <div className="space-y-5" aria-label="Loading feed">
            {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl border border-[#e3e7df] bg-white" />)}
          </div>
        )}

        {!loading && !error && visibleCategories.length === 0 && (
          <div className="rounded-3xl border border-[#e0e5dc] bg-white p-7 text-center sm:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf2e8] text-xl text-[#355b40]">S</span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#20362a]">No public reports yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#707b72]">Reports appear in the feed after moderators review and publish them. Check back soon or search the public index.</p>
            <Link href="/search" className="mt-5 inline-flex rounded-full bg-[#183a2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24543e]">Search reports</Link>
          </div>
        )}

        {!loading && !error && visibleCategories.map((category) => {
          const feed = feeds[category.id];
          const index = activeIndexes[category.id] ?? 0;
          const report = feed.reports[index];
          const platform = report.social_account?.platform;
          const accountName = report.social_account?.display_name || report.social_account?.username;

          return (
            <section key={category.id} aria-label={`${category.name} reports`} className="mb-6 overflow-hidden rounded-[1.65rem] border border-[#e2e6de] bg-white shadow-[0_8px_26px_rgba(31,54,37,.035)] sm:mb-7">
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0ea] px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a8a7d]">Recent in</p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold tracking-[-0.02em] text-[#23382a]">{category.name}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="mr-1 text-xs tabular-nums text-[#778178]">{index + 1} / {feed.reports.length}</span>
                  <button type="button" aria-label={`Previous ${category.name} report`} onClick={() => moveReport(category.id, -1)} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] transition hover:bg-[#f1f4ef] disabled:cursor-not-allowed disabled:opacity-35"><Chevron direction="left" /></button>
                  <button type="button" aria-label={`Next ${category.name} report`} onClick={() => moveReport(category.id, 1)} disabled={index >= feed.reports.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] transition hover:bg-[#f1f4ef] disabled:cursor-not-allowed disabled:opacity-35"><Chevron direction="right" /></button>
                </div>
              </div>

              <article className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f0f3ed] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52705a]">{platform || "Public report"}</span>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${statusClasses(report.verification_status)}`}>{reportStatusLabel(report.status, report.verification_status)}</span>
                  {report.created_at && <span className="text-xs text-[#879087]">{new Date(report.created_at).toLocaleDateString()}</span>}
                </div>

                {accountName && (
                  <p className="mt-4 text-sm font-medium text-[#516356]">{report.social_account?.display_name ? `${accountName} · ` : ""}@{report.social_account?.username}</p>
                )}
                <h3 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.03em] text-[#20362a] sm:text-2xl">{report.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#657267]">{report.description}</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-4">
                  <span className="text-[11px] text-[#899289]">Report ID: {report.id}</span>
                  <Link href={`/reports/${report.id}`} className="inline-flex items-center gap-2 rounded-full bg-[#183a2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543e]">View report <Chevron direction="right" /></Link>
                </div>
              </article>
              {feed.total > feed.reports.length && <p className="px-5 pb-4 text-xs text-[#818b82] sm:px-6">Showing the {feed.reports.length} newest reports in this category.</p>}
            </section>
          );
        })}
      </section>

      <footer className="border-t border-[#e5e8e1] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-[#788279] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="font-semibold text-[#38523e]">shabdhan.</Link>
          <p>Explore openly. Read carefully. Participate responsibly.</p>
        </div>
      </footer>
    </main>
  );
}
