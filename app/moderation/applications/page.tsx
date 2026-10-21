"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import {
  approveMembershipApplication,
  declineMembershipApplication,
  getMembershipApplications,
  issueMembershipApplicationCode,
} from "../../lib/membership-api";
import {
  formatMembershipApplicationNumber,
  type MembershipApplication,
  type MembershipApplicationStatus,
} from "../../../shared/membership";

type Filter = MembershipApplicationStatus | "ALL";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function MembershipApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const canModerate = user?.role === "MODERATOR" || user?.role === "ADMIN";
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplications = useCallback(async (status: Filter) => {
    if (!canModerate) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getMembershipApplications(status);
      setApplications(response.applications);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load applications");
    } finally {
      setLoading(false);
    }
  }, [canModerate]);

  useEffect(() => {
    if (!authLoading) void loadApplications(filter);
  }, [authLoading, filter, loadApplications]);

  async function runAction(application: MembershipApplication, action: "approve" | "decline" | "issue-code") {
    const code = codes[application.id]?.toUpperCase() ?? "";
    if (action !== "decline" && !/^[A-Z0-9]{6}$/.test(code)) { setError("Enter a six-character code using letters and numbers before approving."); return; }
    if (action === "decline" && !window.confirm(`Decline ${formatMembershipApplicationNumber(application.application_number)}?`)) return;
    setBusyId(application.id);
    setError("");
    setNotice("");
    try {
      const response = action === "approve"
        ? await approveMembershipApplication(application.id, code)
        : action === "issue-code"
          ? await issueMembershipApplicationCode(application.id, code)
          : await declineMembershipApplication(application.id);
      if (action !== "decline") setCodes((prev) => ({ ...prev, [application.id]: code }));
      setNotice(response.message);
      await loadApplications(filter);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update application");
      if (action === "approve") {
        setFilter("APPROVED");
        await loadApplications("APPROVED");
      } else {
        await loadApplications(filter);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return <main className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading membership applications…</main>;
  }

  if (!user || !canModerate) {
    return <main className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><h1 className="font-semibold text-rose-950">Access denied</h1><p className="mt-2 text-sm text-rose-800">You need moderator or admin access to review membership applications.</p></main>;
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/moderation" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Moderation</Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Membership applications</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Review the social profile, enter a six-character code using letters and numbers when approving, then manually email the decision and code within 48 hours. Codes expire after 48 hours.</p>
        </div>
        <label className="text-sm font-medium text-slate-700">Show
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
            <option value="ALL">All applications</option>
          </select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Refreshing applications…</div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">No applications here</h2>
          <p className="mt-2 text-sm text-slate-500">New applications will appear in this queue.</p>
        </div>
      ) : (
        <section aria-label="Applications" className="space-y-4">
          {applications.map((application) => {
            const busy = busyId === application.id;
            const serial = formatMembershipApplicationNumber(application.application_number);
            return (
              <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-700">{serial}</p>
                    <p className="mt-1 break-all text-base font-semibold text-slate-950">{application.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${application.status === "PENDING" ? "bg-amber-50 text-amber-900" : application.status === "APPROVED" ? "bg-teal-50 text-teal-900" : "bg-slate-100 text-slate-700"}`}>{application.status}</span>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Social account</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{application.social_platform}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Applied</dt>
                    <dd className="mt-1 text-sm text-slate-700">{formatDate(application.created_at)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Profile link</dt>
                    <dd className="mt-1 break-all text-sm"><a href={application.social_url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-900 underline underline-offset-2">{application.social_url}</a></dd>
                  </div>
                </dl>
                {application.status !== "PENDING" && <p className="mt-4 text-xs text-slate-500">Reviewed {formatDate(application.reviewed_at)}{application.reviewed_by_username ? ` by ${application.reviewed_by_username}` : ""}{application.account_created_at ? ` · Account created ${formatDate(application.account_created_at)}` : ""}</p>}
                {application.status === "APPROVED" && !application.account_created_at && <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-950">
                  {codes[application.id] ? <><p>Manually email this code before {application.code_expires_at ? formatDate(application.code_expires_at) : "it expires"}.</p><p className="mt-2 font-mono text-xl font-bold tracking-[0.3em]">{codes[application.id]}</p></> : application.code_expires_at ? <p>A code is set and expires {formatDate(application.code_expires_at)}. It is only displayed immediately after being set; issue a new code below if you need to email it again.</p> : <p>No approval code has been set. Set one before the applicant can create an account.</p>}
                </div>}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {application.status === "PENDING" ? (
                    <>
                      <label className="min-w-48 flex-1 text-sm font-medium text-slate-700">Six-character approval code<input aria-label={`Six-character approval code for ${application.email}`} value={codes[application.id] ?? ""} maxLength={6} onChange={(event) => setCodes((prev) => ({ ...prev, [application.id]: event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() }))} placeholder="A1B2C3" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest" /></label>
                      <button type="button" disabled={busy || !/^[A-Z0-9]{6}$/.test(codes[application.id] ?? "")} onClick={() => void runAction(application, "approve")} className="rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? "Working…" : "Accept"}</button>
                      <button type="button" disabled={busy} onClick={() => void runAction(application, "decline")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Decline</button>
                    </>
                  ) : application.status === "APPROVED" && !application.account_created_at ? <>
                    <label className="min-w-48 flex-1 text-sm font-medium text-slate-700">{application.code_expires_at ? "Replace approval code" : "Set approval code"}<input aria-label={`New six-character approval code for ${application.email}`} value={codes[application.id] ?? ""} maxLength={6} onChange={(event) => setCodes((prev) => ({ ...prev, [application.id]: event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() }))} placeholder="A1B2C3" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest" /></label>
                    <button type="button" disabled={busy || !/^[A-Z0-9]{6}$/.test(codes[application.id] ?? "")} onClick={() => void runAction(application, "issue-code")} className="self-end rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? "Working…" : "Set code"}</button>
                  </> : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
