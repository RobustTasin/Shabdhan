"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SidebarNav from "./SidebarNav";
import NotificationLink from "./NotificationLink";

export default function ResponsiveShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compactExpanded, setCompactExpanded] = useState(false);

  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop full sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link href="/dashboard">
            <div className="text-xl font-bold tracking-tight">
              Shabdhan
            </div>

            <div className="text-xs text-slate-500">
              Trust & verification
            </div>
          </Link>
        </div>

        <SidebarNav />

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-semibold">
              Account
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Authenticated user
            </div>
          </div>
        </div>
      </aside>

      {/* Compact / expandable tablet sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 md:flex md:flex-col xl:hidden ${
          compactExpanded ? "w-64" : "w-[72px]"
        }`}
      >
        <div
          className={`relative flex h-16 items-center border-b border-slate-200 ${
            compactExpanded
              ? "justify-between px-4"
              : "justify-center"
          }`}
        >
          {compactExpanded ? (
            <>
              <Link href="/dashboard" className="min-w-0">
                <div className="truncate text-xl font-bold tracking-tight">
                  Shabdhan
                </div>

                <div className="text-xs text-slate-500">
                  Trust & verification
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setCompactExpanded(false)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-100"
              >
                &lt;
              </button>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                aria-label="Shabdhan dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white"
              >
                S
              </Link>

              <button
                type="button"
                onClick={() => setCompactExpanded(true)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="absolute right-[-48px] top-1/2 z-50 flex h-10 w-12 -translate-y-1/2 items-center justify-center rounded-r-lg border border-slate-300 bg-white text-lg font-bold text-slate-600 shadow-md transition hover:bg-slate-100"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-slate-600"
                />
              </button>
            </>
          )}
        </div>

        <SidebarNav compact={!compactExpanded} />
      </aside>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,320px)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="text-xl font-bold tracking-tight">
              Shabdhan
            </div>

            <div className="text-xs text-slate-500">
              Trust & verification
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100"
          >
            X
          </button>
        </div>

        <SidebarNav
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 md:hidden"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                ☰
              </span>
            </button>

            <Link
              href="/dashboard"
              className="truncate text-lg font-bold tracking-tight md:hidden"
            >
              Shabdhan
            </Link>
          </div>

          <div className="hidden md:block" />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationLink />

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              U
            </div>
          </div>
        </header>

        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
