import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useModerationState } from "@/hooks/useModeration";
import { formatThaiDate } from "@/lib/format";

interface Props {
  className?: string;
}

const ModerationBanBanner = ({ className = "" }: Props) => {
  const { data } = useModerationState();
  if (!data || data.allowed) return null;

  const until = data.banned_until ? formatThaiDate(data.banned_until) : null;
  const reason =
    data.reason === "BANNED"
      ? "ใช้คำหยาบซ้ำ"
      : data.reason === "MUTED"
        ? "ถูกจำกัดการโพสต์ชั่วคราว"
        : "ถูกจำกัดการโพสต์";

  return (
    <div
      className={`rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex gap-3 items-start ${className}`}
      role="alert"
    >
      <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="text-sm space-y-1">
        <p className="font-medium text-foreground">
          คุณถูกจำกัดการโพสต์{until ? ` จนถึง ${until}` : ""}
        </p>
        <p className="text-muted-foreground">เหตุผล: {reason}</p>
        <Link to="/legal/community" className="text-primary hover:underline text-xs">
          อ่านกฎชุมชนและโทษแบน
        </Link>
      </div>
    </div>
  );
};

export default ModerationBanBanner;
