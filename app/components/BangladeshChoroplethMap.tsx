"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicReportStatistic } from "../lib/reports-api";

type Position = [number, number, ...number[]];
type Polygon = Position[][];
type MapGeometry = { type: "Polygon"; coordinates: Polygon } | { type: "MultiPolygon"; coordinates: Polygon[] };
type MapFeature = {
  type: "Feature";
  properties: { division_name?: string; district_name?: string; name?: string; bn_name?: string };
  geometry: MapGeometry;
};
type Level = "division" | "district" | "subdistrict";
type Props = {
  level: Level;
  division: string;
  district: string;
  statistics: PublicReportStatistic[];
  selectedArea: string;
  loading: boolean;
  onDivisionSelect: (division: string) => void;
  onDistrictSelect: (division: string, district: string) => void;
  onAreaSelect: (area: string) => void;
};

const layerPaths: Record<Level, string> = {
  division: "/maps/divisions.geojson",
  district: "/maps/districts.geojson",
  subdistrict: "/maps/subdistricts.geojson",
};
const featureCache = new Map<Level, Promise<MapFeature[]>>();
const WIDTH = 520;
const HEIGHT = 640;
const PADDING = 24;

function normalizeName(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    barisal: "barishal",
    chittagong: "chattogram",
    comilla: "cumilla",
    jessore: "jashore",
    bogra: "bogura",
  };
  return aliases[normalized] ?? normalized;
}

function readMapLayer(level: Level) {
  const cached = featureCache.get(level);
  if (cached) return cached;
  const request = fetch(layerPaths[level])
    .then(async (response) => {
      if (!response.ok) throw new Error("Map boundaries could not be loaded.");
      const result = (await response.json()) as { features: MapFeature[] };
      return result.features;
    })
    .catch((error) => {
      featureCache.delete(level);
      throw error;
    });
  featureCache.set(level, request);
  return request;
}

function featurePolygons(feature: MapFeature): Polygon[] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

function featurePositions(feature: MapFeature): Position[] {
  return featurePolygons(feature).flatMap((polygon) => polygon.flat());
}

function countFor(statistics: PublicReportStatistic[], label: string) {
  const match = statistics.find((item) => normalizeName(item.label) === normalizeName(label));
  return match?.report_count ?? 0;
}

