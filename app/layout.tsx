import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SidebarNav from "./components/SidebarNav";
import NotificationLink from "./components/NotificationLink";
import { AuthProvider } from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "Shabdhan",
  description: "Trust & verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-950">
        <AuthProvider>
          <div className="flex min-h-screen">
            <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
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

            <main className="min-w-0 flex-1">
              <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
                <div className="lg:hidden">
                  <Link
                    href="/dashboard"
                    className="text-lg font-bold tracking-tight"
                  >
                    Shabdhan
                  </Link>
                </div>

                <div className="hidden lg:block" />

                <div className="flex items-center gap-3">
                  <NotificationLink />

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    U
                  </div>
                </div>
              </header>

              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}