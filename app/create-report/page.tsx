"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ONLINE_INCIDENT_PLATFORMS, type IncidentType } from "../../shared/incident-platforms";
import ProfilePageLayout from "../components/ProfilePageLayout";
import { useAuth } from "../components/AuthProvider";
import { createReport, createSocialAccount, getCategories, getSocialAccounts, type Category, type SocialAccount } from "../lib/reports-api";
import ReportLocationSelector from "../components/ReportLocationSelector";
import { hasCompleteLocation, type ReportLocationValue } from "../../shared/report-location";

export default function CreateReportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [socialAccountId, setSocialAccountId] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [incidentPlatform, setIncidentPlatform] = useState("");
  const [location, setLocation] = useState<ReportLocationValue>({ scope: "", countryCode: "", division: "", district: "", subDistrict: "" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [platform, setPlatform] = useState("Facebook");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void Promise.all([getCategories(), getSocialAccounts()]).then(([categoryResponse, accountResponse]) => {
      if (cancelled) return;
      setCategories(categoryResponse.categories);
      setSocialAccounts(accountResponse.social_accounts);
      setCategoryId(categoryResponse.categories[0]?.id ?? "");
      setSocialAccountId(new URLSearchParams(window.location.search).get("social_account_id") ?? accountResponse.social_accounts[0]?.id ?? "");
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load report options.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incidentType || !title.trim() || !description.trim() || (incidentType === "ONLINE" && !incidentPlatform)) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await createReport({
        social_account_id: socialAccountId || null,
        category_id: categoryId || null,
        incident_type: incidentType,
        incident_platform: incidentType === "ONLINE" ? incidentPlatform : null,
        location: hasCompleteLocation(location) ? location : undefined,
        title: title.trim(),
        description: description.trim(),
      });
      router.replace(`/reports/${response.report.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the report.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!platform.trim() || !username.trim()) return;
    setCreatingAccount(true);
    setError("");
    try {
      const response = await createSocialAccount({ platform: platform.trim(), username: username.trim(), display_name: displayName.trim() || undefined, profile_url: profileUrl.trim() || undefined });
      setSocialAccounts((current) => [response.social_account, ...current]);
      setSocialAccountId(response.social_account.id);
      setShowAccountForm(false);
      setUsername(""); setDisplayName(""); setProfileUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the social account.");
    } finally {
      setCreatingAccount(false);
    }
  }

  if (authLoading || loading) return <ProfilePageLayout><div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading report form…</div></ProfilePageLayout>;

  return <ProfilePageLayout>
    <div className="mx-auto max-w-3xl">
      <Link href="/me" className="text-sm font-medium text-teal-900 hover:underline">← Back to Me</Link>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Community report</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create a report</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Describe the incident clearly. Reports begin as drafts and are reviewed before they appear in the public feed.</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        <form onSubmit={submitReport} className="mt-7 space-y-5">
          <div>
            <label htmlFor="report-title" className="text-sm font-medium text-slate-700">Report title</label>
            <input id="report-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A concise title for the report" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
          </div>
          <div>
            <label htmlFor="report-description" className="text-sm font-medium text-slate-700">Description</label>
            <textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened? Include relevant context and dates." rows={6} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Where did the incident happen?</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(["OFFLINE", "ONLINE"] as const).map((type) => <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm ${incidentType === type ? "border-teal-800 bg-teal-50 font-medium" : "border-slate-200"}`}>
                <input type="radio" name="incident_type" value={type} checked={incidentType === type} onChange={() => { setIncidentType(type); if (type === "OFFLINE") setIncidentPlatform(""); }} required />
                {type === "OFFLINE" ? "Offline" : "Online"}
              </label>)}
            </div>
          </fieldset>
          {incidentType === "ONLINE" && <div>
            <label htmlFor="incident-platform" className="text-sm font-medium text-slate-700">Platform where it happened</label>
            <select id="incident-platform" value={incidentPlatform} onChange={(event) => setIncidentPlatform(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <option value="">Select a platform</option>{ONLINE_INCIDENT_PLATFORMS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>}
          {incidentType && <div className="rounded-2xl bg-slate-50 p-4"><ReportLocationSelector value={location} onChange={setLocation} required={incidentType === "OFFLINE"} label={incidentType === "OFFLINE" ? "Incident location" : "Reported entity location (optional)"} /></div>}
          <div>
            <label htmlFor="report-category" className="text-sm font-medium text-slate-700">Category</label>
            <select id="report-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="social-account" className="text-sm font-medium text-slate-700">Related social account (optional)</label>
              <button type="button" onClick={() => setShowAccountForm(true)} className="text-xs font-semibold text-teal-900 underline">+ Add account</button>
            </div>
            <select id="social-account" value={socialAccountId} onChange={(event) => setSocialAccountId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <option value="">No linked account</option>{socialAccounts.map((account) => <option key={account.id} value={account.id}>{account.platform} · @{account.username}</option>)}
            </select>
          </div>
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <Link href="/me" className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={submitting || !title.trim() || !description.trim() || !incidentType || (incidentType === "ONLINE" && !incidentPlatform) || (incidentType === "OFFLINE" && !hasCompleteLocation(location))} className="rounded-xl bg-teal-950 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating…" : "Create report"}</button>
          </div>
        </form>
      </section>
    </div>
    {showAccountForm && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <form onSubmit={submitAccount} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Add social account</h2>
        <p className="mt-1 text-sm text-slate-500">Add the account referenced by your report.</p>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Platform<select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>TikTok</option><option>X</option><option>LinkedIn</option><option>Other</option></select></label>
          <label className="block text-sm font-medium text-slate-700">Username<input value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Display name (optional)<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Profile URL (optional)<input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowAccountForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">Cancel</button><button type="submit" disabled={creatingAccount} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{creatingAccount ? "Adding…" : "Add account"}</button></div>
      </form>
    </div>}
  </ProfilePageLayout>;
}
