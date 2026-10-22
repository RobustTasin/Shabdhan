"use client";

import { useEffect, useState } from "react";
import ProfilePageLayout from "../components/ProfilePageLayout";
import { getCategories, getPublicReportStatistics, getPublicReportStatus, type Category, type PublicReportStatistic, type PublicReportStatus } from "../lib/reports-api";

type LocationLeaderKey = "division" | "district" | "sub_district";
const LOCATION_LEADERS: { key: LocationLeaderKey; label: string }[] = [
  { key: "division", label: "Division with most reports" },
  { key: "district", label: "District with most reports" },
  { key: "sub_district", label: "City corporation or subdistrict with most reports" },
];

export default function MyBangladeshPage() {
  const [counts, setCounts] = useState<PublicReportStatus | null>(null);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupBy, setGroupBy] = useState("division");
  const [sortBy, setSortBy] = useState<"count" | "label">("count");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [categoryId, setCategoryId] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [statistics, setStatistics] = useState<PublicReportStatistic[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [leaders, setLeaders] = useState<Record<LocationLeaderKey, PublicReportStatistic | null>>({ division: null, district: null, sub_district: null });
  const [leadersLoading, setLeadersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicReportStatus()
      .then((result) => {
        if (active) setCounts(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load report status.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { void getCategories().then((result)=>setCategories(result.categories)).catch(()=>setCategories([])); }, []);
  useEffect(() => {
    let active = true;
    Promise.all(LOCATION_LEADERS.map(async ({ key }) => {
      const rows = await getPublicReportStatistics({ groupBy: key, sortBy: "count", direction: "desc" });
      return [key, rows.find((row) => row.report_count > 0 && row.label.trim() && row.label !== "Not applicable") ?? null] as const;
    }))
      .then((entries) => { if (active) setLeaders(Object.fromEntries(entries) as Record<LocationLeaderKey, PublicReportStatistic | null>); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load location leaders."); })
      .finally(() => { if (active) setLeadersLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    getPublicReportStatistics({ groupBy, sortBy, direction, categoryId, fromMonth, toMonth })
      .then((result)=>{if(active)setStatistics(result);})
      .catch((err:unknown)=>{if(active)setError(err instanceof Error?err.message:"Could not load location statistics.");})
      .finally(()=>{if(active)setStatsLoading(false);});
    return ()=>{active=false;};
  }, [groupBy, sortBy, direction, categoryId, fromMonth, toMonth]);

  return (
    <ProfilePageLayout>
      <div className="mx-auto max-w-5xl py-5 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-slate-600">Shabdhan · National overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">আমার বাংলাদেশ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A live overview of report activity across the whole website.
          </p>
        </header>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
          </div>
        ) : (
          <section aria-label="Website report status and leading locations" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-slate-600">All reports</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{counts ? counts.total.toLocaleString() : <span className="text-slate-300">—</span>}</p>
            </article>
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-slate-600">Under review</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{counts ? counts.under_review.toLocaleString() : <span className="text-slate-300">—</span>}</p>
            </article>
            {LOCATION_LEADERS.map(({ key, label }) => {
              const leader = leaders[key];
              return <article key={key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <p className="mt-2 break-words text-xl font-bold text-slate-950">{leadersLoading ? <span className="text-slate-300">—</span> : leader?.label ?? "No location data"}</p>
                {leader && <p className="mt-1 text-sm tabular-nums text-slate-500">{leader.report_count.toLocaleString()} {leader.report_count === 1 ? "report" : "reports"}</p>}
              </article>;
            })}
          </section>
        )}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div><h2 className="text-xl font-semibold text-slate-950">Reported locations and trends</h2><p className="mt-1 text-sm text-slate-600">Explore submitted reports by place, category, incident type, or month.</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Group by<select value={groupBy} onChange={(e)=>setGroupBy(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="division">Division</option><option value="district">District</option><option value="sub_district">Sub-district</option><option value="country">Country</option><option value="location">Full location</option><option value="category">Category</option><option value="incident_type">Incident type</option><option value="month">Month</option></select></label>
            <label className="text-sm font-medium text-slate-700">Category filter<select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">All categories</option><option value="uncategorized">Uncategorized</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Sort<select value={`${sortBy}:${direction}`} onChange={(e)=>{const [sort,dir]=e.target.value.split(":");setSortBy(sort as "count"|"label");setDirection(dir as "asc"|"desc");}} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="count:desc">Most reports first</option><option value="count:asc">Fewest reports first</option><option value="label:asc">Name A–Z</option><option value="label:desc">Name Z–A</option></select></label>
            <label className="text-sm font-medium text-slate-700">From month<input type="month" value={fromMonth} onChange={(e)=>setFromMonth(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="text-sm font-medium text-slate-700">To month<input type="month" value={toMonth} onChange={(e)=>setToMonth(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          </div>
          {statsLoading ? <p className="mt-6 text-sm text-slate-500">Loading statistics…</p> : statistics.length ? <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{statistics.map((item)=><div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-sm font-medium text-slate-800">{item.label}</span><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold tabular-nums text-teal-900">{item.report_count.toLocaleString()}</span></div>)}</div> : <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No reports match these filters yet.</p>}
        </section>
      </div>
    </ProfilePageLayout>
  );
}
