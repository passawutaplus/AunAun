import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { trackProductEvent } from "@/lib/productEvents";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  /** Chat from one work: the first message names it and is followed by the work card. */
  about?: { id: string; title: string; coverUrl?: string | null };
};

/**
 * Chat-first contact: type a message and send. Hire / Collaborate have their own buttons and briefs.
 */
export default function ConnectMessageDialog({ open, onOpenChange, recipientId, recipientName, about }: Props) {
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
      const body = about ? `${text.trim()}

From : ${about.title}` : text;
      const conversationId = await openConnectChat(user.id, recipientId, body, about ? { id: about.id, title: about.title } : undefined);
      void trackProductEvent(
        "connect_message",
        { recipient_id: recipientId, source: about ? "project" : "profile" },
        { debounceMs: 0 },
      );
      onOpenChange(false);
      navigate(`/chat/${conversationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            {about ? "ทักแชทเรื่องผลงานนี้" : `ทักแชทหา ${recipientName}`}
          </DialogTitle>
          <DialogDescription>
            {about
              ? `ถาม ${recipientName} เรื่องผลงานชิ้นนี้ได้เลย — ลิงก์ผลงานจะแนบไปกับข้อความให้อัตโนมัติ`
              : "ทักทาย ถามเรื่องผลงาน หรือชวนคุยได้เลย — ถ้าจะจ้างหรือคอลแลป ใช้ปุ่มบนโปรไฟล์จะได้ส่งบรีฟไปพร้อมกัน"}
          </DialogDescription>
        </DialogHeader>

        {about ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-2">
            {about.coverUrl ? (
              <img src={about.coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">แนบผลงาน</p>
              <p className="truncate text-sm font-medium">{about.title}</p>
            </div>
          </div>
        ) : null}

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
          placeholder={
            about
              ? "เช่น ชอบงานนี้มาก อยากรู้ว่าใช้เวลาทำนานไหม / รับงานสไตล์นี้ไหม…"
              : `สวัสดีครับ/ค่ะ ชอบผลงานของ ${recipientName} มาก…`
          }
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
