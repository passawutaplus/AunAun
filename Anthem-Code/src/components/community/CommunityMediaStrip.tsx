import { useRef } from "react";
import { Loader2, Plus, Play, X } from "lucide-react";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

type Props = {
  items: PortfolioMediaItem[];
  uploading: boolean;
  pickDisabled?: boolean;
  onPickFile: (file: File) => void;
  onRemove: (index: number) => void;
};

export function CommunityMediaStrip({
  items,
  uploading,
  pickDisabled,
  onPickFile,
  onRemove,
}: Props) {
  const mediaRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted"
          >
            {item.kind === "video" ? (
              <div className="w-full h-full grid place-items-center bg-muted">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            ) : (
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 rounded-full bg-black/55 p-0.5 text-white"
              aria-label="ลบสื่อ"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => mediaRef.current?.click()}
          disabled={uploading || pickDisabled}
          className={cn(
            "shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-primary/70",
            "flex flex-col items-center justify-center gap-1 text-primary",
            "hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-medium">เพิ่ม</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={mediaRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
