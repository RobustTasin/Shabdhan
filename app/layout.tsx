import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import ResponsiveShell from "./components/ResponsiveShell";

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
      <body className="overflow-x-hidden bg-slate-50 text-slate-950">
        <AuthProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </AuthProvider>
      </body>
    </html>
  );
}
