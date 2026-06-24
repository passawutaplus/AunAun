import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  X,
  ArrowLeft,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Sparkles,
  Ticket,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CreateTicketForm } from "./CreateTicketSheet";
import { MyTicketsPanel } from "./MyTicketsPanel";
import { useMyTickets } from "@/store/supportTickets";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { SupportChat } from "./SupportChat";
import { SupportFaq } from "./SupportFaq";
import { SupportSuggest } from "./SupportSuggest";
import { SupportChangelog } from "./SupportChangelog";
import so1oLogoMark from "@/assets/so1o-logo-mark.png";
import { trackFeature } from "@/lib/featureUsage";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";

type View = "home" | "chat" | "faq" | "suggest" | "changelog" | "create_ticket" | "my_tickets";

const VIEW_TITLES: Record<View, string> = {
  home: "มีอะไรให้เราช่วยไหม?",
  chat: "คุยกับทีมงาน So1o",
  faq: "คำถามที่พบบ่อย",
  suggest: "เสนอแนะฟีเจอร์ใหม่",
  changelog: "อัปเดตล่าสุด",
  create_ticket: "แจ้งปัญหา / บั๊ก",
  my_tickets: "ตั๋วของฉัน",
};

type SupportFabProps = {
  inline?: boolean;
  /** Controlled open (sidebar trigger) */
  forceOpen?: boolean;
  onClose?: () => void;
  /** Hide floating / inline trigger button */
  hiddenTrigger?: boolean;
};

