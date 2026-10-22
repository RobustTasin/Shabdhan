"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useAppearance } from "./AppearanceProvider";
import BrandWordmark from "./BrandWordmark";

export default function PublicSiteHeader() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useAppearance();
  const pathname = usePathname();
  const isModerator = user?.role === "MODERATOR" || user?.role === "ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const menuLinks = (
    <>
      <Link href={user ? "/me" : "/login?next=%2Fme"} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Me</Link>
      <section aria-label="Appearance settings" className="rounded-xl px-3 py-1">
        <button type="button" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100">
          Appearance <span aria-hidden="true" className={`transition-transform ${appearanceOpen ? "rotate-180" : ""}`}>⌄</span>
        </button>
        {appearanceOpen && <label className="mt-2 block px-1 pb-2 text-xs font-medium text-slate-600">Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>}
      </section>
      <Link href="/search" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Advanced search</Link>
      <Link href="/categories" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Browse categories</Link>
      <Link href="/my-bangladesh" onClick={closeMenu} className="site-bangladesh-link rounded-xl px-3 py-3 text-sm font-semibold text-[#F42A41] hover:bg-slate-100">আমার বাংলাদেশ</Link>
      {user ? <>
        {isModerator && <Link href="/dashboard" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Dashboard</Link>}
        <Link href="/create-report" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Create a report</Link>
        <button type="button" onClick={() => { closeMenu(); logout(); }} className="mt-2 rounded-xl border-t border-slate-200 px-3 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Log out</button>
      </> : <>
        <Link href="/login" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Log in</Link>
        <Link href="/apply" onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-slate-100">Apply for membership</Link>
      </>}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
        <Link href="/" aria-label="Shabdhan home feed" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-950 text-sm font-bold text-white">S</span>
          <BrandWordmark className="text-lg font-semibold tracking-tight" />
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
              <Link href="/create-report" aria-label="Create report" title="Create report" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto sm:px-4"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 sm:hidden"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg><span className="hidden sm:inline">Create report</span></Link>
              {isModerator && <Link href="/dashboard" className="rounded-full bg-teal-950 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 sm:px-4">Dashboard</Link>}
            </>
          ) : (
            <>
              {pathname !== "/login" && <Link href="/login" className="rounded-full bg-teal-950 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 sm:px-4">Log in</Link>}
              {pathname !== "/apply" && <Link href="/apply" className="rounded-full bg-teal-950 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 sm:px-4">Apply</Link>}
            </>
          )}
          <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100">
            {menuOpen ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </nav>
      </div>
      {menuOpen && <>
        <button type="button" aria-label="Close menu" onClick={closeMenu} className="fixed inset-0 z-40 hidden bg-transparent md:block" />
        <section aria-label="Navigation menu" className="absolute right-3 top-[calc(100%+0.5rem)] z-50 hidden max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:block">
          <div className="flex items-center justify-between border-b border-slate-200 px-2 pb-3"><h2 className="text-base font-semibold text-slate-900">Menu</h2><button type="button" aria-label="Close menu" onClick={closeMenu} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">×</button></div>
          <nav aria-label="Menu links" className="mt-2 flex flex-col gap-1">{menuLinks}</nav>
        </section>
        {typeof document !== "undefined" && createPortal(<section role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[80] flex flex-col bg-slate-50 md:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-900 text-sm font-bold text-white">S</span><h1 className="text-lg font-semibold text-slate-900">Menu</h1></div><button type="button" aria-label="Close menu" onClick={closeMenu} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-600 hover:bg-slate-100">×</button></div>
          {user && <div className="border-b border-slate-200 bg-white px-7 py-3"><p className="text-sm font-semibold text-slate-900">{user.username}</p><p className="mt-1 text-xs text-slate-500">Signed in to Shabdhan</p></div>}
          <nav aria-label="Menu links" className="flex-1 overflow-y-auto p-4">{menuLinks}</nav>
        </section>, document.body)}
      </>}
    </header>
  );
}
