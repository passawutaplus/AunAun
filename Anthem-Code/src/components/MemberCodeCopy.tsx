import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatMemberCode } from "@/lib/memberCode";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  className?: string;
  size?: "xs" | "sm";
};

export function MemberCodeCopy({ userId, className, size = "xs" }: Props) {
  const code = formatMemberCode(userId);
  const textSize = size === "sm" ? "text-xs" : "text-[10px]";

  const copy = () => {
    void navigator.clipboard.writeText(code).then(
      () => toast.success("คัดลอกรหัสสมาชิกแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  };

  return (
    <span className={cn("inline-flex items-center gap-1", textSize, className)}>
      <span className="font-semibold tabular-nums font-mono">{code}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-admin-muted hover:text-admin-fg hover:bg-admin-hover"
        title="คัดลอกรหัสสมาชิก"
        aria-label="คัดลอกรหัสสมาชิก"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}
