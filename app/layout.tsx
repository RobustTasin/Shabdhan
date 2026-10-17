import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import ResponsiveShell from "./components/ResponsiveShell";
import { AppearanceProvider } from "./components/AppearanceProvider";

export const metadata: Metadata = {
  title: {
    default: "Shabdhan — Community reports, with context",
    template: "%s | Shabdhan",
  },
  description:
    "Explore public community reports, understand their review status, and contribute responsibly. Browsing is open to everyone.",
  openGraph: {
    type: "website",
    siteName: "Shabdhan",
    title: "Shabdhan — Community reports, with context",
    description:
      "Explore public community reports, understand their review status, and contribute responsibly.",
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
