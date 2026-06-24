import * as React from "react";
import { ThumbsUp, ThumbsDown, Pencil, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";

interface Props {
  feature: string;
  prompt: string;
  response: string;
  model?: string;
  metadata?: Record<string, unknown>;
  compact?: boolean;
}

/**
 * Reusable feedback bar that logs AI interactions to `ai_training_samples`
 * for later admin curation. Always renders 👍 / 👎 + optional "แก้ไขให้ดีกว่า"
 * inline editor.
 */
export function AiFeedbackBar({ feature, prompt, response, model, metadata, compact }: Props) {
  const { user } = useAuth();
  const [sampleId, setSampleId] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState<1 | -1 | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [correction, setCorrection] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const ensureSample = React.useCallback(async () => {
    if (!user || sampleId) return sampleId;
    const { data, error } = await (supabase as any)
      .from("ai_training_samples")
      .insert({
        user_id: user.id,
        feature,
        model: model ?? null,
        user_prompt: prompt.slice(0, 8000),
        ai_response: response.slice(0, 16000),
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("AiFeedback insert", error);
      return null;
    }
    setSampleId(data.id);
    return data.id as string;
  }, [user, sampleId, feature, model, prompt, response, metadata]);

  const sendRating = async (r: 1 | -1) => {
    if (!user) return;
    setRating(r);
    setSaving(true);
    try {
      const id = await ensureSample();
      if (!id) throw new Error("no sample");
      await (supabase as any).from("ai_training_samples").update({ user_rating: r }).eq("id", id);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error("บันทึก feedback ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const saveCorrection = async () => {
    if (!user || !correction.trim()) return;
    setSaving(true);
    try {
      const id = await ensureSample();
      if (!id) throw new Error("no sample");
      await supabase
        .from("ai_training_samples")
        .update({ corrected_response: correction.trim(), user_rating: rating ?? -1 })
        .eq("id", id);
      toast.success("ขอบคุณ! AI จะเรียนรู้จากคำตอบนี้");
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "mt-2"}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>คำตอบนี้เป็นยังไง?</span>
        <Button
          size="sm"
          variant={rating === 1 ? "default" : "ghost"}
          className="h-6 w-6 p-0"
          disabled={saving}
          onClick={() => sendRating(1)}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant={rating === -1 ? "default" : "ghost"}
          className="h-6 w-6 p-0"
          disabled={saving}
          onClick={() => sendRating(-1)}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 gap-1 text-[10px]"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="h-3 w-3" /> แก้ไขให้ดีกว่า
        </Button>
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        {saved && <Check className="h-3 w-3 text-emerald-600" />}
      </div>
      {editing && (
        <div className="space-y-1.5">
          <Textarea
            rows={3}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="ถ้าเป็นคุณจะตอบยังไงให้ดีกว่านี้?"
            className="text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving || !correction.trim()}
              onClick={saveCorrection}
            >
              บันทึกเป็นตัวอย่าง
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
