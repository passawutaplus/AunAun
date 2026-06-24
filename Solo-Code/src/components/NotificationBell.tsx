import * as React from "react";
import { Bell, Heart, MessageCircle, Briefcase, Check, Ticket } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { safeHref } from "@/lib/security";
import { useAuth } from "@/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Notif {
  id: string;
  type: "like" | "comment" | "hire" | string;
  message: string;
  url: string | null;
  read: boolean;
  actor_name: string;
  actor_avatar: string | null;
  created_at: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  like: <Heart className="h-3.5 w-3.5 text-rose-500" />,
  comment: <MessageCircle className="h-3.5 w-3.5 text-sky-500" />,
  hire: <Briefcase className="h-3.5 w-3.5 text-amber-500" />,
  ticket: <Ticket className="h-3.5 w-3.5 text-[#FF5F05]" />,
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}วิ`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}นาที`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ชม.`;
  const d = Math.floor(h / 24);
  return `${d}วัน`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<Notif[]>([]);
  const [open, setOpen] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,type,message,url,read,actor_name,actor_avatar,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    fetchItems();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchItems]);

  const unread = items.filter((n) => !n.read).length;

  const breakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of items) {
      if (n.read) continue;
      const key = n.type === "like" || n.type === "comment" || n.type === "hire" ? n.type : "other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const label: Record<string, string> = {
      like: "ไลก์",
      comment: "คอมเมนต์",
      hire: "จ้างงาน",
      other: "อื่นๆ",
    };
    return (["like", "comment", "hire", "other"] as const)
      .filter((k) => (counts[k] ?? 0) > 0)
      .map((k) => `${counts[k]} ${label[k]}`);
  }, [items]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  if (!user) return null;

  const triggerButton = (
    <button
      aria-label={unread > 0 ? `การแจ้งเตือน (ค้าง ${unread} รายการ)` : "การแจ้งเตือน"}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 hover:bg-white text-foreground shadow-soft ring-1 ring-white/60 transition"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center ring-2 ring-background tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) fetchItems();
      }}
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          </TooltipTrigger>
          {unread > 0 && !open && (
            <TooltipContent side="bottom" align="end" className="text-xs">
              <p className="font-semibold mb-0.5">แจ้งเตือนค้าง {unread} รายการ</p>
              {breakdown.length > 0 && (
                <p className="text-muted-foreground">{breakdown.join(" · ")}</p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">การแจ้งเตือน</p>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> อ่านทั้งหมด
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const inner = (
                  <div
                    className={`flex gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="relative shrink-0">
                      {n.actor_avatar ? (
                        <img
                          src={n.actor_avatar}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-xs font-semibold">
                          {n.actor_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white grid place-items-center ring-1 ring-border">
                        {typeIcon[n.type] ?? <Bell className="h-3 w-3" />}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug line-clamp-3">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(n.created_at)}ที่แล้ว
                      </p>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                );
                if (n.url) {
                  const safe = safeHref(n.url);
                  if (!safe) {
                    return (
                      <li key={n.id} onClick={() => markOne(n.id)} className="cursor-pointer">
                        {inner}
                      </li>
                    );
                  }
                  return (
                    <li key={n.id}>
                      <a
                        href={safe}
                        onClick={(e) => {
                          e.preventDefault();
                          markOne(n.id);
                          setOpen(false);
                          navigate({ to: safe });
                        }}
                        className="block"
                      >
                        {inner}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={n.id} onClick={() => markOne(n.id)} className="cursor-pointer">
                    {inner}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
