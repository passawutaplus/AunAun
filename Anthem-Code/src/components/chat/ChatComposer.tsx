import { useRef, useState, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useSendMessage, type Message } from "@/hooks/useChat";
import { getSupabaseErrorMessage } from "@/lib/supabaseErrors";
import { replyPreviewText } from "@/lib/chatReply";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { maskProfanity, detectProfanity, PROFANITY_WARNING, COMMUNITY_GUIDELINES_PATH } from "@/lib/profanity";
import { ChatPortfolioDialog } from "@/components/chat/ChatPortfolioSection";
import { useChatPortfolio } from "@/components/chat/useChatPortfolio";

const CHAT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

interface Props {
  conversationId: string;
  kind: "hire" | "collab" | "group" | "studio";
  userId?: string;
  quickReplies?: string[];
  replyTo?: Message | null;
  replyToSenderName?: string;
  onClearReply?: () => void;
}

const ChatComposer = ({
  conversationId,
  kind,
  userId,
  quickReplies = [],
  replyTo,
  replyToSenderName,
  onClearReply,
}: Props) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const send = useSendMessage();
  const { data: myProjects = [] } = useChatPortfolio(userId);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

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
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  const onAttach = async (file: File) => {
    if (!CHAT_IMAGE_ACCEPT.split(",").includes(file.type)) {
      toast.error("รองรับเฉพาะ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      toast.error("รูปใหญ่เกินไป — สูงสุด 8 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `anthem/chat/${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      await send.mutateAsync({
        conversationId,
        content: "",
        attachmentUrl: path,
        messageType: "image",
        replyToId: replyTo?.id,
      });
      onClearReply?.();
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
    } finally {
      setUploading(false);
    }
  };

  const sendProject = async (project: { id: string; title: string }) => {
    try {
      await send.mutateAsync({
        conversationId,
        content: project.title,
        messageType: "project",
        projectId: project.id,
        replyToId: replyTo?.id,
      });
      toast.success("ส่งผลงานในแชทแล้ว");
      setPortfolioOpen(false);
      onClearReply?.();
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-md px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shrink-0">
      <ModerationBanBanner className="mb-2" />
      {replyTo && (
        <div className="flex items-stretch gap-2 mb-2 rounded-xl bg-muted/80 border border-border overflow-hidden">
          <div className="w-1 shrink-0 bg-primary" />
          <div className="flex-1 min-w-0 py-2 pr-1">
            <span className="text-[11px] font-semibold text-primary block truncate">
              {replyToSenderName ?? "ตอบกลับ"}
            </span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {replyPreviewText(replyTo)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-auto w-8 shrink-0 self-center mr-1" onClick={onClearReply}>
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
          accept={CHAT_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = "";
          }}
        />
        {userId && myProjects.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => setPortfolioOpen(true)}
            disabled={send.isPending}
            aria-label="ส่งผลงาน"
          >
            <FolderOpen className="w-5 h-5" />
          </Button>
        )}
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
          ref={textareaRef}
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

      {userId && (
        <ChatPortfolioDialog
          open={portfolioOpen}
          onOpenChange={setPortfolioOpen}
          title="ส่งผลงานในแชท"
          projects={myProjects}
          onSend={sendProject}
          sending={send.isPending}
        />
      )}
    </div>
  );
};

export default ChatComposer;
