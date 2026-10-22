import countryNames from "../app/lib/data/countries-en.json";
import hierarchy from "../app/lib/data/bangladesh-admin-hierarchy.json";

export type LocationScope = "BANGLADESH" | "ABROAD" | "";
export type ReportLocationValue = {
  scope: LocationScope;
  countryCode: string;
  division: string;
  district: string;
  subDistrict: string;
  cityCorporation: string;
  area: string;
};
type PlaceName = string | { en?: string; local?: string };
type Upazila = { name: PlaceName };
type District = { name: PlaceName; upazila: Upazila[] };
type Division = { name: PlaceName; district: District[] };
const divisions = (hierarchy as { data: Division[] }).data;
const countryMap = countryNames as Record<string, string>;
const english = (name: PlaceName) => typeof name === "string" ? name : name.en ?? name.local ?? "";
const cityCorporationsByDistrict: Record<string, string[]> = {
  Barishal: ["Barishal City Corporation"],
  Chattogram: ["Chattogram City Corporation"],
  Cumilla: ["Cumilla City Corporation"],
  Dhaka: ["Dhaka North City Corporation", "Dhaka South City Corporation"],
  Gazipur: ["Gazipur City Corporation"],
  Khulna: ["Khulna City Corporation"],
  Mymensingh: ["Mymensingh City Corporation"],
  Narayanganj: ["Narayanganj City Corporation"],
  Rajshahi: ["Rajshahi City Corporation"],
  Rangpur: ["Rangpur City Corporation"],
  Sylhet: ["Sylhet City Corporation"],
};
export const reportCountries = Object.entries(countryMap).filter(([code]) => code !== "BD").map(([code, name]) => ({ code, name })).sort((a,b)=>a.name.localeCompare(b.name));
export const bangladeshDivisions = divisions.map((item) => english(item.name));
export function bangladeshDistricts(division: string) { return divisions.find((item)=>english(item.name)===division)?.district.map((item)=>english(item.name)) ?? []; }
export function bangladeshSubDistricts(division: string, district: string) { return divisions.find((item)=>english(item.name)===division)?.district.find((item)=>english(item.name)===district)?.upazila.map((item)=>english(item.name)) ?? []; }
export function bangladeshCityCorporations(division: string, district: string) {
  if (!bangladeshDistricts(division).includes(district)) return [];
  return cityCorporationsByDistrict[district] ?? [];
}
export function locationCountryName(value: ReportLocationValue) { return value.scope === "BANGLADESH" ? "Bangladesh" : reportCountries.find((country)=>country.code===value.countryCode)?.name ?? ""; }
export function hasCompleteLocation(value: ReportLocationValue) {
  if (value.scope === "ABROAD") return Boolean(reportCountries.some((country)=>country.code===value.countryCode));
  if (value.scope === "BANGLADESH") {
    const districtIsValid = bangladeshDistricts(value.division).includes(value.district);
    if (!districtIsValid) return false;
    if (value.cityCorporation) {
      return !value.subDistrict && bangladeshCityCorporations(value.division, value.district).includes(value.cityCorporation) && value.area.trim().length <= 120;
    }
    if (value.area.trim()) return false;
    return !value.subDistrict || bangladeshSubDistricts(value.division,value.district).includes(value.subDistrict);
  }
  return false;
}
