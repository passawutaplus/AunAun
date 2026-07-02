const COMMENT_INPUT_ID = "community-comment-input";
const COMMENTS_ANCHOR_ID = "comments";

/** Mobile / tablet — open keyboard after jumping to comments. */
export function shouldFocusCommentInput(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1024px)").matches;
}

export function focusCommunityCommentInput(): void {
  const input = document.getElementById(COMMENT_INPUT_ID) as HTMLTextAreaElement | null;
  if (!input) return;
  input.focus({ preventScroll: true });
  try {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  } catch {
    /* ignore */
  }
}

export function scrollToPostComments(options?: { focusInput?: boolean }): void {
  if (typeof document === "undefined") return;
  const focusInput = options?.focusInput ?? shouldFocusCommentInput();
  const anchor = document.getElementById(COMMENTS_ANCHOR_ID);
  anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (focusInput) {
    window.setTimeout(() => focusCommunityCommentInput(), 450);
  }
}

export const communityCommentInputId = COMMENT_INPUT_ID;
