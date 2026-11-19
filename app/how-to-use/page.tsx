import Link from "next/link";
import PublicSiteHeader from "../components/PublicSiteHeader";

const linkClass = "font-semibold text-teal-800 underline underline-offset-2";

const guides = [
  {
    title: "Start here: find your way around Shabdhan",
    body: (
      <>
        <p>Shabdhan is a public place to explore reports and their supporting material. You can read public reports without signing in. An account is needed when you want to contribute, such as creating a report, commenting, or corroborating.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Open <Link href="/" className={linkClass}>Feed</Link> to see published reports.</li>
          <li>Choose <Link href="/categories" className={linkClass}>Browse categories</Link> to explore reports by topic.</li>
          <li>Use <Link href="/search" className={linkClass}>Advanced search</Link> when you want to narrow results.</li>
          <li>Open any report card to read its full details, evidence, comments, and corroborations.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm"><strong>Good to know:</strong> a report is information submitted for review. Read its details and sources carefully; a report or a user’s corroboration is not, by itself, proof.</p>
      </>
    ),
  },
  {
    title: "Browse categories and open a report",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>From the menu, select <strong>Browse categories</strong>.</li>
          <li>Scan the category list and its report counts to choose a topic with reports to review.</li>
          <li>Select a category to open its report list, then choose a report card.</li>
          <li>On the report page, start with the title and description. Review the reported entity, incident type, category, and any location and dates shown.</li>
          <li>Continue to the evidence, source links, comments, and corroborations sections. Select an evidence image to view it full size; open source links to inspect the original material.</li>
        </ol>
        <p className="mt-3">You can use <strong>Copy ID</strong> to keep or share the report ID, and <strong>Share report</strong> to share the report page.</p>
      </>
    ),
  },
  {
    title: "Search for a specific report",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open <Link href="/search" className={linkClass}>Advanced search</Link>.</li>
          <li>Enter a useful word or phrase in the search field. A title, username, or report ID can help you find a specific item.</li>
          <li>Narrow results with the available category, platform, account, and location filters.</li>
          <li>To focus on a time period, set <strong>From month</strong> and/or <strong>To month</strong>.</li>
          <li>Review the result count and report cards. Open a result to verify that it matches what you are looking for.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">If a filter is too narrow, remove it or broaden the date range and search again. Location and account filters can only match details that were supplied with a report.</p>
      </>
    ),
  },
  {
    title: "Read a report and assess its evidence",
    body: (
      <>
        <p>Take a moment to separate what the report says from what its sources show. Work through the page in this order:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li><strong>Identify the claim:</strong> read the description and note who or what is reported and whether the incident is online or offline.</li>
          <li><strong>Check the details:</strong> look at the category, dates, platform, and any reported location. Some details may be missing.</li>
          <li><strong>Open the supporting material:</strong> view uploaded images full size and follow source links when available.</li>
          <li><strong>Read the discussion:</strong> comments may add context or questions; corroborations show that a user independently supports the report.</li>
          <li><strong>Keep uncertainty in view:</strong> assess the material yourself and avoid treating a status label or a vote as a guarantee that every detail is accurate.</li>
        </ol>
      </>
    ),
  },
  {
    title: "Create an account or apply for membership",
    body: (
      <>
        <p>You do not need an account just to browse public reports. Sign in when you are ready to contribute.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>If you have an account, choose <Link href="/login" className={linkClass}>Log in</Link>.</li>
          <li>If you are new, submit a <Link href="/apply" className={linkClass}>membership application</Link> with your email, social platform, and a public link to your social account for review.</li>
          <li>Applying does not create an account. Wait for the moderator’s decision by email.</li>
          <li>If approved, use <Link href="/account/create" className={linkClass}>Create account</Link> with the approved email and follow the eligibility and account setup steps.</li>
          <li>After creating your account, log in to create reports, comment, or corroborate.</li>
        </ol>
      </>
    ),
  },
  {
    title: "Create a report, step by step",
    body: (
      <>
        <p>Sign in first, then open <Link href="/create-report" className={linkClass}>Create a report</Link>. Work through the form from top to bottom:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li><strong>Choose the incident type.</strong> Select <strong>Online</strong> for activity on a platform or <strong>Offline</strong> for an incident that took place in person.</li>
          <li><strong>Enter the location information.</strong> Online reports require the incident platform. You may also add the reported entity’s known location. Offline reports require a complete incident location, selected through the location fields.</li>
          <li><strong>Choose a category</strong> that best describes the report.</li>
          <li><strong>Add the account, if relevant.</strong> Use <strong>+ Add account</strong> to provide the platform and username, with any optional profile details requested.</li>
          <li><strong>Write a clear title and description.</strong> Explain what happened in plain language and include relevant context. Distinguish what you observed from what you infer.</li>
          <li><strong>Review before submitting.</strong> Check names, spelling, dates, location, and that the information is relevant and safe to publish. Select <strong>Create report</strong>.</li>
        </ol>
        <p className="mt-3">After submission, open the new report page to review it and add supporting evidence or source links.</p>
      </>
    ),
  },
  {
    title: "Add evidence and source links to your report",
    body: (
      <>
        <p>Only the report creator can add evidence. On your report page, find <strong>Evidence and source links</strong>, then:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Choose whether you are adding a file or a source link, using the form shown.</li>
          <li>For a file, select the relevant image or document and upload it. The page will show file requirements and remaining space; the direct upload limit is 12 MB per report.</li>
          <li>For a source, paste the original URL and add any requested label or description.</li>
          <li>Check the evidence entry after it appears. Open images full size and make sure the link points to the intended source.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">Share only material that supports the report and that you have the right to publish. Avoid exposing private information that is not needed to understand the report.</p>
      </>
    ),
  },
  {
    title: "Comment and reply",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open the report and scroll to <strong>Comments</strong>. Public comments can be read while signed out.</li>
          <li>Sign in and use the comment form to add context, ask a focused question, or respond to another comment.</li>
          <li>When replying, keep your response connected to the comment and the report.</li>
          <li>Review your wording before posting. Be specific, respectful, and avoid sharing personal information that does not belong in a public discussion.</li>
        </ol>
      </>
    ),
  },
  {
    title: "Corroborate a report responsibly",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Read the report and review the available evidence and sources first.</li>
          <li>Sign in and go to the <strong>Corroborations</strong> section.</li>
          <li>Select <strong>Corroborate report</strong>. Add a short note if you have useful context; the note is optional.</li>
          <li>Submit only if you have an independent basis for supporting the report. Do not corroborate solely because another person has done so.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm">Corroboration records a user’s support. It does not certify the report or prove the claim.</p>
      </>
    ),
  },
  {
    title: "Explore আমার বাংলাদেশ statistics",
    body: (
      <>
        <p>Open <Link href="/my-bangladesh" className={linkClass}>আমার বাংলাদেশ</Link> to explore reports with available location data and see how report counts vary across places and time.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Choose a <strong>Group by</strong> option, such as division, district, sub-district, country, full location, category, incident type, or month.</li>
          <li>Optionally select a category and a From/To month range to narrow the statistics.</li>
          <li>Choose whether to sort by report count or name, and select the direction that makes the results easiest to compare.</li>
          <li>Select a location or group when you want to continue exploring its reports.</li>
        </ol>
        <p className="mt-3">These statistics reflect the location details included in reports. Missing or incomplete location data will not appear as a precise place.</p>
      </>
    ),
  },
  {
    title: "Manage your reports and account",
    body: (
      <>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open <strong>Me</strong> or your account menu to find your account area and your contributions.</li>
          <li>Open one of your reports to review its current details, discussion, and evidence.</li>
          <li>Use report editing controls when you need to correct or update information. Remove a report only when appropriate, since deletion affects its public record.</li>
          <li>Use <strong>Log out</strong> on a shared device when you finish.</li>
        </ol>
        <p className="mt-3">Some controls are shown only to the report creator or to users with the required account role.</p>
      </>
    ),
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
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">A step-by-step guide to finding reports, checking their supporting material, and contributing responsibly. Open a section to follow the steps.</p>
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
