/**
 * Copy text to the clipboard, with a fallback for places where the async Clipboard API is
 * missing or refused (Android WebView app shell, LINE / Facebook in-app browsers, a page that
 * is not focused, plain-http previews). Rejects when every method fails, like writeText does.
 */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to the legacy path */
    }
  }
  if (!legacyCopy(text)) throw new Error("copy failed");
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  // Inside a modal the focus trap would pull focus back from an element outside it.
  const host = (document.activeElement?.closest('[role="dialog"]') as HTMLElement | null) ?? document.body;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  host.appendChild(area);
  const previous = document.activeElement as HTMLElement | null;
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus?.({ preventScroll: true });
  }
}
