"use client";
import { bangladeshCityCorporations, bangladeshDivisions, bangladeshDistricts, bangladeshSubDistricts, reportCountries, type ReportLocationValue } from "../../shared/report-location";

type Props = { value: ReportLocationValue; onChange: (value: ReportLocationValue) => void; required?: boolean; label?: string };
const selectClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm";
const CITY_CORPORATION_PREFIX = "city-corporation:";
export default function ReportLocationSelector({ value, onChange, required = false, label = "Location" }: Props) {
  const set = (patch: Partial<ReportLocationValue>) => onChange({ ...value, ...patch });
  const locationRequired = required || Boolean(value.scope);
  const selectedDistrictDetail = value.cityCorporation ? `${CITY_CORPORATION_PREFIX}${value.cityCorporation}` : value.subDistrict;
  return <fieldset className="space-y-4">
    <legend className="text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</legend>
    <label className="block text-sm text-slate-600">Where is the location?
      <select value={value.scope} required={required} onChange={(e)=>onChange({scope:e.target.value as ReportLocationValue["scope"],countryCode:"",division:"",district:"",subDistrict:"",cityCorporation:"",area:""})} className={selectClass}>
        <option value="">{required ? "Choose Bangladesh or abroad" : "Not provided"}</option><option value="BANGLADESH">Bangladesh</option><option value="ABROAD">Abroad</option>
      </select>
    </label>
    {value.scope === "ABROAD" && <label className="block text-sm text-slate-600">Country
      <select value={value.countryCode} required={locationRequired} onChange={(e)=>set({countryCode:e.target.value})} className={selectClass}><option value="">Choose a country</option>{reportCountries.map((country)=><option key={country.code} value={country.code}>{country.name}</option>)}</select>
    </label>}
    {value.scope === "BANGLADESH" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm text-slate-600">Division<select required={locationRequired} value={value.division} onChange={(e)=>set({division:e.target.value,district:"",subDistrict:"",cityCorporation:"",area:""})} className={selectClass}><option value="">Choose division</option>{bangladeshDivisions.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="text-sm text-slate-600">District<select required={locationRequired} value={value.district} onChange={(e)=>set({district:e.target.value,subDistrict:"",cityCorporation:"",area:""})} disabled={!value.division} className={selectClass}><option value="">Choose district</option>{bangladeshDistricts(value.division).map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="text-sm text-slate-600">Within this district (optional)<select value={selectedDistrictDetail} onChange={(e)=>{
        const selected = e.target.value;
        set(selected.startsWith(CITY_CORPORATION_PREFIX)
          ? {subDistrict:"",cityCorporation:selected.slice(CITY_CORPORATION_PREFIX.length),area:""}
          : {subDistrict:selected,cityCorporation:"",area:""});
      }} disabled={!value.district} className={selectClass}><option value="">District only</option>{bangladeshSubDistricts(value.division,value.district).length > 0 && <optgroup label="Sub-districts">{bangladeshSubDistricts(value.division,value.district).map((item)=><option key={item} value={item}>{item}</option>)}</optgroup>}{bangladeshCityCorporations(value.division,value.district).length > 0 && <optgroup label="City corporations">{bangladeshCityCorporations(value.division,value.district).map((item)=><option key={item} value={`${CITY_CORPORATION_PREFIX}${item}`}>{item}</option>)}</optgroup>}</select></label>
      {value.cityCorporation && <label className="text-sm text-slate-600">Area within city corporation (optional)<input maxLength={120} value={value.area} onChange={(e)=>set({area:e.target.value})} placeholder="Neighborhood, ward, or area" className={selectClass} /></label>}
    </div>}
  </fieldset>;
}
