import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarDays, Clock, Handshake } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useCountUp } from "@/hooks/useCountUp";
import { formatStudioJoinedDate, studioDaysOnPlatform } from "@/lib/studioTenure";
import { profilePublicPath } from "@/lib/profileRoutes";
import { STUDIO_HIRE_PATH } from "@/lib/studioNav";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  displayName: string | null | undefined;
  username: string | null | undefined;
  avatarUrl: string | null | undefined;
  joinedAt: string | undefined;
  hireCompleted: number;
  collabCompleted: number;
};

function Fact({
  label,
  icon: Icon,
  children,
  to,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
  to?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex min-h-[4.25rem] min-w-0 flex-col justify-center rounded-xl bg-secondary/35 px-3 py-2.5 transition-colors",
        to && "hover:bg-secondary/55",
      )}
    >
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span className="mt-0.5 text-base font-medium leading-snug tabular-nums text-foreground sm:text-lg">
        {children}
      </span>
    </div>
  );
  if (!to) return body;
  return (
    <Link to={to} className="min-w-0 rounded-xl">
      {body}
    </Link>
  );
}

function CountFact({
  label,
  icon,
  value,
  suffix,
  to,
}: {
  label: string;
  icon: LucideIcon;
  value: number;
  suffix?: string;
  to?: string;
}) {
  const shown = useCountUp(value);
  return (
    <Fact label={label} icon={icon} to={to}>
      <span aria-live="polite">
        {shown.toLocaleString("th-TH")}
        {suffix ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
      </span>
    </Fact>
  );
}

export default function StudioIdentityCard({
  userId,
  displayName,
  username,
  avatarUrl,
  joinedAt,
  hireCompleted,
  collabCompleted,
}: Props) {
  const name = displayName?.trim() || username?.trim() || "ครีเอเตอร์";
  const handle = username?.trim();
  const days = joinedAt ? studioDaysOnPlatform(joinedAt) : null;
  const joinedLabel = joinedAt ? formatStudioJoinedDate(joinedAt) : "—";

  return (
    <section className="rounded-2xl glass-panel p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <Link
          to={profilePublicPath({ user_id: userId, username: handle })}
          className="flex min-w-0 items-center gap-3 lg:w-[min(100%,18rem)] lg:shrink-0"
        >
          <UserAvatar
            src={avatarUrl}
            name={name}
            username={handle}
            className="h-14 w-14 shrink-0 ring-2 ring-border/60 sm:h-16 sm:w-16"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{name}</p>
            {handle ? <p className="truncate text-sm text-muted-foreground">@{handle}</p> : null}
            <p className="mt-0.5 text-xs text-muted-foreground">ดูโปรไฟล์สาธารณะ</p>
          </div>
        </Link>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label="สมัครเมื่อ" icon={CalendarDays}>
            {joinedLabel}
          </Fact>
          {days == null ? (
            <Fact label="ใช้มาแล้ว" icon={Clock}>
              —
            </Fact>
          ) : (
            <CountFact label="ใช้มาแล้ว" icon={Clock} value={days} suffix="วัน" />
          )}
          <CountFact label="จ้างงานสำเร็จ" icon={Briefcase} value={hireCompleted} to={STUDIO_HIRE_PATH} />
          <CountFact label="คอลแลปสำเร็จ" icon={Handshake} value={collabCompleted} to="/dashboard/collab" />
        </div>
      </div>
    </section>
  );
}
