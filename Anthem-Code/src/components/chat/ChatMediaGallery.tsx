import { useMemo, useState } from "react";
import { FileText, ImageIcon, Play } from "lucide-react";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { cn } from "@/lib/utils";

export type ChatMediaItem = {
  url: string;
  createdAt: string;
  messageType?: string | null;
  name?: string | null;
};

type MediaKind = "image" | "video" | "file";
type Filter = "all" | MediaKind;

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|heic)(?:$|\?)/i;
const VIDEO_RE = /\.(mp4|mov|webm|m4v)(?:$|\?)/i;

function chatMediaKind(item: ChatMediaItem): MediaKind {
  if (item.messageType === "video" || VIDEO_RE.test(item.url)) return "video";
  if (item.messageType === "image" || IMAGE_RE.test(item.url)) return "image";
  return "file";
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "image", label: "ภาพ" },
  { id: "video", label: "วิดีโอ" },
  { id: "file", label: "ไฟล์" },
];

function MediaTile({ item, kind }: { item: ChatMediaItem; kind: MediaKind }) {
  const src = useSignedStorageUrl(item.url);
  const label = item.name?.trim() || item.url.split("/").pop()?.split("?")[0] || "ไฟล์แนบ";
  const base = "group relative block overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-90";

  if (kind === "file") {
    return (
      <a
        href={src || undefined}
        target="_blank"
        rel="noopener noreferrer"
        download={label}
        className="col-span-3 flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 truncate">{label}</span>
      </a>
    );
  }

  return (
    <a href={src || undefined} target="_blank" rel="noopener noreferrer" className={cn(base, "aspect-square")}>
      {!src ? (
        <span className="absolute inset-0 animate-pulse bg-muted" />
      ) : kind === "video" ? (
        <>
          <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-900">
              <Play className="h-4 w-4 translate-x-px" aria-hidden />
            </span>
          </span>
        </>
      ) : (
        <img loading="lazy" decoding="async" src={src} alt="" className="h-full w-full object-cover" />
      )}
    </a>
  );
}

/** Every image, video and file sent in this chat, newest first, with type filters. */
export function ChatMediaGallery({ items }: { items: ChatMediaItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const typed = useMemo(() => items.map((item) => ({ item, kind: chatMediaKind(item) })), [items]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: typed.length, image: 0, video: 0, file: 0 };
    for (const t of typed) c[t.kind] += 1;
    return c;
  }, [typed]);
  const shown = filter === "all" ? typed : typed.filter((t) => t.kind === filter);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
        <p className="text-sm">ยังไม่มีรูป วิดีโอ หรือไฟล์ในแชทนี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="กรองมีเดีย">
        {FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0).map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shown.map(({ item, kind }) => (
          <MediaTile key={`${item.url}-${item.createdAt}`} item={item} kind={kind} />
        ))}
      </div>
    </div>
  );
}
