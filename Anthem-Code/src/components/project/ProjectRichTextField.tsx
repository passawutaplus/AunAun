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

type InlineTag = "b" | "i" | "u" | "s";
type AlignCmd = "justifyLeft" | "justifyCenter" | "justifyRight";

const INLINE_BY_CMD: Record<"bold" | "italic" | "underline" | "strikeThrough", InlineTag> = {
  bold: "b",
  italic: "i",
  underline: "u",
  strikeThrough: "s",
};

function saveSelection(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function restoreSelection(range: Range | null) {
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function normalizeText(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, "").trim();
}

function selectionCoversAllText(root: HTMLElement, range: Range): boolean {
  const selected = normalizeText(range.toString());
  const all = normalizeText(root.textContent ?? "");
  return !!selected && !!all && selected === all;
}

function closestFormatTag(node: Node | null, root: HTMLElement, tag: InlineTag): HTMLElement | null {
  let cur: Node | null = node;
  const upper = tag.toUpperCase();
  const aliases =
    tag === "b" ? new Set(["B", "STRONG"]) :
    tag === "i" ? new Set(["I", "EM"]) :
    tag === "s" ? new Set(["S", "STRIKE"]) :
    new Set(["U"]);

  while (cur && cur !== root) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (aliases.has(el.tagName) || el.tagName === upper) return el;
    }
    cur = cur.parentNode;
  }
  return null;
}

function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** True when every text char in root is already inside `tag`. */
function isEntirelyFormatted(root: HTMLElement, tag: InlineTag): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let saw = false;
  while (node) {
    const text = node.textContent ?? "";
    if (normalizeText(text)) {
      saw = true;
      if (!closestFormatTag(node, root, tag)) return false;
    }
    node = walker.nextNode();
  }
  return saw;
}

function wrapRangeWithTag(range: Range, tag: InlineTag): void {
  const wrapper = document.createElement(tag);
  try {
    range.surroundContents(wrapper);
  } catch {
    const frag = range.extractContents();
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
  }
}

function wrapAllTextInTag(root: HTMLElement, tag: InlineTag): void {
  const blocks = Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && (el.tagName === "P" || el.tagName === "DIV"),
  );

  if (blocks.length === 0) {
    if (!normalizeText(root.textContent ?? "")) return;
    const wrapper = document.createElement(tag);
    while (root.firstChild) wrapper.appendChild(root.firstChild);
    root.appendChild(wrapper);
    return;
  }

  for (const block of blocks) {
    if (!normalizeText(block.textContent ?? "")) continue;
    if (isEntirelyFormatted(block, tag)) continue;
    const wrapper = document.createElement(tag);
    while (block.firstChild) wrapper.appendChild(block.firstChild);
    block.appendChild(wrapper);
  }
}

function unwrapAllTag(root: HTMLElement, tag: InlineTag): void {
  const aliases =
    tag === "b" ? "b,strong" :
    tag === "i" ? "i,em" :
    tag === "s" ? "s,strike" :
    "u";
  root.querySelectorAll(aliases).forEach((el) => unwrapElement(el as HTMLElement));
}

function toggleInlineFormat(root: HTMLElement, tag: InlineTag): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const coversAll = range.collapsed
    ? false
    : selectionCoversAllText(root, range);

  // Full-cover (or empty caret in already-all-bold field): toggle whole editor.
  if (coversAll || (range.collapsed && isEntirelyFormatted(root, tag))) {
    if (isEntirelyFormatted(root, tag)) unwrapAllTag(root, tag);
    else wrapAllTextInTag(root, tag);
    return;
  }

  if (range.collapsed) return;

  // Partial selection: if already inside same tag, unwrap nearest; else wrap.
  const startTag = closestFormatTag(range.startContainer, root, tag);
  const endTag = closestFormatTag(range.endContainer, root, tag);
  if (startTag && startTag === endTag) {
    unwrapElement(startTag);
    return;
  }

  // Prefer semantic tags over CSS spans from the browser.
  try {
    document.execCommand("styleWithCSS", false, "false");
  } catch {
    /* ignore */
  }
  wrapRangeWithTag(range, tag);
}

function applyAlign(cmd: AlignCmd): void {
  try {
    document.execCommand("styleWithCSS", false, "false");
  } catch {
    /* ignore */
  }
  document.execCommand(cmd, false);
}

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

  const applyInline = (cmd: keyof typeof INLINE_BY_CMD) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const saved = saveSelection(el);
    el.focus();
    restoreSelection(saved);
    toggleInlineFormat(el, INLINE_BY_CMD[cmd]);
    // Normalize browser markup → semantic tags, then persist.
    emit({ rewriteDom: true });
  };

  const applyAlignCmd = (cmd: AlignCmd) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const saved = saveSelection(el);
    el.focus();
    restoreSelection(saved);
    applyAlign(cmd);
    emit({ rewriteDom: true });
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
