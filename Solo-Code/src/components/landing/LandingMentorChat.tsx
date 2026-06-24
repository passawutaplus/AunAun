import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  Palette,
  Calculator,
  MessageCircle,
  Loader2,
  StopCircle,
  Trash2,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PriceGuideModal } from "@/components/price-guide/PriceGuideModal";
import type { JobType } from "@/components/price-guide/priceLogic";
import { MentorTopicGallery } from "@/components/landing/MentorTopicGallery";

interface PriceContext {
  jobType: JobType;
  recommended: number;
  days: number;
  complexity: string;
  marketAvgMin: number;
  marketAvgMax: number;
}
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "sending" | "streaming" | "ok" | "error";
  jobTypeHint?: JobType;
}

const DAILY_LIMIT = 5;
const STORAGE_MSGS = "so1o.mentor.msgs.v1";
const STORAGE_GUEST = "so1o.mentor.guest_id";
const STORAGE_GUEST_USED = "so1o.mentor.guest_used.v1";

function getGuestId(): string {
  try {
    let id = localStorage.getItem(STORAGE_GUEST);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_GUEST, id);
    }
    return id;
  } catch {
    return "guest-fallback";
  }
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function readGuestUsed(): number {
  try {
    const raw = localStorage.getItem(STORAGE_GUEST_USED);
    if (!raw) return 0;
    const d = JSON.parse(raw);
    return d?.date === todayStr() ? Number(d.count ?? 0) : 0;
  } catch {
    return 0;
  }
}
function writeGuestUsed(count: number) {
  try {
    localStorage.setItem(STORAGE_GUEST_USED, JSON.stringify({ date: todayStr(), count }));
  } catch {
    /* noop */
  }
}

