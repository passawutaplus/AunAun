import { useRef, useState } from "react";
import {
  Check,
  FileText,
  ImagePlus,
  Link2,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import {
  buildProgressCommentTree,
  countProgressComments,
  createEmptyProgressEntry,
  isProgressEntryConfirmed,
  newProgressEntryId,
  type CollabAttachment,
  type CollabProgressComment,
  type CollabProgressEntry,
  type ProgressCommentTree,
} from "@/lib/collabPlanDoc";
import { storageMediaPublicUrl } from "@/lib/storageMediaUrl";
import { safeHttpUrl } from "@/lib/safeUrl";
import { formatThaiDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ProgressMemberProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type CommentDraft = {
  text: string;
  link: string;
  pendingFiles: CollabAttachment[];
  replyToId: string | null;
  replyToName: string | null;
};

type Props = {
  entries: CollabProgressEntry[];
  disabled?: boolean;
  canComment?: boolean;
  uploading?: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  memberProfiles?: Map<string, ProgressMemberProfile>;
  title?: string;
  addLabel?: string;
  showHeader?: boolean;
  onChange: (entries: CollabProgressEntry[]) => void;
  /** Persist social updates without clearing plan acks. */
  onPersistSocial?: (entries: CollabProgressEntry[]) => void | Promise<void>;
  onUploadFile: (
    entryId: string,
    file: File,
    kind: "image" | "file",
  ) => void | Promise<void>;
  onUploadCommentFile?: (
    entryId: string,
    file: File,
  ) => Promise<CollabAttachment | null>;
};

function isImageAtt(a: CollabAttachment): boolean {
  return !!a.contentType?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(a.name);
}

function emptyDraft(): CommentDraft {
  return { text: "", link: "", pendingFiles: [], replyToId: null, replyToName: null };
}

/** Stack of dated progress boxes with social-style comments. */
export function CollabProgressFeed({
  entries,
  disabled,
  canComment = false,
  uploading,
  currentUserId,
  currentUserName,
  currentUserAvatar = null,
  memberProfiles,
  title = "ความคืบหน้า",
  addLabel = "+ ความคืบหน้า",
  showHeader = true,
  onChange,
  onPersistSocial,
  onUploadFile,
  onUploadCommentFile,
}: Props) {
  const entryImageRef = useRef<HTMLInputElement>(null);
  const entryFileRef = useRef<HTMLInputElement>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [commentUploadEntryId, setCommentUploadEntryId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, CommentDraft>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showAttach, setShowAttach] = useState<Record<string, boolean>>({});
  const [commentBusy, setCommentBusy] = useState(false);

  const getCommentDraft = (entryId: string): CommentDraft =>
    commentDrafts[entryId] ?? emptyDraft();

  const setCommentDraft = (entryId: string, patch: Partial<CommentDraft>) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [entryId]: { ...getCommentDraft(entryId), ...patch },
    }));
  };

  const applyEntries = (next: CollabProgressEntry[], persistSocial = false) => {
    if (persistSocial && onPersistSocial) {
      void onPersistSocial(next);
      return;
    }
    onChange(next);
  };

  const assertOwnsDraft = (entry: CollabProgressEntry | undefined, action = "แก้ไข") => {
    if (!entry) return false;
    if (disabled) {
      toast.error("ขั้นนี้ยังแก้ความคืบหน้าไม่ได้");
      return false;
    }
    if (!currentUserId || entry.userId !== currentUserId) {
      toast.error(`เฉพาะเจ้าของรายการนี้ที่${action}ได้`);
      return false;
    }
    if (isProgressEntryConfirmed(entry)) {
      toast.error("โพสต์แล้ว — แก้เนื้อหาไม่ได้");
      return false;
    }
    return true;
  };

  const patchEntry = (id: string, patch: Partial<CollabProgressEntry>) => {
    const entry = entries.find((e) => e.id === id);
    if (!assertOwnsDraft(entry)) return;
    // Never let callers reassign ownership / confirm via patch.
    const safePatch: Partial<CollabProgressEntry> = { ...patch };
    delete safePatch.userId;
    delete safePatch.userName;
    delete safePatch.confirmedAt;
    onChange(entries.map((e) => (e.id === id ? { ...e, ...safePatch } : e)));
  };

  const resolveProfile = (userId: string, fallbackName: string): ProgressMemberProfile => {
    const fromMap = memberProfiles?.get(userId);
    if (fromMap) return fromMap;
    if (userId === currentUserId) {
      return {
        username: currentUserName,
        displayName: currentUserName,
        avatarUrl: currentUserAvatar,
      };
    }
    return { username: fallbackName, displayName: fallbackName, avatarUrl: null };
  };

  const addEntry = () => {
    if (disabled) {
      toast.error("ขั้นนี้ยังเพิ่มความคืบหน้าไม่ได้");
      return;
    }
    if (!currentUserId) {
      toast.error("เข้าสู่ระบบก่อนเพิ่มความคืบหน้า");
      return;
    }
    onChange([
      ...entries,
      createEmptyProgressEntry({
        userId: currentUserId,
        userName: currentUserName,
      }),
    ]);
  };

  const removeEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (!currentUserId || entry.userId !== currentUserId) {
      toast.error("เฉพาะเจ้าของรายการนี้ที่ลบได้");
      return;
    }
    if (isProgressEntryConfirmed(entry) && entry.comments.length > 0) {
      toast.error("มีคอมเมนต์แล้ว — ลบไม่ได้");
      return;
    }
    if (disabled) {
      toast.error("ขั้นนี้ยังลบความคืบหน้าไม่ได้");
      return;
    }
    onChange(entries.filter((e) => e.id !== id));
    setCommentDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeImage = (entryId: string, path: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!assertOwnsDraft(entry, "ลบภาพ")) return;
    onChange(
      entries.map((e) =>
        e.id === entryId
          ? { ...e, images: e.images.filter((img) => img.path !== path) }
          : e,
      ),
    );
  };

  const removeFile = (entryId: string, path: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!assertOwnsDraft(entry, "ลบไฟล์")) return;
    onChange(
      entries.map((e) =>
        e.id === entryId
          ? { ...e, files: (e.files ?? []).filter((f) => f.path !== path) }
          : e,
      ),
    );
  };

  const confirmEntry = (entry: CollabProgressEntry) => {
    if (!assertOwnsDraft(entry, "โพสต์")) return;
    if (!entry.date.trim()) {
      toast.error("ใส่วันที่ก่อนยืนยัน");
      return;
    }
    if (!entry.body.trim() && entry.images.length === 0 && !(entry.files ?? []).length) {
      toast.error("ใส่รายละเอียด หรืออัปภาพ/ไฟล์ก่อนยืนยัน");
      return;
    }
    const next = entries.map((e) =>
      e.id === entry.id ? { ...e, confirmedAt: new Date().toISOString() } : e,
    );
    applyEntries(next, true);
    setOpenComments((prev) => ({ ...prev, [entry.id]: true }));
    toast.success("โพสต์ความคืบหน้าแล้ว");
  };

  const addComment = (entryId: string) => {
    const draft = getCommentDraft(entryId);
    const text = draft.text.trim();
    const link = draft.link.trim();
    const links = link ? [link] : [];
    if (link && !safeHttpUrl(link)) {
      toast.error("ลิงก์ไม่ถูกต้อง — ใช้ http/https");
      return;
    }
    if (!text && links.length === 0 && draft.pendingFiles.length === 0) {
      toast.error("พิมพ์ข้อความหรือแนบไฟล์ก่อนส่ง");
      return;
    }
    const comment: CollabProgressComment = {
      id: newProgressEntryId(),
      userId: currentUserId,
      userName: currentUserName,
      text,
      createdAt: new Date().toISOString(),
      links,
      attachments: draft.pendingFiles,
      parentId: draft.replyToId,
      likedBy: [],
    };
    const next = entries.map((e) =>
      e.id === entryId ? { ...e, comments: [...e.comments, comment] } : e,
    );
    applyEntries(next, true);
    setCommentDraft(entryId, emptyDraft());
    setShowAttach((prev) => ({ ...prev, [entryId]: false }));
    setOpenComments((prev) => ({ ...prev, [entryId]: true }));
  };

  const toggleLike = (entryId: string, commentId: string) => {
    if (!currentUserId || !canComment) return;
    const next = entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        comments: e.comments.map((c) => {
          if (c.id !== commentId) return c;
          const likedBy = c.likedBy ?? [];
          const has = likedBy.includes(currentUserId);
          return {
            ...c,
            likedBy: has
              ? likedBy.filter((id) => id !== currentUserId)
              : [...likedBy, currentUserId],
          };
        }),
      };
    });
    applyEntries(next, true);
  };

  const renderCommentNode = (
    entryId: string,
    node: ProgressCommentTree,
    depth: number,
  ) => {
    const c = node.comment;
    const profile = resolveProfile(c.userId, c.userName);
    const likedBy = c.likedBy ?? [];
    const liked = !!currentUserId && likedBy.includes(currentUserId);
    const canReply = depth < 2 && canComment;

    return (
      <div
        key={c.id}
        className={cn(depth > 0 && "ml-4 md:ml-6 border-l-2 border-border/60 pl-3")}
      >
        <div className="rounded-2xl glass-panel p-3 flex gap-2.5">
          <UserAvatar
            src={profile.avatarUrl}
            name={profile.displayName}
            username={profile.username}
            className="w-9 h-9 shrink-0"
            fallbackClassName="bg-primary/15 text-primary"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
              <span className="text-xs text-muted-foreground">{formatThaiDate(c.createdAt)}</span>
              <button
                type="button"
                disabled={!canComment}
                onClick={() => toggleLike(entryId, c.id)}
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs transition-colors",
                  liked ? "text-primary" : "text-muted-foreground hover:text-primary",
                  !canComment && "opacity-60 cursor-default",
                )}
              >
                <PlusOneMark filled={liked} className="text-[10px]" />
                {likedBy.length > 0 ? <span>{likedBy.length}</span> : null}
              </button>
              {canReply ? (
                <button
                  type="button"
                  onClick={() =>
                    setCommentDraft(entryId, {
                      replyToId: c.id,
                      replyToName: profile.username,
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" /> ตอบกลับ
                </button>
              ) : null}
            </div>
            {c.text ? (
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.text}</p>
            ) : null}
            {(c.links ?? []).map((url) => {
              const href = safeHttpUrl(url);
              return href ? (
                <a
                  key={url}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[hsl(var(--chat-collab))] hover:underline break-all inline-flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3 shrink-0" />
                  {url}
                </a>
              ) : null;
            })}
            {(c.attachments ?? []).length ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(c.attachments ?? []).map((a) =>
                  isImageAtt(a) ? (
                    <a
                      key={a.path}
                      href={storageMediaPublicUrl(a.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-h-36 rounded-lg border border-border/60 overflow-hidden"
                    >
                      <img
                        src={storageMediaPublicUrl(a.path)}
                        alt={a.name}
                        className="max-h-36 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      key={a.path}
                      href={storageMediaPublicUrl(a.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:underline"
                    >
                      <Paperclip className="w-3 h-3" />
                      {a.name}
                    </a>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </div>
        {node.replies.map((child) => (
          <div key={child.comment.id} className="mt-2.5">
            {renderCommentNode(entryId, child, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-foreground">{title}</p>
          {!disabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-[11px] border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
              onClick={addEntry}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {addLabel.replace(/^\+\s*/, "")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={entryImageRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = uploadTargetId;
          e.target.value = "";
          setUploadTargetId(null);
          if (!f || !target) return;
          const entry = entries.find((x) => x.id === target);
          if (!assertOwnsDraft(entry, "อัปภาพ")) return;
          void onUploadFile(target, f, "image");
        }}
      />
      <input
        ref={entryFileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = uploadTargetId;
          e.target.value = "";
          setUploadTargetId(null);
          if (!f || !target) return;
          const entry = entries.find((x) => x.id === target);
          if (!assertOwnsDraft(entry, "อัปไฟล์")) return;
          void onUploadFile(target, f, "file");
        }}
      />
      <input
        ref={commentFileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const entryId = commentUploadEntryId;
          e.target.value = "";
          setCommentUploadEntryId(null);
          if (!f || !entryId || !onUploadCommentFile) return;
          setCommentBusy(true);
          void (async () => {
            try {
              const att = await onUploadCommentFile(entryId, f);
              if (att) {
                const d = getCommentDraft(entryId);
                setCommentDraft(entryId, {
                  pendingFiles: [...d.pendingFiles, att],
                });
                setShowAttach((prev) => ({ ...prev, [entryId]: true }));
              }
            } finally {
              setCommentBusy(false);
            }
          })();
        }}
      />

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center space-y-2">
          <p className="text-[11px] text-muted-foreground">
            ยังไม่มีความคืบหน้า — กดเพิ่ม แล้วโพสต์เหมือนโซเชียล จากนั้นให้เพื่อนคอมเมนต์ได้
          </p>
          {!disabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-[11px]"
              onClick={addEntry}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              เพิ่มความคืบหน้า
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline rail — connects through entries to the add node */}
          {!disabled || entries.length > 1 ? (
            <div
              className="pointer-events-none absolute left-[11px] top-4 bottom-3 w-px bg-border"
              aria-hidden
            />
          ) : null}
          <ul className="relative space-y-0">
          {entries.map((entry, index) => {
            const confirmed = isProgressEntryConfirmed(entry);
            const isOwner = entry.userId === currentUserId;
            const canEditDraft = !disabled && !confirmed && isOwner;
            const canDelete =
              !disabled && isOwner && (!confirmed || !entry.comments.length);
            const commentsAllowed = confirmed && canComment;
            const commentsOpen =
              openComments[entry.id] ?? (confirmed && entry.comments.length > 0);
            const draft = getCommentDraft(entry.id);
            const files = entry.files ?? [];
            const commentCount = countProgressComments(entry.comments);
            const tree = buildProgressCommentTree(entry.comments);
            const author = resolveProfile(entry.userId, entry.userName);
            const isLast = index === entries.length - 1;

            return (
              <li key={entry.id} className={cn("relative flex gap-3", (!isLast || !disabled) && "pb-5")}>
                {/* Timeline node */}
                <div className="relative z-[1] flex w-6 shrink-0 justify-center pt-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums bg-background",
                      confirmed
                        ? "border-[hsl(var(--chat-collab))] bg-[hsl(var(--chat-collab))] text-white"
                        : "border-border text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {confirmed ? (
                      <Check className="w-3 h-3" strokeWidth={3} />
                    ) : (
                      String(index + 1)
                    )}
                  </span>
                </div>

                {/* Section content */}
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border overflow-hidden",
                    confirmed
                      ? "border-[hsl(var(--chat-collab)/0.3)] bg-[hsl(var(--chat-collab-soft))]/10"
                      : "border-border/80 bg-card/40",
                  )}
                >
                {/* Social post header */}
                <div className="p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={author.avatarUrl}
                        name={author.displayName}
                        username={author.username}
                        className="w-10 h-10 shrink-0"
                        fallbackClassName="bg-primary/15 text-primary"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          @{entry.userName || author.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ความคืบหน้า #{String(index + 1).padStart(2, "0")}
                          {entry.date ? ` · ${entry.date}` : ""}
                          {confirmed ? " · โพสต์แล้ว" : " · ร่าง"}
                        </p>
                      </div>
                    </div>
                    {canDelete ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        onClick={() => removeEntry(entry.id)}
                        aria-label="ลบความคืบหน้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {canEditDraft ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={entry.date}
                          className="h-9 rounded-lg text-sm"
                          aria-label="วันที่"
                          onChange={(e) => patchEntry(entry.id, { date: e.target.value })}
                        />
                        <label className="space-y-1">
                          <span className="text-[10px] text-muted-foreground">ชื่อ (username)</span>
                          <Input
                            value={entry.userName}
                            disabled
                            readOnly
                            className="h-9 rounded-lg text-sm bg-muted/40"
                          />
                        </label>
                      </div>
                      <Textarea
                        value={entry.body}
                        rows={3}
                        placeholder="สรุปงานที่ทำ / ไฟล์ที่อัป / สิ่งที่อยากให้ดู…"
                        className="rounded-xl text-sm resize-y min-h-[72px]"
                        onChange={(e) => patchEntry(entry.id, { body: e.target.value })}
                      />
                    </>
                  ) : (
                    entry.body.trim() ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {entry.body}
                      </p>
                    ) : null
                  )}

                  <div className="space-y-2">
                    {canEditDraft ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] text-muted-foreground">ภาพ / ไฟล์</p>
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full text-[10px]"
                            disabled={uploading}
                            onClick={() => {
                              setUploadTargetId(entry.id);
                              entryImageRef.current?.click();
                            }}
                          >
                            {uploading && uploadTargetId === entry.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <ImagePlus className="w-3 h-3 mr-1" />
                            )}
                            อัปภาพ
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full text-[10px]"
                            disabled={uploading}
                            onClick={() => {
                              setUploadTargetId(entry.id);
                              entryFileRef.current?.click();
                            }}
                          >
                            <Paperclip className="w-3 h-3 mr-1" />
                            ไฟล์
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {entry.images.length || files.length ? (
                      <div className="space-y-2">
                        {entry.images.length ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {entry.images.map((img) => (
                              <div
                                key={img.path}
                                className="relative aspect-square rounded-xl border border-border overflow-hidden bg-muted"
                              >
                                <a
                                  href={storageMediaPublicUrl(img.path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-full h-full"
                                >
                                  <img
                                    src={storageMediaPublicUrl(img.path)}
                                    alt={img.name}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                                {canEditDraft ? (
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 rounded-full bg-black/55 text-white p-0.5"
                                    onClick={() => removeImage(entry.id, img.path)}
                                    aria-label="ลบรูป"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {files.length ? (
                          <ul className="space-y-1">
                            {files.map((f) => (
                              <li
                                key={f.path}
                                className="flex items-center gap-2 text-[11px] rounded-lg border border-border px-2 py-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <a
                                  href={storageMediaPublicUrl(f.path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 truncate hover:underline"
                                >
                                  {f.name}
                                </a>
                                {canEditDraft ? (
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => removeFile(entry.id, f.path)}
                                    aria-label="ลบไฟล์"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : canEditDraft ? (
                      <p className="text-[10px] text-muted-foreground rounded-lg border border-dashed border-border px-2 py-3 text-center">
                        ยังไม่มีภาพหรือไฟล์ในกล่องนี้
                      </p>
                    ) : null}
                  </div>

                  {canEditDraft ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-9 rounded-full text-[12px] bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                      onClick={() => confirmEntry(entry)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" strokeWidth={2.5} />
                      โพสต์ความคืบหน้านี้
                    </Button>
                  ) : null}
                </div>

                {!confirmed ? null : (
                  <div className="border-t border-border/70 px-3 py-2.5 space-y-3 bg-background/30">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant={commentsOpen ? "default" : "outline"}
                        className={cn(
                          "h-8 rounded-full text-[11px]",
                          commentsOpen
                            ? "bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                            : "border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]",
                        )}
                        onClick={() =>
                          setOpenComments((prev) => ({
                            ...prev,
                            [entry.id]: !commentsOpen,
                          }))
                        }
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        คอมเมนต์
                        {commentCount ? ` (${commentCount})` : ""}
                      </Button>
                    </div>

                    {commentsOpen ? (
                      <div className="space-y-3">
                        {tree.length ? (
                          <div className="space-y-2.5">
                            {tree.map((node) => renderCommentNode(entry.id, node, 0))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-3">
                            ยังไม่มีคอมเมนต์ — มาเป็นคนแรกกันเถอะ
                          </p>
                        )}

                        {commentsAllowed ? (
                          <div className="rounded-2xl glass-panel p-3 space-y-2.5">
                            {draft.replyToId ? (
                              <div className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                                <span>
                                  ตอบกลับ <strong>@{draft.replyToName}</strong>
                                </span>
                                <button
                                  type="button"
                                  className="text-[hsl(var(--chat-collab))] hover:underline"
                                  onClick={() =>
                                    setCommentDraft(entry.id, {
                                      replyToId: null,
                                      replyToName: null,
                                    })
                                  }
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            ) : null}
                            <div className="flex gap-2.5 items-start">
                              <UserAvatar
                                src={currentUserAvatar}
                                name={currentUserName}
                                username={currentUserName}
                                className="w-9 h-9 shrink-0 mt-0.5"
                                fallbackClassName="bg-primary/15 text-primary"
                              />
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="text-xs font-semibold text-foreground">
                                  @{currentUserName}
                                </p>
                                <Textarea
                                  value={draft.text}
                                  onChange={(e) =>
                                    setCommentDraft(entry.id, { text: e.target.value })
                                  }
                                  placeholder={
                                    draft.replyToId
                                      ? "เขียนคำตอบ..."
                                      : "เขียนคอมเมนต์..."
                                  }
                                  rows={2}
                                  maxLength={800}
                                  className="rounded-xl text-sm resize-none min-h-[56px]"
                                />
                                {showAttach[entry.id] || draft.link || draft.pendingFiles.length ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={draft.link}
                                      onChange={(e) =>
                                        setCommentDraft(entry.id, { link: e.target.value })
                                      }
                                      placeholder="ลิงก์ (ถ้ามี) https://…"
                                      className="h-8 rounded-xl text-xs font-mono"
                                    />
                                    {draft.pendingFiles.length ? (
                                      <ul className="space-y-1">
                                        {draft.pendingFiles.map((f) => (
                                          <li
                                            key={f.path}
                                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                          >
                                            <Paperclip className="w-3 h-3" />
                                            <span className="truncate flex-1">{f.name}</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCommentDraft(entry.id, {
                                                  pendingFiles: draft.pendingFiles.filter(
                                                    (x) => x.path !== f.path,
                                                  ),
                                                })
                                              }
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-full text-[11px] px-2"
                                      disabled={commentBusy || !onUploadCommentFile}
                                      onClick={() => {
                                        setCommentUploadEntryId(entry.id);
                                        window.setTimeout(
                                          () => commentFileRef.current?.click(),
                                          0,
                                        );
                                      }}
                                    >
                                      {commentBusy && commentUploadEntryId === entry.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <ImagePlus className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-full text-[11px] px-2"
                                      onClick={() =>
                                        setShowAttach((prev) => ({
                                          ...prev,
                                          [entry.id]: !prev[entry.id],
                                        }))
                                      }
                                    >
                                      <Link2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-full text-[11px] bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                                    onClick={() => addComment(entry.id)}
                                  >
                                    <Send className="w-3.5 h-3.5 mr-1" />
                                    ส่ง
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
                </div>
              </li>
            );
          })}
          </ul>
          {!disabled ? (
            <div className="relative flex gap-3 pt-1">
              <div className="relative z-[1] flex w-6 shrink-0 justify-center pt-1">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[hsl(var(--chat-collab)/0.55)] bg-background text-[hsl(var(--chat-collab))]"
                  aria-hidden
                >
                  <Plus className="w-3 h-3" strokeWidth={2.5} />
                </span>
              </div>
              <div className="min-w-0 flex-1 flex items-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-[11px] border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                  onClick={addEntry}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {addLabel.replace(/^\+\s*/, "")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
