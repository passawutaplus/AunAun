import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { th } from "date-fns/locale";
import { ExternalLink, Reply, Undo2 } from "lucide-react";
import ReportTrigger from "@/components/report/ReportTrigger";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_FEED_SELECT, PUBLIC_PROFILE_SELECT } from "@/lib/dbSelects";
import { profilePublicPath } from "@/lib/profileRoutes";
import { isSystemFallbackContent, stripSystemFallbackPrefix } from "@/lib/chatContext";
import { UNSEND_WINDOW_MS, type Message } from "@/hooks/useChat";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";

function ChatAttachmentImage({ refUrl }: { refUrl: string }) {
  const src = useSignedStorageUrl(refUrl);
  if (!src) return <div className="rounded-2xl mb-1 h-32 bg-muted animate-pulse" />;
  return <img src={src} alt="" className="rounded-2xl mb-1 max-h-72 object-cover" />;
}

interface Props {
  message: Message;
  mine: boolean;
  kind: "hire" | "collab" | "group";
  onReply?: (message: Message) => void;
  onUnsend?: (message: Message) => void;
}

const MessageBubble = ({ message, mine, kind, onReply, onUnsend }: Props) => {
  const time = format(new Date(message.created_at), "HH:mm");
  const deleted = !!message.deleted_at;
  const canUnsend =
    mine &&
    !deleted &&
    Date.now() - new Date(message.created_at).getTime() < UNSEND_WINDOW_MS;

  const isSystem =
    message.message_type === "system" ||
    (!!message.content && isSystemFallbackContent(message.content));

  const profileUserId =
    message.message_type === "profile"
      ? (message as Message & { profile_user_id?: string }).profile_user_id ?? message.sender_id
      : null;

  const { data: replyTo } = useQuery({
    queryKey: ["msg-reply", message.reply_to_id],
    enabled: !!message.reply_to_id && !deleted,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, deleted_at, message_type, project_id")
        .eq("id", message.reply_to_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: project } = useQuery({
    queryKey: ["msg-project", message.project_id],
    enabled: message.message_type === "project" && !!message.project_id && !deleted,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("id", message.project_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: profileCard } = useQuery({
    queryKey: ["msg-profile", profileUserId],
    enabled: message.message_type === "profile" && !!profileUserId && !deleted,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(PUBLIC_PROFILE_SELECT)
        .eq("user_id", profileUserId!)
        .maybeSingle();
      return data;
    },
  });

  const mineBg =
    kind === "hire"
      ? "bg-[hsl(var(--chat-hire))] text-white"
      : kind === "collab"
        ? "bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.8)] text-white"
        : "bg-primary text-primary-foreground";
  const theirBg =
    kind === "hire"
      ? "bg-[hsl(var(--chat-hire-soft))] text-foreground"
      : kind === "collab"
        ? "bg-card text-foreground border border-border"
        : "bg-muted text-foreground border border-border";

  const displayContent = message.content
    ? isSystemFallbackContent(message.content)
      ? stripSystemFallbackPrefix(message.content)
      : message.content
    : "";

  if (isSystem && !deleted) {
    return (
      <div className="flex justify-center my-2 px-4">
        <p className="text-xs text-center text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-full max-w-[90%] leading-relaxed">
          {displayContent}
        </p>
      </div>
    );
  }

  const bubble = (
    <div className={cn("flex group/msg", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] md:max-w-[60%]")}>
        {deleted ? (
          <div className="px-3.5 py-2 rounded-2xl text-sm italic text-muted-foreground bg-muted/60">
            ข้อความถูกยกเลิก
          </div>
        ) : (
          <>
            {message.reply_to_id && replyTo && (
              <div
                className={cn(
                  "mb-1 px-3 py-1.5 rounded-xl text-[11px] border-l-2 opacity-90",
                  mine ? "bg-black/10 border-white/50" : "bg-muted/80 border-primary/40",
                )}
              >
                <span className="font-medium block truncate">
                  {replyTo.deleted_at ? "ข้อความถูกยกเลิก" : replyTo.content || "📷 รูปภาพ"}
                </span>
              </div>
            )}
            {message.attachment_url && message.message_type !== "project" && message.message_type !== "profile" && (
              <ChatAttachmentImage refUrl={message.attachment_url} />
            )}
            {message.message_type === "project" && project && (
              <Link
                to={`/project/${project.id}`}
                className={cn(
                  "block rounded-2xl overflow-hidden mb-1 border shadow-sm hover:opacity-95 transition-opacity",
                  mine ? "border-white/20" : "border-border",
                )}
              >
                {project.cover_url ? (
                  <img src={project.cover_url} alt="" className="w-full max-h-40 object-cover" />
                ) : (
                  <div className="h-24 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    ไม่มีรูปปก
                  </div>
                )}
                <div className={cn("px-3 py-2 flex items-center justify-between gap-2", mine ? "bg-black/10" : "bg-card")}>
                  <span className="text-sm font-medium truncate">{project.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </div>
              </Link>
            )}
            {message.message_type === "profile" && profileCard && (
              <Link
                to={profilePublicPath(profileCard)}
                className={cn(
                  "block rounded-2xl overflow-hidden mb-1 border shadow-sm hover:opacity-95 transition-opacity",
                  mine ? "border-white/20" : "border-border",
                )}
              >
                <div className={cn("p-3 flex items-center gap-3", mine ? "bg-black/10" : "bg-card")}>
                  {profileCard.avatar_url ? (
                    <img src={profileCard.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                      {(profileCard.display_name ?? "?")[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{profileCard.display_name ?? "ครีเอเตอร์"}</p>
                    {profileCard.role && (
                      <p className="text-xs text-muted-foreground truncate">{profileCard.role}</p>
                    )}
                    {profileCard.skills && profileCard.skills.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {profileCard.skills.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </div>
              </Link>
            )}
            {displayContent && message.message_type !== "project" && message.message_type !== "profile" && (
              <div
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-base leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  mine ? `${mineBg} rounded-br-md` : `${theirBg} rounded-bl-md`,
                )}
              >
                {displayContent}
              </div>
            )}
          </>
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground",
            mine ? "justify-end" : "justify-start",
          )}
        >
          <span>{time}</span>
          {mine && !deleted && <span>{message.read_at ? "อ่านแล้ว" : "ส่งแล้ว"}</span>}
          {!mine && !deleted && (
            <ReportTrigger
              targetType="message"
              targetId={message.id}
              targetOwnerId={message.sender_id}
              className="opacity-0 group-hover/msg:opacity-100 ml-0.5"
            />
          )}
        </div>
      </div>
    </div>
  );

  if (!onReply && !onUnsend) return bubble;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={deleted}>
        <div>{bubble}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onReply && !deleted && (
          <ContextMenuItem onClick={() => onReply(message)}>
            <Reply className="w-4 h-4 mr-2" />
            ตอบกลับ
          </ContextMenuItem>
        )}
        {onUnsend && canUnsend && (
          <ContextMenuItem onClick={() => onUnsend(message)} className="text-destructive">
            <Undo2 className="w-4 h-4 mr-2" />
            ยกเลิกการส่ง
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const DateSeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  const label = isToday(d) ? "วันนี้" : isYesterday(d) ? "เมื่อวาน" : format(d, "d MMM yyyy", { locale: th });
  return (
    <div className="flex justify-center my-3">
      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{label}</span>
    </div>
  );
};

export default MessageBubble;
