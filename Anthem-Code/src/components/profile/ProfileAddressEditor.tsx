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
import type { ProfileAddress } from "@/lib/profileAddress";
import { normalizeThaiProvince, THAI_PROVINCES } from "@/lib/thaiProvinces";
import {
  listDistrictsForProvince,
  listPostalCodes,
  listSubdistrictsForDistrict,
  resolvePostalCode,
} from "@/lib/thaiAddressLookup";

type Props = {
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
  idPrefix?: string;
};

const NONE = "__none__";

function withLegacy(options: string[], current: string): string[] {
  const t = current.trim();
  if (!t || options.includes(t)) return options;
  return [t, ...options];
}

/** ที่อยู่แบบมาตรฐาน: จังหวัด → อำเภอ/เขต → ตำบล/แขวง → รหัสไปรษณีย์ */
export default function ProfileAddressEditor({ value, onChange, idPrefix = "profile-address" }: Props) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-foreground">ที่อยู่</h3>
          <p className="text-xs text-muted-foreground">
            เลือกจังหวัด → อำเภอ/เขต → ตำบล/แขวง แล้วระบบใส่รหัสไปรษณีย์ให้
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-line1`}>บ้านเลขที่ / หมู่ / ซอย / ถนน</Label>
          <Input
            id={`${idPrefix}-line1`}
            value={value.line1}
            onChange={(e) =>
              onChange({ ...value, line1: e.target.value.slice(0, 120) })
            }
            placeholder="เช่น 123/4 หมู่ 5 ซอยสุขุมวิท 21"
            maxLength={120}
            className="rounded-xl bg-secondary border-border"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-province`}>จังหวัด</Label>
          <Select
            key={`province-${province || "none"}`}
            value={province || undefined}
            onValueChange={onProvince}
          >
            <SelectTrigger
              id={`${idPrefix}-province`}
              className="rounded-xl bg-secondary border-border"
            >
              <SelectValue placeholder="เลือกจังหวัด" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
              {THAI_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-district`}>อำเภอ / เขต</Label>
          <Select
            key={`district-${province}-${value.district.trim() || "none"}`}
            value={value.district.trim() || undefined}
            onValueChange={onDistrict}
            disabled={districtDisabled}
          >
            <SelectTrigger
              id={`${idPrefix}-district`}
              className="rounded-xl bg-secondary border-border"
            >
              <SelectValue placeholder={districtDisabled ? "เลือกจังหวัดก่อน" : "เลือกอำเภอ / เขต"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-subdistrict`}>ตำบล / แขวง</Label>
          <Select
            key={`subdistrict-${province}-${value.district.trim()}-${value.subdistrict.trim() || "none"}`}
            value={value.subdistrict.trim() || undefined}
            onValueChange={onSubdistrict}
            disabled={subdistrictDisabled}
          >
            <SelectTrigger
              id={`${idPrefix}-subdistrict`}
              className="rounded-xl bg-secondary border-border"
            >
              <SelectValue
                placeholder={subdistrictDisabled ? "เลือกอำเภอ / เขตก่อน" : "เลือกตำบล / แขวง"}
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
              {subdistricts.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-postal`}>รหัสไปรษณีย์</Label>
          {postalOptions.length > 1 ? (
            <Select
              value={value.postalCode.trim() || undefined}
              onValueChange={onPostal}
              disabled={postalDisabled}
            >
              <SelectTrigger
                id={`${idPrefix}-postal`}
                className="rounded-xl bg-secondary border-border"
              >
                <SelectValue placeholder="เลือกรหัสไปรษณีย์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
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
              placeholder={postalDisabled ? "เลือกตำบล / แขวงก่อน" : "—"}
              className="rounded-xl bg-secondary border-border"
            />
          )}
        </div>
      </div>
    </div>
  );
}
