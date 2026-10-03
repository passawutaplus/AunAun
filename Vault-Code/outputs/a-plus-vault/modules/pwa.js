/* PWA glue: service worker registration + "Install app" prompt.
   Visibility of the install UI is driven by data attributes on <html> (see the A+ Vault app shell CSS block). */
const root = document.documentElement;
let deferredPrompt = null;

const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Local dev serves no-store files; only register there when asked, so edits are never masked by a cache.
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  let optIn = false;
  try { optIn = localStorage.getItem("aplus-vault-sw") === "1"; } catch (e) {}
  if (location.protocol !== "https:" && !(local && optIn)) return;
  addEventListener("load", () => { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}); }, { once: true });
}

export function initPwa({ toast } = {}) {
  if (isStandalone()) root.dataset.standalone = "1";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone()) root.dataset.iosInstall = "1";
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    root.dataset.canInstall = "1";
  });
  addEventListener("appinstalled", () => {
    deferredPrompt = null;
    delete root.dataset.canInstall;
    root.dataset.standalone = "1";
    if (toast) toast("A+ Vault installed.");
  });
  document.addEventListener("click", async e => {
    const button = e.target && e.target.closest ? e.target.closest("[data-install-app]") : null;
    if (!button || !deferredPrompt) return;
    e.preventDefault();
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    try { await prompt.userChoice; } catch (err) {}
    delete root.dataset.canInstall;
  });
  registerWorker();
}
