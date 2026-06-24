import * as React from "react";
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadBriefReference } from "./uploadReference";
import type { BriefReference } from "@/lib/briefSchema";

interface Props {
  refs: BriefReference[];
  onChange: (next: BriefReference[]) => void;
  userId?: string | null;
  shareToken?: string | null;
  max?: number;
  disabled?: boolean;
}

interface PendingPreview {
  id: string;
  name: string;
  previewUrl: string; // local blob URL — instant preview
  status: "uploading" | "error";
  errorMsg?: string;
}

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const low = msg.toLowerCase();
  if (low.includes("payload") || low.includes("413") || low.includes("too large")) {
    return "ไฟล์ใหญ่เกินไป (สูงสุด 10MB) ระบบบีบอัตโนมัติแล้วยังไม่พอ";
  }
  if (low.includes("mime") || low.includes("400") || low.includes("invalid")) {
    return "ไฟล์นี้ไม่รองรับ ลอง JPG/PNG/WebP/GIF/SVG";
  }
  if (
    low.includes("403") ||
    low.includes("rls") ||
    low.includes("denied") ||
    low.includes("unauthorized")
  ) {
    return "อัปโหลดไม่ได้ — กรุณาเข้าสู่ระบบใหม่";
  }
  if (low.includes("network") || low.includes("fetch")) {
    return "เครือข่ายขัดข้อง ลองใหม่อีกครั้ง";
  }
  return msg || "อัปโหลดไม่สำเร็จ";
}

export function ReferenceUploader({
  refs,
  onChange,
  userId,
  shareToken,
  max = 12,
  disabled,
}: Props) {
  const [drag, setDrag] = React.useState(false);
  const [pending, setPending] = React.useState<PendingPreview[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup blob URLs on unmount
  React.useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;
    const arr = Array.from(files);
    const slots = max - refs.length - pending.filter((p) => p.status === "uploading").length;
    if (slots <= 0) {
      toast.error(`อัปโหลดได้สูงสุด ${max} รูป`);
      return;
    }
    const toUpload = arr.slice(0, slots);

    // Validate + create instant previews
    const queued: PendingPreview[] = [];
    for (const f of toUpload) {
      if (!ACCEPTED_TYPES.has(f.type)) {
        toast.error(`${f.name}: ไฟล์ประเภทนี้ไม่รองรับ`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: ไฟล์ใหญ่เกิน 10MB`);
        continue;
      }
      queued.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        previewUrl: URL.createObjectURL(f),
        status: "uploading",
      });
    }
    if (queued.length === 0) return;
    setPending((prev) => [...prev, ...queued]);

    // Upload in parallel
    const results: BriefReference[] = [];
    await Promise.all(
      toUpload.slice(0, queued.length).map(async (f, i) => {
        const slot = queued[i];
        try {
          const r = await uploadBriefReference({ file: f, userId, shareToken });
          results.push(r);
          setPending((prev) => prev.filter((p) => p.id !== slot.id));
          URL.revokeObjectURL(slot.previewUrl);
        } catch (e) {
          const msg = friendlyError(e);
          toast.error(`${f.name}: ${msg}`);
          setPending((prev) =>
            prev.map((p) => (p.id === slot.id ? { ...p, status: "error", errorMsg: msg } : p)),
          );
        }
      }),
    );

    if (results.length) {
      onChange([...refs, ...results]);
      toast.success(`เพิ่มรูปอ้างอิง ${results.length} รูปแล้ว`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (idx: number) => {
    const next = refs.filter((_, i) => i !== idx);
    onChange(next);
  };

  const dismissPending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const busy = pending.some((p) => p.status === "uploading");

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition ${
          drag ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ImageIcon className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">ลากรูปมาวางที่นี่ หรือกดเลือกไฟล์</p>
        <p className="text-xs text-muted-foreground mt-1">
          รองรับ JPG / PNG / WebP / GIF / SVG · สูงสุด {max} รูป · ระบบจะบีบอัดอัตโนมัติ (~200KB)
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 rounded-xl"
          disabled={busy || refs.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> กำลังอัปโหลด…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1.5" /> เลือกไฟล์
            </>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {(refs.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {refs.map((r, i) => (
            <div
              key={`r-${i}`}
              className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square"
            >
              <img
                src={r.url}
                alt={r.name ?? `ref-${i}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="ลบ"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {pending.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-xl overflow-hidden border aspect-square ${
                p.status === "error"
                  ? "border-destructive bg-destructive/5"
                  : "border-primary/40 bg-muted"
              }`}
              title={p.errorMsg || "กำลังอัปโหลด…"}
            >
              <img
                src={p.previewUrl}
                alt={p.name}
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                {p.status === "uploading" ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <div className="text-center text-white px-2">
                    <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-[10px] leading-tight line-clamp-2">{p.errorMsg}</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissPending(p.id)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                aria-label="ปิด"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
