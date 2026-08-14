import { useRef, useState, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, Paperclip } from "lucide-react";
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
import { UploadFileHint } from "@/components/ui/UploadFileHint";

const CHAT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const CHAT_FILE_MAX_BYTES = 25 * 1024 * 1024;
const CHAT_FILE_EXTS = new Set([
  "pdf",
  "zip",
  "rar",
  "7z",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "ttf",
  "otf",
  "woff",
  "woff2",
]);
const CHAT_FILE_ACCEPT = Array.from(CHAT_FILE_EXTS)
  .map((ext) => `.${ext}`)
  .join(",");

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

interface Props {
  conversationId: string;
  kind: "hire" | "collab" | "group" | "studio";
  userId?: string;
  replyTo?: Message | null;
  replyToSenderName?: string;
  onClearReply?: () => void;
  /** When set, hide input and show this status instead. */
  lockedHint?: string | null;
}

const ChatComposer = ({
  conversationId,
  kind,
  replyTo,
  replyToSenderName,
  onClearReply,
  lockedHint = null,
}: Props) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState<"image" | "file" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const send = useSendMessage();

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

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    const { hasProfanity } = detectProfanity(value);
    const toSend = hasProfanity ? maskProfanity(value) : value;
    if (hasProfanity) {
      toast.warning(PROFANITY_WARNING, {
        action: {
          label: "กฎชุมชน",
          onClick: () => {
            window.location.href = COMMUNITY_GUIDELINES_PATH;
          },
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
      setText("");
      onClearReply?.();
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    }
  };

  const onAttachImage = async (file: File) => {
    if (!CHAT_IMAGE_ACCEPT.split(",").includes(file.type)) {
      toast.error("รองรับเฉพาะ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      toast.error("รูปใหญ่เกินไป — สูงสุด 8 MB");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setFailedFile(null);
    setUploading("image");
    setUploadProgress(15);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `anthem/chat/${conversationId}/${crypto.randomUUID()}.${ext}`;
      setUploadProgress(45);
      const { error: upErr } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (ac.signal.aborted) return;
      if (upErr) throw upErr;
      setUploadProgress(80);
      await send.mutateAsync({
        conversationId,
        content: "",
        attachmentUrl: path,
        messageType: "image",
        replyToId: replyTo?.id,
      });
      onClearReply?.();
      setUploadProgress(100);
    } catch (e: unknown) {
      if (ac.signal.aborted) return;
      setFailedFile(file);
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
    } finally {
      if (!ac.signal.aborted) {
        setUploading(null);
        setUploadProgress(null);
      }
    }
  };

  const onAttachFile = async (file: File) => {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      toast.error("รูปและวิดีโอใช้ปุ่มรูปภาพทางขวา");
      return;
    }
    const ext = fileExt(file.name);
    if (!ext || !CHAT_FILE_EXTS.has(ext)) {
      toast.error("รองรับ PDF, ZIP, Word, Excel, PowerPoint, TXT, CSV, ฟอนต์");
      return;
    }
    if (file.size > CHAT_FILE_MAX_BYTES) {
      toast.error("ไฟล์ใหญ่เกินไป — สูงสุด 25 MB");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setFailedFile(null);
    setUploading("file");
    setUploadProgress(15);
    try {
      const safeName = file.name.replace(/[^\w.\-()\u0E00-\u0E7F]+/g, "_").slice(0, 120);
      const path = `anthem/chat/${conversationId}/${crypto.randomUUID()}.${ext}`;
      setUploadProgress(45);
      const { error: upErr } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (ac.signal.aborted) return;
      if (upErr) throw upErr;
      setUploadProgress(80);
      await send.mutateAsync({
        conversationId,
        content: safeName || `file.${ext}`,
        attachmentUrl: path,
        messageType: "file",
        replyToId: replyTo?.id,
      });
      onClearReply?.();
      toast.success("ส่งไฟล์แล้ว");
      setUploadProgress(100);
    } catch (e: unknown) {
      if (ac.signal.aborted) return;
      setFailedFile(file);
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไฟล์ไม่สำเร็จ"));
    } finally {
      if (!ac.signal.aborted) {
        setUploading(null);
        setUploadProgress(null);
      }
    }
  };

  const handleDroppedFiles = (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    if (file.type.startsWith("image/")) void onAttachImage(file);
    else void onAttachFile(file);
  };

  const busy = !!uploading || send.isPending;
  const locked = !!lockedHint;

  if (locked) {
    return (
      <div className="border-t border-border bg-muted/30 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shrink-0">
        <p className="text-xs leading-relaxed text-muted-foreground text-center sm:text-left">
          {lockedHint}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t border-border bg-background/80 backdrop-blur-md px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shrink-0",
        dragOver && "ring-2 ring-inset ring-primary/50 bg-primary/5",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleDroppedFiles(e.dataTransfer.files);
      }}
    >
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
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={CHAT_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAttachFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={imageRef}
          type="file"
          accept={CHAT_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAttachImage(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="แนบไฟล์จากเครื่อง"
          title="แนบไฟล์ (PDF, ZIP, เอกสาร · สูงสุด 25 MB)"
        >
          {uploading === "file" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => imageRef.current?.click()}
          disabled={busy}
          aria-label="แนบรูป"
          title="แนบรูป JPG/PNG/WebP · สูงสุด 8 MB"
        >
          {uploading === "image" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5" />
          )}
        </Button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
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
          onClick={() => void submit()}
          disabled={!text.trim() || busy}
          className={cn("rounded-full shrink-0", sendBtn)}
          aria-label="ส่งข้อความ"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <UploadFileHint
        formats="รูป JPG/PNG/WebP · ไฟล์ PDF/ZIP/เอกสาร · ลากวางได้"
        maxMb={25}
        className="pl-1 pt-1"
      />
      {uploading && uploadProgress != null ? (
        <div className="flex items-center gap-2 pt-1.5 pl-1">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              abortRef.current?.abort();
              setUploading(null);
              setUploadProgress(null);
            }}
          >
            ยกเลิก
          </button>
        </div>
      ) : null}
      {failedFile && !uploading ? (
        <button
          type="button"
          className="text-[11px] text-primary hover:underline pt-1 pl-1"
          onClick={() => {
            const f = failedFile;
            setFailedFile(null);
            if (f.type.startsWith("image/")) void onAttachImage(f);
            else void onAttachFile(f);
          }}
        >
          อัปโหลดไม่สำเร็จ — ลองใหม่
        </button>
      ) : null}
    </div>
  );
};

export default ChatComposer;
