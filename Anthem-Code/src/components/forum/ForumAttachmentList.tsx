import { Download, FileText } from "lucide-react";
import type { ForumAttachment } from "@/lib/forumAttachments";
import { formatBytes } from "@/lib/forumAttachments";
import { cn } from "@/lib/utils";

type Props = {
  attachments: ForumAttachment[];
  className?: string;
};

export function ForumAttachmentList({ attachments, className }: Props) {
  const visible = attachments.filter((a) => a.scan_status === "clean" && a.public_url);
  if (!visible.length) return null;

  const images = visible.filter((a) => a.kind === "image");
  const videos = visible.filter((a) => a.kind === "video");
  const files = visible.filter((a) => a.kind === "file");

  return (
    <div className={cn("space-y-3", className)}>
      {images.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((a) => (
            <a
              key={a.id}
              href={a.public_url!}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-border bg-muted/40 aspect-video"
            >
              <img src={a.public_url!} alt={a.file_name} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {videos.map((a) => (
        <video
          key={a.id}
          src={a.public_url!}
          controls
          className="w-full max-h-80 rounded-lg border border-border bg-black"
          preload="metadata"
        >
          <track kind="captions" />
        </video>
      ))}

      {files.length ? (
        <ul className="space-y-1.5">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={a.public_url!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium">{a.file_name}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatBytes(a.size_bytes)}
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
