import * as React from "react";
import { Bell, Briefcase, Receipt, CalendarDays } from "lucide-react";

export function HeroGreeting({
  greet,
  unreadNotif,
  activeJobs,
  pendingInvoices,
  todayPosts,
}: {
  greet: string;
  unreadNotif: number;
  activeJobs: number;
  pendingInvoices: number;
  todayPosts: number;
}) {
  return (
    <div className="rounded-xl glass border border-border/60 p-5 sm:p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">สวัสดี 👋</p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
            สวัสดีครับ{greet ? ` ${greet}` : "บอส"} วันนี้ลุยกันต่อ!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            นี่คือภาพรวมหลังบ้านของคุณวันนี้
          </p>
        </div>
        {unreadNotif > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 px-3 py-1.5 text-xs font-semibold border border-amber-500/30">
            <Bell className="h-3.5 w-3.5" />
            แจ้งเตือนใหม่ {unreadNotif}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
        <Stat icon={Briefcase} label="งานที่ยังไม่เสร็จ" value={activeJobs} />
        <Stat icon={Receipt} label="ใบแจ้งหนี้ค้าง" value={pendingInvoices} />
        <Stat icon={CalendarDays} label="โพสต์วันนี้" value={todayPosts} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-card/80 border border-border/60 px-3 py-2 flex items-center gap-2">
      <span className="rounded-md bg-primary-soft text-primary p-1.5 shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-base font-bold leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}
