import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Handshake, MessageCircle, Paperclip, X, UserCircle2, FolderOpen, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useAcceptRequest, useRejectRequest, useFindConversationByRequest } from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const COLLAB_TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "accepted":
    case "interested":
      return { label: "กำลังคุย", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "declined":
    case "passed":
      return { label: "ปฏิเสธแล้ว", tone: "bg-muted text-muted-foreground border-border" };
    case "pending":
      return { label: "ข้อความใหม่", tone: "bg-primary/10 text-primary border-primary/20" };
    default:
      return { label: status, tone: "bg-muted text-muted-foreground border-border" };
  }
};

const CollabRequestsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [] } = useReceivedCollabRequests();
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const findConv = useFindConversationByRequest();

  const senderIds = Array.from(new Set(requests.map((r) => r.sender_id)));
  const attachedIds = Array.from(new Set(requests.flatMap((r) => r.attached_project_ids ?? [])));

  const { data: sendersMap = {} } = useQuery({
    queryKey: ["collab-senders", senderIds],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, role")
        .in("user_id", senderIds);
      const map: Record<string, { name: string; avatar: string; role: string }> = {};
      (data ?? []).forEach((p) => {
        map[p.user_id] = {
          name: p.display_name || "ฟรีแลนซ์",
          avatar: p.avatar_url || "",
          role: p.role || "",
        };
      });
      return map;
    },
  });

  const { data: attachedMap = {} } = useQuery({
    queryKey: ["collab-attached", attachedIds],
    enabled: attachedIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .in("id", attachedIds);
      const map: Record<string, { title: string; cover: string }> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = { title: p.title, cover: p.cover_url || "" };
      });
      return map;
    },
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync({ kind: "collab", requestId: id });
      toast.success("ปฏิเสธคำขอแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const openChat = async (req: (typeof requests)[number]) => {
    if (!user) return;
    try {
      let convId = await findConv("collab", req.id);
      if (!convId) {
        convId = await accept.mutateAsync({
          kind: "collab",
          requestId: req.id,
          clientId: req.sender_id,
          freelancerId: req.recipient_id,
          projectId: req.project_id ?? null,
          projectTitle: "คอลแลปไอเดียใหม่",
        });
      }
      navigate(`/chat/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-3 scroll-mt-24 rounded-3xl glass-panel p-5 md:p-6" id="collab-section">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--chat-collab-soft))]"><Handshake className="w-5 h-5 text-[hsl(var(--chat-collab))]" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-foreground">คำขอร่วมงาน (Collab)</h2>
            {pendingCount > 0 && (
              <Badge className="bg-primary text-primary-foreground border-0 hover:bg-primary text-[10px] px-1.5">{pendingCount} ใหม่</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">ครีเอเตอร์ที่อยากร่วมงานกับคุณ — เปิดแชทตอบได้เลย</p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีคำขอร่วมงาน</p>
        )}

        {requests.map((req) => {
          const sender = sendersMap[req.sender_id];
          const sb = statusBadge(req.status as string);
          const isDeclined = req.status === "declined" || req.status === "passed";
          return (
            <div key={req.id} className="rounded-2xl glass-panel p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <button onClick={() => navigate(`/u/${req.sender_id}`)} className="shrink-0">
                  {sender?.avatar ? (
                    <img src={sender.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-medium">
                      {(sender?.name ?? "?")[0]}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/u/${req.sender_id}`)} className="font-semibold text-foreground text-sm hover:text-primary">
                      {sender?.name ?? "ฟรีแลนซ์"}
                    </button>
                    {sender?.role && <span className="text-xs text-muted-foreground">· {sender.role}</span>}
                    <Badge variant="outline" className={`text-[10px] ${sb.tone}`}>{sb.label}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {(req.collab_types ?? []).map((t) => {
                      const label = COLLAB_TYPE_LABELS[t] ?? t;
                      const isOther = t === "other";
                      const note = (req as { other_type_note?: string | null }).other_type_note;
                      return (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]">
                          {isOther && note ? `${label}: ${note}` : label}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-base text-foreground mt-2 leading-6 whitespace-pre-wrap">{req.message}</p>

                  {((req as { external_drive_url?: string }).external_drive_url || (req as { website_url?: string }).website_url) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(req as { external_drive_url?: string }).external_drive_url && (
                        <a
                          href={(req as { external_drive_url: string }).external_drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border bg-card hover:border-primary/40 text-foreground"
                        >
                          <FolderOpen className="w-3 h-3 text-primary" /> ไดรฟ์/ไฟล์ผลงาน
                        </a>
                      )}
                      {(req as { website_url?: string }).website_url && (
                        <a
                          href={(req as { website_url: string }).website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border bg-card hover:border-primary/40 text-foreground"
                        >
                          <Globe className="w-3 h-3 text-primary" /> เว็บไซต์
                        </a>
                      )}
                    </div>
                  )}

                  {req.timeline && (
                    <p className="text-xs text-muted-foreground mt-1.5">⏰ {req.timeline}</p>
                  )}

                  {req.attached_project_ids && req.attached_project_ids.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> ผลงานที่แนบมา
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {req.attached_project_ids.map((pid) => {
                          const proj = attachedMap[pid];
                          if (!proj) return null;
                          return (
                            <button
                              key={pid}
                              onClick={() => navigate(`/project/${pid}`)}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                              title={proj.title}
                            >
                              {proj.cover ? (
                                <img src={proj.cover} alt={proj.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted text-[9px] flex items-center justify-center text-muted-foreground p-1 text-center">{proj.title}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">⏱ {timeAgoTH(req.created_at)}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/u/${req.sender_id}`)}
                        className="rounded-full h-8 text-xs"
                      >
                        <UserCircle2 className="w-3.5 h-3.5 mr-1" /> ดูโปรไฟล์
                      </Button>
                      {!isDeclined && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(req.id)} disabled={reject.isPending} className="rounded-full h-8 text-xs text-muted-foreground hover:text-destructive">
                            <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
                          </Button>
                          <Button size="sm" onClick={() => openChat(req)} disabled={accept.isPending} className="rounded-full h-8 text-xs bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.85)] text-white hover:opacity-90">
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollabRequestsSection;
