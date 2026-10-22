"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function PublicSiteHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isModerator = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
        <Link href="/" aria-label="Shabdhan home feed" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-950 text-sm font-bold text-white">S</span>
          <span className="text-lg font-semibold tracking-tight"><span className="text-[#006A4E]">sha</span><span className="text-[#F42A41]">bd</span><span className="text-[#006A4E]">han.</span></span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#public-feed" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">
            Feed
          </Link>
          <Link href="/search" aria-label="Search reports" title="Search reports" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="10.8" cy="10.8" r="6.3" />
              <path strokeLinecap="round" d="m15.5 15.5 4.2 4.2" />
            </svg>
          </Link>
          {user ? (
            <>
              <Link href="/me" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Me</Link>
              <Link href="/create-report" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Create report</Link>
              {isModerator && <Link href="/dashboard" className="rounded-full bg-teal-950 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 sm:px-4">Dashboard</Link>}
            </>
          ) : (
            <>
              {pathname !== "/login" && <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Log in</Link>}
              {pathname !== "/apply" && <Link href="/apply" className="rounded-full bg-teal-950 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 sm:px-4">Apply</Link>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
