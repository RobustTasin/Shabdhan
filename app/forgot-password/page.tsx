"use client";

import Link from "next/link";
import BrandWordmark from "../components/BrandWordmark";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeManualPasswordReset, requestPasswordReset } from "../lib/membership-api";

type Mode = "choose" | "request" | "code";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { const result = await requestPasswordReset(email.trim()); setMessage(result.message); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to request a code"); }
    finally { setBusy(false); }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await completeManualPasswordReset({ email: email.trim(), code: code.trim().toUpperCase(), password }); router.replace("/login?reset=success"); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to reset password"); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="text-center"><Link href="/" className="text-2xl font-bold tracking-tight"><BrandWordmark /></Link><p className="mt-2 text-sm text-slate-500">Reset your password</p></div>
    <h1 className="mt-7 text-xl font-semibold text-slate-950">Forgot password?</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">A moderator reviews reset requests and manually emails a six-letter code to the account email.</p>
    {error && <div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="mt-5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>}
    {mode === "choose" && <div className="mt-6 grid gap-3"><button onClick={() => { setMode("request"); setMessage(""); }} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Get a Code</button><button onClick={() => { setMode("code"); setMessage(""); }} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800">I Have a Code</button></div>}
    {mode === "request" && <form onSubmit={request} className="mt-6 space-y-4"><label htmlFor="email" className="block text-sm font-medium text-slate-700">Account email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" /><button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Submitting…" : "Request a Code"}</button><button type="button" onClick={() => setMode("choose")} className="w-full text-sm font-medium text-slate-600">Back</button></form>}
    {mode === "code" && <form onSubmit={reset} className="mt-6 space-y-4"><div><label htmlFor="email" className="text-sm font-medium text-slate-700">Account email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" placeholder="you@example.com" /></div><div><label htmlFor="code" className="text-sm font-medium text-slate-700">Six-letter code</label><input id="code" required minLength={6} maxLength={6} pattern="[A-Za-z]{6}" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, "").slice(0, 6).toUpperCase())} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-center font-mono text-xl tracking-[0.45em]" placeholder="ABCDEF" /></div><div><label htmlFor="password" className="text-sm font-medium text-slate-700">New password</label><input id="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" /></div><div><label htmlFor="confirm" className="text-sm font-medium text-slate-700">Confirm new password</label><input id="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" /></div><button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Change password"}</button><button type="button" onClick={() => setMode("choose")} className="w-full text-sm font-medium text-slate-600">Back</button></form>}
    <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm"><Link href="/login" className="font-medium text-slate-900 hover:underline">Back to sign in</Link></div>
  </section></main>;
}
