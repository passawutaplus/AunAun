const NOTE_PREFIX = "aplus1.inspire.item.note.";
const MAX_NOTE_LEN = 2000;

export function readInspireNote(itemId: string): string {
  try {
    return localStorage.getItem(`${NOTE_PREFIX}${itemId}`) ?? "";
  } catch {
    return "";
  }
}

export function writeInspireNote(itemId: string, note: string): void {
  try {
    const trimmed = note.slice(0, MAX_NOTE_LEN);
    if (!trimmed.trim()) {
      localStorage.removeItem(`${NOTE_PREFIX}${itemId}`);
      return;
    }
    localStorage.setItem(`${NOTE_PREFIX}${itemId}`, trimmed);
  } catch {
    /* ignore */
  }
}