function colorFor(count: number, maximum: number) {
  if (!count || !maximum) return "#dcfce7";
  const ratio = Math.log1p(count) / Math.log1p(maximum);
  const start = [134, 239, 172];
  const middle = [250, 204, 21];
  const end = [220, 38, 38];
  const from = ratio < 0.45 ? start : middle;
  const to = ratio < 0.45 ? middle : end;
  const amount = ratio < 0.45 ? ratio / 0.45 : (ratio - 0.45) / 0.55;
  const channel = (index: number) => Math.round(from[index] + (to[index] - from[index]) * amount).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function labelFor(feature: MapFeature, level: Level) {
  if (level === "division") return feature.properties.division_name ?? "Unknown division";
  if (level === "district") return feature.properties.district_name ?? "Unknown district";
  return feature.properties.name ?? "Unknown subdistrict";
}

export default function BangladeshChoroplethMap({
  level,
  division,
  district,
  statistics,
  selectedArea,
  loading,
  onDivisionSelect,
  onDistrictSelect,
  onAreaSelect,
}: Props) {
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [loadError, setLoadError] = useState("");
  const [hovered, setHovered] = useState("");

  useEffect(() => {
    let active = true;
    setLoadError("");
    setFeatures([]);
    readMapLayer(level)
      .then((result) => { if (active) setFeatures(result); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Map boundaries could not be loaded."); });
    return () => { active = false; };
  }, [level]);

  const visibleFeatures = useMemo(() => features.filter((feature) => {
    if (level === "district" && division && normalizeName(feature.properties.division_name ?? "") !== normalizeName(division)) return false;
    if (level === "subdistrict" && (normalizeName(feature.properties.division_name ?? "") !== normalizeName(division) || normalizeName(feature.properties.district_name ?? "") !== normalizeName(district))) return false;
    return true;
  }), [features, level, division, district]);

  const prepared = useMemo(() => {
    const positions = visibleFeatures.flatMap(featurePositions).filter((position) => Number.isFinite(position[0]) && Number.isFinite(position[1]));
    if (!positions.length) return { items: [] as { feature: MapFeature; label: string; count: number; path: string }[], width: WIDTH, height: HEIGHT };
    const projectX = (position: Position) => position[0] * 111.32 * Math.cos(23.6 * Math.PI / 180);
    const projectY = (position: Position) => position[1] * 111.32;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const position of positions) {
      const x = projectX(position), y = projectY(position);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const scale = Math.min((WIDTH - PADDING * 2) / Math.max(maxX - minX, 1), (HEIGHT - PADDING * 2) / Math.max(maxY - minY, 1));
    const drawX = (position: Position) => (WIDTH - (maxX - minX) * scale) / 2 + (projectX(position) - minX) * scale;
    const drawY = (position: Position) => (HEIGHT - (maxY - minY) * scale) / 2 + (maxY - projectY(position)) * scale;
    const maximum = Math.max(1, ...statistics.map((item) => item.report_count));
    const items = visibleFeatures.map((feature) => {
      const label = labelFor(feature, level);
      const path = featurePolygons(feature).map((polygon) => polygon.map((ring) => ring.map((position, index) => `${index ? "L" : "M"}${drawX(position).toFixed(2)},${drawY(position).toFixed(2)}`).join(" ") + " Z").join(" ")).join(" ");
      return { feature, label, count: countFor(statistics, label), path };
    });
    return { items, width: WIDTH, height: HEIGHT, maximum };
  }, [visibleFeatures, level, statistics]);

  const select = (feature: MapFeature) => {
    const properties = feature.properties;
    if (level === "division") onDivisionSelect(properties.division_name ?? "");
    else if (level === "district") onDistrictSelect(properties.division_name ?? division, properties.district_name ?? "");
    else onAreaSelect(properties.name ?? "");
  };

  const selectedCount = level === "subdistrict" ? countFor(statistics, selectedArea) : 0;
  const mappedSubdistricts = new Set(prepared.items.map((item) => normalizeName(item.label)));
  const unmappedAreaStatistics = level === "subdistrict" ? statistics.filter((item) => item.label !== "Not applicable" && !mappedSubdistricts.has(normalizeName(item.label))) : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
      <div className="relative min-h-[24rem] overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-2 sm:p-4">
        {loadError ? <p role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError}</p> : !features.length ? <p className="p-8 text-center text-sm text-slate-500">Loading Bangladesh map…</p> : !visibleFeatures.length ? <p className="p-8 text-center text-sm text-slate-500">No map boundaries are available for this area.</p> : (
          <svg viewBox={`0 0 ${prepared.width} ${prepared.height}`} role="group" aria-label={`${level === "division" ? "Bangladesh divisions" : level === "district" ? `${division || "Bangladesh"} districts` : `${district} subdistricts`} report map`} className="mx-auto block max-h-[38rem] w-full">
            <defs><filter id="map-shadow" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f513d" floodOpacity="0.14" /></filter></defs>
            <g filter="url(#map-shadow)">
              {prepared.items.map(({ feature, label, count, path }) => {
                const selected = level === "division" ? normalizeName(label) === normalizeName(division) : level === "district" ? normalizeName(label) === normalizeName(district) : normalizeName(label) === normalizeName(selectedArea);
                return <path key={`${feature.properties.division_name}-${feature.properties.district_name}-${label}`} d={path} fill={colorFor(count, prepared.maximum ?? 1)} fillRule="evenodd" stroke={selected ? "#0f766e" : hovered === label ? "#0f766e" : "#ffffff"} strokeWidth={selected ? 2.4 : hovered === label ? 2 : 1.1} vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={`${label}, ${count.toLocaleString()} reports. Select to explore.`} onClick={() => select(feature)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(feature); } }} onMouseEnter={() => setHovered(label)} onMouseLeave={() => setHovered("")} onFocus={() => setHovered(label)} onBlur={() => setHovered("")} className="cursor-pointer outline-none transition-colors focus:stroke-teal-800">
                  <title>{label}: {count.toLocaleString()} reports — select to explore</title>
                </path>;
              })}
            </g>
          </svg>
        )}
        <div className="absolute bottom-3 left-3 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Report count</p>
          <div className="flex items-center gap-2 text-xs text-slate-600"><span>Fewer</span><span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-[#86efac] via-[#facc15] to-[#dc2626]" aria-hidden="true"/><span>More</span></div>
        </div>
        {hovered && <div className="absolute right-3 top-3 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-lg">{hovered}: {countFor(statistics, hovered).toLocaleString()}</div>}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-base font-semibold text-slate-950">{level === "division" ? "Divisions" : level === "district" ? (division ? `${division} districts` : "Districts") : `${district} city corporations and subdistricts`}</h3><p className="mt-1 text-sm text-slate-500">Select a map area or a row to explore its reports.</p></div>
          {loading && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Updating…</span>}
        </div>
        <div className="mt-3 max-h-[35rem] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {prepared.items.map(({ feature, label, count }) => (
            <button key={`list-${feature.properties.division_name}-${feature.properties.district_name}-${label}`} type="button" onClick={() => select(feature)} onMouseEnter={() => setHovered(label)} onMouseLeave={() => setHovered("")} className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-emerald-50 ${normalizeName(label) === normalizeName(selectedArea || district || division) ? "bg-emerald-50" : ""}`}>
              <span className="min-w-0 truncate font-medium text-slate-800">{label}{level === "district" && !division ? <span className="ml-1 text-xs font-normal text-slate-500">· {feature.properties.division_name}</span> : null}</span>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-800" style={{ backgroundColor: colorFor(count, prepared.maximum ?? 1) }}>{count.toLocaleString()}</span>
            </button>
          ))}
          {unmappedAreaStatistics.map((item) => (
            <button key={`unmapped-${item.label}`} type="button" onClick={() => onAreaSelect(item.label)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-amber-50">
              <span className="min-w-0 truncate font-medium text-slate-800">{item.label}<span className="ml-2 text-[11px] font-normal text-amber-700">No mapped boundary</span></span>
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-900">{item.report_count.toLocaleString()}</span>
            </button>
          ))}
          {!prepared.items.length && !unmappedAreaStatistics.length && <p className="p-4 text-sm text-slate-500">Map locations are not available.</p>}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Boundary source: <a href="https://data.humdata.org/dataset/cod-ab-bgd" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">BBS / OCHA HDX Bangladesh COD-AB</a> · CC BY 3.0 IGO.</p>
        {level === "subdistrict" && selectedArea && <p className="mt-2 text-sm font-medium text-teal-800">Selected: {selectedArea} · {selectedCount.toLocaleString()} reports</p>}
      </div>
    </div>
  );
}
