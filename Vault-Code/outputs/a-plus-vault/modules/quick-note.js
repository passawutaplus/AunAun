import { esc, escA } from "./utils.js";

/**
 * Floating note for inspiration hunting: several notes (one per brief), each with
 * "looking for / for / notes" and pinned Vault references. Lives outside the app render
 * tree so it survives re-renders; saved per user in localStorage (local to this browser).
 */
const KEY_PREFIX = "aplus-vault-quick-note";
const OPEN_KEY = "aplus-vault-quick-note-open";
const MAX_NOTES = 12;
const MAX_PINS = 40;

function key(userId) {
  return `${KEY_PREFIX}:${userId || "guest"}`;
}

function blank(id) {
  return { id: id || `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, lookingFor: "", forWhat: "", notes: "", pins: [], updatedAt: 0 };
}

function cleanNote(v) {
  const n = blank(v && v.id);
  if (!v || typeof v !== "object") return n;
  n.lookingFor = String(v.lookingFor || "");
  n.forWhat = String(v.forWhat || "");
  n.notes = String(v.notes || "");
  n.pins = Array.isArray(v.pins) ? [...new Set(v.pins.map(String))].slice(0, MAX_PINS) : [];
  n.updatedAt = Number(v.updatedAt) || 0;
  return n;
}

/** { notes: [...], activeId } — migrates the old single-note format on first read. */
export function readNoteStore(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) || "null");
    if (raw && Array.isArray(raw.notes) && raw.notes.length) {
      const notes = raw.notes.slice(0, MAX_NOTES).map(cleanNote);
      return { notes, activeId: notes.some(n => n.id === raw.activeId) ? raw.activeId : notes[0].id };
    }
    if (raw && typeof raw === "object") {
      const n = cleanNote(raw);
      return { notes: [n], activeId: n.id };
    }
  } catch (e) {}
  const n = blank();
  return { notes: [n], activeId: n.id };
}

export function writeNoteStore(userId, store) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(store));
  } catch (e) {}
}

export function activeNote(store) {
  return store.notes.find(n => n.id === store.activeId) || store.notes[0];
}

export function readQuickNote(userId) {
  return activeNote(readNoteStore(userId));
}

export function writeQuickNote(userId, fields) {
  const store = readNoteStore(userId);
  const n = activeNote(store);
  n.lookingFor = String(fields.lookingFor || "");
  n.forWhat = String(fields.forWhat || "");
  n.notes = String(fields.notes || "");
  n.updatedAt = Date.now();
  writeNoteStore(userId, store);
}

/** Clears the text of the active note and its pins (the note itself stays). */
export function clearQuickNote(userId) {
  const store = readNoteStore(userId);
  const n = activeNote(store);
  Object.assign(n, { lookingFor: "", forWhat: "", notes: "", pins: [], updatedAt: 0 });
  writeNoteStore(userId, store);
}

export function addNote(userId) {
  const store = readNoteStore(userId);
  if (store.notes.length >= MAX_NOTES) return { store, added: false };
  const n = blank();
  store.notes.push(n);
  store.activeId = n.id;
  writeNoteStore(userId, store);
  return { store, added: true };
}

export function setActiveNote(userId, noteId) {
  const store = readNoteStore(userId);
  if (store.notes.some(n => n.id === noteId)) store.activeId = noteId;
  writeNoteStore(userId, store);
  return store;
}

export function removeActiveNote(userId) {
  const store = readNoteStore(userId);
  if (store.notes.length <= 1) {
    clearQuickNote(userId);
    return readNoteStore(userId);
  }
  store.notes = store.notes.filter(n => n.id !== store.activeId);
  store.activeId = store.notes[0].id;
  writeNoteStore(userId, store);
  return store;
}

export function pinToActiveNote(userId, itemId) {
  const store = readNoteStore(userId);
  const n = activeNote(store);
  const id = String(itemId);
  if (n.pins.includes(id)) return { store, added: false };
  n.pins = [id, ...n.pins].slice(0, MAX_PINS);
  n.updatedAt = Date.now();
  writeNoteStore(userId, store);
  return { store, added: true };
}

export function unpinFromActiveNote(userId, itemId) {
  const store = readNoteStore(userId);
  const n = activeNote(store);
  n.pins = n.pins.filter(p => p !== String(itemId));
  writeNoteStore(userId, store);
  return store;
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
  return !!(note.lookingFor.trim() || note.forWhat.trim() || note.notes.trim() || (note.pins && note.pins.length));
}

export function noteLabel(note, index) {
  return (note.lookingFor || note.forWhat || note.notes || "").trim().slice(0, 18) || `Note ${index + 1}`;
}

const PEN = "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M4 20h4l10-10-4-4L4 16z'/><path d='m13 7 4 4'/></svg>";

/** thumbs: [{ id, src }] for the pinned items that still exist in the Vault. */
export function quickNoteMarkup(store, open, savedLabel, thumbs) {
  const note = activeNote(store);
  const has = quickNoteHasContent(note);
  const tabs = store.notes
    .map((n, i) => `<button type='button' class='qn-tab${n.id === note.id ? " is-active" : ""}' data-quick-note-tab='${escA(n.id)}' title='${escA(noteLabel(n, i))}'>${esc(noteLabel(n, i))}</button>`)
    .join("");
  const pins = (thumbs || [])
    .map(t => `<span class='qn-pin'><img src='${escA(t.src)}' alt='' loading='lazy'><button type='button' data-quick-note-unpin='${escA(t.id)}' aria-label='Remove from note'>&times;</button></span>`)
    .join("");
  return `<div class='quick-note${open ? " is-open" : ""}' data-quick-note>
  <button type='button' class='quick-note-fab${has ? " has-content" : ""}' data-quick-note-toggle aria-expanded='${open}' aria-controls='quick-note-panel' title='Quick note'>${PEN}<span class='sr-only'>Quick note</span></button>
  <section class='quick-note-paper' id='quick-note-panel' role='dialog' aria-label='Quick note'${open ? "" : " hidden"}>
    <header><strong>Quick note</strong><span class='quick-note-saved' data-quick-note-saved>${esc(savedLabel || "")}</span><button type='button' class='quick-note-min' data-quick-note-toggle aria-label='Minimize note'>&minus;</button></header>
    <div class='qn-tabs' role='tablist'>${tabs}<button type='button' class='qn-tab qn-add' data-quick-note-new title='New note' aria-label='New note'>+</button></div>
    <label><span>Looking for</span><input data-quick-note-field='lookingFor' value='${escA(note.lookingFor)}' maxlength='120' placeholder='e.g. warm minimal packaging, kraft paper'></label>
    <label><span>For</span><input data-quick-note-field='forWhat' value='${escA(note.forWhat)}' maxlength='120' placeholder='Which job, client, or idea?'></label>
    <label class='quick-note-free'><span>Notes</span><textarea data-quick-note-field='notes' maxlength='2000' placeholder='Anything else to remember…'>${esc(note.notes)}</textarea></label>
    <div class='qn-pins' data-quick-note-pins${pins ? "" : " hidden"}>${pins}</div>
    <p class='qn-hint'${note.pins.length ? " hidden" : ""}>While this note is open, anything you keep from Discover is pinned here.</p>
    <footer><button type='button' data-quick-note-search title='Search Discover for what you are looking for'>Search this</button><button type='button' data-quick-note-board title='Make a moodboard from the pinned references'>Make moodboard</button><button type='button' data-quick-note-keep title='Save this note into My Vault'>Keep note</button></footer>
    <footer class='qn-foot2'><button type='button' class='quick-note-clear' data-quick-note-clear>Clear</button><button type='button' class='quick-note-clear' data-quick-note-delete>Delete note</button></footer>
  </section>
</div>`;
}
