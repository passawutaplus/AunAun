import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Handshake,
  ImagePlus,
  Loader2,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUnblockUser } from "@/hooks/useCommunityPostInteractions";
import {
  useBlockedChatUsers,
  useChatSettings,
  useSaveChatSettings,
  type ChatSettings,
} from "@/hooks/useChatSettings";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { getSupabaseErrorMessage } from "@/lib/supabaseErrors";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";

const TEXT_MAX = 1000;
const LINK_MAX = 500;
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

type Kind = "hire" | "collab";

function AutoReplyPreviewImage({ path }: { path: string | null }) {
  const src = useSignedStorageUrl(path ?? undefined);
  if (!path) return null;
  if (!src) {
    return <div className="mt-2 h-24 w-full max-w-[200px] rounded-xl bg-muted animate-pulse" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="mt-2 h-24 w-full max-w-[200px] rounded-xl object-cover border border-border"
    />
  );
}

function AutoReplyEditor({
  kind,
  draft,
  onChange,
  uploading,
  onUploadImage,
}: {
  kind: Kind;
  draft: ChatSettings;
  onChange: (patch: Partial<ChatSettings>) => void;
  uploading: boolean;
  onUploadImage: (kind: Kind, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isHire = kind === "hire";
  const enabled = isHire ? draft.hire_auto_reply_enabled : draft.collab_auto_reply_enabled;
  const text = isHire ? draft.hire_auto_reply_text : draft.collab_auto_reply_text;
  const imageUrl = isHire ? draft.hire_auto_reply_image_url : draft.collab_auto_reply_image_url;
  const linkUrl = isHire ? draft.hire_auto_reply_link_url : draft.collab_auto_reply_link_url;
  const accent = isHire ? "text-[hsl(var(--chat-hire))]" : "text-[hsl(var(--chat-collab))]";
  const Icon = isHire ? Briefcase : Handshake;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium flex items-center gap-1.5", accent)}>
            <Icon className="w-4 h-4 shrink-0" />
            {isHire ? "ตอบกลับแชทจ้างอัตโนมัติ" : "ตอบกลับแชทคอลแลปอัตโนมัติ"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ส่งเมื่อมีคนเปิดแชท{isHire ? "งานจ้าง" : "คอลแลป"}กับคุณครั้งแรก
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) =>
            onChange(
              isHire
                ? { hire_auto_reply_enabled: v }
                : { collab_auto_reply_enabled: v },
            )
          }
          aria-label={isHire ? "เปิดตอบกลับแชทจ้างอัตโนมัติ" : "เปิดตอบกลับแชทคอลแลปอัตโนมัติ"}
        />
      </div>

      <div className={cn("space-y-3", !enabled && "opacity-50 pointer-events-none")}>
        <div className="space-y-1.5">
          <Label className="text-xs">ข้อความ</Label>
          <Textarea
            value={text}
            onChange={(e) =>
              onChange(
                isHire
                  ? { hire_auto_reply_text: e.target.value.slice(0, TEXT_MAX) }
                  : { collab_auto_reply_text: e.target.value.slice(0, TEXT_MAX) },
              )
            }
            rows={3}
            maxLength={TEXT_MAX}
            placeholder={
              isHire
                ? "เช่น สวัสดีครับ ขอบคุณที่สนใจผลงาน — กำลังดูรายละเอียดและจะตอบกลับเร็ว ๆ นี้"
                : "เช่น สวัสดี! ยินดีคุยแนวทางคอลแลป — ส่ง mood board มาก่อนได้เลย"
            }
            className="rounded-xl resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {text.length}/{TEXT_MAX}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">ลิงก์ (ถ้ามี)</Label>
          <Input
            type="url"
            value={linkUrl ?? ""}
            onChange={(e) =>
              onChange(
                isHire
                  ? { hire_auto_reply_link_url: e.target.value.slice(0, LINK_MAX) || null }
                  : { collab_auto_reply_link_url: e.target.value.slice(0, LINK_MAX) || null },
              )
            }
            placeholder="https://…"
            className="rounded-xl h-9 text-sm"
            maxLength={LINK_MAX}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">รูปแนบ (ถ้ามี)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUploadImage(kind, file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8 text-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
              )}
              {imageUrl ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full h-8 text-xs text-muted-foreground"
                onClick={() =>
                  onChange(
                    isHire
                      ? { hire_auto_reply_image_url: null }
                      : { collab_auto_reply_image_url: null },
                  )
                }
              >
                <X className="w-3.5 h-3.5 mr-1" />
                ลบรูป
              </Button>
            )}
          </div>
          <AutoReplyPreviewImage path={imageUrl} />
          <p className="text-[10px] text-muted-foreground">JPG / PNG / WebP สูงสุด 8 MB</p>
        </div>
      </div>
    </div>
  );
}

