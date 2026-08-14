const storageKey = (userId: string) => `aplus1:hide-read-receipts:${userId}`;

export function loadHideReadReceipts(userId: string | null | undefined): boolean {
  if (!userId || typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(userId)) === "1";
}

export function saveHideReadReceipts(userId: string, hide: boolean): void {
  if (typeof window === "undefined") return;
  if (hide) window.localStorage.setItem(storageKey(userId), "1");
  else window.localStorage.removeItem(storageKey(userId));
  window.dispatchEvent(new CustomEvent("aplus1:chat-read-receipts", { detail: { userId } }));
}
