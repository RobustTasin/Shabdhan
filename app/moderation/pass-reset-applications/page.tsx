"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { approvePasswordResetApplication, declinePasswordResetApplication, getPasswordResetApplications, type PasswordResetApplication } from "../../lib/membership-api";

type Filter = "ALL" | PasswordResetApplication["status"];
const serial = (value: string) => `PASS-${String(value).padStart(5, "0")}`;

export default function PassResetApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const allowed = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [items, setItems] = useState<PasswordResetApplication[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    setLoading(true);
    try { const result = await getPasswordResetApplications(filter); setItems(result.applications); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load requests"); }
    finally { setLoading(false); }
  }, [allowed, filter]);
  useEffect(() => { if (!authLoading) void load(); }, [authLoading, load]);

  async function act(item: PasswordResetApplication, action: "approve" | "decline") {
    const code = codes[item.id]?.toUpperCase() ?? "";
    if (action === "approve" && !/^[A-Z]{6}$/.test(code)) { setError("Enter a six-letter code before approving."); return; }
    if (action === "decline" && !window.confirm(`Decline ${serial(item.application_number)}?`)) return;
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const result = action === "approve" ? await approvePasswordResetApplication(item.id, code) : await declinePasswordResetApplication(item.id);
      if (action === "approve") setCodes((prev) => ({ ...prev, [item.id]: code }));
      setNotice(result.message); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update request"); }
    finally { setBusyId(""); }
  }

  if (authLoading || loading) return <main className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading password reset applications…</main>;
  if (!allowed) return <main className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><h1 className="font-semibold text-rose-950">Access denied</h1><p className="mt-2 text-sm text-rose-800">Moderator or admin access is required.</p></main>;

  return <main className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/moderation" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Moderation</Link><h1 className="mt-2 text-2xl font-semibold text-slate-950">Pass-Res Applications</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Review reset requests. When accepting, create a unique six-letter code and email it to the user manually. Codes expire after 48 hours.</p></div>
      <label className="text-sm font-medium text-slate-700">Show<select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="DECLINED">Declined</option><option value="COMPLETED">Completed</option><option value="ALL">All</option></select></label></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}
    {items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="font-semibold text-slate-900">No requests here</h2><p className="mt-2 text-sm text-slate-500">Password reset requests will appear here.</p></div> : <section aria-label="Password reset applications" className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold text-slate-700">{serial(item.application_number)}</p><p className="mt-1 break-all text-base font-semibold text-slate-950">{item.email}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "PENDING" ? "bg-amber-50 text-amber-900" : item.status === "APPROVED" ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>{item.status}</span></div><p className="mt-4 text-sm text-slate-600">Requested {new Date(item.created_at).toLocaleString()} · Active account {item.account_exists ? "found" : "not found"}</p>
      {item.status === "PENDING" && <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row"><label className="flex-1 text-sm font-medium text-slate-700">Six-letter code<input aria-label={`Six-letter code for ${item.email}`} value={codes[item.id] ?? ""} maxLength={6} onChange={(e) => setCodes((prev) => ({ ...prev, [item.id]: e.target.value.replace(/[^a-z]/gi, "").slice(0, 6).toUpperCase() }))} placeholder="ABCDEF" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest" /></label><div className="flex items-end gap-2"><button disabled={busyId === item.id || !item.account_exists} onClick={() => void act(item, "approve")} className="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busyId === item.id ? "Working…" : "Accept"}</button><button disabled={busyId === item.id} onClick={() => void act(item, "decline")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Decline</button></div></div>}
      {item.status === "APPROVED" && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950"><p>Manually email this code to the user before {item.code_expires_at ? new Date(item.code_expires_at).toLocaleString() : "expiry"}.</p>{codes[item.id] ? <p className="mt-2 font-mono text-xl font-bold tracking-[0.3em]">{codes[item.id]}</p> : <p className="mt-2 text-xs">The code is only shown immediately after approval. If it was lost, decline the old request and ask the user to submit another request.</p>}</div>}</article>)}</section>}
  </main>;
}
