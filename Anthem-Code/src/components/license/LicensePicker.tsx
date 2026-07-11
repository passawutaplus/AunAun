import { Scale } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LICENSE_LIST, getLicenseMeta, type LicenseType } from "@/lib/licenses";

interface Props {
  value: LicenseType;
  onChange: (v: LicenseType) => void;
  licenseNote: string;
  onLicenseNoteChange: (v: string) => void;
}

const LicensePicker = ({
  value,
  onChange,
  licenseNote,
  onLicenseNoteChange,
}: Props) => {
  const selected = getLicenseMeta(value);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
        <Scale className="w-3.5 h-3.5" aria-hidden />
        สิทธิ์การใช้งาน
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as LicenseType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LICENSE_LIST.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.shortLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground leading-snug">{selected.description}</p>

      {value === "custom" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">เงื่อนไขการใช้งาน *</Label>
          <Textarea
            value={licenseNote}
            onChange={(e) => onLicenseNoteChange(e.target.value)}
            placeholder="เช่น อนุญาตให้ใช้ในโซเชียลได้ แต่ห้ามพิมพ์ลงสื่อสิ่งพิมพ์"
            rows={2}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{licenseNote.length}/500</p>
        </div>
      )}
    </div>
  );
};

export default LicensePicker;
