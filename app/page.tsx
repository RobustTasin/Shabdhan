"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./components/AuthProvider";
import {
  getCategories,
  reportStatusLabel,
  searchReports,
  setReportVote,
  type ApiReport,
  type Category,
} from "./lib/reports-api";

type CategoryFeed = {
  reports: ApiReport[];
  total: number;
};

type DemoReport = {
  id: string;
  subject: string;
  title: string;
  description: string;
};

type VoteDirection = 1 | -1;

const DEMO_REPORTS: DemoReport[][] = [
  [
    { id: "DEMO-01", subject: "Example Profile A", title: "Sample: an example profile lists conflicting service hours", description: "Fictional sample for the public feed. It describes a harmless information mismatch on an imaginary profile and makes no claim about a real person or organization." },
    { id: "DEMO-02", subject: "Example Page B", title: "Sample: an example page links to an outdated notice", description: "Fictional sample for the public feed. This imaginary page has an old notice link that a reader might want to check. No real account or institution is involved." },
    { id: "DEMO-03", subject: "Example Listing C", title: "Sample: an example listing has incomplete contact details", description: "Fictional sample for the public feed. It demonstrates how a report can describe missing public information without making an allegation about a real entity." },
  ],
  [
    { id: "DEMO-04", subject: "Example Service D", title: "Sample: an example service page has a broken contact form", description: "Fictional sample for the public feed. The contact form belongs to an imaginary service and is included only to demonstrate a category card and detail view." },
    { id: "DEMO-05", subject: "Example Notice E", title: "Sample: an example notice shows an expired deadline", description: "Fictional sample for the public feed. It illustrates how readers can add context about an outdated public notice. It is not a real report." },
  ],
  [
    { id: "DEMO-06", subject: "Example Organization F", title: "Sample: an example organization page needs an updated link", description: "Fictional sample for the public feed. This imaginary organization page points to an unavailable information page; no real organization or person is referenced." },
  ],
];

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

