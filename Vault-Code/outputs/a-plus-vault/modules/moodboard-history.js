/** Bounded undo/redo for moodboard editor (max 50 meaningful ops). */

export function createMoodboardHistory(limit = 50) {
  let past = [];
  let future = [];
  let merging = null;

  function push(entry) {
    if (!entry || !entry.after) return;
    if (merging && merging.type === entry.type && merging.mergeKey && merging.mergeKey === entry.mergeKey) {
      merging.after = entry.after;
      return;
    }
    past.push(entry);
    if (past.length > limit) past.shift();
    future = [];
    merging = entry.mergeKey ? entry : null;
  }

  function endMerge() {
    merging = null;
  }

  function undo(apply) {
    endMerge();
    const entry = past.pop();
    if (!entry) return null;
    future.push(entry);
    if (typeof apply === "function") apply(entry.before);
    return entry.before;
  }

  function redo(apply) {
    endMerge();
    const entry = future.pop();
    if (!entry) return null;
    past.push(entry);
    if (typeof apply === "function") apply(entry.after);
    return entry.after;
  }

  function canUndo() {
    return past.length > 0;
  }
  function canRedo() {
    return future.length > 0;
  }
  function clear() {
    past = [];
    future = [];
    merging = null;
  }

  return { push, endMerge, undo, redo, canUndo, canRedo, clear };
}

export function snapshotBoard(board) {
  return JSON.parse(JSON.stringify(board));
}
