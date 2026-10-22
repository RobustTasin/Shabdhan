import countryNames from "../app/lib/data/countries-en.json";
import hierarchy from "../app/lib/data/bangladesh-admin-hierarchy.json";

export type LocationScope = "BANGLADESH" | "ABROAD" | "";
export type ReportLocationValue = {
  scope: LocationScope;
  countryCode: string;
  division: string;
  district: string;
  subDistrict: string;
  area: string;
};
export const OTHER_LOCALITY_VALUE = "__OTHER_LOCALITY__";
type PlaceName = string | { en?: string; local?: string };
type Upazila = { name: PlaceName };
type District = { name: PlaceName; upazila: Upazila[] };
type Division = { name: PlaceName; district: District[] };
const divisions = (hierarchy as { data: Division[] }).data;
const countryMap = countryNames as Record<string, string>;
const english = (name: PlaceName) => typeof name === "string" ? name : name.en ?? name.local ?? "";
export const reportCountries = Object.entries(countryMap).filter(([code]) => code !== "BD").map(([code, name]) => ({ code, name })).sort((a,b)=>a.name.localeCompare(b.name));
export const bangladeshDivisions = divisions.map((item) => english(item.name));
export function bangladeshDistricts(division: string) { return divisions.find((item)=>english(item.name)===division)?.district.map((item)=>english(item.name)) ?? []; }
export function bangladeshSubDistricts(division: string, district: string) { return divisions.find((item)=>english(item.name)===division)?.district.find((item)=>english(item.name)===district)?.upazila.map((item)=>english(item.name)) ?? []; }
export function locationCountryName(value: ReportLocationValue) { return value.scope === "BANGLADESH" ? "Bangladesh" : reportCountries.find((country)=>country.code===value.countryCode)?.name ?? ""; }
export function hasCompleteLocation(value: ReportLocationValue) {
  if (value.scope === "ABROAD") return Boolean(reportCountries.some((country)=>country.code===value.countryCode));
  if (value.scope === "BANGLADESH") {
    const districtIsValid = bangladeshDistricts(value.division).includes(value.district);
    if (!districtIsValid) return false;
    if (value.subDistrict === OTHER_LOCALITY_VALUE) return value.area.trim().length >= 2 && value.area.trim().length <= 120;
    return !value.area.trim() && bangladeshSubDistricts(value.division,value.district).includes(value.subDistrict);
  }
  return false;
}
