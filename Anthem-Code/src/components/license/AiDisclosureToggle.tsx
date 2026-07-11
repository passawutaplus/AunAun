import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  note: string;
  onNoteChange: (v: string) => void;
}

/** Optional disclosure when AI helped create portfolio images / process. */
const AiDisclosureToggle = ({ enabled, onEnabledChange, note, onNoteChange }: Props) => (
  <div className="relative z-10 space-y-2 pt-2 border-t border-border/60">
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor="ai-assisted-disclosure"
        className="min-w-0 flex flex-1 items-start gap-2 cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <span className="text-sm text-foreground leading-snug">
          ใช้ AI ช่วยทำผลงานนี้
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            ช่วยให้ผู้ชมเข้าใจกระบวนการของคุณ
            <span className="block">ไม่ติ๊ก = ไม่ใช้ AI เลย</span>
          </span>
        </span>
      </label>
      <Switch
        id="ai-assisted-disclosure"
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="shrink-0"
      />
    </div>
    {enabled ? (
      <div className="space-y-2 pl-6">
        <Label className="text-xs text-muted-foreground">ใช้ AI อย่างไร (ไม่บังคับ)</Label>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="เช่น Midjourney ทำ moodboard แล้วปรับเอง · ChatGPT ช่วย sketch · upscale ด้วย AI"
          rows={2}
          maxLength={300}
        />
      </div>
    ) : null}
  </div>
);

export default AiDisclosureToggle;
