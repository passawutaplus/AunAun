import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Paperclip, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription/useSubscription";
import {
  FORUM_ATTACH_ACCEPT,
  FORUM_ATTACH_MAX_REPLY,
  FORUM_ATTACH_MAX_TOPIC,
  formatBytes,
  type ForumAttachment,
} from "@/lib/forumAttachments";
import { uploadAndScanForumAttachment } from "@/lib/uploadForumAttachment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  value: ForumAttachment[];
  onChange: (next: ForumAttachment[]) => void;
  variant?: "topic" | "reply";
  className?: string;
  disabled?: boolean;
};

export function ForumAttachmentComposer({
  value,
  onChange,
  variant = "topic",
  className,
  disabled,
}: Props) {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const max = variant === "topic" ? FORUM_ATTACH_MAX_TOPIC : FORUM_ATTACH_MAX_REPLY;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || !user) {
      if (!user) toast.error("ต้องเข้าสู่ระบบก่อนแนบไฟล์");
      return;
    }
    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.error(`แนบได้สูงสุด ${max} ไฟล์`);
      return;
    }

    setBusy(true);
    const next = [...value];
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        try {
          const att = await uploadAndScanForumAttachment(file, user.id, tier, setProgress);
          next.push(att);
          onChange([...next]);
          toast.success(`แนบแล้ว (ผ่านการสแกน): ${file.name}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "แนบไฟล์ไม่สำเร็จ");
        }
      }
    } finally {
      setBusy(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (id: string) => onChange(value.filter((a) => a.id !== id));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={FORUM_ATTACH_ACCEPT}
          multiple
          className="hidden"
          disabled={disabled || busy || value.length >= max}
          onChange={(e) => void addFiles(e.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={disabled || busy || value.length >= max || !user}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          แนบรูป / วิดีโอ / ไฟล์
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {value.length}/{max} · สแกนไวรัสก่อนเผยแพร่ · สูงสุด 25MB
        </span>
      </div>
      {busy && progress ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {progress}
        </p>
      ) : null}
      {value.length ? (
        <ul className="space-y-2">
          {value.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-sm"
            >
              {a.kind === "image" && a.public_url ? (
                <img src={a.public_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              ) : a.kind === "video" ? (
                <Video className="h-5 w-5 text-violet-500 shrink-0" />
              ) : a.kind === "image" ? (
                <ImageIcon className="h-5 w-5 text-sky-500 shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.file_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(a.size_bytes)} · ผ่านการสแกน
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={disabled || busy}
                onClick={() => remove(a.id)}
                aria-label="ลบไฟล์"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
