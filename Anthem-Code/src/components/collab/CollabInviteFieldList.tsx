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
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const empty = value === EMPTY;
  return (
    <p className="text-sm text-foreground">
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
  collabTypesLabel?: string | null;
  links?: string[];
  attachments?: string[];
  personalMessage?: string | null;
  className?: string;
};

/** Collab form fields — always shown; empty values render as "-". */
export function CollabInviteFieldList({
  collabTypesLabel,
  links = [],
  attachments = [],
  personalMessage,
  className,
}: Props) {
  const safeLinks = links.map((url) => safeHttpUrl(url)).filter((url): url is string => !!url);
  const safeAttachments = attachments
    .map((url) => safeHttpUrl(url))
    .filter((url): url is string => !!url);

  return (
    <div className={cn("space-y-1.5", className)}>
      <MetaRow label="อยากร่วมงานแบบไหน" value={dash(collabTypesLabel)} />

      <div className="text-sm">
        <p className="text-muted-foreground">ลิงก์ (ไดรฟ์ / เว็บ / พอร์ต):</p>
        {safeLinks.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {safeLinks.map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-1 text-[11px] text-foreground hover:border-primary/40"
              >
                <Link2 className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{EMPTY}</p>
        )}
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">แนบภาพ:</p>
        {safeAttachments.length ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {safeAttachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="ภาพแนบ">
                <img loading="lazy" decoding="async"
                  src={url}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-border/70 object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{EMPTY}</p>
        )}
      </div>

      <MetaRow label="ข้อความถึง" value={dash(personalMessage)} multiline />
    </div>
  );
}

export default CollabInviteFieldList;
