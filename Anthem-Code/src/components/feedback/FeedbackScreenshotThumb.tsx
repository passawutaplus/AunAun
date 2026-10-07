import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { signedFeedbackScreenshotUrl } from "@/lib/feedbackScreenshot";
import { parseFeedbackComments, parseFeedbackScreenshotRef, type FeedbackCommentPin } from "@/lib/feedbackTicket";
import { cn } from "@/lib/utils";

function FeedbackScreenshotViewer({
  src,
  comments,
  onClose,
}: {
  src: string;
  comments: FeedbackCommentPin[];
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(comments.length === 1 ? comments[0].number : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92dvh] w-full max-w-5xl overflow-auto rounded-xl bg-background p-3 shadow-2xl">
        <button
          type="button"
          aria-label="ปิด"
          className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1 text-muted-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-2 pr-8 text-sm font-medium">ภาพแคปฟีดแบ็ก</p>
        {comments.length ? (
          <p className="mb-2 text-xs text-muted-foreground">กดจุดตัวเลขเพื่อดูคอมเมนต์</p>
        ) : null}
        <div className="relative inline-block max-w-full">
          <img loading="lazy" decoding="async" src={src} alt="ภาพแคปฟีดแบ็ก" className="block max-h-[78dvh] max-w-full rounded-md" />
          {comments.map((c) => {
            const open = openId === c.number;
            return (
              <div
                key={`${c.number}-${c.nx}-${c.ny}`}
                className="absolute z-[2]"
                style={{ left: `${c.nx * 100}%`, top: `${c.ny * 100}%` }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`คอมเมนต์ ${c.number}`}
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow ring-2 ring-white"
                  onClick={() => setOpenId(open ? null : c.number)}
                >
                  {c.number}
                </button>
                {open && c.text ? (
                  <div className="absolute left-4 top-[-8px] w-52 rounded-md border border-border bg-background p-2 text-xs shadow-lg">
                    <p className="mb-1 font-medium">คอมเมนต์ {c.number}</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </div>
                ) : open ? (
                  <div className="absolute left-4 top-[-8px] w-40 rounded-md border border-border bg-background p-2 text-xs text-muted-foreground shadow-lg">
                    ไม่มีข้อความ
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackScreenshotThumb({
  stored,
  annotationJson,
  className,
}: {
  stored: string | null | undefined;
  annotationJson?: unknown;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const comments = parseFeedbackComments(annotationJson);

  useEffect(() => {
    if (!stored) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void signedFeedbackScreenshotUrl(stored).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (!parseFeedbackScreenshotRef(stored ?? "")) return <span className="text-xs text-muted-foreground">—</span>;
  if (!src) return <span className="text-[10px] text-muted-foreground">กำลังโหลดรูป</span>;

  return (
    <>
      <button type="button" className={cn("relative block", className)} onClick={() => setOpen(true)}>
        <img loading="lazy" decoding="async" src={src} alt="ภาพแคปฟีดแบ็ก" className="h-12 w-16 rounded border border-border object-cover" />
        {comments.length ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {comments.length}
          </span>
        ) : null}
      </button>
      {open ? <FeedbackScreenshotViewer src={src} comments={comments} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
