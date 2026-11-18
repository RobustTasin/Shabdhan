import Link from "next/link";
import PublicSiteHeader from "../components/PublicSiteHeader";

const guides = [
  {
    title: "Browse reports and categories",
    body: <p>Explore the public feed to read reports. Use <Link href="/categories" className="font-semibold text-teal-800 underline underline-offset-2">Browse categories</Link> to see reports grouped by category, or open <Link href="/search" className="font-semibold text-teal-800 underline underline-offset-2">Advanced search</Link> to narrow what you are looking for.</p>,
  },
  {
    title: "Open a report and review its details",
    body: <p>Select a report to see its description, reported entity, evidence, comments, and corroborations. Evidence images can be opened to view them at full size. Read the available information and sources before drawing conclusions.</p>,
  },
  {
    title: "Create a report",
    body: <p>Sign in and choose <strong>Create a report</strong>. Add a clear title and description, choose the closest category, and provide the incident details requested in the form. For offline incidents, provide the location details; for online incidents, include the platform and any known location information. Add supporting evidence when you have it, then review the report before submitting.</p>,
  },
  {
    title: "Add evidence and sources",
    body: <p>Evidence helps readers assess a report. Report creators can add supporting files and source links from the report page. Use material that is relevant and safe to share, and describe what it shows accurately.</p>,
  },
  {
    title: "Comment on a report",
    body: <p>Comments are for context, questions, or replies to other users. You can read public comments while signed out; sign in to add a comment or reply. Keep discussion focused on useful information about the report.</p>,
  },
  {
    title: "Corroborate a report",
    body: <p>Corroboration lets a signed-in user indicate independent support for a report. Use it only when you have a basis for supporting the information. A corroboration is a user contribution and does not by itself establish that a claim is proven.</p>,
  },
  {
    title: "Use search and location features",
    body: <p>Advanced search helps filter reports using available report details. <Link href="/my-bangladesh" className="font-semibold text-teal-800 underline underline-offset-2">আমার বাংলাদেশ</Link> presents reports with Bangladesh location data. Location filters and statistics depend on the information provided with reports.</p>,
  },
  {
    title: "Membership and your account",
    body: <p>Create an account or apply for membership using the links in the menu. Signing in enables actions such as posting comments, corroborating reports, and creating reports. Some features may be limited by your account role.</p>,
  },
];

export default function HowToUsePage() {
  return (
    <>
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Shabdhan guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">How to use Shabdhan</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">A quick guide to finding reports, reviewing evidence, and contributing responsibly.</p>
        </div>
        <div className="space-y-3">
          {guides.map((guide, index) => (
            <details key={guide.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:border-teal-200 open:bg-teal-50/30 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 marker:content-none sm:text-lg">
                <span><span className="mr-3 text-sm font-bold text-teal-800">{String(index + 1).padStart(2, "0")}</span>{guide.title}</span>
                <span aria-hidden="true" className="shrink-0 text-xl text-teal-800 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="mt-4 max-w-3xl border-t border-slate-200 pt-4 text-sm leading-7 text-slate-700 sm:text-base">{guide.body}</div>
            </details>
          ))}
        </div>
      </main>
    </>
  );
}
