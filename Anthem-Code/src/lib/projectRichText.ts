/** Allowed inline/block tags for project text modules. */
const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "BR",
  "P",
  "DIV",
  "SPAN",
]);

const ALIGN_RE = /^(left|center|right|justify)$/i;

function normalizeAlign(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return ALIGN_RE.test(v) ? v : null;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (tag === "BR") return "<br>";

  if (!ALLOWED_TAGS.has(tag)) {
    return Array.from(el.childNodes).map(serializeNode).join("");
  }

  const align = normalizeAlign(el.style?.textAlign || el.getAttribute("align"));
  const kids = Array.from(el.childNodes).map(serializeNode).join("");

  if (tag === "SPAN") {
    if (align) return `<span style="text-align:${align}">${kids}</span>`;
    return kids;
  }

  const outTag =
    tag === "STRONG" ? "b" : tag === "EM" ? "i" : tag === "STRIKE" ? "s" : tag.toLowerCase();

  if ((outTag === "p" || outTag === "div") && align) {
    return `<${outTag} style="text-align:${align}">${kids}</${outTag}>`;
  }
  if (outTag === "p" || outTag === "div") {
    return `<${outTag}>${kids}</${outTag}>`;
  }
  return `<${outTag}>${kids}</${outTag}>`;
}

/** Strip to safe formatting subset used by project text modules. */
export function sanitizeProjectRichText(raw: string): string {
  const input = raw.trim();
  if (!input) return "";

  if (typeof DOMParser === "undefined") {
    return input.replace(/<[^>]*>/g, "");
  }

  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return escapeText(input);

  return Array.from(root.childNodes).map(serializeNode).join("").trim();
}

export function isProjectRichHtml(raw: string): boolean {
  return /<\/?(?:b|strong|i|em|u|s|strike|p|div|br|span)\b/i.test(raw);
}

export function projectRichTextPlainLength(raw: string): number {
  if (!raw) return 0;
  if (typeof document === "undefined") {
    return raw.replace(/<[^>]*>/g, "").length;
  }
  const el = document.createElement("div");
  el.innerHTML = sanitizeProjectRichText(raw);
  return (el.textContent ?? "").length;
}

/** Convert legacy plain text (with newlines) into safe HTML paragraphs. */
export function plainTextToProjectRichHtml(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => `<p>${escapeText(line) || "<br>"}</p>`)
    .join("");
}
