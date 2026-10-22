import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import ResponsiveShell from "./components/ResponsiveShell";
import { AppearanceProvider } from "./components/AppearanceProvider";

export const metadata: Metadata = {
  title: {
    default: "Shabdhan — Warn others",
    template: "%s | Shabdhan",
  },
  description:
    "Warn others by sharing public community reports and their context. Browsing is open to everyone.",
  openGraph: {
    type: "website",
    siteName: "Shabdhan",
    title: "Shabdhan — Warn others",
    description:
      "Warn others by sharing public community reports and their context.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden bg-slate-50 text-slate-950">
        <AuthProvider>
          <AppearanceProvider>
            <ResponsiveShell>{children}</ResponsiveShell>
          </AppearanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
