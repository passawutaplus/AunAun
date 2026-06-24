export function registerPwa(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[pwa] service worker registration failed", error);
    });
  });
}
