import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatMemberCode } from "@/lib/userDisplayId";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  className?: string;
  codeClassName?: string;
  showLabel?: boolean;
  size?: "xs" | "sm";
  /** Light text on dark sidebar */
  tone?: "default" | "onDark";
};

export function MemberCodeCopy({
  userId,
  className,
  codeClassName,
  showLabel = true,
  size = "xs",
  tone = "default",
}: Props) {
  const code = formatMemberCode(userId);
  const textSize = size === "sm" ? "text-xs" : "text-[10px]";
  const labelClass = tone === "onDark" ? "text-white/75" : "text-muted-foreground";
  const codeClass = codeClassName ?? (tone === "onDark" ? "text-white/90" : undefined);
  const btnClass =
    tone === "onDark"
      ? "text-white/60 hover:text-white hover:bg-white/10"
      : "text-muted-foreground hover:text-foreground hover:bg-muted";

  const copy = () => {
    void navigator.clipboard.writeText(code).then(
      () => toast.success("คัดลอกรหัสสมาชิกแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  };

  return (
    <span className={cn("inline-flex items-center gap-1", textSize, className)}>
      {showLabel ? <span className={labelClass}>รหัสสมาชิก:</span> : null}
      <span className={cn("font-semibold tabular-nums", codeClass)}>{code}</span>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded",
          btnClass,
        )}
        title="คัดลอกรหัสสมาชิก — ใช้แจ้งปัญหากับทีม So1o"
        aria-label="คัดลอกรหัสสมาชิก"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}
