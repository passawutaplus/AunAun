import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SPONSOR_OFFER_HEADER } from "@/lib/chat/eventLink";
import { useAuth } from "@/hooks/useAuth";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { trackProductEvent } from "@/lib/productEvents";
import { cn } from "@/lib/utils";

const SUPPORT_TYPES = ["เงินทุน", "สถานที่", "สินค้า / อุปกรณ์", "สื่อ / ประชาสัมพันธ์", "อาหาร / เครื่องดื่ม", "อื่น ๆ"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: { id: string; title: string; owner_id: string; organizer_name: string | null };
};

/**
 * "Become a sponsor": a short intro (who you are, what you can support) sent as a normal chat text.
 * The event link at the end renders as an event card in the chat (ChatEventCard).
 */
export default function SponsorOfferDialog({ open, onOpenChange, event }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [who, setWho] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWho("");
    setTypes([]);
    setDetails("");
  }, [open]);

  const ready = who.trim().length > 0 && (types.length > 0 || details.trim().length > 0);

  const send = async () => {
    if (!user || !ready) return;
    setBusy(true);
    try {
      const intro = [
        `${SPONSOR_OFFER_HEADER} "${event.title}"`,
        `ผู้สนับสนุน: ${who.trim()}`,
        types.length ? `สนับสนุนเรื่อง: ${types.join(", ")}` : "",
        details.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      const body = `${intro}\n\n${window.location.origin}/exhibition/${event.id}`;
      const conversationId = await openConnectChat(user.id, event.owner_id, body);
      void trackProductEvent("connect_message", { recipient_id: event.owner_id, source: "event_sponsor" }, { debounceMs: 0 });
      onOpenChange(false);
      navigate(`/chat/${conversationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งข้อเสนอไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" aria-hidden />
            เสนอเป็นผู้สนับสนุน
          </DialogTitle>
          <DialogDescription>
            แนะนำตัวสั้น ๆ ให้ {event.organizer_name ?? "ผู้จัดงาน"} รู้ว่าคุณคือใครและช่วยอะไรได้ — ข้อความจะส่งเข้าแชทพร้อมการ์ดงานนี้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">คุณคือใคร</span>
            <Input
              autoFocus
              maxLength={80}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="ชื่อแบรนด์ / บริษัท / ตัวคุณ"
              className="rounded-xl"
              disabled={busy}
            />
          </label>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">สนับสนุนเรื่องอะไร</legend>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUPPORT_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => setTypes((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))}
                    className={cn(
                      "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      on ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground/50",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">รายละเอียดคร่าว ๆ</span>
            <Textarea
              rows={3}
              maxLength={600}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
              }}
              placeholder="เช่น ให้ใช้พื้นที่ร้านจัดเวิร์กช็อปฟรี 1 วัน / สนับสนุนกระดาษพิมพ์ 500 แผ่น…"
              className="resize-none rounded-xl"
              disabled={busy}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button type="button" className="gap-1.5 rounded-full" disabled={busy || !ready} onClick={() => void send()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            ส่งข้อเสนอ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
