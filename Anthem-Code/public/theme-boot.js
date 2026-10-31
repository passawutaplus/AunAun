/*
 * Runs before first paint (sync <script> in <head>; external because the CSP forbids inline scripts).
 * Applies the saved theme so the boot screen and the app never flash the wrong background.
 * Keep the storage key in step with src/lib/brandConfig.ts.
 */
(function () {
  try {
    var stored = localStorage.getItem("an1hem-theme");
    var theme = stored || "system";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  } catch (_) {}
})();
