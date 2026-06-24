import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  Loader2,
  Zap,
  Palette,
  Wand2,
  Users,
  AlertCircle,
  PenLine,
  Scale,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { aiAssistant } from "@/lib/aiAssistant.functions";
import { trackFeature } from "@/lib/featureUsage";
import type { AiUsageSummary } from "@/lib/aiCredits";
import { useAiUsage } from "@/hooks/useAiUsage";
import { aiUsagePercent, describeAiCreditsPlan } from "@/lib/aiCredits";
import type { AssistantPreset } from "@/context/AssistantContext";
import { getPresetConfig } from "@/lib/aiAssistantPresets";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string };

const MAX_CHARS = 500;
const STREAM_URL = "/api/assistant/stream";

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function consumeAssistantSse(
  resp: Response,
  onDelta: (text: string) => void,
): Promise<{ answer: string; usage?: AiUsageSummary }> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";
  let usage: AiUsageSummary | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      const eventLine = evt.split("\n").find((l) => l.startsWith("event:"));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      try {
        const j = JSON.parse(payload) as Record<string, unknown>;
        if (eventLine?.includes("error")) {
          throw new Error(String(j.error ?? "ai_error"));
        }
        if (eventLine?.includes("done")) {
          if (j.usage && typeof j.usage === "object") {
            usage = j.usage as AiUsageSummary;
          }
          const answer = String(j.answer ?? acc).trim();
          if (answer) acc = answer;
          continue;
        }
        if (typeof j.delta === "string") {
          acc += j.delta;
          onDelta(acc);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { answer: acc.trim(), usage };
}

type QuickAction = { label: string; icon: typeof Palette; prompt: string };

const QUICK_BY_PRESET: Record<AssistantPreset, QuickAction[]> = {
  mentor: [
    {
      label: "ช่วยออกแบบ",
      icon: Wand2,
      prompt: "ช่วยออกแบบ [ใส่รายละเอียดงาน เช่น โลโก้ร้านกาแฟสไตล์มินิมอล] ให้หน่อย...",
    },
    {
      label: "ช่วยเลือกสี",
      icon: Palette,
      prompt: "ช่วยเลือกคู่สีสำหรับงานออกแบบ [ชื่อโปรเจกต์/แบรนด์] ให้หน่อย...",
    },
  ],
  business: [
    {
      label: "ลูกค้าท็อป 10",
      icon: Users,
      prompt: "ลูกค้า 10 คนแรกที่ทำเงินให้ฉันได้มากที่สุดคือใคร?",
    },
    {
      label: "ใบค้างชำระ",
      icon: AlertCircle,
      prompt: "ลูกค้าคนไหนที่ควรทวงเงินก่อน หรือ priority สูงสุดตามกำหนดชำระ?",
    },
  ],
  copy: [
    {
      label: "คิดแคปชัน",
      icon: PenLine,
      prompt: "ช่วยคิดแคปชันสำหรับงาน [ใส่รายละเอียดงาน/แบรนด์] ให้หน่อย...",
    },
    {
      label: "ข้อความทวงงาน",
      icon: FileText,
      prompt: "ช่วยร่างข้อความทวงงาน/ติดตามลูกค้าแบบสุภาพสำหรับ [ชื่องาน/ลูกค้า]...",
    },
  ],
  legal: [
    {
      label: "ส่งมอบงาน",
      icon: FileText,
      prompt: "ช่วยร่างข้อความส่งมอบงานและขอชำระเงินสำหรับ [ชื่องาน]...",
    },
    {
      label: "สิทธิ์ใช้งาน",
      icon: Scale,
      prompt: "อธิบายข้อควรระวังเรื่องสิทธิ์ใช้งานงานดีไซน์สำหรับ [ประเภทงาน]...",
    },
  ],
};

export function AssistantCreditBar({ compact }: { compact?: boolean }) {
  const usage = useAiUsage();
  const usagePercent = aiUsagePercent(usage.included_used, usage.included_limit);
  const planHint = describeAiCreditsPlan(usage);

  return (
    <div className={compact ? "mt-1 space-y-1" : "mt-1.5 space-y-1"}>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground flex justify-between gap-2">
        <span className="truncate">
          เหลือ {usage.total_remaining.toLocaleString("th-TH")} เครดิต
        </span>
        <span className="shrink-0 tabular-nums">
          {usage.included_used}/{usage.included_limit}
        </span>
      </div>
      {!compact && <p className="text-[9px] text-muted-foreground/80 leading-snug">{planHint}</p>}
    </div>
  );
}

export function AssistantChatPanel({
  preset,
  compact = false,
  active,
  onCloseLimitCta,
}: {
  preset: AssistantPreset;
  compact?: boolean;
  active: boolean;
  onCloseLimitCta?: () => void;
}) {
  const { user } = useAuth();
  const assistantFn = useServerFn(aiAssistant);
  const usage = useAiUsage();
  const { limitReached, refetch: refetchUsage } = usage;
  const planHint = describeAiCreditsPlan(usage);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const presetConfig = getPresetConfig(preset);
  const quickActions = QUICK_BY_PRESET[preset];

  const loadMessages = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .eq("preset", preset)
      .order("created_at", { ascending: true })
      .limit(compact ? 50 : 100);
    setMessages((data ?? []) as Msg[]);
  }, [user, preset, compact]);

  React.useEffect(() => {
    if (active) {
      loadMessages();
      void refetchUsage();
    }
  }, [active, preset, loadMessages, refetchUsage]);

  React.useEffect(() => {
    if (active && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, active]);

  const send = async () => {
    if (!user) return;
    const text = body.trim();
    if (!text || limitReached) return;
    setSending(true);
    void trackFeature("ai.chat.assistant");

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text, created_at: now },
      { id: assistantMsgId, role: "assistant", content: "", created_at: now },
    ]);
    setBody("");

    const handleError = (raw: string) => {
      const msg = raw || "ส่งไม่สำเร็จ";
      if (msg.includes("limit_reached")) {
        toast.error("เครดิต AI หมดแล้ว — อัพเกรดหรือเติมเครดิตได้ที่ตั้งค่า");
        void refetchUsage();
      } else {
        toast.error(msg);
      }
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId));
    };

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("unauthorized");

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, preset, request_id: userMsgId }),
      });

      if (resp.status === 429) {
        handleError("limit_reached");
        return;
      }

      if (!resp.ok || !resp.body) {
        // Fallback to non-streaming server function
        const result = await assistantFn({
          data: { message: text, preset, request_id: userMsgId },
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: result.answer, created_at: new Date().toISOString() }
              : m,
          ),
        );
        void refetchUsage();
        return;
      }

      const { answer } = await consumeAssistantSse(resp, (acc) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: acc } : m)),
        );
      });

      if (!answer) throw new Error("empty_response");
      void refetchUsage();
    } catch (e) {
      handleError(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10 px-3">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary/60" />
            ถาม {presetConfig.label} ได้เลย
            <div className="mt-1 text-[10px]">
              ยาวไม่เกิน 500 ตัวอักษร · ใช้ {presetConfig.cost} เครดิต/คำถาม
            </div>
            {compact && planHint && (
              <div className="mt-2 text-[10px] text-muted-foreground/80">{planHint}</div>
            )}
          </div>
        ) : (
          messages.map((m, idx) => (
            <Bubble
              key={m.id}
              m={m}
              prevUserPrompt={
                m.role === "assistant"
                  ? ([...messages]
                      .slice(0, idx)
                      .reverse()
                      .find((x) => x.role === "user")?.content ?? "")
                  : ""
              }
              userId={user.id}
              source={compact ? "floating_chat" : "assistant_sidebar"}
            />
          ))
        )}
        {sending && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {limitReached && (
        <div className="mx-3 mb-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-center shrink-0">
          <div className="text-xs font-semibold mb-1">เครดิต AI หมดแล้ว</div>
          <div className="text-[10px] text-muted-foreground mb-2">
            อัพเกรด Pro หรือเติมเครดิตเพื่อถามต่อ
          </div>
          <Button asChild size="sm" className="h-7 text-xs gap-1">
            <Link to="/pricing" onClick={onCloseLimitCta}>
              <Zap className="h-3 w-3" /> อัพเกรด / เติมเครดิต
            </Link>
          </Button>
        </div>
      )}

      <div className="p-2 border-t border-border space-y-2 shrink-0">
        {!limitReached && (
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setBody(q.prompt)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-foreground transition-colors"
              >
                <q.icon className="h-3 w-3 text-primary" /> {q.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              limitReached
                ? "เครดิตหมดแล้ว — เติมได้ที่ตั้งค่า"
                : `ถาม ${presetConfig.shortLabel}...`
            }
            rows={1}
            disabled={limitReached || sending}
            className="min-h-9 max-h-28 text-xs resize-none flex-1"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            disabled={sending || !body.trim() || limitReached}
            onClick={send}
            aria-label="ส่ง"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-[9px] text-muted-foreground text-right">
          {body.length}/{MAX_CHARS}
        </div>
      </div>
    </>
  );
}

function Bubble({
  m,
  prevUserPrompt,
  userId,
  source,
}: {
  m: Msg;
  prevUserPrompt: string;
  userId: string;
  source: string;
}) {
  const mine = m.role === "user";
  const [feedback, setFeedback] = React.useState<"liked" | "disliked" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const sendFeedback = async (status: "liked" | "disliked") => {
    if (busy || feedback) return;
    setBusy(true);
    setFeedback(status);
    try {
      const { data: personality } = await (supabase as any)
        .from("ai_personality_settings")
        .select("creativity,formality,detail_level,forbidden_keywords,system_prompt_override")
        .limit(1)
        .maybeSingle();

      const { error } = await (supabase as any).from("ai_interactions_feedback").insert({
        user_id: userId,
        feature: "mentor_chat",
        prompt: prevUserPrompt || "(no prior prompt)",
        ai_response: m.content,
        personality_settings: personality ?? {},
        status,
        source_message_id: m.id,
        metadata: { source },
      });
      if (error) throw error;
      toast.success("ขอบคุณสำหรับฟีดแบ็กครับ");
    } catch (e) {
      setFeedback(null);
      toast.error(e instanceof Error ? e.message : "บันทึกฟีดแบ็กไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        <div className="text-xs whitespace-pre-wrap break-words">{m.content}</div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div
            className={`text-[9px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
          >
            {new Date(m.created_at).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {!mine && (
            <div className="flex items-center gap-0.5 -mr-1">
              <button
                type="button"
                onClick={() => sendFeedback("liked")}
                disabled={busy || feedback !== null}
                aria-label="ตอบโดน"
                className={`h-6 w-6 rounded-full grid place-items-center transition-all disabled:cursor-default ${
                  feedback === "liked"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => sendFeedback("disliked")}
                disabled={busy || feedback !== null}
                aria-label="ยังไม่โดน"
                className={`h-6 w-6 rounded-full grid place-items-center transition-all disabled:cursor-default ${
                  feedback === "disliked"
                    ? "bg-muted-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                }`}
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
