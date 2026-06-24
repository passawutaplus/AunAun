import { useRef, useState } from "react";
import { Send, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useSendMessage, type Message } from "@/hooks/useChat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { maskProfanity, detectProfanity, PROFANITY_WARNING, COMMUNITY_GUIDELINES_PATH } from "@/lib/profanity";

interface Props {
  conversationId: string;
  kind: "hire" | "collab" | "group" | "studio";
  quickReplies?: string[];
  replyTo?: Message | null;
  onClearReply?: () => void;
}

const ChatComposer = ({
  conversationId,
  kind,
  quickReplies = [],
  replyTo,
  onClearReply,
}: Props) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const send = useSendMessage();

  const placeholder =
    kind === "hire"
      ? "พิมพ์ข้อความถึงลูกค้าอย่างสุภาพ…"
      : kind === "group" || kind === "studio"
        ? "ส่งข้อความถึงกลุ่ม…"
        : "คุยเล่นไอเดียกันต่อได้เลย…";

  const accentRing =
    kind === "hire"
      ? "focus-visible:ring-[hsl(var(--chat-hire))]"
      : kind === "collab"
        ? "focus-visible:ring-[hsl(var(--chat-collab))]"
        : "focus-visible:ring-primary";
  const sendBtn =
    kind === "hire"
      ? "bg-[hsl(var(--chat-hire))] hover:bg-[hsl(var(--chat-hire)/0.9)] text-white"
      : kind === "collab"
        ? "bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.85)] hover:opacity-90 text-white"
        : "bg-primary hover:bg-primary/90 text-primary-foreground";

  const submit = async (overrideText?: string) => {
    const value = (overrideText ?? text).trim();
    if (!value) return;
    const { hasProfanity } = detectProfanity(value);
    const toSend = hasProfanity ? maskProfanity(value) : value;
    if (hasProfanity && !overrideText) {
      toast.warning(PROFANITY_WARNING, {
        action: {
          label: "กฎชุมชน",
          onClick: () => { window.location.href = COMMUNITY_GUIDELINES_PATH; },
        },
      });
    }
    try {
      await send.mutateAsync({
        conversationId,
        content: toSend,
        replyToId: replyTo?.id,
        hadProfanity: hasProfanity,
      });
      if (!overrideText) setText("");
      onClearReply?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    }
  };

  const onAttach = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `anthem/chat/${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
      await send.mutateAsync({
        conversationId,
        content: "",
        attachmentUrl: data.publicUrl,
        messageType: "image",
        replyToId: replyTo?.id,
      });
      onClearReply?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-md px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <ModerationBanBanner className="mb-2" />
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-muted/80 border border-border">
          <div className="flex-1 min-w-0 text-xs">
            <span className="font-medium text-foreground">ตอบกลับ</span>
            <p className="truncate text-muted-foreground mt-0.5">
              {replyTo.content || (replyTo.attachment_url ? "📷 รูปภาพ" : "ข้อความ")}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClearReply}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="แนบรูป"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className={cn(
            "resize-none min-h-[40px] max-h-32 rounded-2xl bg-muted border-0 focus-visible:ring-2",
            accentRing,
          )}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => submit()}
          disabled={!text.trim() || send.isPending}
          className={cn("rounded-full shrink-0", sendBtn)}
          aria-label="ส่งข้อความ"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatComposer;
