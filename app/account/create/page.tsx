"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import PublicSiteHeader from "../../components/PublicSiteHeader";
import { setAuth } from "../../lib/auth";
import { checkMembershipEligibility, completeMembership, verifyMembershipCode } from "../../lib/membership-api";

type Step = "email" | "code" | "account";

export default function CreateAccountPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setChecking(true);
    try {
      const result = await checkMembershipEligibility(email.trim());
      if (result.eligible) setStep("code");
      else setError("We couldn't find an approved application for this email with an active code.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to check eligibility"); }
    finally { setChecking(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setChecking(true);
    try {
      const result = await verifyMembershipCode(email.trim(), code);
      if (result.eligible) setStep("account");
      else setError("That code is incorrect, expired, or no longer eligible. Check it or contact a moderator for help.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify code"); }
    finally { setChecking(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await completeMembership({ email: email.trim(), code, username: username.trim(), password });
      setAuth(response.token, response.user); window.location.assign("/me");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create account"); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f2f6f5]"><PublicSiteHeader /><div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
    <Link href="/" className="text-sm font-semibold text-[#326966] hover:underline">← Back to feed</Link>
    <section className="mt-5 rounded-3xl border border-[#dbe7e5] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,37,0.08)] sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e817d]">Approved membership</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#123d3b] sm:text-4xl">Create your account</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627573]">First check the email you applied with. If your application is approved, enter the six-character code a moderator sent you to continue.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {step === "email" && <form onSubmit={check} className="mt-7 space-y-4">
        <div><label className="block text-sm font-medium text-[#344f4e]" htmlFor="eligible-email">Application email</label>
        <input id="eligible-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-[#fbfdfd] px-4 py-3 text-sm text-[#1d3837] outline-none focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]" /></div>
        <button disabled={checking || !email} className="w-full rounded-xl bg-[#123d3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#225c57] disabled:opacity-60">{checking ? "Checking…" : "Check eligibility"}</button>
      </form>}
      {step === "code" && <form onSubmit={verifyCode} className="mt-6 rounded-2xl border border-[#cae2df] bg-[#eef7f6] p-5">
        <p role="status" className="text-sm font-semibold text-[#123d3b]">Your application is approved. Enter the code sent to <span className="break-all">{email}</span>.</p>
        <label className="mt-4 block text-sm font-medium text-[#344f4e]" htmlFor="membership-code">Six-character approval code</label>
        <input id="membership-code" required minLength={6} maxLength={6} pattern="[A-Za-z0-9]{6}" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase())} placeholder="A1B2C3" className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-white px-4 py-3 font-mono text-sm uppercase tracking-[0.3em] text-[#1d3837] outline-none focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]" />
        <button disabled={checking || code.length !== 6} className="mt-4 w-full rounded-xl bg-[#123d3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#225c57] disabled:opacity-60">{checking ? "Verifying…" : "Verify code"}</button>
        <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="mt-3 w-full text-sm font-semibold text-[#326966] hover:underline">Use a different email</button>
      </form>}
      {step === "account" && <div className="mt-6 rounded-2xl border border-[#cae2df] bg-[#eef7f6] p-5">
        <p role="status" className="text-sm font-semibold text-[#123d3b]">Code verified. Choose your username and password.</p>
        <form onSubmit={create} className="mt-5 space-y-4">
          <div><label htmlFor="new-username" className="text-sm font-medium text-[#344f4e]">Username</label><input id="new-username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-white px-4 py-3 text-sm text-[#1d3837] outline-none focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]" placeholder="Choose a unique username" /><p className="mt-1 text-xs text-[#718481]">3–50 letters, numbers, or underscores. Usernames must be unique.</p></div>
          <div><label htmlFor="new-password" className="text-sm font-medium text-[#344f4e]">Password</label><input id="new-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-white px-4 py-3 text-sm text-[#1d3837] outline-none focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]" /></div>
          <div><label htmlFor="confirm-password" className="text-sm font-medium text-[#344f4e]">Confirm password</label><input id="confirm-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dbe7e5] bg-white px-4 py-3 text-sm text-[#1d3837] outline-none focus:border-[#4e817d] focus:ring-2 focus:ring-[#dfedeb]" /></div>
          <button disabled={busy} className="w-full rounded-xl bg-[#123d3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#225c57] disabled:opacity-60">{busy ? "Creating account…" : "Create account"}</button>
        </form>
      </div>}
      <p className="mt-6 border-t border-[#e3eeec] pt-6 text-center text-sm text-[#627573]">Already have an account? <Link href="/login" className="font-semibold text-[#123d3b] hover:underline">Log in</Link></p>
    </section>
  </div></main>;
}
