import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeHttpUrl } from "@/lib/safeUrl";

const EMPTY = "-";

function dash(value: string | null | undefined): string {
  const v = value?.trim();
  return v || EMPTY;
}

function MetaRow({
  label,
  value,
  multiline,
  compact,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  compact?: boolean;
}) {
  const empty = value === EMPTY;
  return (
    <p className={cn("text-foreground", compact ? "text-xs" : "text-sm")}>
      <span className="text-muted-foreground">{label}: </span>
      <span
        className={cn(
          empty && "text-muted-foreground",
          multiline && "whitespace-pre-wrap break-words",
        )}
      >
        {value}
      </span>
    </p>
  );
}

type Props = {
  jobTypesLabel?: string | null;
  details?: string | null;
  links?: string[];
  attachments?: string[];
  budgetLabel?: string | null;
  deadlineLabel?: string | null;
  compact?: boolean;
  className?: string;
};

/** Hire form fields — always shown; empty values render as "-". */
export function HireInviteFieldList({
  jobTypesLabel,
  details,
  links = [],
  attachments = [],
  budgetLabel,
  deadlineLabel,
  compact = false,
  className,
}: Props) {
  const safeLinks = links.map((url) => safeHttpUrl(url)).filter((url): url is string => !!url);
  const safeAttachments = attachments
    .map((url) => safeHttpUrl(url))
    .filter((url): url is string => !!url);
  const text = compact ? "text-xs" : "text-sm";
  const thumb = compact ? "w-11 h-11" : "w-14 h-14";

  return (
    <div className={cn("space-y-1.5", className)}>
      <MetaRow label="ประเภทงาน" value={dash(jobTypesLabel)} compact={compact} />
      <MetaRow label="รายละเอียดงาน" value={dash(details)} multiline compact={compact} />

      <div className={text}>
        <p className="text-muted-foreground">ลิงก์อ้างอิง (ไฟล์ / brief):</p>
        {safeLinks.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {safeLinks.map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 max-w-full text-[11px] px-2 py-1 rounded-full border border-border/70 bg-card hover:border-primary/40 text-foreground"
              >
                <Link2 className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{EMPTY}</p>
        )}
      </div>

      <div className={text}>
        <p className="text-muted-foreground">แนบภาพอ้างอิง:</p>
        {safeAttachments.length ? (
          <div className="mt-1 flex gap-2 flex-wrap">
            {safeAttachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="ภาพอ้างอิง">
                <img loading="lazy" decoding="async"
                  src={url}
                  alt=""
                  className={cn(thumb, "rounded-lg object-cover border border-border/70")}
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{EMPTY}</p>
        )}
      </div>

      <MetaRow label="งบประมาณ (บาท)" value={dash(budgetLabel)} compact={compact} />
      <MetaRow label="กำหนดส่งงาน" value={dash(deadlineLabel)} compact={compact} />
    </div>
  );
}

export default HireInviteFieldList;
