"use client";

import Link from "next/link";
import { getStoredUser } from "../lib/auth";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createReport,
  createSocialAccount,
  getCategories,
  getModerationReports,
  getReports,
  getSocialAccounts,
  reportStatusLabel,
  type ApiReport,
  type Category,
  type SocialAccount,
} from "../lib/reports-api";

export default function ReportsPage() {
  const role = getStoredUser()?.role;
  const isModerator = role === "MODERATOR" || role === "ADMIN";
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showSocialAccount, setShowSocialAccount] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [socialAccountId, setSocialAccountId] = useState("");
  const [platform, setPlatform] = useState("Facebook");
  const [username, setUsername] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const role = getStoredUser()?.role;
      const reportsRequest =
        role === "MODERATOR" || role === "ADMIN"
          ? getModerationReports({ limit: 100 })
          : getReports({ limit: 100 });

      const [rr, cr, sr] = await Promise.all([
        reportsRequest,
        getCategories(),
        getSocialAccounts(),
      ]);
      setReports(rr.reports);
      setCategories(cr.categories);
      setSocialAccounts(sr.social_accounts);

      if (cr.categories[0]) {
        setCategoryId((current) => current || cr.categories[0].id);
      }
      if (sr.social_accounts[0]) {
        setSocialAccountId((current) => current || sr.social_accounts[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function handleCreateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !socialAccountId) return;
    try {
      setSubmitting(true);
      setError("");
      await createReport({
        social_account_id: socialAccountId,
        category_id: categoryId || null,
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSocialAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!platform.trim() || !username.trim()) return;
    try {
      setCreatingAccount(true);
      setError("");
      const response = await createSocialAccount({
        platform: platform.trim(),
        username: username.trim(),
        profile_url: profileUrl.trim() || undefined,
        display_name: displayName.trim() || undefined,
      });
      setSocialAccounts((current) => [response.social_account, ...current]);
      setSocialAccountId(response.social_account.id);
      setUsername("");
      setProfileUrl("");
      setDisplayName("");
      setShowSocialAccount(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create social account");
    } finally {
      setCreatingAccount(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Shabdhan</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-2 text-sm text-slate-600">{isModerator ? "Review and manage reports submitted by all users." : "Create, review, and manage your reports."}</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            + Create report
          </button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <section className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-semibold">{isModerator ? "All reports" : "My reports"}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? "Loading..." : reports.length + " report" + (reports.length === 1 ? "" : "s")}
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-700">No reports yet</p>
                <p className="mt-1 text-sm text-slate-500">{isModerator ? "No reports have been submitted yet." : "Create your first report to get started."}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <Link key={report.id} href={"/reports/" + report.id} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{report.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{report.category?.name ?? "Uncategorized"}</span>
                        {isModerator && report.reporter?.username && <><span>•</span><span>Reporter: @{report.reporter.username}</span></>}
                        <span>•</span>
                        <span>{report.social_account?.platform} · @{report.social_account?.username}</span>
                        <span>•</span>
                        <span>Updated {new Date(report.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {reportStatusLabel(report.status, report.verification_status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <form onSubmit={handleCreateReport} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Create a report</h2>
                  <p className="mt-1 text-sm text-slate-500">Start a new verification report.</p>
                </div>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100">✕</button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">Report title</label>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a report title" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what you are reporting..." rows={4} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <option value="">No category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Social account</label>
                    <button type="button" onClick={() => setShowSocialAccount(true)} className="text-xs font-medium text-slate-700 underline">+ Add account</button>
                  </div>
                  {socialAccounts.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Add a social account before creating a report.</p>
                  ) : (
                    <select value={socialAccountId} onChange={(event) => setSocialAccountId(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <option value="">Select a social account</option>
                      {socialAccounts.map((account) => <option key={account.id} value={account.id}>{account.platform} · @{account.username}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting || !title.trim() || !description.trim() || !socialAccountId} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">
                  {submitting ? "Creating..." : "Create report"}
                </button>
              </div>
            </form>
          </div>
        )}

        {showSocialAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
            <form onSubmit={handleCreateSocialAccount} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold">Add social account</h2>
              <p className="mt-1 text-sm text-slate-500">Add the account referenced by your report.</p>
              <div className="mt-6 space-y-4">
                <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <option>Facebook</option><option>Instagram</option><option>YouTube</option><option>TikTok</option><option>X</option><option>LinkedIn</option><option>Other</option>
                </select>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name (optional)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                <input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder="Profile URL (optional)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSocialAccount(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={creatingAccount} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">
                  {creatingAccount ? "Adding..." : "Add account"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
