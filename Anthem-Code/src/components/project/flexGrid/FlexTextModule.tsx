import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, forwardRef, type ReactNode } from "react";
import { sanitizeProjectRichText } from "@/lib/projectRichText";
import {
  applyAlign,
  applyFontFamily,
  applyFontSize,
  INLINE_BY_CMD,
  restoreSelection,
  saveSelection,
  toggleInlineFormat,
  type AlignCmd,
  type InlineCmd,
} from "@/lib/projectRichTextFormat";
import { PROJECT_TEXT_FONTS, PROJECT_TEXT_SIZES } from "@/lib/projectTextFonts";
import { cn } from "@/lib/utils";

/** Rich-text toolbar and contentEditable body for Full Grid text modules. */
export type FlexTextCommand =
  | { kind: "inline"; cmd: InlineCmd }
  | { kind: "align"; cmd: AlignCmd }
  | { kind: "font"; stack: string }
  | { kind: "size"; size: string };

export function FlexTextFormatToolbar({
  onCommand,
  className,
}: {
  onCommand: (cmd: FlexTextCommand) => void;
  className?: string;
}) {
  const btn = (label: string, cmd: FlexTextCommand, icon: ReactNode) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCommand(cmd);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {icon}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="จัดรูปแบบข้อความ"
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-card/95 px-1 py-0.5 shadow-sm",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        aria-label="ฟอนต์"
        className="mr-0.5 h-6 max-w-[7.5rem] rounded border border-border/50 bg-background px-1 text-[10px] text-foreground"
        defaultValue="inherit"
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onCommand({ kind: "font", stack: e.target.value })}
      >
        {PROJECT_TEXT_FONTS.map((f) => (
          <option key={f.id} value={f.stack}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="ขนาดตัวอักษร"
        className="mr-0.5 h-6 w-[3.25rem] rounded border border-border/50 bg-background px-0.5 text-[10px] text-foreground"
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onCommand({ kind: "size", size: e.target.value })}
      >
        {PROJECT_TEXT_SIZES.map((s) => (
          <option key={s.id} value={s.size}>
            {s.label}
          </option>
        ))}
      </select>
      {btn("ตัวหนา", { kind: "inline", cmd: "bold" }, <Bold className="h-3.5 w-3.5" />)}
      {btn("ตัวเอียง", { kind: "inline", cmd: "italic" }, <Italic className="h-3.5 w-3.5" />)}
      {btn("ขีดเส้นใต้", { kind: "inline", cmd: "underline" }, <Underline className="h-3.5 w-3.5" />)}
      {btn(
        "ขีดกลาง",
        { kind: "inline", cmd: "strikeThrough" },
        <Strikethrough className="h-3.5 w-3.5" />,
      )}
      <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
      {btn("ชิดซ้าย", { kind: "align", cmd: "justifyLeft" }, <AlignLeft className="h-3.5 w-3.5" />)}
      {btn(
        "กึ่งกลาง",
        { kind: "align", cmd: "justifyCenter" },
        <AlignCenter className="h-3.5 w-3.5" />,
      )}
      {btn("ชิดขวา", { kind: "align", cmd: "justifyRight" }, <AlignRight className="h-3.5 w-3.5" />)}
    </div>
  );
}

export type TextModuleBodyHandle = {
  applyCommand: (cmd: FlexTextCommand) => void;
};

export const TextModuleBody = forwardRef<
  TextModuleBodyHandle,
  {
    initialHtml: string;
    editing: boolean;
    disabled?: boolean;
    onCommit: (html: string) => void;
  }
>(function TextModuleBody({ initialHtml, editing, disabled, onCommit }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (!editorRef.current) return;
    if (!seeded.current) {
      editorRef.current.innerHTML = initialHtml;
      seeded.current = true;
      return;
    }
    if (document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const commit = (el: HTMLElement) => {
    onCommit(sanitizeProjectRichText(el.innerHTML));
  };

  useImperativeHandle(ref, () => ({
    applyCommand(cmd: FlexTextCommand) {
      const el = editorRef.current;
      if (!el || disabled) return;
      const saved = saveSelection(el);
      el.focus();
      restoreSelection(saved);
      if (cmd.kind === "inline") {
        toggleInlineFormat(el, INLINE_BY_CMD[cmd.cmd]);
      } else if (cmd.kind === "align") {
        applyAlign(cmd.cmd);
      } else if (cmd.kind === "font") {
        applyFontFamily(el, cmd.stack);
      } else {
        applyFontSize(el, cmd.size);
      }
      // Normalize markup after format (select-all bold/font especially).
      const safe = sanitizeProjectRichText(el.innerHTML);
      if (el.innerHTML !== safe) el.innerHTML = safe;
      onCommit(safe);
    },
  }));

  return (
    <div
      ref={editorRef}
      className={cn(
        "h-full w-full overflow-auto text-sm leading-relaxed outline-none",
        "[&_p]:my-0 [&_p+p]:mt-1.5 [&_b]:font-bold [&_strong]:font-bold",
        "bg-transparent text-foreground",
        editing ? "p-3" : "p-1",
      )}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={(e) => commit(e.currentTarget)}
    />
  );
});