export function SupportFab({
  inline = false,
  forceOpen,
  onClose,
  hiddenTrigger = false,
}: SupportFabProps = {}) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const controlled = forceOpen !== undefined;
  const sheetOpen = controlled ? forceOpen : open;
  const setSheetOpen = (next: boolean) => {
    if (controlled) {
      if (!next) onClose?.();
      return;
    }
    setOpen(next);
  };
  const [view, setView] = React.useState<View>("home");
  const [unread, setUnread] = React.useState(0);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const { openCount } = useMyTickets();

  React.useEffect(() => {
    if (sheetOpen) void trackFeature("support.open");
  }, [sheetOpen]);

  // Count unread admin messages
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sender_role", "admin")
        .eq("is_read", false);
      if (!cancelled) setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`support_unread_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  React.useEffect(() => {
    if (sheetOpen) {
      setView("home");
      setSelectedTicketId(null);
    }
  }, [sheetOpen]);

  const goBack = () => {
    if (view === "my_tickets" && selectedTicketId) {
      setSelectedTicketId(null);
      return;
    }
    setView("home");
  };

  return (
    <>
      {!hiddenTrigger && !sheetOpen && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="เปิด So1o Support Hub"
          className={
            inline
              ? "relative h-12 w-12 rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(255,95,5,0.5)] ring-2 ring-[#FF5F05]/20 hover:ring-[#FF5F05]/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              : "fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(255,95,5,0.5)] ring-2 ring-[#FF5F05]/20 hover:ring-[#FF5F05]/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          }
        >
          <img src={so1oLogoMark} alt="So1o" className="h-full w-full object-cover rounded-full" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white z-10 shadow-md">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="z-[70] p-0 w-full sm:max-w-[400px] sm:right-6 sm:bottom-6 sm:top-auto sm:h-[640px] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl border-0 overflow-hidden shadow-2xl flex flex-col bg-white"
        >
          {/* Header — orange gradient */}
          <div
            className="relative px-5 pt-5 pb-6 text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #FF5F05 0%, #FF9F67 100%)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {view !== "home" && (
                  <button
                    onClick={goBack}
                    className="h-8 w-8 -ml-1 rounded-full hover:bg-white/15 flex items-center justify-center transition"
                    aria-label="ย้อนกลับ"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="h-10 w-10 rounded-xl bg-white p-1.5 shadow-sm shrink-0 overflow-hidden ring-2 ring-white/40">
                  <img src={so1oLogoMark} alt="So1o" className="h-full w-full object-contain" />
                </div>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition"
                aria-label="ปิด"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {view === "home" ? (
              <>
                <p className="mt-4 text-[11px] font-medium text-white/75 tracking-wide">
                  So1o Support Hub · v1.0
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">มีอะไรให้เราช่วยไหม?</h2>
                <p className="mt-1 text-sm text-white/90">
                  ทีม So1o พร้อมช่วยคุณเสมอ ตอบไว ภายใน 15 นาที
                </p>
              </>
            ) : (
              <h2 className="mt-4 text-xl font-semibold tracking-tight">{VIEW_TITLES[view]}</h2>
            )}
          </div>

          {/* Body — min-h-0 + inner scroll keeps rounded sheet corners from clipping last row */}
          <div className="flex-1 min-h-0 bg-white">
            {view === "home" && (
              <HomeView
                userId={user?.id}
                setView={setView}
                setSheetOpen={setSheetOpen}
                unread={unread}
                openCount={openCount}
              />
            )}
            {view === "chat" && <SupportChat />}
            {view === "faq" && <SupportFaq />}
            {view === "suggest" && <SupportSuggest />}
            {view === "changelog" && <SupportChangelog />}
            {view === "create_ticket" && <CreateTicketForm prefill={{ source: "support_hub" }} />}
            {view === "my_tickets" && (
              <MyTicketsPanel selectedId={selectedTicketId} onSelectTicket={setSelectedTicketId} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function HomeView({
  userId,
  setView,
  setSheetOpen,
  unread,
  openCount,
}: {
  userId?: string;
  setView: (v: View) => void;
  setSheetOpen: (open: boolean) => void;
  unread: number;
  openCount: number;
}) {
  const navigate = useNavigate();

  const openHelpCenter = () => {
    setSheetOpen(false);
    void navigate({ to: "/help" });
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pt-4 pb-6 space-y-2.5">
      {userId ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 mb-1">
          <MemberCodeCopy userId={userId} size="sm" className="text-gray-600" />
          <p className="text-[10px] text-gray-400 mt-1">ทีมงานใช้รหัสนี้ระบุบัญชีเมื่อช่วยเหลือ</p>
        </div>
      ) : null}
      <HubMenuItem
        icon={Ticket}
        title="แจ้งปัญหา / บั๊ก"
        description="ได้เลขตั๋ว TKT-xxxx ติดตามสถานะได้"
        highlighted
        onClick={() => setView("create_ticket")}
      />
      <HubMenuItem
        icon={ClipboardList}
        title="ตั๋วของฉัน"
        description="ดูสถานะและความคืบหน้า"
        badge={openCount > 0 ? openCount : undefined}
        onClick={() => setView("my_tickets")}
      />
      <HubMenuItem
        icon={MessageCircle}
        title="คุยกับทีมงาน"
        description="ปกติเราตอบกลับภายใน 15 นาที"
        badge={unread > 0 ? unread : undefined}
        badgeVariant="danger"
        onClick={() => setView("chat")}
      />
      <HubMenuItem
        icon={BookOpen}
        title="คู่มือและ FAQ"
        description="ศูนย์ช่วยเหลือและคำถามที่พบบ่อย"
        onClick={openHelpCenter}
      />
      <HubMenuItem
        icon={Lightbulb}
        title="เสนอแนะฟีเจอร์"
        description="อยากได้อะไรเพิ่ม บอกเราได้เลย"
        onClick={() => setView("suggest")}
      />
      <HubMenuItem
        icon={Sparkles}
        title="อัปเดตฟีเจอร์ใหม่"
        description="ดูสิ่งใหม่ๆ ที่เพิ่มเข้ามา"
        onClick={() => setView("changelog")}
      />
      <HubMenuItem
        icon={LineIcon}
        title="แชทผ่าน LINE"
        description="ทีมตอบเร็ว · @solofreelancer"
        href="https://lin.ee/q3W9Qds"
        iconClassName="text-[#06C755]"
        iconBgClassName="bg-[#06C755]/10"
        iconShape="square"
      />

      <div className="pt-1 text-center text-[10px] text-gray-400">So1o Support Hub · v1.0</div>
    </div>
  );
}

const FLAT_ICON = { strokeWidth: 1.5 } as const;

function HubMenuItem({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  highlighted,
  badge,
  badgeVariant = "brand",
  iconClassName = "text-[#FF5F05]",
  iconBgClassName = "bg-[#FF5F05]/10",
  iconShape = "circle",
}: {
  icon: LucideIcon | typeof LineIcon;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  highlighted?: boolean;
  badge?: number;
  badgeVariant?: "brand" | "danger";
  iconClassName?: string;
  iconBgClassName?: string;
  iconShape?: "circle" | "square";
}) {
  const iconWrapClass = iconShape === "square" ? "h-10 w-10 rounded-xl" : "h-10 w-10 rounded-full";
  const className = [
    "w-full text-left rounded-xl bg-white p-4 transition-all group",
    highlighted
      ? "border-2 border-[#FF5F05] bg-gradient-to-br from-[#FF5F05]/5 to-orange-50 hover:shadow-md"
      : "border border-gray-200 hover:border-[#FF5F05]/40 hover:shadow-sm",
  ].join(" ");

  const inner = (
    <div className="flex items-start gap-3">
      <div
        className={`${iconWrapClass} flex items-center justify-center shrink-0 ${iconBgClassName} group-hover:opacity-90`}
      >
        {Icon === LineIcon ? (
          <LineIcon className={`h-5 w-5 ${iconClassName}`} />
        ) : (
          <Icon className={`h-5 w-5 ${iconClassName}`} {...FLAT_ICON} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
          {badge != null && badge > 0 ? (
            <span
              className={[
                "inline-flex min-w-5 h-5 px-1.5 rounded-full text-white text-[10px] font-bold items-center justify-center",
                badgeVariant === "danger" ? "bg-red-500" : "bg-[#FF5F05]",
              ].join(" ")}
            >
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function LineIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      strokeWidth={strokeWidth}
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .628.285.628.63 0 .349-.282.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}
