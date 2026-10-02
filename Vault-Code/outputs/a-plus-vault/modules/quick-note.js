import { esc, escA } from "./utils.js";

/**
 * Floating sticky note: what am I looking for, for which job, plus free notes.
 * Lives outside the app render tree so it survives re-renders; saved per user in localStorage.
 */
const KEY_PREFIX = "aplus-vault-quick-note";
const OPEN_KEY = "aplus-vault-quick-note-open";

function key(userId) {
  return `${KEY_PREFIX}:${userId || "guest"}`;
}

export function readQuickNote(userId) {
  try {
    const v = JSON.parse(localStorage.getItem(key(userId)) || "null");
    return v && typeof v === "object" ? { lookingFor: String(v.lookingFor || ""), forWhat: String(v.forWhat || ""), notes: String(v.notes || ""), updatedAt: Number(v.updatedAt) || 0 } : { lookingFor: "", forWhat: "", notes: "", updatedAt: 0 };
  } catch (e) {
    return { lookingFor: "", forWhat: "", notes: "", updatedAt: 0 };
  }
}

export function writeQuickNote(userId, note) {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ ...note, updatedAt: Date.now() }));
  } catch (e) {}
}

export function clearQuickNote(userId) {
  try {
    localStorage.removeItem(key(userId));
  } catch (e) {}
}

export function quickNoteOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function setQuickNoteOpen(open) {
  try {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  } catch (e) {}
}

export function quickNoteHasContent(note) {
  return !!(note.lookingFor.trim() || note.forWhat.trim() || note.notes.trim());
}

const PEN = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M4 20h4l10-10-4-4L4 16z'/><path d='m13.5 6.5 4 4'/></svg>";

export function quickNoteMarkup(note, open, savedLabel) {
  const has = quickNoteHasContent(note);
  return `<div class='quick-note${open ? " is-open" : ""}' data-quick-note>
  <button type='button' class='quick-note-fab${has ? " has-content" : ""}' data-quick-note-toggle aria-expanded='${open}' aria-controls='quick-note-panel' title='Quick note'>${PEN}<span class='sr-only'>Quick note</span></button>
  <section class='quick-note-paper' id='quick-note-panel' role='dialog' aria-label='Quick note'${open ? "" : " hidden"}>
    <header><strong>Quick note</strong><span class='quick-note-saved' data-quick-note-saved>${esc(savedLabel || "")}</span><button type='button' class='quick-note-min' data-quick-note-toggle aria-label='Minimize note'>&minus;</button></header>
    <label><span>Looking for</span><input data-quick-note-field='lookingFor' value='${escA(note.lookingFor)}' maxlength='120' placeholder='e.g. warm minimal packaging, kraft paper'></label>
    <label><span>For</span><input data-quick-note-field='forWhat' value='${escA(note.forWhat)}' maxlength='120' placeholder='Which job, client, or idea?'></label>
    <label class='quick-note-free'><span>Notes</span><textarea data-quick-note-field='notes' maxlength='2000' placeholder='Anything else to remember…'>${esc(note.notes)}</textarea></label>
    <footer><button type='button' data-quick-note-search title='Search Discover for what you are looking for'>Search this</button><button type='button' data-quick-note-keep title='Save this note into My Vault'>Keep note</button><button type='button' class='quick-note-clear' data-quick-note-clear>Clear</button></footer>
  </section>
</div>`;
}
