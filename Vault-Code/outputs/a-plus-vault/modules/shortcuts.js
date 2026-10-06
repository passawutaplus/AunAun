import { esc } from "./utils.js";

/** Single-key shortcuts. Ignored while typing or when a modifier is held (browser shortcuts win). */
export const SHORTCUTS = [
  { keys: ["/"], label: "Search", scope: "Everywhere" },
  { keys: ["N"], label: "Keep something new", scope: "Everywhere" },
  { keys: ["G", "D"], label: "Go to Museum", scope: "Everywhere" },
  { keys: ["G", "V"], label: "Go to My Vault", scope: "Everywhere" },
  { keys: ["G", "C"], label: "Go to Collections", scope: "Everywhere" },
  { keys: ["Space"], label: "Preview the selected reference", scope: "My Vault" },
  { keys: ["P"], label: "Pin / unpin the selected reference", scope: "My Vault" },
  { keys: ["C"], label: "Add the selected reference to a collection", scope: "My Vault" },
  { keys: ["←", "→"], label: "Previous / next image", scope: "Museum detail" },
  { keys: ["Esc"], label: "Close", scope: "Everywhere" },
  { keys: ["?"], label: "Show these shortcuts", scope: "Everywhere" },
];

export function isTypingTarget(target) {
  return !!(target && target.closest && target.closest("input,textarea,select,[contenteditable],[contenteditable='true']"));
}

export function shortcutsListMarkup() {
  return `<dl class='shortcut-list'>${SHORTCUTS.map(s => `<div><dt>${s.keys.map(k => `<kbd>${esc(k)}</kbd>`).join(s.keys.length === 2 && s.keys[0] === "G" ? " then " : " ")}</dt><dd>${esc(s.label)}<small>${esc(s.scope)}</small></dd></div>`).join("")}</dl>`;
}

export function shortcutsDialogMarkup() {
  return `<div class='shortcut-backdrop' data-shortcuts-close role='presentation'><section class='shortcut-dialog' role='dialog' aria-modal='true' aria-labelledby='shortcut-title'><header><h2 id='shortcut-title'>Keyboard shortcuts</h2><button type='button' class='shortcut-close' data-shortcuts-close aria-label='Close'>&times;</button></header>${shortcutsListMarkup()}</section></div>`;
}
