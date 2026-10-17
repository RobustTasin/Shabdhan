"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useAuth } from "./AuthProvider";

export default function ProfilePageLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6f2] text-[#1e2924]">
      <header className="sticky top-0 z-50 border-b border-[#e5e8e1] bg-[#fbfcf9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Shabdhan home" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#183a2c] text-sm font-bold text-[#eaf1d7]">S</span>
            <span className="text-lg font-semibold tracking-[-0.04em]">shabdhan<span className="text-[#65846e]">.</span></span>
          </Link>
          <nav aria-label="Main navigation" className="ml-auto flex items-center gap-2">
            <Link href="/#public-feed" className="inline-flex h-10 items-center justify-center rounded-full bg-[#edf1e9] px-4 text-sm font-semibold text-[#244a34] transition hover:bg-[#e3e9df]">Feed</Link>
            <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#48594e] transition hover:bg-[#edf1e9]">
              {menuOpen ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <span aria-hidden="true" className="text-2xl leading-none">☰</span>}
            </button>
          </nav>
        </div>
        {menuOpen && <>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-transparent" />
          <section aria-label="Navigation menu" className="absolute right-3 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[#e5e8e1] bg-[#fbfcf9] p-4 shadow-[0_18px_50px_rgba(20,36,26,.18)]">
            <div className="flex items-center justify-between border-b border-[#e8ebe5] px-2 pb-3"><h2 className="text-base font-semibold text-[#20362a]">Menu</h2><button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#48594e] hover:bg-[#edf1e9]">×</button></div>
            <nav aria-label="Menu links" className="mt-2 flex flex-col gap-1">
              <Link href="/#public-feed" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Browse feed</Link>
              <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Advanced search</Link>
              {user ? <>
                <Link href="/me" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Me</Link>
                <Link href="/reports" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">My reports</Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Dashboard</Link>
              </> : <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Log in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#f0f2ed]">Join Shabdhan</Link>
              </>}
            </nav>
          </section>
        </>}
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
