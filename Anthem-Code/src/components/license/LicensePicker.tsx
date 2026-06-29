import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LICENSE_LIST, getLicenseMeta, type LicenseType } from "@/lib/licenses";
import { cn } from "@/lib/utils";

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
}: Props) => {
  const [advancedOpen, setAdvancedOpen] = useState(
    () => value === "custom" || copyrightHolder.trim().length > 0,
  );
  const selected = getLicenseMeta(value);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase">สิทธิ์การใช้งาน</Label>
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

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
          <ChevronDown
            className={cn("w-3.5 h-3.5 transition-transform", advancedOpen && "rotate-180")}
            aria-hidden
          />
          ตั้งค่าเพิ่มเติม
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:hidden pt-2 space-y-2">
          <Label className="text-xs text-muted-foreground">ชื่อเจ้าของลิขสิทธิ์ (ถ้าไม่ใช่คุณ)</Label>
          <Input
            value={copyrightHolder}
            onChange={(e) => onCopyrightHolderChange(e.target.value)}
            placeholder="เว้นว่าง = ใช้ชื่อโปรไฟล์ของคุณ"
            maxLength={120}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default LicensePicker;
