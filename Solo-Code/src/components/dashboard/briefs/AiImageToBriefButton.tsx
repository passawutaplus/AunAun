import * as React from "react";
import { Sparkles, Loader2, Check, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { aiBriefFromImages } from "@/lib/aiBriefFromImages.functions";
import type { DesignBrief } from "@/lib/briefSchema";

type Suggestion = {
  project_type: string;
  moods: string[];
  liked_color_chips: string[];
  liked_colors: string;
  inspiration: string;
  key_takeaways: string;
};

type Props = {
  brief: DesignBrief;
  disabled?: boolean;
  onApply: (s: Suggestion) => void;
};

export function AiImageToBriefButton({ brief, disabled, onApply }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [sug, setSug] = React.useState<Suggestion | null>(null);
  const fn = useServerFn(aiBriefFromImages);

  const refCount = brief.references?.length ?? 0;

  const run = async () => {
    if (refCount === 0) {
      toast.error("อัปโหลดรูปอ้างอิงอย่างน้อย 1 รูปก่อน");
      return;
    }
    setBusy(true);
    setSug(null);
    try {
      const hint = [brief.project_overview?.project_name, brief.project_overview?.about_business]
        .filter(Boolean)
        .join(" / ");
      const result = await fn({
        data: {
          imageUrls: brief.references.slice(0, 6).map((r) => r.url),
          hint,
        },
      });
      setSug(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("limit_reached")) {
        toast.error("เครดิต AI หมดแล้ว — เติมเครดิตหรืออัพเกรด Pro");
      } else {
        toast.error(msg || "วิเคราะห์ไม่สำเร็จ");
      }
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!sug) return;
    onApply(sug);
    toast.success("ดึงเข้าบรีฟแล้ว");
    setSug(null);
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/15 text-primary p-1.5">
            <Wand2 className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold">AI Image-to-Brief (Mode 3)</p>
            <p className="text-[10px] text-muted-foreground">
              ให้ AI ดูรูปอ้างอิงแล้วเดา mood / สี / สไตล์ให้
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={run}
          disabled={busy || disabled || refCount === 0}
          className="h-7 text-xs gap-1"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {busy ? "กำลังวิเคราะห์…" : `วิเคราะห์ ${refCount} รูป`}
        </Button>
      </div>

      {sug && (
        <div className="rounded-lg bg-background border border-border p-3 space-y-2 text-xs">
          {sug.project_type && (
            <div>
              <span className="text-[10px] text-muted-foreground">ประเภทงาน: </span>
              <Badge variant="secondary" className="text-[10px]">
                {sug.project_type}
              </Badge>
            </div>
          )}
          {sug.moods.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Mood & Tone</p>
              <div className="flex flex-wrap gap-1">
                {sug.moods.map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px]">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {sug.liked_color_chips.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Color Palette</p>
              <div className="flex flex-wrap gap-1.5">
                {sug.liked_color_chips.map((c) => (
                  <div
                    key={c}
                    className="flex items-center gap-1 rounded-full border border-border bg-muted/30 pl-1 pr-2 py-0.5"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-border/50"
                      style={{ background: c }}
                    />
                    <span className="font-mono text-[9px] uppercase">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sug.liked_colors && (
            <p className="text-[11px] text-muted-foreground italic">"{sug.liked_colors}"</p>
          )}
          {sug.inspiration && (
            <div>
              <p className="text-[10px] text-muted-foreground">Inspiration</p>
              <p className="text-[11px]">{sug.inspiration}</p>
            </div>
          )}
          {sug.key_takeaways && (
            <div>
              <p className="text-[10px] text-muted-foreground">ประเด็นสำคัญ</p>
              <p className="text-[11px] whitespace-pre-wrap">{sug.key_takeaways}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSug(null)}>
              <X className="h-3 w-3 mr-1" /> ทิ้ง
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={apply}>
              <Check className="h-3 w-3 mr-1" /> ดึงเข้าบรีฟ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
