/*
 * Runs before first paint (sync <script> in <head>, external because the CSP forbids inline scripts).
 * Inside the Capacitor Android shell (user-agent suffix "SamecorApp"), drop viewport-fit=cover so the
 * shell pads the WebView below the status bar and above the gesture bar instead of letting the
 * page draw under them. See src/lib/appShell.ts and capacitor-shell/.
 */
(function () {
  if (navigator.userAgent.indexOf("SamecorApp") === -1) return;
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  meta.setAttribute("content", meta.getAttribute("content").replace(/,?\s*viewport-fit=cover/, ""));
})();
