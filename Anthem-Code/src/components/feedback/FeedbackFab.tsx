import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, Loader2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mobileFabBottom } from "@/lib/mobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import { featureFromRoute, shouldHideFeedbackFab } from "@/lib/featureRoute";

const RATINGS = [
  { value: 5, label: "ดีมาก" },
  { value: 4, label: "ดี" },
  { value: 3, label: "ปานกลาง" },
  { value: 2, label: "พอใช้" },
  { value: 1, label: "ต้องปรับปรุง" },
] as const;

const FeedbackFab = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const openLogin = useAuthDialog((s) => s.openLogin);
  const submit = useSubmitFeedback();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  if (shouldHideFeedbackFab(pathname)) return null;

  const feature = featureFromRoute(pathname);

  const reset = () => {
    setRating(null);
    setMessage("");
    setDone(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next && !user) {
      openLogin();
      return;
    }
    setOpen(next);
    if (!next) reset();
  };

  const send = async () => {
    if (!rating || submit.isPending) return;
    try {
      await submit.mutateAsync({
        feature,
        route: pathname,
        rating,
        message: message.trim().slice(0, 500),
      });
      setDone(true);
      toast.success("ขอบคุณสำหรับฟีดแบ็ก 🙌");
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1200);
    } catch {
      // useSubmitFeedback onError shows the toast
    }
  };

  return (
    <div
      className="fixed right-3 z-40 md:right-5"
      style={{
        bottom: mobileFabBottom(),
      }}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="ส่งฟีดแบ็ก"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full",
              "bg-primary/15 backdrop-blur-md border border-primary/30 text-primary",
              "supports-[backdrop-filter]:bg-primary/10",
              "px-3.5 py-2 text-xs font-medium shadow-lg",
              "hover:bg-primary/25 hover:shadow-xl transition-all"
            )}
            style={{ WebkitBackdropFilter: "blur(12px)" }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Give feedback</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-72 p-0 border-border/60 shadow-xl"
        >
          {done ? (
            <div className="p-5 text-center space-y-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">ส่งฟีดแบ็กแล้ว</p>
              <p className="text-xs text-muted-foreground">ขอบคุณที่ช่วยให้ Aplus1 ดีขึ้น</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold leading-tight">ประสบการณ์เป็นอย่างไร?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  คุณกำลังให้คะแนน: <span className="font-medium">{feature}</span>
                </p>
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
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-background hover:bg-muted/60"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold shrink-0",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
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
                <div className="space-y-2 animate-fade-in">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="อยากบอกอะไรเพิ่ม? (ไม่บังคับ)"
                    rows={2}
                    maxLength={500}
                    className="resize-none text-xs bg-background"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
                    <Button size="sm" onClick={send} disabled={submit.isPending} className="h-7 gap-1.5">
                      {submit.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      ส่งคะแนน
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FeedbackFab;
