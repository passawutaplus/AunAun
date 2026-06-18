import { Copy } from "lucide-react";
import { formatMemberCode } from "@/lib/memberCode";

type Props = {
  userId: string;
  className?: string;
};

export function MemberCodeCopy({ userId, className }: Props) {
  const code = formatMemberCode(userId);

  const copy = () => {
    void navigator.clipboard.writeText(code);
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted ${className ?? ""}`}>
      <span className="text-muted">รหัสสมาชิก:</span>
      <span className="font-semibold tabular-nums text-foreground">{code}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-surface"
        title="คัดลอกรหัสสมาชิก"
        aria-label="คัดลอกรหัสสมาชิก"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}
