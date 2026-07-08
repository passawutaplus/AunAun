/**
 * Debounced moodboard autosave with visible status transitions.
 * Does not persist on every pointer frame — callers should flush on drag end.
 */

export function createMoodboardAutosave(options) {
  const {
    debounceMs = 700,
    saveLocal,
    saveRemote,
    onStatus
  } = options || {};
  let timer = null;
  let status = "idle";
  let pendingBoard = null;
  let generation = 0;

  function setStatus(next) {
    status = next;
    if (typeof onStatus === "function") onStatus(next);
  }

  function queue(board) {
    pendingBoard = board;
    setStatus("queued");
    clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  }

  async function flush() {
    clearTimeout(timer);
    timer = null;
    if (!pendingBoard) {
      setStatus("saved");
      return { ok: true };
    }
    const board = pendingBoard;
    pendingBoard = null;
    const gen = ++generation;
    setStatus("saving");
    try {
      if (typeof saveLocal === "function") saveLocal(board);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        pendingBoard = board;
        return { ok: false, offline: true };
      }
      if (typeof saveRemote === "function") await saveRemote(board);
      if (gen !== generation) return { ok: true, stale: true };
      setStatus("saved");
      return { ok: true };
    } catch (err) {
      if (gen !== generation) return { ok: false, stale: true };
      pendingBoard = board;
      setStatus("error");
      return { ok: false, error: err };
    }
  }

  function retry() {
    if (pendingBoard) queue(pendingBoard);
    else setStatus("idle");
  }

  function getStatus() {
    return status;
  }

  function destroy() {
    clearTimeout(timer);
  }

  return { queue, flush, retry, getStatus, destroy, setStatus };
}

export function saveStatusLabel(status) {
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "offline":
      return "Offline";
    case "queued":
      return "Changes queued";
    case "error":
      return "Save failed";
    case "conflict":
      return "Conflict — reload";
    default:
      return "";
  }
}