function FeedActionIcon({
  name,
}: {
  name: "upvote" | "downvote" | "comment" | "corroborate" | "share";
}) {
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 20 20",
    fill: "none",
    className: "h-4 w-4 shrink-0",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "upvote") return <svg {...common}><path d="M10 16V4m-5 5 5-5 5 5" /></svg>;
  if (name === "downvote") return <svg {...common}><path d="M10 4v12m5-5-5 5-5-5" /></svg>;
  if (name === "comment") return <svg {...common}><path d="M16.5 14.5A7 7 0 0 1 5 15l-2 1 1-3A7 7 0 1 1 16.5 14.5Z" /></svg>;
  if (name === "corroborate") return <svg {...common}><path d="M10 2.5 16 5v4.3c0 3.5-2.4 6.4-6 8.2-3.6-1.8-6-4.7-6-8.2V5l6-2.5Z" /><path d="m7.3 9.8 1.8 1.8 3.7-3.8" /></svg>;
  return <svg {...common}><circle cx="15" cy="4.5" r="2" /><circle cx="5" cy="10" r="2" /><circle cx="15" cy="15.5" r="2" /><path d="m6.8 9 6.4-3.5M6.8 11l6.4 3.5" /></svg>;
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
  const [selectedDemo, setSelectedDemo] = useState<DemoReport | null>(null);
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({});
  const [shareFeedback, setShareFeedback] = useState<Record<string, string>>({});
  const [copiedDemoId, setCopiedDemoId] = useState<string | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState(1);

  useEffect(() => {
    const updateCardsPerPage = () => {
      const width = window.innerWidth;
      const isWide = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
      setCardsPerPage(width >= 1280 && isWide ? 3 : width >= 768 ? 2 : 1);
    };
    updateCardsPerPage();
    window.addEventListener("resize", updateCardsPerPage);
    return () => window.removeEventListener("resize", updateCardsPerPage);
  }, []);

  useEffect(() => {
    if (!menuOpen || window.innerWidth >= 1024) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

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

  function moveReport(categoryId: string, direction: -1 | 1, count: number) {
    setActiveIndexes((current) => {
      const index = current[categoryId] ?? 0;
      return { ...current, [categoryId]: Math.max(0, Math.min(count - 1, index + direction * cardsPerPage)) };
    });
  }

  async function handleVote(report: ApiReport, direction: VoteDirection) {
    if (!user || pendingVote) return;
    const nextVote = report.current_user_vote === direction ? null : direction;
    setPendingVote(report.id);
    setVoteErrors((current) => ({ ...current, [report.id]: "" }));
    try {
      const response = await setReportVote(report.id, nextVote);
      setFeeds((current) => Object.fromEntries(Object.entries(current).map(([categoryId, feed]) => [
        categoryId,
        { ...feed, reports: feed.reports.map((item) => item.id === report.id ? {
          ...item,
          upvote_count: response.upvote_count,
          downvote_count: response.downvote_count,
          current_user_vote: response.vote,
        } : item) },
      ])));
    } catch (error) {
      setVoteErrors((current) => ({ ...current, [report.id]: error instanceof Error ? error.message : "Could not save your vote." }));
    } finally {
      setPendingVote(null);
    }
  }

  async function handleShare(report: ApiReport) {
    const url = `${window.location.origin}/reports/${report.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, url });
        setShareFeedback((current) => ({ ...current, [report.id]: "Shared" }));
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback((current) => ({ ...current, [report.id]: "Link copied" }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setShareFeedback((current) => ({ ...current, [report.id]: "Link copied" }));
      } catch {
        setShareFeedback((current) => ({ ...current, [report.id]: "Could not copy link" }));
      }
    }
  }

  async function handleShareDemo(demo: DemoReport) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`);
      setCopiedDemoId(demo.id);
      window.setTimeout(() => setCopiedDemoId(null), 2000);
    } catch {
      setCopiedDemoId(null);
    }
  }

  const visibleCategories = categories.filter((category) => feeds[category.id]?.reports.length);
  const sampleCategories = categories.slice(0, 3);
  const sampleCategoryNames = ["Online information", "Public services", "Community notices"];
  while (sampleCategories.length < 3) {
    const index = sampleCategories.length;
    sampleCategories.push({
      id: `sample-category-${index + 1}`,
      name: `${sampleCategoryNames[index]} · sample`,
      description: "Fictional category used for the feed preview.",
      is_active: true,
    });
  }
  const demoMode = !loading && !error && visibleCategories.length === 0;
  const categorySections = demoMode ? sampleCategories : visibleCategories;

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#1e2924]">
      <header className="relative sticky top-0 z-[70] border-b border-[#e5e8e1] bg-[#fbfcf9]/95 backdrop-blur-xl">
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
        {menuOpen && <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[60] hidden bg-transparent lg:block" />}
        {menuOpen && <section aria-label="Navigation menu" className="absolute right-3 top-[calc(100%+0.5rem)] z-[70] hidden max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[#e5e8e1] bg-[#fbfcf9] p-4 shadow-[0_18px_50px_rgba(20,36,26,.18)] lg:block">
          <div className="flex items-center justify-between border-b border-[#e8ebe5] px-2 pb-3">
            <h2 className="text-base font-semibold text-[#20362a]">Menu</h2>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#48594e] hover:bg-[#edf1e9]"><MenuIcon open /></button>
          </div>
          <nav aria-label="Menu links" className="mt-2 flex flex-col gap-1">
            <a href="#public-feed" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Browse categories</a>
            <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Search all reports</Link>
            {user ? <><Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Dashboard</Link><Link href="/reports" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">My reports</Link></> : <><Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Log in</Link><Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Join Shabdhan</Link></>}
          </nav>
        </section>}
      </header>

      {menuOpen && <section role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[80] flex flex-col bg-[#f5f6f2] lg:hidden">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e8e1] bg-[#fbfcf9] px-4">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#183a2c] text-sm font-bold text-[#eaf1d7]">S</span><h1 className="text-lg font-semibold text-[#20362a]">Menu</h1></div>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#48594e] hover:bg-[#edf1e9]"><MenuIcon open /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {user && <div className="mb-4 rounded-2xl border border-[#e5e8e1] bg-white p-4"><p className="text-sm font-semibold text-[#20362a]">{user.username}</p><p className="mt-1 text-xs text-[#788279]">Signed in to Shabdhan</p></div>}
          <nav aria-label="Menu links" className="flex flex-col gap-2">
            <a href="#public-feed" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">Browse categories</a>
            <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">Search all reports</Link>
            {user ? <><Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">Dashboard</Link><Link href="/reports" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">My reports</Link></> : <><Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">Log in</Link><Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-[#e5e8e1] bg-white px-4 py-4 text-sm font-medium hover:bg-[#f0f2ed]">Join Shabdhan</Link></>}
          </nav>
          {user && <Link href="/reports" onClick={() => setMenuOpen(false)} className="mt-4 block rounded-2xl bg-[#183a2c] px-4 py-4 text-center text-sm font-semibold text-white hover:bg-[#24543e]">+ Create a report</Link>}
        </div>
      </section>}

      <section id="public-feed" aria-label="Recent reports by category" className="mx-auto max-w-5xl px-4 pt-5 pb-16 sm:px-6 lg:max-w-none lg:px-8 xl:px-10">
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

        {!loading && !error && visibleCategories.length === 0 && !demoMode && (
          <div className="rounded-3xl border border-[#e0e5dc] bg-white p-7 text-center sm:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf2e8] text-xl text-[#355b40]">S</span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#20362a]">No public reports yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#707b72]">Reports appear in the feed after moderators review and publish them. Check back soon or search the public index.</p>
            <Link href="/search" className="mt-5 inline-flex rounded-full bg-[#183a2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24543e]">Search reports</Link>
          </div>
        )}

        {!loading && !error && categorySections.map((category) => {
          const feed = feeds[category.id] ?? { reports: [], total: 0 };
          const index = activeIndexes[category.id] ?? 0;
          const demoCategoryIndex = sampleCategories.findIndex((item) => item.id === category.id);
          const demoReports = demoMode ? DEMO_REPORTS[demoCategoryIndex] ?? [] : [];
          const count = demoMode ? demoReports.length : feed.reports.length;
          const shownCount = Math.min(cardsPerPage, Math.max(0, count - index));
          const shownDemoReports = demoReports.slice(index, index + cardsPerPage);
          const shownReports = demoMode ? [] : feed.reports.slice(index, index + cardsPerPage);

          return (
            <section key={category.id} aria-label={`${category.name} reports`} className="mb-6 overflow-hidden rounded-[1.65rem] border border-[#e2e6de] bg-white shadow-[0_8px_26px_rgba(31,54,37,.035)] sm:mb-7">
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0ea] px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a8a7d]">Recent in</p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold tracking-[-0.02em] text-[#23382a]"><Link href={`/search?category_id=${encodeURIComponent(category.id)}`} className="rounded-sm hover:text-[#52705a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#52705a]">{category.name}<span className="sr-only"> — view all reports in this category</span></Link></h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="mr-1 text-xs tabular-nums text-[#778178]">{shownCount ? `${index + 1}${shownCount > 1 ? `–${index + shownCount}` : ""}` : 0} / {count}</span>
                  <button type="button" aria-label={`Previous ${category.name} reports`} onClick={() => moveReport(category.id, -1, count)} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] transition hover:bg-[#f1f4ef] disabled:cursor-not-allowed disabled:opacity-35"><Chevron direction="left" /></button>
                  <button type="button" aria-label={`Next ${category.name} reports`} onClick={() => moveReport(category.id, 1, count)} disabled={index + cardsPerPage >= count} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] transition hover:bg-[#f1f4ef] disabled:cursor-not-allowed disabled:opacity-35"><Chevron direction="right" /></button>
                </div>
              </div>

              {demoMode ? (
                <div className="feed-report-grid p-4 sm:p-5">
                {shownDemoReports.map((demoReport) => <article key={demoReport.id} className="relative flex min-w-0 flex-col rounded-2xl border border-[#edf0ea] bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f4eddb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#705a28]">Demo only · fictional</span>
                    <span className="text-xs text-[#879087]">Not a verified report</span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#516356]">{demoReport.subject}</p>
                  <h3 className="mt-1.5 text-base font-semibold leading-6 tracking-[-0.02em] text-[#20362a]"><button type="button" onClick={() => setSelectedDemo(demoReport)} className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#52705a]">{demoReport.title}<span className="sr-only"> — open sample details</span></button></h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#657267]">{demoReport.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-3">
                    <span className="text-[11px] text-[#899289]">Sample ID: {demoReport.id}</span>
                  </div>
                  <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-[#edf0e9] pt-4" aria-label="Sample actions">
                    <button type="button" disabled aria-label="Upvote sample" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7e1] text-[#879087]" title="Voting is disabled for fictional samples"><FeedActionIcon name="upvote" /></button>
                    <button type="button" disabled aria-label="Downvote sample" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7e1] text-[#879087]" title="Voting is disabled for fictional samples"><FeedActionIcon name="downvote" /></button>
                    <button type="button" disabled aria-label="Comment on sample" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7e1] text-[#879087]" title="Comments are disabled for fictional samples"><FeedActionIcon name="comment" /></button>
                    <button type="button" disabled aria-label="Corroborate sample" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e7e1] text-[#879087]" title="Corroboration is disabled for fictional samples"><FeedActionIcon name="corroborate" /></button>
                    <button type="button" aria-label="Share sample feed" title={copiedDemoId === demoReport.id ? "Feed link copied" : "Share sample feed"} onClick={() => void handleShareDemo(demoReport)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="share" /></button>
                  </div>
                </article>)}
                </div>
              ) : shownReports.length ? (
                <div className="feed-report-grid p-4 sm:p-5">
                {shownReports.map((report) => {
                  const platform = report.social_account?.platform;
                  const accountName = report.social_account?.display_name || report.social_account?.username;
                  return <article key={report.id} className="relative flex min-w-0 flex-col rounded-2xl border border-[#edf0ea] bg-white p-3 sm:p-4">
                  {report.preview_image_url && <img src={report.preview_image_url} alt={`Evidence image for ${report.title}`} loading="lazy" decoding="async" className="mb-3 aspect-[4/3] w-full rounded-xl bg-[#edf1e9] object-cover" />}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#52705a]">{platform || "Public report"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusClasses(report.verification_status)}`}>{reportStatusLabel(report.status, report.verification_status)}</span>
                  </div>
                  {accountName && <p className="mt-2 text-xs font-medium text-[#516356]">{report.social_account?.display_name ? `${accountName} · ` : ""}@{report.social_account?.username}</p>}
                  <h3 className="mt-1.5 text-base font-semibold leading-5 tracking-[-0.02em] text-[#20362a]"><Link href={`/reports/${report.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#52705a]">{report.title}<span className="sr-only"> — open report details</span></Link></h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#657267]">{report.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-3">
                    <span className="text-[10px] text-[#899289]">{report.created_at ? new Date(report.created_at).toLocaleDateString() : ""}</span>
                  </div>
                  <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 border-t border-[#edf0e9] pt-2" aria-label="Report actions">
                    {user ? (
                      <>
                        <button type="button" aria-label="Upvote report" title="Upvote" aria-pressed={report.current_user_vote === 1} disabled={pendingVote === report.id} onClick={() => void handleVote(report, 1)} className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition disabled:opacity-50 ${report.current_user_vote === 1 ? "border-[#9bb99d] bg-[#e8f2e9] text-[#24543e]" : "border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"}`}><FeedActionIcon name="upvote" /><span className="tabular-nums">{report.upvote_count ?? 0}</span></button>
                        <button type="button" aria-label="Downvote report" title="Downvote" aria-pressed={report.current_user_vote === -1} disabled={pendingVote === report.id} onClick={() => void handleVote(report, -1)} className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition disabled:opacity-50 ${report.current_user_vote === -1 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"}`}><FeedActionIcon name="downvote" /><span className="tabular-nums">{report.downvote_count ?? 0}</span></button>
                      </>
                    ) : (
                      <>
                        <Link href={`/login?next=${encodeURIComponent("/")}`} aria-label="Sign in to upvote report" title="Upvote" className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-[#dfe4dc] px-2.5 text-xs font-semibold text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="upvote" /><span className="tabular-nums">{report.upvote_count ?? 0}</span></Link>
                        <Link href={`/login?next=${encodeURIComponent("/")}`} aria-label="Sign in to downvote report" title="Downvote" className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-[#dfe4dc] px-2.5 text-xs font-semibold text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="downvote" /><span className="tabular-nums">{report.downvote_count ?? 0}</span></Link>
                      </>
                    )}
                    <Link href={`/reports/${report.id}#comments`} aria-label="Comment on report" title="Comment" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="comment" /></Link>
                    <Link href={`/reports/${report.id}#corroborations`} aria-label="Corroborate report" title="Corroborate" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="corroborate" /></Link>
                    <button type="button" aria-label="Share report" title={shareFeedback[report.id] || "Share"} onClick={() => void handleShare(report)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe4dc] text-[#405747] hover:bg-[#f1f4ef]"><FeedActionIcon name="share" /></button>
                    <span className="sr-only" aria-live="polite">{shareFeedback[report.id] || ""}</span>
                  </div>
                  {voteErrors[report.id] && <p role="alert" className="mt-2 text-xs text-rose-700">{voteErrors[report.id]}</p>}
                </article>;
                })}
                </div>
              ) : null}
              {!demoMode && feed.total > feed.reports.length && <p className="px-5 pb-4 text-xs text-[#818b82] sm:px-6">Showing the {feed.reports.length} newest reports in this category.</p>}
            </section>
          );
        })}
      </section>

      {selectedDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15241b]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDemo(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="demo-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#816b38]">Fictional sample · not a real report</p>
                <h2 id="demo-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#20362a]">{selectedDemo.title}</h2>
              </div>
              <button type="button" aria-label="Close sample details" onClick={() => setSelectedDemo(null)} className="rounded-full px-3 py-1 text-xl text-[#5f6c62] hover:bg-[#f1f3ef]">×</button>
            </div>
            <p className="mt-5 text-sm font-medium text-[#516356]">Subject: {selectedDemo.subject}</p>
            <p className="mt-3 text-sm leading-6 text-[#657267]">{selectedDemo.description}</p>
            <div className="mt-5 rounded-2xl border border-[#eadfbe] bg-[#faf6ea] p-4 text-xs leading-5 text-[#66582f]">Sample ID: {selectedDemo.id}. This content is only for previewing the feed. It is not stored as a Shabdhan report, does not refer to a real person or organization, and has no verification status.</div>
            <button type="button" onClick={() => setSelectedDemo(null)} className="mt-6 w-full rounded-full bg-[#183a2c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#24543e]">Close sample</button>
          </section>
        </div>
      )}

      <footer className="border-t border-[#e5e8e1] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-[#788279] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:max-w-none lg:px-8 xl:px-10">
          <Link href="/" className="font-semibold text-[#38523e]">shabdhan.</Link>
          <p>Explore openly. Read carefully. Participate responsibly.</p>
        </div>
      </footer>
    </main>
  );
}
