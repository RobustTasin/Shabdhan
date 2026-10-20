"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function PublicSiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Shabdhan home feed" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950 text-sm font-bold text-white">S</span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">shabdhan.</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#public-feed" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">
            Feed
          </Link>
          <Link href="/search" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">
            Search
          </Link>
          {user ? (
            <>
              <Link href="/me" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Me</Link>
              <Link href="/dashboard" className="rounded-full bg-emerald-950 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 sm:px-4">Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Log in</Link>
              <Link href="/apply" className="rounded-full bg-emerald-950 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 sm:px-4">Apply</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
