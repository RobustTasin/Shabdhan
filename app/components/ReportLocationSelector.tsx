"use client";
import { bangladeshDivisions, bangladeshDistricts, bangladeshSubDistricts, reportCountries, type ReportLocationValue } from "../../shared/report-location";

type Props = { value: ReportLocationValue; onChange: (value: ReportLocationValue) => void; required?: boolean; label?: string };
const selectClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm";
export default function ReportLocationSelector({ value, onChange, required = false, label = "Location" }: Props) {
  const set = (patch: Partial<ReportLocationValue>) => onChange({ ...value, ...patch });
  const locationRequired = required || Boolean(value.scope);
  return <fieldset className="space-y-4">
    <legend className="text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</legend>
    <label className="block text-sm text-slate-600">Where is the location?
      <select value={value.scope} required={required} onChange={(e)=>onChange({scope:e.target.value as ReportLocationValue["scope"],countryCode:"",division:"",district:"",subDistrict:""})} className={selectClass}>
        <option value="">{required ? "Choose Bangladesh or abroad" : "Not provided"}</option><option value="BANGLADESH">Bangladesh</option><option value="ABROAD">Abroad</option>
      </select>
    </label>
    {value.scope === "ABROAD" && <label className="block text-sm text-slate-600">Country
      <select value={value.countryCode} required={locationRequired} onChange={(e)=>set({countryCode:e.target.value})} className={selectClass}><option value="">Choose a country</option>{reportCountries.map((country)=><option key={country.code} value={country.code}>{country.name}</option>)}</select>
    </label>}
    {value.scope === "BANGLADESH" && <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm text-slate-600">Division<select required={locationRequired} value={value.division} onChange={(e)=>set({division:e.target.value,district:"",subDistrict:""})} className={selectClass}><option value="">Choose division</option>{bangladeshDivisions.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="text-sm text-slate-600">District<select required={locationRequired} value={value.district} onChange={(e)=>set({district:e.target.value,subDistrict:""})} disabled={!value.division} className={selectClass}><option value="">Choose district</option>{bangladeshDistricts(value.division).map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="text-sm text-slate-600">Sub-district<select required={locationRequired} value={value.subDistrict} onChange={(e)=>set({subDistrict:e.target.value})} disabled={!value.district} className={selectClass}><option value="">Choose sub-district</option>{bangladeshSubDistricts(value.division,value.district).map((item)=><option key={item}>{item}</option>)}</select></label>
    </div>}
  </fieldset>;
}
