import { useAuth } from "@/auth/AuthProvider";
import { formatMemberCode, siteBrandLabel } from "@/lib/userDisplayId";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";
import { cn } from "@/lib/utils";

interface AccountIdentityBadgeProps {
  variant?: "sidebar" | "settings";
  collapsed?: boolean;
  className?: string;
}

export function AccountIdentityBadge({
  variant = "sidebar",
  collapsed = false,
  className,
}: AccountIdentityBadgeProps) {
  const { user } = useAuth();
  if (!user) return null;

  const memberCode = formatMemberCode(user.id);
  const brand = siteBrandLabel();

  if (variant === "settings") {
    return (
      <div className={cn("text-right shrink-0", className)}>
        <MemberCodeCopy
          userId={user.id}
          size="sm"
          codeClassName="text-sky-600 dark:text-sky-400"
        />
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">{brand}</p>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div
        title={`รหัสสมาชิก: ${memberCode} — ใช้แจ้งปัญหากับทีม So1o`}
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white tabular-nums",
          className,
        )}
      >
        {memberCode.slice(1, 4)}
      </div>
    );
  }

  return (
    <div
      className={cn("w-full min-w-0 border-t border-white/15 pt-2 mt-0.5 text-center", className)}
    >
      <p className="text-[11px] text-white/75 flex items-center justify-center gap-1 flex-wrap">
        <MemberCodeCopy userId={user.id} tone="onDark" className="text-[11px]" />
      </p>
      <p className="text-[9px] text-white/55 mt-0.5 truncate">{brand}</p>
    </div>
  );
}