export function ChatSettingsSection() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useChatSettings();
  const save = useSaveChatSettings();
  const { data: blocked = [], isLoading: blockedLoading } = useBlockedChatUsers();
  const unblock = useUnblockUser();
  const [draft, setDraft] = useState<ChatSettings | null>(null);
  const [uploadingKind, setUploadingKind] = useState<Kind | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const dirty =
    !!draft &&
    !!settings &&
    (draft.hire_auto_reply_enabled !== settings.hire_auto_reply_enabled ||
      draft.hire_auto_reply_text !== settings.hire_auto_reply_text ||
      draft.hire_auto_reply_image_url !== settings.hire_auto_reply_image_url ||
      draft.hire_auto_reply_link_url !== settings.hire_auto_reply_link_url ||
      draft.collab_auto_reply_enabled !== settings.collab_auto_reply_enabled ||
      draft.collab_auto_reply_text !== settings.collab_auto_reply_text ||
      draft.collab_auto_reply_image_url !== settings.collab_auto_reply_image_url ||
      draft.collab_auto_reply_link_url !== settings.collab_auto_reply_link_url);

  const patchDraft = (patch: Partial<ChatSettings>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const uploadImage = async (kind: Kind, file: File) => {
    if (!user?.id) return;
    if (!IMAGE_ACCEPT.split(",").includes(file.type)) {
      toast.error("รองรับเฉพาะ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error("รูปใหญ่เกินไป — สูงสุด 8 MB");
      return;
    }
    setUploadingKind(kind);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `anthem/chat-auto-reply/${user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      patchDraft(
        kind === "hire"
          ? { hire_auto_reply_image_url: path }
          : { collab_auto_reply_image_url: path },
      );
      toast.success("อัปโหลดรูปแล้ว — กดบันทึกการตั้งค่าแชท");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
    } finally {
      setUploadingKind(null);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    const hireLink = draft.hire_auto_reply_link_url?.trim() || null;
    const collabLink = draft.collab_auto_reply_link_url?.trim() || null;
    if (hireLink && !/^https?:\/\//i.test(hireLink)) {
      toast.error("ลิงก์แชทจ้างต้องขึ้นต้นด้วย http:// หรือ https://");
      return;
    }
    if (collabLink && !/^https?:\/\//i.test(collabLink)) {
      toast.error("ลิงก์แชทคอลแลปต้องขึ้นต้นด้วย http:// หรือ https://");
      return;
    }
    try {
      await save.mutateAsync({
        hire_auto_reply_enabled: draft.hire_auto_reply_enabled,
        hire_auto_reply_text: draft.hire_auto_reply_text.trim(),
        hire_auto_reply_image_url: draft.hire_auto_reply_image_url,
        hire_auto_reply_link_url: hireLink,
        collab_auto_reply_enabled: draft.collab_auto_reply_enabled,
        collab_auto_reply_text: draft.collab_auto_reply_text.trim(),
        collab_auto_reply_image_url: draft.collab_auto_reply_image_url,
        collab_auto_reply_link_url: collabLink,
      });
      toast.success("บันทึกการตั้งค่าแชทแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "บันทึกไม่สำเร็จ"));
    }
  };

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ตั้งค่าแชท</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        ตั้งข้อความตอบกลับอัตโนมัติเมื่อมีคนเริ่มแชทจ้างหรือคอลแลป และจัดการรายการที่คุณบล็อก
      </p>

      {isLoading || !draft ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : (
        <div className="space-y-4">
          <AutoReplyEditor
            kind="hire"
            draft={draft}
            onChange={patchDraft}
            uploading={uploadingKind === "hire"}
            onUploadImage={uploadImage}
          />
          <AutoReplyEditor
            kind="collab"
            draft={draft}
            onChange={patchDraft}
            uploading={uploadingKind === "collab"}
            onUploadImage={uploadImage}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!dirty || save.isPending}
              className="rounded-full"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              บันทึกการตั้งค่าแชท
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border/40 pt-5 space-y-3">
        <h3 className="text-sm font-medium text-foreground">รายการบล็อกแชท</h3>
        <p className="text-xs text-muted-foreground">
          คนที่คุณบล็อกจะส่งคำขอจ้าง/คอลแลปหาคุณไม่ได้ — กดปลดบล็อกได้ทุกเมื่อ
        </p>
        {blockedLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">ยังไม่ได้บล็อกใคร</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {blocked.map((u) => (
              <li key={u.userId} className="flex items-center gap-3 px-3 py-2.5 bg-background">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={u.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">{u.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    to={profilePublicPath({
                      user_id: u.userId,
                      username: u.username,
                    })}
                    className="text-sm font-medium text-foreground hover:underline truncate block"
                  >
                    {u.displayName}
                  </Link>
                  {u.username && (
                    <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 text-xs shrink-0"
                  disabled={unblock.isPending}
                  onClick={() => {
                    void unblock.mutateAsync(u.userId).then(() => {
                      /* toast from hook */
                    });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  ปลดบล็อก
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