function inferJobType(text: string): JobType {
  const t = text.toLowerCase();
  if (t.includes("โลโก้") || t.includes("logo")) return "logo";
  if (t.includes("แบรนด์") || t.includes("brand") || t.includes("ci")) return "branding";
  if (t.includes("เว็บ") || t.includes("website") || t.includes("landing")) return "website";
  if (t.includes("ui") || t.includes("ux") || t.includes("แอพ") || t.includes("app")) return "uiux";
  if (t.includes("วิดีโอ") || t.includes("video") || t.includes("motion") || t.includes("ตัดต่อ"))
    return "video";
  if (t.includes("ภาพประกอบ") || t.includes("illustration") || t.includes("กราฟิก"))
    return "illustration";
  if (t.includes("คอนเทนต์") || t.includes("content") || t.includes("เขียน") || t.includes("copy"))
    return "content";
  if (t.includes("ถ่าย") || t.includes("photo") || t.includes("รีทัช")) return "photography";
  return "other";
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-design-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function LandingMentorChat() {
  const { user } = useAuth();
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [used, setUsed] = React.useState(0);
  const [priceCtx, setPriceCtx] = React.useState<PriceContext | null>(null);
  const [showPriceModal, setShowPriceModal] = React.useState(false);
  const [pricePrefillJobType, setPricePrefillJobType] = React.useState<JobType | undefined>();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const guestId = React.useMemo(() => getGuestId(), []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MSGS);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMsgs(parsed);
          return;
        }
      }
    } catch {
      /* noop */
    }
    setMsgs([
      {
        id: "welcome",
        role: "assistant",
        content:
          "สวัสดีครับ ผมคือ So1o Mentor — พี่เลี้ยงฟรีแลนซ์ของคุณ ลองเลือกหัวข้อด้านล่าง หรือพิมพ์ถามเรื่องราคา ดีไซน์ การคุยลูกค้าได้เลยครับ (ฟรี 5 คำถาม/วัน ไม่ต้องสมัคร)",
        status: "ok",
      },
    ]);
  }, []);

  React.useEffect(() => {
    if (msgs.length === 0) return;
    try {
      localStorage.setItem(STORAGE_MSGS, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* noop */
    }
  }, [msgs]);

  React.useEffect(() => {
    setUsed(user ? 0 : readGuestUsed());
    if (!user) {
      try {
        const raw = localStorage.getItem("so1o.lastPriceCtx");
        if (raw) setPriceCtx(JSON.parse(raw));
      } catch {
        /* noop */
      }
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("price_guide_events")
        .select("job_type, recommended_price, days, complexity, min_price, max_price")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const ctx: PriceContext = {
          jobType: data.job_type as JobType,
          recommended: Number(data.recommended_price ?? 0),
          days: Number(data.days ?? 1),
          complexity: String(data.complexity ?? "normal"),
          marketAvgMin: Number(data.min_price ?? 0),
          marketAvgMax: Number(data.max_price ?? 0),
        };
        setPriceCtx(ctx);
        try {
          localStorage.setItem("so1o.lastPriceCtx", JSON.stringify(ctx));
        } catch {
          /* noop */
        }
      }
    })();
  }, [user]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  // Streaming send
  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    if (used >= DAILY_LIMIT) {
      toast.error(`ครบโควต้าวันนี้แล้ว (${DAILY_LIMIT} ครั้ง/วัน) — กลับมาใหม่พรุ่งนี้นะครับ`);
      return;
    }

    const userMsg: Msg = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text.trim(),
      status: "ok",
    };
    const assistantId = `a_${Date.now()}`;
    const assistantMsg: Msg = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
      jobTypeHint: inferJobType(text),
    };
    setMsgs((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Get auth token if logged in
    let authHeader = `Bearer ${ANON_KEY}`;
    if (user) {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (token) authHeader = `Bearer ${token}`;
    }

    try {
      const resp = await fetch(FN_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: authHeader,
          "x-guest-id": guestId,
        },
        body: JSON.stringify({
          message: text.trim(),
          guestId,
          priceContext: priceCtx ?? undefined,
          stream: true,
        }),
      });

      if (resp.status === 429) {
        setUsed(DAILY_LIMIT);
        if (!user) writeGuestUsed(DAILY_LIMIT);
        setMsgs((m) =>
          m.map((x) =>
            x.id === assistantId
              ? {
                  ...x,
                  status: "error",
                  content: `วันนี้คุยครบ ${DAILY_LIMIT} คำถามแล้วครับ พรุ่งนี้มาคุยกันต่อนะครับ 🙏`,
                }
              : x,
          ),
        );
        return;
      }
      if (!resp.ok || !resp.body) throw new Error(`http_${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

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
            const j = JSON.parse(payload);
            if (eventLine?.includes("meta")) {
              if (typeof j.used === "number") {
                setUsed(j.used);
                if (!user) writeGuestUsed(j.used);
              }
              continue;
            }
            if (eventLine?.includes("done")) {
              if (typeof j.used === "number") {
                setUsed(j.used);
                if (!user) writeGuestUsed(j.used);
              }
              continue;
            }
            if (typeof j.delta === "string") {
              acc += j.delta;
              setMsgs((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)));
            }
          } catch {
            /* skip */
          }
        }
      }
      setMsgs((m) =>
        m.map((x) =>
          x.id === assistantId ? { ...x, status: "ok", content: acc || x.content } : x,
        ),
      );
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        setMsgs((m) =>
          m.map((x) =>
            x.id === assistantId
              ? {
                  ...x,
                  status: "ok",
                  content: (x.content || "") + "\n\n⏹ หยุดการตอบแล้วครับ",
                }
              : x,
          ),
        );
      } else {
        // Streaming failed — fallback to non-streaming via supabase client
        console.error("[mentor] stream failed, falling back:", err);
        try {
          const { data, error } = await supabase.functions.invoke("ai-design-chat", {
            body: {
              message: text.trim(),
              guestId,
              priceContext: priceCtx ?? undefined,
              stream: false,
            },
            headers: { "x-guest-id": guestId },
          });
          if (error) throw error;
          if (data?.error === "limit_reached") {
            setUsed(DAILY_LIMIT);
            if (!user) writeGuestUsed(DAILY_LIMIT);
            setMsgs((m) =>
              m.map((x) =>
                x.id === assistantId
                  ? {
                      ...x,
                      status: "error",
                      content: `วันนี้คุยครบ ${DAILY_LIMIT} คำถามแล้วครับ พรุ่งนี้มาคุยกันต่อนะครับ 🙏`,
                    }
                  : x,
              ),
            );
            return;
          }
          const reply = String(data?.reply ?? "").trim();
          if (!reply) throw new Error("empty_reply");
          if (typeof data?.used === "number") {
            setUsed(data.used);
            if (!user) writeGuestUsed(data.used);
          }
          setMsgs((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, status: "ok", content: reply } : x)),
          );
        } catch (e2) {
          console.error("[mentor] fallback failed:", e2);
          const reason = (e2 as Error)?.message || err.message || "unknown";
          setMsgs((m) =>
            m.map((x) =>
              x.id === assistantId
                ? {
                    ...x,
                    status: "error",
                    content: `ขออภัยครับ ส่งไม่สำเร็จ (${reason.slice(0, 80)}) — กดปุ่ม 🔄 ลองใหม่ด้านล่างได้เลย`,
                  }
                : x,
            ),
          );
          toast.error("ส่งไม่สำเร็จ ลองอีกครั้งได้");
        }
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const retryLast = () => {
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMsgs((m) => {
      const idx = m.findIndex((x) => x.id === lastUser.id);
      return idx >= 0 ? m.slice(0, idx) : m;
    });
    void send(lastUser.content);
  };

  const clearChat = () => {
    setMsgs([
      {
        id: "welcome",
        role: "assistant",
        content: "เริ่มใหม่ครับ — เลือกหัวข้อหรือพิมพ์คำถามได้เลย",
        status: "ok",
      },
    ]);
    try {
      localStorage.removeItem(STORAGE_MSGS);
    } catch {
      /* noop */
    }
  };

  const openPriceWith = (jobType?: JobType) => {
    setPricePrefillJobType(jobType);
    setShowPriceModal(true);
  };

  const lastError =
    msgs.length > 0 &&
    msgs[msgs.length - 1].status === "error" &&
    msgs[msgs.length - 1].role === "assistant";
  const hasConversation = msgs.filter((m) => m.id !== "welcome").length > 0;
  const streamingMsg = msgs.find((m) => m.status === "streaming");

  return (
    <section id="mentor" className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> So1o Mentor — AI สำหรับฟรีแลนซ์
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            พี่เลี้ยง AI ที่อยู่
            <span className="bg-gradient-primary bg-clip-text text-transparent">ข้างฟรีแลนซ์</span>
            เสมอ
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ลองคุยฟรี 5 คำถาม/วัน ไม่ต้องสมัครสมาชิก — So1o Mentor
            ช่วยคุณตัดสินใจเรื่องสำคัญในงานฟรีแลนซ์
          </p>
          <ul className="space-y-2.5">
            {[
              { Icon: Calculator, t: "คิดราคาอย่างมั่นใจ", d: "Markup + WHT 3% + อ้างอิงราคาตลาด" },
              { Icon: Palette, t: "ที่ปรึกษาดีไซน์", d: "สี ฟอนต์ Layout Mood & Tone ครบ" },
              {
                Icon: MessageCircle,
                t: "รับมือลูกค้ายากๆ",
                d: "ร่างข้อความตอบลูกค้าอย่างมืออาชีพ",
              },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="flex items-start gap-2.5">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          {priceCtx && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Price Guide ล่าสุด
              </p>
              <p className="text-muted-foreground">
                งาน <b>{priceCtx.jobType}</b> · {priceCtx.days} วัน · แนะนำ{" "}
                <b className="num">฿{priceCtx.recommended.toLocaleString()}</b>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                So1o Mentor จะอ้างอิงตัวเลขนี้ในคำตอบ
              </p>
            </div>
          )}
        </div>

        {/* Right: chat */}
        <Card className="lg:col-span-3 overflow-hidden border-border/60 bg-card/80 backdrop-blur shadow-elevated flex flex-col h-[640px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-primary/10">
            <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none">So1o Mentor</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {user ? "ออนไลน์ · สมาชิก" : "โหมดทดลอง · ไม่ต้องล็อกอิน"} · ใช้แล้ว {used}/
                {DAILY_LIMIT} วันนี้
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={clearChat}
              title="ล้างบทสนทนา"
              aria-label="ล้างบทสนทนา"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[88%] space-y-1.5">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                        : m.status === "error"
                          ? "bg-destructive/10 text-destructive rounded-bl-sm border border-destructive/20"
                          : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                    {m.status === "streaming" && (
                      <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                  {m.status === "streaming" && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full w-1/3 bg-gradient-primary animate-[shimmer_1.4s_ease-in-out_infinite]"
                        style={{ backgroundSize: "200% 100%" }}
                      />
                    </div>
                  )}
                  {m.role === "assistant" && m.status === "ok" && m.id !== "welcome" && (
                    <button
                      type="button"
                      onClick={() => openPriceWith(m.jobTypeHint)}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <Calculator className="h-3 w-3" /> ใช้คำตอบนี้กับราคาประเมิน
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Topic gallery: full when no conversation, compact button after */}
          <div className="px-3 pt-3 pb-1 border-t border-border/60 bg-card/60">
            {!hasConversation ? (
              <MentorTopicGallery
                onPick={(q) => send(q)}
                disabled={loading || used >= DAILY_LIMIT}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <MentorTopicGallery
                  compact
                  onPick={(q) => send(q)}
                  disabled={loading || used >= DAILY_LIMIT}
                />
                {lastError && !loading && (
                  <button
                    type="button"
                    onClick={retryLast}
                    className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 hover:bg-primary/20 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> ลองใหม่
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-border bg-card/80 flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              placeholder={
                used >= DAILY_LIMIT
                  ? "ครบโควต้าวันนี้แล้ว มาใหม่พรุ่งนี้นะครับ"
                  : "พิมพ์คำถามถึง So1o Mentor..."
              }
              disabled={loading || used >= DAILY_LIMIT}
              aria-label="พิมพ์คำถามถึง So1o Mentor"
              className="flex-1"
            />
            {loading ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={stop}
                className="shrink-0"
                title="หยุด"
                aria-label="หยุดการตอบกลับ"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || used >= DAILY_LIMIT}
                size="icon"
                className="bg-gradient-primary shrink-0"
                aria-label="ส่งคำถาม"
              >
                {streamingMsg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </form>
        </Card>
      </div>

      <PriceGuideModal
        open={showPriceModal}
        onOpenChange={setShowPriceModal}
        initialJobType={pricePrefillJobType}
      />
    </section>
  );
}
