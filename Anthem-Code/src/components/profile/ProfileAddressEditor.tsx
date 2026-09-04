import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROFILE_ADDRESS_EDITOR_COPY_TH,
  type ProfileAddress,
  type ProfileAddressEditorCopy,
} from "@/lib/profileAddress";
import { normalizeThaiProvince, THAI_PROVINCES } from "@/lib/thaiProvinces";
import {
  listDistrictsForProvince,
  listPostalCodes,
  listSubdistrictsForDistrict,
  resolvePostalCode,
} from "@/lib/thaiAddressLookup";
import { cn } from "@/lib/utils";

type AddressInvalid = {
  line1?: boolean;
  province?: boolean;
  district?: boolean;
  subdistrict?: boolean;
  postalCode?: boolean;
};

type Props = {
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
  idPrefix?: string;
  required?: boolean;
  hideHeader?: boolean;
  line1Label?: string;
  invalid?: AddressInvalid;
  fieldClassName?: string;
  copy?: ProfileAddressEditorCopy;
};

const NONE = "__none__";

function ReqStar() {
  return (
    <span className="text-primary" aria-hidden="true">
      {" *"}
    </span>
  );
}

function withLegacy(options: string[], current: string): string[] {
  const t = current.trim();
  if (!t || options.includes(t)) return options;
  return [t, ...options];
}

