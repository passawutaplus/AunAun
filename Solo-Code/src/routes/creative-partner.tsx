import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Clock,
  Moon,
  Sun,
  Zap,
  BarChart3,
  PenLine,
  Scale,
} from "lucide-react";
import { AssistantChatPanel, AssistantCreditBar } from "@/components/assistant/AssistantChatPanel";
import { ASSISTANT_PRESETS } from "@/lib/aiAssistantPresets";
import type { AssistantPreset } from "@/context/AssistantContext";
import { useAiUsage } from "@/hooks/useAiUsage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/creative-partner")({
  head: () => ({
    meta: [
      { title: "So1o Creative Partner — AI ที่ปรึกษาดีไซน์" },
      {
        name: "description",
        content: "AI ที่ปรึกษาด้านงานออกแบบ สี ฟอนต์ คอนเซปต์ สำหรับฟรีแลนซ์ไทย",
      },
      { property: "og:title", content: "So1o Creative Partner — AI ที่ปรึกษาดีไซน์" },
      { property: "og:description", content: "AI ที่ปรึกษาด้านงานออกแบบสำหรับฟรีแลนซ์ไทย" },
      { property: "og:url", content: "https://solofreelancer.com/creative-partner" },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/creative-partner" }],
  }),
  component: CreativePartnerPage,
});

type Msg = { id: string; role: string; content: string; created_at: string; preset?: string };

const PRESET_ICONS: Record<AssistantPreset, typeof Sparkles> = {
  mentor: Sparkles,
  business: BarChart3,
  copy: PenLine,
  legal: Scale,
};

const THEME_KEY = "so1o:creative-partner-dark:v1";

function CreativePartnerPage() {
  const { user } = useAuth();
  const usage = useAiUsage();
  const [preset, setPreset] = React.useState<AssistantPreset>("mentor");
  const [dark, setDark] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(THEME_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [history, setHistory] = React.useState<Msg[]>([]);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "1" : "0");
    } catch {
      /* noop */
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  const loadHistory = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at, preset")
      .eq("user_id", user.id)
      .eq("preset", preset)
      .order("created_at", { ascending: false })
      .limit(40);
    setHistory((data ?? []) as Msg[]);
  }, [user, preset]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory, preset]);

  const grouped = React.useMemo(() => {
    const userMsgs = history.filter((m) => m.role === "user");
    const today: Msg[] = [];
    const yesterday: Msg[] = [];
    const last30: Msg[] = [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();
    for (const m of userMsgs) {
      const t = new Date(m.created_at).getTime();
      if (t >= startMs) today.push(m);
      else if (t >= startMs - 86400000) yesterday.push(m);
      else if (t >= startMs - 30 * 86400000) last30.push(m);
    }
    return { today, yesterday, last30 };
  }, [history]);

  const shell = dark ? "bg-[#0f0f0f] text-foreground" : "bg-[#f8f9fc] text-foreground";

  const panel = dark
    ? "bg-card/80 border-border/60 backdrop-blur-xl"
    : "bg-white border-border/80 shadow-sm";

  return (
    <div className={cn("min-h-screen flex transition-colors", shell)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:w-64 lg:w-72 border-r flex-col",
          dark ? "border-border/40 bg-black/30" : "border-border/60 bg-white/80",
        )}
      >
        <div className={cn("p-4 border-b", dark ? "border-border/40" : "border-border/60")}>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าหลัก
          </Link>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-soft">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">So1o Creative</div>
              <div className="text-[10px] text-muted-foreground">AI Partner</div>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            Agent
          </p>
          <div className="grid grid-cols-2 gap-1">
            {ASSISTANT_PRESETS.map((p) => {
              const Icon = PRESET_ICONS[p.id];
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors border",
                    active
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground hover:bg-muted border-transparent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {p.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <HistoryGroup title="วันนี้" items={grouped.today} dark={dark} />
          <HistoryGroup title="เมื่อวาน" items={grouped.yesterday} dark={dark} />
          <HistoryGroup title="30 วันที่แล้ว" items={grouped.last30} dark={dark} />
        </div>

        <div
          className={cn("p-3 border-t space-y-2", dark ? "border-border/40" : "border-border/60")}
        >
          <div className={cn("rounded-xl border p-3", panel)}>
            <AssistantCreditBar />
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground px-1">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <header
          className={cn(
            "flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0",
            dark
              ? "border-border/40 bg-black/20 backdrop-blur-xl"
              : "border-border/60 bg-white/90 backdrop-blur-sm",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="md:hidden text-muted-foreground" aria-label="กลับ">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-sm font-semibold truncate">So1o Creative Partner</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!user && (
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link to="/auth" search={{ redirect: undefined }}>
                  เข้าสู่ระบบ
                </Link>
              </Button>
            )}
            {usage.limitReached && user && (
              <Button asChild size="sm" className="h-8 text-xs gap-1">
                <Link to="/pricing">
                  <Zap className="h-3 w-3" /> เติมเครดิต
                </Link>
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={dark ? "โหมดสว่าง" : "โหมดมืด"}
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-elevated mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold">So1o Creative Partner</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              พี่เลี้ยงด้านดีไซน์ สี คอนเซปต์ และข้อมูลธุรกิจ — เข้าสู่ระบบเพื่อเริ่มแชท
            </p>
            <Button asChild className="mt-6">
              <Link to="/auth" search={{ redirect: undefined }}>
                เข้าสู่ระบบ
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto">
            <div className="md:hidden p-2 border-b border-border/40 overflow-x-auto">
              <div className="flex gap-1">
                {ASSISTANT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium border",
                      preset === p.id
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground border-border",
                    )}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <AssistantChatPanel
              preset={preset}
              active
              onCloseLimitCta={() => toast.info("เติมเครดิตได้ที่ตั้งค่าหรือหน้าราคา")}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function HistoryGroup({ title, items, dark }: { title: string; items: Msg[]; dark: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
        <Clock className="h-3 w-3" /> {title}
      </div>
      <div className="space-y-0.5">
        {items.slice(0, 12).map((m) => (
          <div
            key={m.id}
            className={cn(
              "px-2 py-1.5 rounded-lg text-xs text-muted-foreground truncate cursor-default",
              dark ? "hover:bg-white/5" : "hover:bg-muted/60",
            )}
            title={m.content}
          >
            {m.content.slice(0, 48)}
          </div>
        ))}
      </div>
    </div>
  );
}
