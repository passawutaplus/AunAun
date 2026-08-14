import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { TwemojiImg } from "@/components/comments/TwemojiImg";
import { COMMENT_PICKER_EMOJIS } from "@/lib/twemoji";
import { cn } from "@/lib/utils";

type Props = {
  onPick: (emoji: string) => void;
  disabled?: boolean;
};

export function CommentEmojiPicker({ onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        aria-label="ใส่อีโมจิ"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          open && "bg-muted/60 text-foreground",
        )}
      >
        <Smile className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className="absolute left-0 bottom-full z-30 mb-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-2 shadow-lg"
          role="listbox"
          aria-label="เลือกอีโมจิ"
        >
          <div className="grid grid-cols-6 gap-0.5">
            {COMMENT_PICKER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="option"
                className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-muted/70"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(emoji);
                  setOpen(false);
                }}
              >
                <TwemojiImg emoji={emoji} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
