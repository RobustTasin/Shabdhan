"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useAppearance } from "./AppearanceProvider";
import { useAuth } from "./AuthProvider";
import BrandWordmark from "./BrandWordmark";

export default function ProfilePageLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const isModerator = user?.role === "MODERATOR" || user?.role === "ADMIN";
  const { theme, setTheme } = useAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#f2f6f5] text-[#1e2c2b]">
      <header className="sticky top-0 z-50 border-b border-[#e0eae8] bg-[#fbfdfd]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Shabdhan home" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123d3b] text-sm font-bold text-[#e1f3ef]">S</span>
            <BrandWordmark className="text-lg font-semibold tracking-[-0.04em]" />
          </Link>
          <nav aria-label="Main navigation" className="ml-auto flex items-center gap-2">
            <Link href="/#public-feed" className="inline-flex h-10 items-center justify-center rounded-full bg-[#e7f1ef] px-4 text-sm font-semibold text-[#245c58] transition hover:bg-[#dfecea]">Feed</Link>
            <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#455e5c] transition hover:bg-[#e7f1ef]">
              {menuOpen ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <span aria-hidden="true" className="text-2xl leading-none">☰</span>}
            </button>
          </nav>
        </div>
        {menuOpen && <>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 hidden bg-transparent md:block" />
          <section aria-label="Navigation menu" className="absolute right-3 top-[calc(100%+0.5rem)] z-50 hidden max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[#e0eae8] bg-[#fbfdfd] p-4 shadow-[0_18px_50px_rgba(20,36,26,.18)] md:block">
            <div className="flex items-center justify-between border-b border-[#e3eeec] px-2 pb-3"><h2 className="text-base font-semibold text-[#1d3837]">Menu</h2><button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#455e5c] hover:bg-[#e7f1ef]">×</button></div>
            <nav aria-label="Menu links" className="mt-2 flex flex-col gap-1">
              <Link href={user ? "/me" : "/login?next=%2Fme"} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Me</Link>
              <section aria-label="Appearance settings" className="rounded-xl px-3 py-1">
                <button type="button" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl py-1.5 text-left text-sm font-semibold text-[#1d3837] hover:bg-[#edf4f2]">
                  Appearance <span aria-hidden="true" className={`transition-transform ${appearanceOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {appearanceOpen && <label className="mt-2 block px-1 pb-2 text-xs font-medium text-[#586c69]">Theme
                  <select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")} className="mt-1 block w-full rounded-lg border border-[#dbe7e5] bg-white px-3 py-2 text-sm text-[#1d3837]">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>}
              </section>
              <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Advanced search</Link>
              <Link href="/categories" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Browse Categories</Link>
              <Link href="/my-bangladesh" onClick={() => setMenuOpen(false)} className="site-bangladesh-link rounded-xl px-3 py-3 text-sm font-semibold text-[#F42A41] hover:bg-[#edf4f2]">আমার বাংলাদেশ</Link>
              {user ? <>
                {isModerator && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Dashboard</Link>}
                <Link href="/create-report" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Create a report</Link>
                <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="mt-2 rounded-xl border-t border-[#e3eeec] px-3 py-3 text-left text-sm font-semibold text-rose-800 hover:bg-rose-50">Log out</button>
              </> : <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Log in</Link>
                <Link href="/apply" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Apply for membership</Link>
              </>}
            </nav>
          </section>
        </>}
        {menuOpen && typeof document !== "undefined" && createPortal(
          <section role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[80] flex flex-col bg-[#f2f6f5] md:hidden">
            <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#e0eae8] bg-[#fbfdfd] px-4">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123d3b] text-sm font-bold text-[#e1f3ef]">S</span><h1 className="text-lg font-semibold text-[#1d3837]">Menu</h1></div>
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#455e5c] hover:bg-[#e7f1ef]">×</button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {user && <div className="mb-2 px-3 py-2"><p className="text-sm font-semibold text-[#1d3837]">{user.username}</p><p className="mt-1 text-xs text-[#788279]">Signed in to Shabdhan</p></div>}
              <nav aria-label="Menu links" className="flex flex-col gap-0.5">
                <Link href={user ? "/me" : "/login?next=%2Fme"} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Me</Link>
                <section aria-label="Appearance settings" className="rounded-xl px-3 py-1">
                  <button type="button" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl py-2 text-left text-sm font-semibold text-[#1d3837] hover:bg-[#edf4f2]">Appearance <span aria-hidden="true" className={`transition-transform ${appearanceOpen ? "rotate-180" : ""}`}>⌄</span></button>
                  {appearanceOpen && <label className="mt-2 block px-1 pb-2 text-xs font-medium text-[#586c69]">Theme<select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")} className="mt-1 block w-full rounded-lg border border-[#dbe7e5] bg-white px-3 py-2 text-sm text-[#1d3837]"><option value="light">Light</option><option value="dark">Dark</option></select></label>}
                </section>
                <Link href="/search" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Advanced search</Link>
                <Link href="/categories" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Browse Categories</Link>
                <Link href="/my-bangladesh" onClick={() => setMenuOpen(false)} className="site-bangladesh-link rounded-xl px-3 py-3 text-sm font-semibold text-[#F42A41] hover:bg-[#edf4f2]">আমার বাংলাদেশ</Link>
                {user ? <>{isModerator && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Dashboard</Link>}<Link href="/create-report" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Create a report</Link><button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="mt-2 rounded-xl border-t border-[#e3eeec] px-3 py-3 text-left text-sm font-semibold text-rose-800 hover:bg-rose-50">Log out</button></> : <><Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Log in</Link><Link href="/apply" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-[#edf4f2]">Apply for membership</Link></>}
              </nav>
            </div>
          </section>, document.body
        )}
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
