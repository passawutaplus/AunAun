import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Hash, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  topic: string;
  mood?: string;
  platforms: string[];
  onCaption: (text: string) => void;
  onHashtags: (text: string) => void;
};

type Variation = { length: string; text: string };

export function AiAssistButton({ topic, mood, platforms, onCaption, onHashtags }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<"caption" | "hashtags" | null>(null);
  const [variations, setVariations] = React.useState<Variation[]>([]);
  const [hashtags, setHashtags] = React.useState<string[]>([]);

  const callAi = async (mode: "caption" | "hashtags") => {
    if (!topic.trim()) {
      toast.error("กรอกหัวข้อโพสต์ก่อน AI ถึงจะช่วยได้นะครับ");
      return;
    }
    setLoading(mode);
    try {
      const { data, error } = await supabase.functions.invoke("planner-ai-assist", {
        body: { mode, topic, mood, platforms, language: "th" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (mode === "caption") {
        setVariations(data.variations ?? []);
      } else {
        setHashtags(data.hashtags ?? []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI ขัดข้อง ลองใหม่อีกครั้ง");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assist
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] rounded-2xl p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1 rounded-xl text-xs gap-1.5"
              disabled={loading !== null}
              onClick={() => callAi("caption")}
            >
              {loading === "caption" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Type className="h-3 w-3" />
              )}
              เขียนแคปชัน
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1 rounded-xl text-xs gap-1.5"
              disabled={loading !== null}
              onClick={() => callAi("hashtags")}
            >
              {loading === "hashtags" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              แฮชแท็ก
            </Button>
          </div>

          {variations.length > 0 && (
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {variations.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onCaption(v.text);
                    setOpen(false);
                    toast.success("ใส่แคปชันแล้ว");
                  }}
                  className="w-full text-left rounded-xl border border-border/60 p-2 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="text-[9px] font-medium text-primary uppercase mb-1">
                    {v.length}
                  </div>
                  <div className="line-clamp-4">{v.text}</div>
                </button>
              ))}
            </div>
          )}

          {hashtags.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="text-[10px] rounded-md bg-primary/10 text-primary px-1.5 py-0.5"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full rounded-xl text-xs"
                onClick={() => {
                  onHashtags(hashtags.join(" "));
                  setOpen(false);
                  toast.success("ใส่แฮชแท็กแล้ว");
                }}
              >
                ใส่ในแคปชัน
              </Button>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground text-center">
            * AI ช่วยร่าง — โปรดตรวจทานก่อนโพสต์เสมอ
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