/** ที่อยู่แบบมาตรฐาน: จังหวัด → อำเภอ/เขต → ตำบล/แขวง → รหัสไปรษณีย์ */
export default function ProfileAddressEditor({
  value,
  onChange,
  idPrefix = "profile-address",
  required = false,
  hideHeader = false,
  line1Label,
  invalid,
  fieldClassName,
  copy = PROFILE_ADDRESS_EDITOR_COPY_TH,
}: Props) {
  const lineLabel = line1Label ?? copy.line1;
  const province = normalizeThaiProvince(value.province) || value.province.trim();

  const districts = useMemo(() => {
    const list = listDistrictsForProvince(province);
    return withLegacy(list, value.district);
  }, [province, value.district]);

  const subdistricts = useMemo(() => {
    if (!province || !value.district.trim()) return withLegacy([], value.subdistrict);
    const list = listSubdistrictsForDistrict(province, value.district);
    return withLegacy(list, value.subdistrict);
  }, [province, value.district, value.subdistrict]);

  const postalOptions = useMemo(() => {
    if (!province || !value.district.trim() || !value.subdistrict.trim()) {
      return withLegacy([], value.postalCode);
    }
    const list = listPostalCodes(province, value.district, value.subdistrict);
    return withLegacy(list, value.postalCode);
  }, [province, value.district, value.subdistrict, value.postalCode]);

  const onProvince = (next: string) => {
    const p = next === NONE ? "" : next;
    const current = province;
    if (p === current) return;
    onChange({
      ...value,
      province: p,
      district: "",
      subdistrict: "",
      postalCode: "",
    });
  };

  const onDistrict = (next: string) => {
    const d = next === NONE ? "" : next;
    if (d === value.district.trim()) return;
    onChange({
      ...value,
      district: d,
      subdistrict: "",
      postalCode: "",
    });
  };

  const onSubdistrict = (next: string) => {
    const s = next === NONE ? "" : next;
    if (s === value.subdistrict.trim()) {
      if (!value.postalCode.trim() && s) {
        const postal = resolvePostalCode(province, value.district, s);
        if (postal) onChange({ ...value, postalCode: postal });
      }
      return;
    }
    const postal = s ? resolvePostalCode(province, value.district, s) : "";
    onChange({
      ...value,
      subdistrict: s,
      postalCode: postal,
    });
  };

  const onPostal = (next: string) => {
    const zip = next === NONE ? "" : next.replace(/\D/g, "").slice(0, 5);
    if (zip === value.postalCode.trim()) return;
    onChange({
      ...value,
      postalCode: zip,
    });
  };

  const districtDisabled = !province;
  const subdistrictDisabled = !province || !value.district.trim();
  const postalDisabled = !province || !value.district.trim() || !value.subdistrict.trim();
  const triggerClass = (bad?: boolean) =>
    cn(
      "rounded-xl bg-secondary border-border",
      fieldClassName,
      bad && "border-destructive focus:ring-destructive",
    );
  const inputClass = (bad?: boolean) =>
    cn(
      "rounded-xl bg-secondary border-border",
      fieldClassName,
      bad && "border-destructive focus-visible:ring-destructive",
    );

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-foreground">{copy.title}</h3>
            <p className="text-xs text-muted-foreground">{copy.hint}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2" data-kyc-error={invalid?.line1 ? "true" : undefined}>
          <Label htmlFor={`${idPrefix}-line1`}>
            {lineLabel}
            {required ? <ReqStar /> : null}
          </Label>
          <Input
            id={`${idPrefix}-line1`}
            value={value.line1}
            onChange={(e) =>
              onChange({ ...value, line1: e.target.value.slice(0, 120) })
            }
            placeholder={copy.line1Ph}
            maxLength={120}
            className={inputClass(invalid?.line1)}
            aria-invalid={invalid?.line1}
          />
        </div>

        <div className="space-y-1.5" data-kyc-error={invalid?.province ? "true" : undefined}>
          <Label htmlFor={`${idPrefix}-province`}>
            {copy.province}
            {required ? <ReqStar /> : null}
          </Label>
          <Select
            key={`province-${province || "none"}`}
            value={province || undefined}
            onValueChange={onProvince}
          >
            <SelectTrigger
              id={`${idPrefix}-province`}
              className={triggerClass(invalid?.province)}
              aria-invalid={invalid?.province}
            >
              <SelectValue placeholder={copy.selectProvince} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {!required && <SelectItem value={NONE}>{copy.unspecified}</SelectItem>}
              {THAI_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5" data-kyc-error={invalid?.district ? "true" : undefined}>
          <Label htmlFor={`${idPrefix}-district`}>
            {copy.district}
            {required ? <ReqStar /> : null}
          </Label>
          <Select
            key={`district-${province}-${value.district.trim() || "none"}`}
            value={value.district.trim() || undefined}
            onValueChange={onDistrict}
            disabled={districtDisabled}
          >
            <SelectTrigger
              id={`${idPrefix}-district`}
              className={triggerClass(invalid?.district)}
              aria-invalid={invalid?.district}
            >
              <SelectValue placeholder={districtDisabled ? copy.selectDistrictFirst : copy.selectDistrict} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {!required && <SelectItem value={NONE}>{copy.unspecified}</SelectItem>}
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5" data-kyc-error={invalid?.subdistrict ? "true" : undefined}>
          <Label htmlFor={`${idPrefix}-subdistrict`}>
            {copy.subdistrict}
            {required ? <ReqStar /> : null}
          </Label>
          <Select
            key={`subdistrict-${province}-${value.district.trim()}-${value.subdistrict.trim() || "none"}`}
            value={value.subdistrict.trim() || undefined}
            onValueChange={onSubdistrict}
            disabled={subdistrictDisabled}
          >
            <SelectTrigger
              id={`${idPrefix}-subdistrict`}
              className={triggerClass(invalid?.subdistrict)}
              aria-invalid={invalid?.subdistrict}
            >
              <SelectValue
                placeholder={subdistrictDisabled ? copy.selectSubdistrictFirst : copy.selectSubdistrict}
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {!required && <SelectItem value={NONE}>{copy.unspecified}</SelectItem>}
              {subdistricts.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5" data-kyc-error={invalid?.postalCode ? "true" : undefined}>
          <Label htmlFor={`${idPrefix}-postal`}>
            {copy.postalCode}
            {required ? <ReqStar /> : null}
          </Label>
          {postalOptions.length > 1 ? (
            <Select
              value={value.postalCode.trim() || undefined}
              onValueChange={onPostal}
              disabled={postalDisabled}
            >
              <SelectTrigger
                id={`${idPrefix}-postal`}
                className={triggerClass(invalid?.postalCode)}
                aria-invalid={invalid?.postalCode}
              >
                <SelectValue placeholder={copy.selectPostal} />
              </SelectTrigger>
              <SelectContent>
                {!required && <SelectItem value={NONE}>{copy.unspecified}</SelectItem>}
                {postalOptions.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`${idPrefix}-postal`}
              value={value.postalCode}
              readOnly
              placeholder={postalDisabled ? copy.selectPostalFirst : "—"}
              className={inputClass(invalid?.postalCode)}
              aria-invalid={invalid?.postalCode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
