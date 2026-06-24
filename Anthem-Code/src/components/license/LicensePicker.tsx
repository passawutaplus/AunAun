import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LICENSE_LIST, type LicenseType } from "@/lib/licenses";

interface Props {
  value: LicenseType;
  onChange: (v: LicenseType) => void;
  licenseNote: string;
  onLicenseNoteChange: (v: string) => void;
  copyrightHolder: string;
  onCopyrightHolderChange: (v: string) => void;
}

const LicensePicker = ({
  value,
  onChange,
  licenseNote,
  onLicenseNoteChange,
  copyrightHolder,
  onCopyrightHolderChange,
}: Props) => (
  <div className="space-y-3">
    <Label className="text-xs font-semibold text-muted-foreground uppercase">สิทธิ์การใช้งานผลงาน</Label>
    <div className="grid grid-cols-2 gap-2">
      {LICENSE_LIST.map((preset) => {
        const Icon = preset.icon;
        const selected = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium text-foreground leading-tight">{preset.shortLabel}</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{preset.description}</span>
          </button>
        );
      })}
    </div>

    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">ชื่อเจ้าของลิขสิทธิ์ (ถ้าไม่ใช่คุณ)</Label>
      <Input
        value={copyrightHolder}
        onChange={(e) => onCopyrightHolderChange(e.target.value)}
        placeholder="เว้นว่าง = ใช้ชื่อโปรไฟล์ของคุณ"
        maxLength={120}
      />
    </div>

    {value === "custom" && (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">เงื่อนไขการใช้งาน *</Label>
        <Textarea
          value={licenseNote}
          onChange={(e) => onLicenseNoteChange(e.target.value)}
          placeholder="เช่น อนุญาตให้ใช้ในโซเชียลได้ แต่ห้ามพิมพ์ลงสื่อสิ่งพิมพ์"
          rows={3}
          maxLength={500}
        />
        <p className="text-[10px] text-muted-foreground text-right">{licenseNote.length}/500</p>
      </div>
    )}
  </div>
);

export default LicensePicker;
