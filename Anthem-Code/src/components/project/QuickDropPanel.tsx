import { useRef, useState, type ReactNode, type RefObject } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  coverUrl: string;
  imageUrls: string[];
  uploading: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onRemoveImage: (url: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  titleRef?: RefObject<HTMLInputElement>;
  titleInvalid?: boolean;
  /** Category picker, rendered by the page so it keeps its own state + errors. */
  taxonomy: ReactNode;
  shortDescription: string;
  onShortDescriptionChange: (value: string) => void;
  shortDescriptionMax: number;
  defaultsSummary: string[];
  onEditDefaults: () => void;
};

/** Quick drop — the one-column fast post. Same editor state as Studio, fewer fields. */
export function QuickDropPanel({
  coverUrl,
  imageUrls,
  uploading,
  disabled,
  onFiles,
  onRemoveImage,
  title,
  onTitleChange,
  titleRef,
  titleInvalid,
  taxonomy,
  shortDescription,
  onShortDescriptionChange,
  shortDescriptionMax,
  defaultsSummary,
  onEditDefaults,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hasImages = imageUrls.length > 0 || !!coverUrl;
  const thumbs = imageUrls.length ? imageUrls : coverUrl ? [coverUrl] : [];

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-8 pb-28 lg:pb-10">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-3xl border border-dashed border-border bg-card/40 transition-colors",
          dragging && "border-foreground bg-card",
        )}
      >
        {hasImages ? (
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
            {thumbs.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted">
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
                    ปก
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="ลบรูปนี้"
                  onClick={() => onRemoveImage(url)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              เพิ่มรูป
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
            <span className="text-base text-foreground">ลากรูปมาวางที่นี่</span>
            <span className="text-xs">รูปแรกจะเป็นภาพปก · เพิ่มได้หลายรูป</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="เลือกรูปผลงาน"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          ชื่องาน <span className="text-primary">*</span>
        </Label>
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="เช่น โลโก้ร้านกาแฟเชียงใหม่ Doi Brew"
          aria-label="ชื่องาน"
          aria-required
          aria-invalid={titleInvalid || undefined}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">{taxonomy}</div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">รายละเอียดสั้น ๆ (ไม่บังคับ)</Label>
        <Textarea
          value={shortDescription}
          maxLength={shortDescriptionMax}
          onChange={(e) => onShortDescriptionChange(e.target.value)}
          placeholder="สรุปสั้น ๆ ว่างานนี้คืออะไร"
          rows={3}
          disabled={disabled}
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {shortDescription.length}/{shortDescriptionMax}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>ตั้งค่าเริ่มต้น</span>
        {defaultsSummary.map((label) => (
          <span key={label} className="rounded-full border border-border px-2.5 py-0.5">
            {label}
          </span>
        ))}
        <button type="button" onClick={onEditDefaults} className="ml-auto underline underline-offset-2 hover:text-foreground">
          แก้ไขใน Studio
        </button>
      </div>
    </div>
  );
}
