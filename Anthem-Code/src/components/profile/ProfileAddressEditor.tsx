import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileAddress } from "@/lib/profileAddress";

type Props = {
  value: ProfileAddress;
  onChange: (next: ProfileAddress) => void;
  idPrefix?: string;
};

/** Full address form: บ้านเลขที่ · ตำบล · อำเภอ · จังหวัด · รหัสไปรษณีย์ */
export default function ProfileAddressEditor({ value, onChange, idPrefix = "profile-address" }: Props) {
  const set = <K extends keyof ProfileAddress>(key: K, v: string) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-foreground">ที่อยู่</h3>
          <p className="text-xs text-muted-foreground">กรอกครบเพื่อแสดงบนโปรไฟล์และ About me</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-line1`}>บ้านเลขที่ / หมู่ / ซอย / ถนน</Label>
          <Input
            id={`${idPrefix}-line1`}
            value={value.line1}
            onChange={(e) => set("line1", e.target.value.slice(0, 120))}
            placeholder="เช่น 123/4 หมู่ 5 ซอยสุขุมวิท 21"
            maxLength={120}
            className="rounded-xl bg-secondary border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-subdistrict`}>ตำบล / แขวง</Label>
          <Input
            id={`${idPrefix}-subdistrict`}
            value={value.subdistrict}
            onChange={(e) => set("subdistrict", e.target.value.slice(0, 60))}
            placeholder="เช่น คลองเตย"
            maxLength={60}
            className="rounded-xl bg-secondary border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-district`}>อำเภอ / เขต</Label>
          <Input
            id={`${idPrefix}-district`}
            value={value.district}
            onChange={(e) => set("district", e.target.value.slice(0, 60))}
            placeholder="เช่น คลองเตย"
            maxLength={60}
            className="rounded-xl bg-secondary border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-province`}>จังหวัด</Label>
          <Input
            id={`${idPrefix}-province`}
            value={value.province}
            onChange={(e) => set("province", e.target.value.slice(0, 60))}
            placeholder="เช่น กรุงเทพมหานคร"
            maxLength={60}
            className="rounded-xl bg-secondary border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-postal`}>รหัสไปรษณีย์</Label>
          <Input
            id={`${idPrefix}-postal`}
            value={value.postalCode}
            onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="10110"
            inputMode="numeric"
            maxLength={5}
            className="rounded-xl bg-secondary border-border"
          />
        </div>
      </div>
    </div>
  );
}
