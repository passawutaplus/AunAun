import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  note: string;
  onNoteChange: (v: string) => void;
}

const ThirdPartyAssetsToggle = ({ enabled, onEnabledChange, note, onNoteChange }: Props) => (
  <div className="space-y-3 pt-2 border-t border-border/60">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">มี asset จากที่อื่น</p>
        <p className="text-xs text-muted-foreground">ฟอนต์, stock, เสียง, ภาพ AI reference ฯลฯ</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
    {enabled && (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">ระบุแหล่งที่มา / สิทธิ์ที่ได้รับ *</Label>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="เช่น ฟอนต์ Noto Sans จาก Google Fonts (OFL), ภาพจาก Unsplash License"
          rows={2}
          maxLength={300}
        />
      </div>
    )}
  </div>
);

export default ThirdPartyAssetsToggle;
