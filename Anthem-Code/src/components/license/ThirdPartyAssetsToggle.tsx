import { Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  note: string;
  onNoteChange: (v: string) => void;
  noteInvalid?: boolean;
}

const ThirdPartyAssetsToggle = ({
  enabled,
  onEnabledChange,
  note,
  onNoteChange,
  noteInvalid,
}: Props) => (
  <div className="relative z-10 space-y-2 pt-2 border-t border-border/60">
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor="third-party-assets"
        className="min-w-0 flex flex-1 items-start gap-2 cursor-pointer"
      >
        <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <span className="text-sm text-foreground leading-snug">
          มี asset จากที่อื่น
          <span className="text-xs text-muted-foreground"> · ฟอนต์, stock, เสียง</span>
        </span>
      </label>
      <Switch
        id="third-party-assets"
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="shrink-0"
      />
    </div>
    {enabled && (
      <div className="space-y-2 pl-6">
        <Label className="text-xs text-muted-foreground">
          แหล่งที่มา / สิทธิ์ที่ได้รับ <span className="text-primary">*</span>
        </Label>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="เช่น Noto Sans (OFL), ภาพ Unsplash License"
          rows={2}
          maxLength={300}
          aria-invalid={noteInvalid || undefined}
          className={cn(noteInvalid && "border-destructive focus-visible:ring-destructive/40")}
        />
      </div>
    )}
  </div>
);

export default ThirdPartyAssetsToggle;
