import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Send, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useMyBetaFeedback } from "@/store/betaFeedback";
import { toast } from "sonner";

/**
 * Floating-style suggestion box that lives inside each feature.
 * Early-access testers can leave per-feature feedback that the admin can review.
 */
export function FeatureFeedbackBox({ feature, label }: { feature: string; label?: string }) {
  const { items, isLoading, submit, remove } = useMyBetaFeedback(feature);
  const [open, setOpen] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  // กันกดส่งซ้ำในหน้าต่างเสี้ยววินาทีก่อน setSending จะ paint
  const sendingRef = React.useRef(false);

  const send = async () => {
    if (sendingRef.current) return;
    const text = msg.trim();
    if (text.length < 4) {
      toast.error("ใส่ข้อความอย่างน้อย 4 ตัวอักษร");
      return;
    }
    if (text.length > 1000) {
      toast.error("ข้อความยาวเกิน 1000 ตัวอักษร");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
      await submit({ feature, message: text });
      setMsg("");
      toast.success("ขอบคุณสำหรับข้อเสนอแนะ! 🙌");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await remove(id);
      toast.success("ลบแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary-soft/20">
      <CardContent className="p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                ข้อเสนอแนะสำหรับ{label ? ` "${label}"` : "ฟีเจอร์นี้"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                บอกสิ่งที่อยากให้เพิ่ม/ปรับ — ทีมจะเห็นในหน้า Admin
              </p>
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </button>

        {open && (
          <div className="mt-3 space-y-3 animate-fade-in">
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="เช่น อยากให้เพิ่มปุ่มส่งออก, สีไม่ชัด, หรือคำแนะนำอื่น ๆ"
              rows={3}
              maxLength={1000}
              className="resize-none text-sm bg-background"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">{msg.length}/1000</span>
              <Button size="sm" onClick={send} disabled={sending} className="gap-1.5 h-8">
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                ส่ง
              </Button>
            </div>

            {!isLoading && items.length > 0 && (
              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <p className="text-[11px] text-muted-foreground">ที่คุณเคยส่งไว้</p>
                {items.slice(0, 5).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start gap-2 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs"
                  >
                    <p className="flex-1 whitespace-pre-wrap break-words">{it.message}</p>
                    <button
                      onClick={() => handleRemove(it.id)}
                      disabled={deletingId === it.id}
                      className="text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                      title="ลบ"
                      aria-label="ลบข้อเสนอแนะ"
                    >
                      {deletingId === it.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
