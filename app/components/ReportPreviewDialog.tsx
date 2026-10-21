"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";
import { createComment } from "../lib/comments-api";
import { createCorroboration } from "../lib/corroborations-api";
import { formatPublicReportId } from "../../shared/report-id";
import type { ApiReport } from "../lib/reports-api";

export default function ReportPreviewDialog({ report, onClose }: { report: ApiReport; onClose: () => void }) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [supportingNote, setSupportingNote] = useState("");
  const [busy, setBusy] = useState<"comment" | "corroboration" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const accountName = report.social_account?.display_name || report.social_account?.username;
  const reportId = formatPublicReportId(report.public_report_category_code, report.public_report_number);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !comment.trim() || busy) return;
    setBusy("comment"); setError(""); setMessage("");
    try {
      await createComment({ report_id: report.id, content: comment.trim() });
      setComment(""); setMessage("Your comment was posted.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not post your comment."); }
    finally { setBusy(null); }
  }

  async function submitCorroboration() {
    if (!user || busy) return;
    setBusy("corroboration"); setError(""); setMessage("");
    try {
      await createCorroboration({ report_id: report.id, comment: supportingNote.trim() || undefined });
      setSupportingNote(""); setMessage("Your corroboration was added.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not corroborate this report."); }
    finally { setBusy(null); }
  }

  return <div className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#102322]/55 p-5 backdrop-blur-sm md:flex" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="report-preview-title" className="flex max-h-[min(90vh,54rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#dbe7e5] bg-[#fbfdfd] shadow-[0_24px_80px_rgba(9,28,27,.3)]">
      <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[#e3eeec] px-6 py-5 sm:px-8">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#24716c]">{report.category?.name ?? "Uncategorized"} <span aria-hidden="true">·</span> {reportId}</p><h2 id="report-preview-title" className="mt-2 text-xl font-semibold leading-7 tracking-tight text-[#1d3837] sm:text-2xl">{report.title}</h2></div>
        <button type="button" aria-label="Close report details" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-[#455e5c] transition hover:bg-[#e7f1ef]">×</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        {report.preview_image_url && <img src={report.preview_image_url} alt={`Evidence image for ${report.title}`} className="mb-5 max-h-72 w-full rounded-2xl bg-[#e7f1ef] object-cover" />}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#617573]"><span className="font-medium text-[#344f4e]">{accountName ? `${report.social_account?.display_name ? `${accountName} · ` : ""}@${report.social_account?.username}` : report.incident_type === "OFFLINE" ? "Offline incident" : `Online · ${report.incident_platform}`}</span><span aria-hidden="true">·</span><span>{report.published_at ? new Date(report.published_at).toLocaleDateString() : "Recently published"}</span><span className="rounded-full bg-[#e6f3f1] px-2.5 py-1 text-xs font-semibold text-[#286a65]">{report.verification_status === "VERIFIED" ? "Verified" : report.status}</span></div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#405654]">{report.description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[#536d6a]"><span className="rounded-full bg-[#edf4f2] px-3 py-1.5">↑ {report.upvote_count ?? 0}</span><span className="rounded-full bg-[#edf4f2] px-3 py-1.5">↓ {report.downvote_count ?? 0}</span>{Boolean(report.verified_evidence_count) && <span className="rounded-full bg-[#edf4f2] px-3 py-1.5">{report.verified_evidence_count} verified {report.verified_evidence_count === 1 ? "source" : "sources"}</span>}</div>

        <section className="mt-6 grid gap-4 border-t border-[#e3eeec] pt-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#dbe7e5] bg-white p-4"><h3 className="text-sm font-semibold text-[#1d3837]">Comment</h3>{user ? <form onSubmit={submitComment} className="mt-3"><label htmlFor="preview-comment" className="sr-only">Write a comment</label><textarea id="preview-comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={5000} placeholder="Add context or join the discussion…" disabled={busy !== null} className="w-full resize-y rounded-xl border border-[#dbe7e5] bg-[#fbfdfd] px-3 py-2.5 text-sm text-[#1d3837] outline-none focus:border-[#5a9993] focus:ring-2 focus:ring-[#e4f1ef]" /><button type="submit" disabled={busy !== null || !comment.trim()} className="mt-3 rounded-xl bg-[#123d3b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e615b] disabled:opacity-50">{busy === "comment" ? "Posting…" : "Post comment"}</button></form> : <p className="mt-2 text-sm text-[#617573]">Sign in to comment. <Link href={`/login?next=${encodeURIComponent(`/reports/${report.id}#comments`)}`} onClick={onClose} className="font-semibold text-[#24716c] hover:underline">Log in</Link></p>}</div>
          <div className="rounded-2xl border border-[#dbe7e5] bg-white p-4"><h3 className="text-sm font-semibold text-[#1d3837]">Corroborate</h3>{user ? user.id === report.reporter_id ? <p className="mt-2 text-sm text-[#617573]">You can’t corroborate your own report.</p> : <><label htmlFor="preview-corroboration" className="sr-only">Optional corroboration context</label><textarea id="preview-corroboration" value={supportingNote} onChange={(event) => setSupportingNote(event.target.value)} rows={3} maxLength={2000} placeholder="Add a note (optional)…" disabled={busy !== null} className="mt-3 w-full resize-y rounded-xl border border-[#dbe7e5] bg-[#fbfdfd] px-3 py-2.5 text-sm text-[#1d3837] outline-none focus:border-[#5a9993] focus:ring-2 focus:ring-[#e4f1ef]" /><button type="button" onClick={() => void submitCorroboration()} disabled={busy !== null} className="mt-3 rounded-xl bg-[#123d3b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e615b] disabled:opacity-50">{busy === "corroboration" ? "Saving…" : "Corroborate report"}</button></> : <p className="mt-2 text-sm text-[#617573]">Sign in to corroborate. <Link href={`/login?next=${encodeURIComponent(`/reports/${report.id}#corroborations`)}`} onClick={onClose} className="font-semibold text-[#24716c] hover:underline">Log in</Link></p>}</div>
        </section>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</p>}
      </div>
      <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e3eeec] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8"><p className="text-xs text-[#718481]">This preview shows the essentials. Open the report for full evidence and discussion.</p><Link href={`/reports/${report.id}`} onClick={onClose} className="inline-flex justify-center rounded-xl bg-[#123d3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e615b]">View full report</Link></footer>
    </section>
  </div>;
}
