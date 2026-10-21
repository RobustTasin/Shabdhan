"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import PublicSiteHeader from "../components/PublicSiteHeader";
import { submitMembershipApplication } from "../lib/membership-api";
import { SUGGESTED_SOCIAL_PLATFORMS, formatMembershipApplicationNumber } from "../../shared/membership";

export default function ApplyForMembershipPage() {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await submitMembershipApplication({
        email: email.trim(),
        social_platform: platform.trim(),
        social_url: socialUrl.trim(),
      });
      setApplicationNumber(formatMembershipApplicationNumber(response.application_number));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicSiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <Link href="/" className="text-sm font-medium text-teal-900 hover:underline">← Back to feed</Link>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          {applicationNumber ? (
            <section aria-live="polite">
              <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">Application received</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Thanks for applying.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Your application number is <strong className="font-mono text-slate-900">{applicationNumber}</strong>. A moderator will review it and manually email you with the decision within 48 hours.</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">If approved, visit account creation and check eligibility with this email. You do not need to create an account before applying.</p>
              <Link href="/account/create" className="mt-5 inline-flex rounded-xl border border-teal-900 px-5 py-3 text-sm font-semibold text-teal-950 hover:bg-teal-50">Check account eligibility</Link>
              <Link href="/" className="mt-7 inline-flex rounded-xl bg-teal-950 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900">Return to feed</Link>
            </section>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Shabdhan membership</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Apply for membership</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">A moderator reviews your application and manually emails you with the decision within 48 hours. If approved, use this email on the account creation page.</p>
              {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="membership-email" className="text-sm font-medium text-slate-800">Email address</label>
                  <input id="membership-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-100" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="membership-platform" className="text-sm font-medium text-slate-800">Social platform</label>
                  <input id="membership-platform" list="membership-platform-options" required minLength={2} maxLength={50} value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-100" placeholder="Choose or enter a platform" />
                  <datalist id="membership-platform-options">
                    {SUGGESTED_SOCIAL_PLATFORMS.map((item) => <option key={item} value={item} />)}
                  </datalist>
                  <p className="mt-1.5 text-xs text-slate-500">Enter any social platform where a moderator can find your account.</p>
                </div>
                <div>
                  <label htmlFor="membership-social-url" className="text-sm font-medium text-slate-800">Link to your social account</label>
                  <input id="membership-social-url" type="url" required maxLength={2048} value={socialUrl} onChange={(event) => setSocialUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-800 focus:ring-2 focus:ring-teal-100" placeholder="https://..." />
                  <p className="mt-1.5 text-xs text-slate-500">Use a public profile or channel link that a moderator can review.</p>
                </div>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Your email and social link are used for membership review and are only shown to moderators. Applying does not create an account.</p>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-teal-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Submitting…" : "Submit application"}</button>
              </form>
              <p className="mt-6 text-center text-sm text-slate-500">Already applied? <Link href="/account/create" className="font-semibold text-teal-950 hover:underline">Create account</Link></p>
              <p className="mt-6 text-center text-sm text-slate-500">Already a member? <Link href="/login" className="font-medium text-teal-900 hover:underline">Log in</Link></p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
