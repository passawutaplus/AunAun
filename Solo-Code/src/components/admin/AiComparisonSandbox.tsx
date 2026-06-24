import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sandboxChat } from "@/lib/aiSandbox.functions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trash2, Sparkles, Bot, Crown, Wand2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

function ChatPane({
  variant,
  messages,
  loading,
  onClear,
}: {
  variant: "standard" | "trained";
  messages: Msg[];
  loading: boolean;
  onClear: () => void;
}) {
  const isTrained = variant === "trained";
  const Icon = isTrained ? Crown : Bot;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  return (
    <Card
      className={`flex flex-col h-[520px] overflow-hidden ${
        isTrained
          ? "border-primary/40 shadow-elegant bg-gradient-to-br from-primary/5 via-background to-background"
          : "bg-muted/20"
      }`}
    >
      <CardHeader className="py-3 border-b flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
              isTrained ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              {isTrained ? "So1o Trained AI" : "Standard AI"}
              {isTrained && (
                <Badge className="bg-primary/15 text-primary border-0 text-[9px] px-1.5">
                  PREMIUM
                </Badge>
              )}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground truncate">
              {isTrained ? "Personality + Knowledge Base" : "Gemini 3.1 Flash · default prompt"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={onClear}
          disabled={messages.length === 0}
        >
          <Trash2 className="h-3 w-3" /> Clear
        </Button>
      </CardHeader>
      <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-center px-6">
            <div className="text-xs text-muted-foreground">
              <Sparkles className="h-5 w-5 mx-auto mb-1.5 text-primary/60" />
              พิมพ์ข้อความด้านล่างเพื่อเปรียบเทียบคำตอบ
              <br />
              ระหว่าง AI มาตรฐานและ So1o ที่เทรนแล้ว
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : isTrained
                    ? "bg-card border border-primary/20"
                    : "bg-card border border-border"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-xs max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            กำลังคิด...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AiComparisonSandbox() {
  const sendFn = useServerFn(sandboxChat);
  const [standard, setStandard] = React.useState<Msg[]>([]);
  const [trained, setTrained] = React.useState<Msg[]>([]);
  const [draft, setDraft] = React.useState("");

  const stdMut = useMutation({
    mutationFn: (msgs: Msg[]) => sendFn({ data: { mode: "standard", messages: msgs } }),
    onSuccess: (res) => setStandard((prev) => [...prev, { role: "assistant", content: res.reply }]),
    onError: (e: Error) => toast.error(`Standard: ${e.message}`),
  });

  const trnMut = useMutation({
    mutationFn: (msgs: Msg[]) => sendFn({ data: { mode: "trained", messages: msgs } }),
    onSuccess: (res) => setTrained((prev) => [...prev, { role: "assistant", content: res.reply }]),
    onError: (e: Error) => toast.error(`So1o: ${e.message}`),
  });

  const loading = stdMut.isPending || trnMut.isPending;

  const send = () => {
    const text = draft.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const stdNext = [...standard, userMsg];
    const trnNext = [...trained, userMsg];
    setStandard(stdNext);
    setTrained(trnNext);
    setDraft("");
    stdMut.mutate(stdNext);
    trnMut.mutate(trnNext);
  };

  const clearAll = () => {
    setStandard([]);
    setTrained([]);
  };

  return (
    <Card className="glass">
      <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            AI Comparison Sandbox
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            เทียบคำตอบของ AI มาตรฐาน vs So1o ที่เทรนแล้ว · พิมพ์ครั้งเดียว ส่งทั้งสองฝั่ง
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={clearAll}
          disabled={standard.length === 0 && trained.length === 0}
        >
          <Trash2 className="h-3 w-3" /> Clear All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <ChatPane
            variant="standard"
            messages={standard}
            loading={stdMut.isPending}
            onClear={() => setStandard([])}
          />
          <ChatPane
            variant="trained"
            messages={trained}
            loading={trnMut.isPending}
            onClear={() => setTrained([])}
          />
        </div>

        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ลองพิมพ์ เช่น 'ช่วยวางแผนการตลาดให้ร้านกาแฟเปิดใหม่แบบพรีเมียม'..."
            rows={2}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            onClick={send}
            disabled={!draft.trim() || loading}
            className="self-end bg-primary gap-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งคู่
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Cmd/Ctrl + Enter เพื่อส่ง · ข้อความเดียวกันจะถูกส่งไปทั้งสองโมเดลพร้อมกัน
        </p>
      </CardContent>
    </Card>
  );
}
