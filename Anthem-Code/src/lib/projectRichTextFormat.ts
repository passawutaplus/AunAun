import {
  resolveWhitelistedFontSize,
  resolveWhitelistedFontStack,
} from "@/lib/projectTextFonts";

export type InlineTag = "b" | "i" | "u" | "s";
export type AlignCmd = "justifyLeft" | "justifyCenter" | "justifyRight";
export type InlineCmd = "bold" | "italic" | "underline" | "strikeThrough";

export const INLINE_BY_CMD: Record<InlineCmd, InlineTag> = {
  bold: "b",
  italic: "i",
  underline: "u",
  strikeThrough: "s",
};

export function saveSelection(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

export function restoreSelection(range: Range | null) {
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function normalizeText(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, "").trim();
}

export function selectionCoversAllText(root: HTMLElement, range: Range): boolean {
  const selected = normalizeText(range.toString());
  const all = normalizeText(root.textContent ?? "");
  if (!!selected && !!all && selected === all) return true;

  // Ctrl+A / select-nodeContents: compare against a full-contents range.
  try {
    const full = document.createRange();
    full.selectNodeContents(root);
    const fullText = normalizeText(full.toString());
    return !!selected && !!fullText && selected === fullText;
  } catch {
    return false;
  }
}

function closestFormatTag(node: Node | null, root: HTMLElement, tag: InlineTag): HTMLElement | null {
  let cur: Node | null = node;
  const upper = tag.toUpperCase();
  const aliases =
    tag === "b"
      ? new Set(["B", "STRONG"])
      : tag === "i"
        ? new Set(["I", "EM"])
        : tag === "s"
          ? new Set(["S", "STRIKE"])
          : new Set(["U"]);

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
export function isEntirelyFormatted(root: HTMLElement, tag: InlineTag): boolean {
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
    tag === "b" ? "b,strong" : tag === "i" ? "i,em" : tag === "s" ? "s,strike" : "u";
  root.querySelectorAll(aliases).forEach((el) => unwrapElement(el as HTMLElement));
}

/**
 * Toggle bold/italic/underline/strike.
 * Select-all uses DOM wrap/unwrap (execCommand often fails when the whole field is selected).
 */
export function toggleInlineFormat(root: HTMLElement, tag: InlineTag): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const coversAll = range.collapsed ? false : selectionCoversAllText(root, range);

  if (coversAll || (range.collapsed && isEntirelyFormatted(root, tag))) {
    if (isEntirelyFormatted(root, tag)) unwrapAllTag(root, tag);
    else wrapAllTextInTag(root, tag);
    return;
  }

  if (range.collapsed) return;

  const startTag = closestFormatTag(range.startContainer, root, tag);
  const endTag = closestFormatTag(range.endContainer, root, tag);
  if (startTag && startTag === endTag) {
    unwrapElement(startTag);
    return;
  }

  try {
    document.execCommand("styleWithCSS", false, "false");
  } catch {
    /* ignore */
  }
  wrapRangeWithTag(range, tag);
}

export function applyAlign(cmd: AlignCmd): void {
  try {
    document.execCommand("styleWithCSS", false, "false");
  } catch {
    /* ignore */
  }
  document.execCommand(cmd, false);
}

function wrapRangeWithFont(range: Range, stack: string): void {
  const span = document.createElement("span");
  span.style.fontFamily = stack;
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
}

function applyFontToAll(root: HTMLElement, stack: string | null): void {
  // Strip existing font spans first so re-applying replaces cleanly.
  root.querySelectorAll("span[style]").forEach((node) => {
    const el = node as HTMLElement;
    if (!el.style.fontFamily) return;
    el.style.removeProperty("font-family");
    if (!el.getAttribute("style")?.trim()) {
      unwrapElement(el);
    }
  });

  if (!stack) return;

  const blocks = Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && (el.tagName === "P" || el.tagName === "DIV"),
  );

  if (blocks.length === 0) {
    if (!normalizeText(root.textContent ?? "")) return;
    const span = document.createElement("span");
    span.style.fontFamily = stack;
    while (root.firstChild) span.appendChild(root.firstChild);
    root.appendChild(span);
    return;
  }

  for (const block of blocks) {
    if (!normalizeText(block.textContent ?? "")) continue;
    const span = document.createElement("span");
    span.style.fontFamily = stack;
    while (block.firstChild) span.appendChild(block.firstChild);
    block.appendChild(span);
  }
}

