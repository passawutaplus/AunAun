/** Pinned Twemoji (jdecked) — SVG via jsDelivr, not the full git clone. */
export const TWEMOJI_VERSION = "16.0.1";
export const TWEMOJI_CREDIT_URL = "https://github.com/jdecked/twemoji";

const TWEMOJI_SVG = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@v${TWEMOJI_VERSION}/assets/svg`;

/** Common comment reactions — keep the picker small. */
export const COMMENT_PICKER_EMOJIS = [
  "😀",
  "😂",
  "🥹",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😮",
  "😢",
  "😭",
  "👍",
  "👎",
  "👏",
  "🙏",
  "🔥",
  "❤️",
  "🧡",
  "🎉",
  "✨",
  "💯",
  "🤝",
  "👀",
  "💪",
  "✅",
] as const;

/**
 * Twemoji asset names drop U+FE0F (emoji presentation) for most glyphs.
 * Keep ZWJ and skin-tone modifiers.
 */
export function twemojiCode(emoji: string): string {
  const codes: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp == null || cp === 0xfe0f) continue;
    codes.push(cp.toString(16));
  }
  return codes.join("-");
}

export function twemojiSvgUrl(emoji: string): string {
  return `${TWEMOJI_SVG}/${twemojiCode(emoji)}.svg`;
}

/** Pictographs + ZWJ sequences + flags. Keyboard-pasted emoji still render. */
export const COMMENT_EMOJI_RE =
  /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)/gu;

export function splitCommentEmojiParts(text: string): string[] {
  return text.split(new RegExp(`(${COMMENT_EMOJI_RE.source})`, "gu"));
}

export function isCommentEmojiToken(part: string): boolean {
  if (!part) return false;
  const re = new RegExp(`^${COMMENT_EMOJI_RE.source}$`, "u");
  return re.test(part);
}

export function insertTextAt(text: string, insert: string, start: number, end = start): string {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  return `${text.slice(0, a)}${insert}${text.slice(b)}`;
}

export function insertEmojiAtSelection(
  text: string,
  emoji: string,
  el: HTMLTextAreaElement | null,
  maxLen = 800,
): { text: string; caret: number } | null {
  const start = el?.selectionStart ?? text.length;
  const end = el?.selectionEnd ?? start;
  if (text.length - (end - start) + emoji.length > maxLen) return null;
  return { text: insertTextAt(text, emoji, start, end), caret: start + emoji.length };
}

export function restoreTextareaCaret(el: HTMLTextAreaElement | null, caret: number) {
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}
