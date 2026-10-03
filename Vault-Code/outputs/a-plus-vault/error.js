/* Error pages: [data-reload] reloads, [data-back] goes back (falls back to the link's own href). */
document.addEventListener("click", e => {
  const el = e.target && e.target.closest ? e.target.closest("[data-reload],[data-back]") : null;
  if (!el) return;
  if (el.hasAttribute("data-reload")) { e.preventDefault(); location.reload(); return; }
  if (history.length > 1 && document.referrer) { e.preventDefault(); history.back(); }
});
