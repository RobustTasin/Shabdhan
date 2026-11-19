"use client";

import { useEffect, useMemo, useState } from "react";
import ProfilePageLayout from "../components/ProfilePageLayout";
import BangladeshChoroplethMap from "../components/BangladeshChoroplethMap";
import { bangladeshCityCorporations, bangladeshDivisions, bangladeshDistricts } from "../../shared/report-location";
import {
  getCategories,
  getPublicReportStatistics,
  getPublicReportStatus,
  type Category,
  type PublicReportStatistic,
  type PublicReportStatus,
} from "../lib/reports-api";

type MapLevel = "division" | "district" | "subdistrict";
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
  const [categoryId, setCategoryId] = useState("");
  const [mapLevel, setMapLevel] = useState<MapLevel>("division");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [mapStatistics, setMapStatistics] = useState<PublicReportStatistic[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [areaCategories, setAreaCategories] = useState<PublicReportStatistic[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [groupBy, setGroupBy] = useState("division");
  const [sortBy, setSortBy] = useState<"count" | "label">("count");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [statistics, setStatistics] = useState<PublicReportStatistic[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [leaders, setLeaders] = useState<Record<LocationLeaderKey, PublicReportStatistic | null>>({ division: null, district: null, sub_district: null });
  const [leadersLoading, setLeadersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicReportStatus()
      .then((result) => { if (active) setCounts(result); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load report status."); });
    getCategories().then((result) => { if (active) setCategories(result.categories); }).catch(() => { if (active) setCategories([]); });
    Promise.all(LOCATION_LEADERS.map(async ({ key }) => {
      const rows = await getPublicReportStatistics({ groupBy: key, sortBy: "count", direction: "desc" });
      return [key, rows.find((row) => row.report_count > 0 && row.label.trim() && row.label !== "Not applicable") ?? null] as const;
    }))
      .then((entries) => { if (active) setLeaders(Object.fromEntries(entries) as Record<LocationLeaderKey, PublicReportStatistic | null>); })
      .catch(() => { if (active) setLeaders({ division: null, district: null, sub_district: null }); })
      .finally(() => { if (active) setLeadersLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setMapLoading(true);
    setMapError("");
    const params = {
      groupBy: mapLevel === "division" ? "division" : mapLevel === "district" ? "district" : "sub_district",
      sortBy: "count" as const,
      direction: "desc" as const,
      categoryId,
      ...(mapLevel !== "division" && selectedDivision ? { division: selectedDivision } : {}),
      ...(mapLevel === "subdistrict" && selectedDistrict ? { district: selectedDistrict } : {}),
    };
    getPublicReportStatistics(params)
      .then((result) => { if (active) setMapStatistics(result); })
      .catch((err: unknown) => { if (active) setMapError(err instanceof Error ? err.message : "Could not load report counts for the map."); })
      .finally(() => { if (active) setMapLoading(false); });
    return () => { active = false; };
  }, [mapLevel, selectedDivision, selectedDistrict, categoryId]);

  useEffect(() => {
    if (!selectedDivision) { setAreaCategories([]); setAreaLoading(false); return; }
    let active = true;
    setAreaLoading(true);
    const locationParams = {
      groupBy: "category",
      categoryId,
      division: selectedDivision,
      ...(selectedDistrict ? { district: selectedDistrict } : {}),
      ...(selectedArea && selectedDistrict
        ? bangladeshCityCorporations(selectedDivision, selectedDistrict).includes(selectedArea)
          ? { cityCorporation: selectedArea }
          : { subDistrict: selectedArea }
        : {}),
    };
    getPublicReportStatistics(locationParams)
      .then((result) => { if (active) setAreaCategories(result.filter((item) => item.label !== "Not applicable")); })
      .catch(() => { if (active) setAreaCategories([]); })
      .finally(() => { if (active) setAreaLoading(false); });
    return () => { active = false; };
  }, [selectedDivision, selectedDistrict, selectedArea, categoryId]);

  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    getPublicReportStatistics({ groupBy, sortBy, direction, categoryId, fromMonth, toMonth })
      .then((result) => { if (active) setStatistics(result); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Could not load location statistics."); })
      .finally(() => { if (active) setStatsLoading(false); });
    return () => { active = false; };
  }, [groupBy, sortBy, direction, categoryId, fromMonth, toMonth]);

  const mapTotal = useMemo(() => mapStatistics.reduce((total, item) => total + (item.label === "Not applicable" ? 0 : item.report_count), 0), [mapStatistics]);
  const areaTotal = useMemo(() => areaCategories.reduce((total, item) => total + item.report_count, 0), [areaCategories]);
  const overviewLabel = selectedArea || selectedDistrict || selectedDivision || "Bangladesh";
  const overviewItems = selectedArea ? areaCategories : mapStatistics.filter((item) => item.label !== "Not applicable");
  const overviewTotal = selectedArea ? areaTotal : mapTotal;

  function showDivisions() {
    setMapLevel("division");
    setSelectedDivision("");
    setSelectedDistrict("");
    setSelectedArea("");
  }
  function showDistricts() {
    setMapLevel("district");
    setSelectedDivision("");
    setSelectedDistrict("");
    setSelectedArea("");
  }
  function selectDivision(division: string) {
    setSelectedDivision(division);
    setSelectedDistrict("");
    setSelectedArea("");
    setMapLevel("district");
  }
  function selectDistrict(division: string, district: string) {
    setSelectedDivision(division);
    setSelectedDistrict(district);
    setSelectedArea("");
    setMapLevel("subdistrict");
  }

  return (
    <ProfilePageLayout>
      <div className="mx-auto max-w-7xl py-5 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-teal-800">Shabdhan · National overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">আমার বাংলাদেশ</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore report activity by place. Select a division, district, or subdistrict to see its live overview.</p>
        </header>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

        <section aria-label="Report activity map" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Report activity map</h2>
                <p className="mt-1 text-sm text-slate-600">Darker red means more reports; green means fewer reports.</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div aria-label="Map level" className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button type="button" aria-pressed={mapLevel === "division"} onClick={showDivisions} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mapLevel === "division" ? "bg-white text-teal-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Divisions</button>
                  <button type="button" aria-pressed={mapLevel !== "division"} onClick={showDistricts} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mapLevel !== "division" ? "bg-white text-teal-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Districts</button>
                </div>
                <label className="min-w-48 text-sm font-medium text-slate-700">Category filter
                  <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSelectedArea(""); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <option value="">All categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button type="button" onClick={showDivisions} className={`rounded-full px-3 py-1.5 ${!selectedDivision ? "bg-teal-50 font-semibold text-teal-900" : "text-teal-800 hover:bg-teal-50"}`}>Bangladesh</button>
              {selectedDivision && <><span aria-hidden="true" className="text-slate-400">/</span><button type="button" onClick={() => { setSelectedDistrict(""); setSelectedArea(""); setMapLevel("district"); }} className={`rounded-full px-3 py-1.5 ${!selectedDistrict ? "bg-teal-50 font-semibold text-teal-900" : "text-teal-800 hover:bg-teal-50"}`}>{selectedDivision}</button></>}
              {selectedDistrict && <><span aria-hidden="true" className="text-slate-400">/</span><span className="rounded-full bg-teal-50 px-3 py-1.5 font-semibold text-teal-900">{selectedDistrict}</span></>}
              {selectedArea && <><span aria-hidden="true" className="text-slate-400">/</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-900">{selectedArea}</span></>}
            </div>
          </div>
          <div className="p-3 sm:p-6">
            <BangladeshChoroplethMap
              level={mapLevel}
              division={selectedDivision}
              district={selectedDistrict}
              statistics={mapStatistics}
              selectedArea={selectedArea}
              loading={mapLoading}
              onDivisionSelect={selectDivision}
              onDistrictSelect={selectDistrict}
              onAreaSelect={setSelectedArea}
            />
            {mapError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{mapError}</p>}
          </div>
        </section>

        <section aria-live="polite" aria-label="Live overview for selected location" className="mt-5 rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">Live overview</p><h2 className="mt-1 text-xl font-bold text-slate-950">{overviewLabel}</h2><p className="mt-1 text-sm text-slate-600">{selectedArea ? "Report count and category mix for the selected area." : selectedDistrict ? "District-level report totals by reported city corporation or subdistrict." : selectedDivision ? "Division-level report totals by district." : mapLevel === "district" ? "Report totals for districts across Bangladesh." : "Report totals for divisions across Bangladesh."}</p></div>
            <div className="rounded-2xl border border-white bg-white px-5 py-3 shadow-sm"><p className="text-xs font-medium text-slate-500">{selectedArea ? "Reports in selected area" : selectedDistrict ? "Reports in this district" : selectedDivision ? "Reports in this division" : "Reports in mapped areas"}</p><p className="mt-1 text-3xl font-bold tabular-nums text-teal-950">{selectedArea ? areaLoading ? "…" : areaTotal.toLocaleString() : mapLoading ? "…" : mapTotal.toLocaleString()}</p></div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overviewItems.length ? overviewItems.map((item) => <button key={item.label} type="button" onClick={() => {
              if (!selectedDistrict && mapLevel === "division") selectDivision(item.label);
              else if (mapLevel === "district" && !selectedDistrict) {
                const divisionForDistrict = selectedDivision || bangladeshDivisions.find((name) => bangladeshDistricts(name).includes(item.label)) || "";
                selectDistrict(divisionForDistrict, item.label);
              } else if (mapLevel === "subdistrict" && selectedDistrict && !selectedArea) setSelectedArea(item.label);
            }} disabled={Boolean(selectedArea) || (mapLevel === "subdistrict" && item.label === "Not applicable")} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white"><span className="truncate text-sm font-medium text-slate-700">{item.label}</span><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-900">{item.report_count.toLocaleString()}</span></button>) : <p className="rounded-xl bg-white p-4 text-sm text-slate-500">{mapLoading || areaLoading ? "Updating overview…" : "No reports match this location and category yet."}</p>}
          </div>
          {selectedArea && areaLoading && <p className="mt-4 text-sm text-slate-500">Updating category breakdown…</p>}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Overall report statistics">
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">All reports</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{counts ? counts.total.toLocaleString() : <span className="text-slate-300">—</span>}</p></article>
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">Under review</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{counts ? counts.under_review.toLocaleString() : <span className="text-slate-300">—</span>}</p></article>
          {LOCATION_LEADERS.map(({ key, label }) => { const leader = leaders[key]; return <article key={key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 break-words text-xl font-bold text-slate-950">{leadersLoading ? <span className="text-slate-300">—</span> : leader?.label ?? "No location data"}</p>{leader && <p className="mt-1 text-sm tabular-nums text-slate-500">{leader.report_count.toLocaleString()} {leader.report_count === 1 ? "report" : "reports"}</p>}</article>; })}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div><h2 className="text-xl font-semibold text-slate-950">Detailed report statistics</h2><p className="mt-1 text-sm text-slate-600">Compare location, category, incident type, and month totals.</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Group by<select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="division">Division</option><option value="district">District</option><option value="sub_district">City corporation or subdistrict</option><option value="country">Country</option><option value="location">Full location</option><option value="category">Category</option><option value="incident_type">Incident type</option><option value="month">Month</option></select></label>
            <label className="text-sm font-medium text-slate-700">Category filter<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">All categories</option><option value="uncategorized">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Sort<select value={`${sortBy}:${direction}`} onChange={(event) => { const [sort, dir] = event.target.value.split(":"); setSortBy(sort as "count" | "label"); setDirection(dir as "asc" | "desc"); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="count:desc">Most reports first</option><option value="count:asc">Fewest reports first</option><option value="label:asc">Name A–Z</option><option value="label:desc">Name Z–A</option></select></label>
            <label className="text-sm font-medium text-slate-700">From month<input type="month" value={fromMonth} onChange={(event) => setFromMonth(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="text-sm font-medium text-slate-700">To month<input type="month" value={toMonth} onChange={(event) => setToMonth(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          </div>
          {statsLoading ? <p className="mt-6 text-sm text-slate-500">Loading statistics…</p> : statistics.length ? <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{statistics.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-sm font-medium text-slate-800">{item.label}</span><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold tabular-nums text-teal-900">{item.report_count.toLocaleString()}</span></div>)}</div> : <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No reports match these filters yet.</p>}
        </section>
      </div>
    </ProfilePageLayout>
  );
}
