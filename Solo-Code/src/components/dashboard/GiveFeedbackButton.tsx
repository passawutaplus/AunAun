import * as React from "react";
import { MessageSquareHeart, Loader2, CheckCircle2, Heart } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMyBetaFeedback } from "@/store/betaFeedback";
import { useMyTickets } from "@/store/supportTickets";
import { TicketImagePicker } from "@/components/support/TicketImagePicker";
import { createTicketSchema, type TicketCategory } from "@/lib/ticketSchema";
import { trackFeature } from "@/lib/featureUsage";
import { getSupabaseErrorMessage, mapTicketSubmitErrorMessage } from "@/lib/supabaseError";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RATINGS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Okay" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Terrible" },
] as const;

export function GiveFeedbackButton({
  feature,
  label,
  className,
  inline = false,
}: {
  feature: string;
  label: string;
  className?: string;
  /** เมื่อใช้ร่วมกับ PageFooterActions — ไม่ห่อด้วย wrapper */
  inline?: boolean;
}) {
  const { submit: submitBeta } = useMyBetaFeedback(feature);
  const { create, linkBetaFeedback } = useMyTickets();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const reset = () => {
    setRating(null);
    setMessage("");
    setFiles([]);
    setSubmitted(false);
  };

  const submitFeedback = async () => {
    if (!rating || sending) return;
    setSending(true);
    try {
      const category: TicketCategory = rating <= 2 ? "bug" : "improvement";
      const description = [message.trim(), `คะแนน: ${rating}/5`].filter(Boolean).join("\n");
      const title = rating <= 2 ? `ปัญหา: ${label}` : `ฟีดแบ็ก: ${label}`;

      const parsed = createTicketSchema.safeParse({
        title,
        description: description || undefined,
        category,
        source: "feedback_button",
        sourceFeature: feature,
        rating,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
        return;
      }

      const ticket = await create({ ...parsed.data, files });

      try {
        const betaId = await submitBeta({
          feature,
          message: message.trim() || `(rating only — ${rating}/5)`,
          rating,
        });
        if (betaId) await linkBetaFeedback({ ticketId: ticket.id, betaFeedbackId: betaId });
      } catch {
        // Beta log is secondary — ticket already created
      }

      void trackFeature("feedback.submit");
      setSubmitted(true);
    } catch (e) {
      console.error("[feedback]", e);
      const msg = getSupabaseErrorMessage(e);
      toast.error(mapTicketSubmitErrorMessage(msg, "ส่งไม่สำเร็จ — ลองใหม่อีกครั้ง"));
    } finally {
      setSending(false);
    }
  };

  const popover = (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Give Feedback — ${label}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full",
            "bg-primary/15 backdrop-blur-md border border-primary/30 text-primary",
            "px-3 py-1.5 text-xs font-medium shadow-soft",
            "hover:bg-primary/25 hover:shadow-elevated transition-all",
            className,
          )}
        >
          <MessageSquareHeart className="h-3.5 w-3.5" />
          <span>Give Feedback</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="give-feedback-popover w-80 p-0 border-border/60 shadow-elevated max-h-[min(560px,75vh)] overflow-y-auto"
      >
        {submitted ? (
          <div className="p-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">ขอบคุณสำหรับฟีดแบ็ก!</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
              เราได้รับความคิดเห็นของคุณแล้ว ติดตามได้ที่ Support Hub → ตั๋วของฉัน
            </p>
            <Heart className="h-4 w-4 text-primary mt-3 opacity-70" />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold leading-tight">ให้คะแนน {label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">แชร์ประสบการณ์ของคุณกับเรา</p>
            </div>

            <div className="space-y-1">
              {RATINGS.map((r) => {
                const selected = rating === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-background hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold shrink-0",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.value}
                    </span>
                    <span className="text-xs">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {rating !== null && (
              <div className="space-y-2.5 animate-fade-in">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="อธิบายปัญหาหรือข้อเสนอแนะ (ไม่ระบุก็ได้)"
                  rows={2}
                  maxLength={500}
                  className="resize-none text-xs bg-background"
                />
                <TicketImagePicker files={files} onChange={setFiles} compact />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
                  <Button
                    size="sm"
                    onClick={submitFeedback}
                    disabled={sending}
                    className="h-7 gap-1.5"
                  >
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Send Feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  if (inline) return popover;

  return <div className={cn("mt-8 flex justify-end pr-1", className)}>{popover}</div>;
}
