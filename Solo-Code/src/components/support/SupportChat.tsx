import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useChatMessages } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, LogIn, ImagePlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";

export function SupportChat() {
  const { user } = useAuth();
  const { messages, loading } = useChatMessages(user?.id ?? null);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Mark admin messages as read
  React.useEffect(() => {
    if (!user) return;
    const unreadIds = messages
      .filter((m) => m.sender_role === "admin" && !m.is_read)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(() => {});
  }, [messages, user]);

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
          <LogIn className="h-6 w-6 text-[#FF5F05]" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">เข้าสู่ระบบเพื่อแชท</h3>
        <p className="text-sm text-gray-500 mb-4">
          ล็อกอินก่อนเพื่อคุยกับทีมงาน So1o ได้แบบเรียลไทม์
        </p>
        <Link to="/auth" search={{ redirect: undefined }}>
          <Button style={{ background: "#FF5F05" }} className="text-white hover:opacity-90">
            เข้าสู่ระบบ
          </Button>
        </Link>
      </div>
    );
  }

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender_id: user.id,
        sender_role: "user",
        body: text,
        is_read: false,
      });
      if (error) throw error;
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender_id: user.id,
        sender_role: "user",
        body: "[รูปภาพ]",
        image_url: pub.publicUrl,
        is_read: false,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 border-b border-gray-100 bg-white px-3 py-2">
        <MemberCodeCopy userId={user.id} size="sm" className="text-gray-600" />
        <p className="text-[10px] text-gray-400 mt-0.5">ทีมงานใช้รหัสนี้ระบุบัญชี</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {loading && messages.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-400">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            กำลังโหลด...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-500 px-4">
            👋 พิมพ์ข้อความได้เลยครับ ทีมงานจะรีบตอบให้เร็วที่สุด
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  m.sender_role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                }`}
                style={m.sender_role === "user" ? { background: "#FF5F05" } : undefined}
              >
                {m.image_url && (
                  <img src={m.image_url} alt="แนบรูป" className="rounded-lg mb-1 max-w-full" />
                )}
                <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className={`text-[10px] mt-1 ${m.sender_role === "user" ? "text-white/70" : "text-gray-400"}`}
                >
                  {new Date(m.created_at).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            aria-label="แนบรูป"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="พิมพ์ข้อความ..."
            rows={1}
            disabled={sending}
            className="min-h-9 max-h-28 text-sm resize-none flex-1"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0 text-white hover:opacity-90"
            style={{ background: "#FF5F05" }}
            disabled={sending || !body.trim()}
            onClick={send}
            aria-label="ส่ง"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
