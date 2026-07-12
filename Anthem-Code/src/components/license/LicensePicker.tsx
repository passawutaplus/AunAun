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
import {
  getLicenseMeta,
  getLicensePickerOptions,
  type LicenseType,
} from "@/lib/licenses";

interface Props {
  value: LicenseType;
  onChange: (v: LicenseType) => void;
  licenseNote: string;
  onLicenseNoteChange: (v: string) => void;
  noteInvalid?: boolean;
}

const LicensePicker = ({
  value,
  onChange,
  licenseNote,
  onLicenseNoteChange,
  noteInvalid,
}: Props) => {
  const selected = getLicenseMeta(value);
  const options = getLicensePickerOptions(value);
  const SelectedIcon = selected.icon;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
        <Scale className="w-3.5 h-3.5" aria-hidden />
        สิทธิ์การใช้งาน
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as LicenseType)}>
        <SelectTrigger>
          <SelectValue>
            <span className="inline-flex items-center gap-2">
              <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {selected.shortLabel}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((preset) => {
            const Icon = preset.icon;
            return (
              <SelectItem key={preset.id} value={preset.id}>
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {preset.shortLabel}
                </span>
              </SelectItem>
            );
          })}
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
            aria-invalid={noteInvalid || undefined}
            className={noteInvalid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
          />
          <p className="text-[10px] text-muted-foreground text-right">{licenseNote.length}/500</p>
        </div>
      )}
    </div>
  );
};

export default LicensePicker;
