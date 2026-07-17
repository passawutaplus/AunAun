import { useEffect, useRef, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react";
import {
  isProjectRichHtml,
  plainTextToProjectRichHtml,
  projectRichTextPlainLength,
  sanitizeProjectRichText,
} from "@/lib/projectRichText";
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
import type { TextVerticalAlign } from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  /** Visual density for heading vs body */
  variant?: "heading" | "body";
  minHeightClass?: string;
  /** Show top/middle/bottom controls (image+text modules). */
  verticalAlign?: TextVerticalAlign;
  onVerticalAlignChange?: (align: TextVerticalAlign) => void;
};

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-muted text-foreground",
      )}
      onMouseDown={(e) => {
        // Keep editor selection — do not let the button steal focus.
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function ProjectRichTextField({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  className,
  variant = "body",
  minHeightClass,
  verticalAlign,
  onVerticalAlignChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const showVertical = typeof onVerticalAlignChange === "function";
  const vAlign = verticalAlign ?? "middle";

  const toEditorHtml = (raw: string) => {
    const trimmed = raw ?? "";
    if (!trimmed) return "";
    if (isProjectRichHtml(trimmed)) return sanitizeProjectRichText(trimmed);
    return plainTextToProjectRichHtml(trimmed);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = toEditorHtml(value);
    if (el.innerHTML !== next) el.innerHTML = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync external value
  }, [value]);

  const emit = (opts?: { rewriteDom?: boolean }) => {
    const el = ref.current;
    if (!el) return;
    let html = sanitizeProjectRichText(el.innerHTML);
    if (maxLength != null && projectRichTextPlainLength(html) > maxLength) {
      return;
    }
    if (!el.textContent?.trim()) html = "";
    if (opts?.rewriteDom && el.innerHTML !== (html || "")) {
      el.innerHTML = html || "";
    }
    onChange(html);
  };

  const withSelection = (fn: (el: HTMLElement) => void) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const saved = saveSelection(el);
    el.focus();
    restoreSelection(saved);
    fn(el);
    emit({ rewriteDom: true });
  };

  const applyInline = (cmd: InlineCmd) => {
    withSelection((el) => toggleInlineFormat(el, INLINE_BY_CMD[cmd]));
  };

  const applyAlignCmd = (cmd: AlignCmd) => {
    withSelection(() => applyAlign(cmd));
  };

  const applyFont = (stack: string) => {
    withSelection((el) => applyFontFamily(el, stack));
  };

  const applySize = (size: string) => {
    withSelection((el) => applyFontSize(el, size));
  };

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-60",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1.5 py-1"
        role="toolbar"
        aria-label="จัดรูปแบบข้อความ"
      >
        <select
          aria-label="ฟอนต์"
          disabled={disabled}
          defaultValue="inherit"
          className="mr-0.5 h-7 max-w-[8.5rem] rounded-md border border-border/60 bg-background px-1.5 text-[11px] text-foreground disabled:opacity-40"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            applyFont(e.target.value);
          }}
        >
          {PROJECT_TEXT_FONTS.map((f) => (
            <option key={f.id} value={f.stack} style={{ fontFamily: f.stack === "inherit" ? undefined : f.stack }}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          aria-label="ขนาดตัวอักษร"
          disabled={disabled}
          defaultValue=""
          className="mr-0.5 h-7 w-[3.75rem] rounded-md border border-border/60 bg-background px-1 text-[11px] text-foreground disabled:opacity-40"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            applySize(e.target.value);
          }}
        >
          {PROJECT_TEXT_SIZES.map((s) => (
            <option key={s.id} value={s.size}>
              {s.label}
            </option>
          ))}
        </select>
        <ToolbarButton label="ตัวหนา" disabled={disabled} onClick={() => applyInline("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ตัวเอียง" disabled={disabled} onClick={() => applyInline("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ขีดเส้นใต้" disabled={disabled} onClick={() => applyInline("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ขีดกลาง" disabled={disabled} onClick={() => applyInline("strikeThrough")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <ToolbarButton label="ชิดซ้าย" disabled={disabled} onClick={() => applyAlignCmd("justifyLeft")}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="กึ่งกลาง" disabled={disabled} onClick={() => applyAlignCmd("justifyCenter")}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ชิดขวา" disabled={disabled} onClick={() => applyAlignCmd("justifyRight")}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        {showVertical ? (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <ToolbarButton
              label="ชิดบน"
              disabled={disabled}
              active={vAlign === "top"}
              onClick={() => onVerticalAlignChange("top")}
            >
              <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="กึ่งกลางแนวตั้ง"
              disabled={disabled}
              active={vAlign === "middle"}
              onClick={() => onVerticalAlignChange("middle")}
            >
              <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="ชิดล่าง"
              disabled={disabled}
              active={vAlign === "bottom"}
              onClick={() => onVerticalAlignChange("bottom")}
            >
              <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
            </ToolbarButton>
          </>
        ) : null}
      </div>

      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "px-3 py-2 text-sm text-foreground outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          // Keep heading size, but don't force semibold — it hides <b> toggles.
          variant === "heading" && "text-base",
          minHeightClass ?? (variant === "heading" ? "min-h-[42px]" : "min-h-[96px]"),
          "[&_p]:my-0 [&_p+p]:mt-2",
          "[&_b]:font-bold [&_strong]:font-bold",
        )}
        onInput={() => {
          if (maxLength != null && ref.current) {
            const len = (ref.current.textContent ?? "").length;
            if (len > maxLength) {
              ref.current.innerHTML = toEditorHtml(value);
              return;
            }
          }
          emit();
        }}
        onBlur={emit}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

type HtmlViewProps = {
  html?: string | null;
  className?: string;
  as?: "h2" | "h3" | "div" | "p";
};

/** Public/read-only render of sanitized project rich text. */
export function ProjectRichTextView({ html, className, as: Tag = "div" }: HtmlViewProps) {
  const raw = html?.trim() ?? "";
  if (!raw) return null;

  if (!isProjectRichHtml(raw)) {
    return (
      <Tag className={cn("whitespace-pre-wrap", className)}>
        {raw}
      </Tag>
    );
  }

  const safe = sanitizeProjectRichText(raw);
  if (!safe) return null;

  return (
    <Tag
      className={cn("[&_p]:my-0 [&_p+p]:mt-2 [&_b]:font-bold [&_strong]:font-bold", className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