/** Apply a whitelisted font stack to the current selection (or whole field on select-all). */
export function applyFontFamily(root: HTMLElement, stackOrInherit: string): void {
  const resolved =
    !stackOrInherit || stackOrInherit === "inherit"
      ? null
      : resolveWhitelistedFontStack(stackOrInherit);

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    applyFontToAll(root, resolved);
    return;
  }
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    applyFontToAll(root, resolved);
    return;
  }

  const coversAll = range.collapsed || selectionCoversAllText(root, range);
  if (coversAll) {
    applyFontToAll(root, resolved);
    return;
  }

  if (!resolved) {
    // Reset font on partial selection: unwrap nearest font span if possible.
    let cur: Node | null = range.commonAncestorContainer;
    while (cur && cur !== root) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        const el = cur as HTMLElement;
        if (el.tagName === "SPAN" && el.style.fontFamily) {
          el.style.removeProperty("font-family");
          if (!el.getAttribute("style")?.trim()) unwrapElement(el);
          return;
        }
      }
      cur = cur.parentNode;
    }
    return;
  }

  wrapRangeWithFont(range, resolved);
}

function wrapRangeWithFontSize(range: Range, size: string): void {
  const span = document.createElement("span");
  span.style.fontSize = size;
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
}

function applyFontSizeToAll(root: HTMLElement, size: string | null): void {
  root.querySelectorAll("span[style]").forEach((node) => {
    const el = node as HTMLElement;
    if (!el.style.fontSize) return;
    el.style.removeProperty("font-size");
    if (!el.getAttribute("style")?.trim()) {
      unwrapElement(el);
    }
  });

  if (!size) return;

  const blocks = Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && (el.tagName === "P" || el.tagName === "DIV"),
  );

  if (blocks.length === 0) {
    if (!normalizeText(root.textContent ?? "")) return;
    const span = document.createElement("span");
    span.style.fontSize = size;
    while (root.firstChild) span.appendChild(root.firstChild);
    root.appendChild(span);
    return;
  }

  for (const block of blocks) {
    if (!normalizeText(block.textContent ?? "")) continue;
    const span = document.createElement("span");
    span.style.fontSize = size;
    while (block.firstChild) span.appendChild(block.firstChild);
    block.appendChild(span);
  }
}

/** Apply a whitelisted font-size to the current selection (or whole field on select-all). */
export function applyFontSize(root: HTMLElement, sizeOrEmpty: string): void {
  const resolved = !sizeOrEmpty ? null : resolveWhitelistedFontSize(sizeOrEmpty);

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    applyFontSizeToAll(root, resolved);
    return;
  }
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    applyFontSizeToAll(root, resolved);
    return;
  }

  const coversAll = range.collapsed || selectionCoversAllText(root, range);
  if (coversAll) {
    applyFontSizeToAll(root, resolved);
    return;
  }

  if (!resolved) {
    let cur: Node | null = range.commonAncestorContainer;
    while (cur && cur !== root) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        const el = cur as HTMLElement;
        if (el.tagName === "SPAN" && el.style.fontSize) {
          el.style.removeProperty("font-size");
          if (!el.getAttribute("style")?.trim()) unwrapElement(el);
          return;
        }
      }
      cur = cur.parentNode;
    }
    return;
  }

  wrapRangeWithFontSize(range, resolved);
}
