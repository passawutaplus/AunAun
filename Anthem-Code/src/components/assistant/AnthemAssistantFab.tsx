import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAiUsage } from "@/hooks/useAiUsage";
import { useSubscription } from "@/core/subscription";
import { BRAND_NAME } from "@/lib/brandConfig";
import { mobileFabBottom } from "@/lib/mobileLayout";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ASSISTANT_LABEL = `${BRAND_NAME} AI`;

export function AnthemAssistantFab() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const usage = useAiUsage();
  const { isPro } = useSubscription();

  async function send() {
    const text = message.trim();
    if (!text) return;
    if (usage.limitReached) {
      toast.error("เครดิต AI หมดแล้ว — อัปเกรดที่ So1o");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anthem-assistant", {
        body: { message: text, mode: "mentor" },
      });
      if (error) throw error;
      if (data?.error === "limit_reached") {
        toast.error("เครดิต AI หมดแล้ว");
        void usage.refetch();
        return;
      }
      setReply(String(data?.reply ?? ""));
      setMessage("");
      void usage.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 lg:bottom-6"
        style={{ bottom: mobileFabBottom("0.5rem") }}
        aria-label={ASSISTANT_LABEL}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={panelTransition}
            className="fixed right-4 z-40 w-[min(100vw-2rem,22rem)] rounded-2xl border border-border bg-background shadow-xl p-4 space-y-3 lg:bottom-24"
            style={{ bottom: mobileFabBottom("4.5rem") }}
          >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{ASSISTANT_LABEL}</p>
            <span className="text-[10px] text-muted-foreground">
              เครดิต {usage.total_remaining}
            </span>
          </div>
          {reply && (
            <div className="text-sm text-foreground/90 bg-muted/40 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {reply}
            </div>
          )}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ถามเรื่องผลงาน ลูกค้า หรือการรับงาน…"
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            {!isPro && (
              <Link to="/upgrade" className="text-[10px] text-primary hover:underline">
                อัปเกรด Pro
              </Link>
            )}
            <Button size="sm" className="ml-auto gap-1" onClick={() => void send()} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              ถาม
            </Button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
