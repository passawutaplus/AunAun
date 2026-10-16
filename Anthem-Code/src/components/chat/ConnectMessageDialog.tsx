import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, Loader2, MessageCircle, Send, Smile } from "lucide-react";
import { toast } from "sonner";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { trackProductEvent } from "@/lib/productEvents";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  /** Quick intents hand over to the existing hire / collab briefs. */
  onHire: () => void;
  onCollab: () => void;
};

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted";

/**
 * Chat-first contact: type a message and send. Picking Hire / Collaborate is optional and opens
 * the short brief for that path instead.
 */
export default function ConnectMessageDialog({ open, onOpenChange, recipientId, recipientName, onHire, onCollab }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      const conversationId = await openConnectChat(user.id, recipientId, text);
      void trackProductEvent("connect_message", { recipient_id: recipientId }, { debounceMs: 0 });
      onOpenChange(false);
      navigate(`/chat/${conversationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handOver = (go: () => void) => {
    onOpenChange(false);
    go();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            ทักแชทหา {recipientName}
          </DialogTitle>
          <DialogDescription>พิมพ์ทักได้เลย หรือเลือกว่าอยากคุยเรื่องอะไร (ไม่บังคับ)</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip} onClick={() => handOver(onHire)}>
            <BriefcaseIcon className="h-3.5 w-3.5" aria-hidden /> จ้างงาน
          </button>
          <button type="button" className={chip} onClick={() => handOver(onCollab)}>
            <Handshake className="h-3.5 w-3.5" aria-hidden /> คอลแลป
          </button>
          <button type="button" className={cn(chip, "border-primary/50 text-primary")} onClick={() => inputRef.current?.focus()}>
            <Smile className="h-3.5 w-3.5" aria-hidden /> แค่ทักทาย
          </button>
        </div>

        <Textarea
          ref={inputRef}
          autoFocus
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          placeholder={`สวัสดีครับ/ค่ะ ชอบผลงานของ ${recipientName} มาก…`}
          className="resize-none rounded-xl"
          disabled={busy}
        />

        <div className="flex justify-end">
          <Button type="button" className="rounded-full gap-1.5" disabled={busy || !text.trim()} onClick={() => void send()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            ส่งข้อความ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
