import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { useChatMessages, playBeep, type ChatMessage } from "@/hooks/useChat";
import { uploadCompressedImage } from "@/lib/imageCompress";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";
import {
  formatMemberCode,
  memberCodeMatchesUserId,
  userLabelWithMemberCode,
} from "@/lib/userDisplayId";

interface ConvSummary {
  user_id: string;
  email: string | null;
  display_name: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

export function AdminChatSection() {
  const { user } = useAuth();
  const [convs, setConvs] = React.useState<ConvSummary[]>([]);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const seenIdsRef = React.useRef<Set<string>>(new Set());

  const { messages } = useChatMessages(activeUserId);

  const refreshConvs = React.useCallback(async () => {
    // Fetch all messages, group by user_id (admin sees all)
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("user_id,body,image_url,created_at,sender_role,is_read")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!msgs) return;

    const byUser = new Map<string, { last: (typeof msgs)[0]; unread: number }>();
    for (const m of msgs) {
      const cur = byUser.get(m.user_id);
      if (!cur) {
        byUser.set(m.user_id, {
          last: m,
          unread: m.sender_role === "user" && !m.is_read ? 1 : 0,
        });
      } else {
        if (m.sender_role === "user" && !m.is_read) cur.unread += 1;
      }
    }

    const ids = Array.from(byUser.keys());
    if (ids.length === 0) {
      setConvs([]);
      return;
    }
    // Admin-only listing: returns non-sensitive profile columns (bank/tax/phone/address are excluded server-side).
    const { data: profilesAll } = await (
      supabase.rpc as unknown as (fn: string) => Promise<{
        data: Array<{ user_id: string; email: string | null; display_name: string | null }> | null;
      }>
    )("admin_list_profiles_safe");
    const profiles = (profilesAll ?? []).filter((p) => ids.includes(p.user_id));
    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const list: ConvSummary[] = ids.map((uid) => {
      const c = byUser.get(uid)!;
      const p = profMap.get(uid);
      return {
        user_id: uid,
        email: p?.email ?? null,
        display_name: p?.display_name ?? null,
        last_message: c.last.body || (c.last.image_url ? "[รูป]" : ""),
        last_at: c.last.created_at,
        unread: c.unread,
      };
    });
    list.sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at));
    setConvs(list);
  }, []);

  React.useEffect(() => {
    refreshConvs();
  }, [refreshConvs]);

  // Ask for desktop notification permission once when sound is on
  React.useEffect(() => {
    if (!soundOn) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [soundOn]);

  // Realtime: any new message updates conv list + plays beep on new user msg
  React.useEffect(() => {
    const ch = supabase
      .channel("admin_chat_global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (seenIdsRef.current.has(m.id)) return;
          seenIdsRef.current.add(m.id);
          if (m.sender_role === "user" && soundOn) {
            playBeep();
            // desktop notification when tab is hidden / unfocused
            if (
              typeof document !== "undefined" &&
              document.visibilityState !== "visible" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification("ข้อความใหม่จากผู้ใช้", {
                  body: m.body || "[รูป]",
                  tag: `chat-${m.user_id}`,
                });
              } catch {
                // ignore
              }
            }
          }
          refreshConvs();
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, () => {
        refreshConvs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refreshConvs, soundOn]);

  // Mark active conversation user msgs as read
  React.useEffect(() => {
    if (!activeUserId) return;
    const ids = messages.filter((m) => m.sender_role === "user" && !m.is_read).map((m) => m.id);
    if (ids.length === 0) return;
    supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("id", ids)
      .then(() => refreshConvs());
  }, [activeUserId, messages, refreshConvs]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (imageUrl?: string) => {
    if (!user || !activeUserId) return;
    const text = body.trim();
    if (!text && !imageUrl) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: activeUserId,
      sender_id: user.id,
      sender_role: "admin",
      body: text,
      image_url: imageUrl ?? null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
  };

  const handleFile = async (file: File) => {
    if (!user || !activeUserId) return;
    setUploading(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: "chat-images",
        userId: user.id,
        prefix: "chat",
      });
      await send(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const filteredConvs = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(
      (c) =>
        memberCodeMatchesUserId(q, c.user_id) ||
        formatMemberCode(c.user_id).toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.display_name ?? "").toLowerCase().includes(q) ||
        c.last_message.toLowerCase().includes(q),
    );
  }, [convs, search]);

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            แชทกับผู้ใช้
            {totalUnread > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px]">
                {totalUnread} ใหม่
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">ตอบกลับข้อความจากผู้ใช้แบบเรียลไทม์</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setSoundOn((v) => !v)}
          title={soundOn ? "ปิดเสียง" : "เปิดเสียง"}
        >
          {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {soundOn ? "เสียงเปิด" : "เสียงปิด"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-3 h-[600px]">
        <Card className="border-border overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ อีเมล รหัสสมาชิก..."
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">ยังไม่มีแชท</div>
            ) : (
              filteredConvs.map((c) => {
                const label = userLabelWithMemberCode(
                  c.display_name || c.email || c.user_id.slice(0, 8),
                  c.user_id,
                );
                return (
                <button
                  key={c.user_id}
                  onClick={() => setActiveUserId(c.user_id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${
                    activeUserId === c.user_id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium truncate">{label}</span>
                    {c.unread > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground text-[9px] h-4 min-w-4 px-1">
                        {c.unread}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{c.last_message}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {new Date(c.last_at).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="border-border flex flex-col overflow-hidden">
          {!activeUserId ? (
            <CardContent className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              เลือกแชทจากด้านซ้ายเพื่อเริ่มตอบกลับ
            </CardContent>
          ) : (
            <>
              <div className="shrink-0 border-b border-border px-3 py-2 bg-muted/30">
                <MemberCodeCopy userId={activeUserId} size="sm" />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        m.sender_role === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.image_url && <SignedChatImage url={m.image_url} />}
                      {m.body && (
                        <div className="text-xs whitespace-pre-wrap break-words">{m.body}</div>
                      )}
                      <div
                        className={`text-[9px] mt-1 ${m.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {new Date(m.created_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border flex items-end gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 shrink-0"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="พิมพ์ตอบกลับ..."
                  rows={1}
                  className="min-h-9 max-h-28 text-xs resize-none flex-1"
                />
                <Button
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  disabled={sending || !body.trim()}
                  onClick={() => send()}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Resolves a private chat-images URL into a short-lived signed URL on mount. */
function SignedChatImage({ url }: { url: string }) {
  const [signed, setSigned] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const marker = "/storage/v1/object/public/chat-images/";
    const idx = url.indexOf(marker);
    const path = idx >= 0 ? url.slice(idx + marker.length) : null;
    if (!path) {
      setSigned(url);
      return;
    }
    supabase.storage
      .from("chat-images")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setSigned(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!signed) return null;
  return (
    <a href={signed} target="_blank" rel="noreferrer">
      <img src={signed} alt="" loading="lazy" className="max-w-full max-h-48 rounded-lg mb-1" />
    </a>
  );
}
