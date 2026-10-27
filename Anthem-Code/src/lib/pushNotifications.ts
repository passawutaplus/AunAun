/**
 * Phone / browser push notifications (Web Push). The service worker (public/sw.js) shows them;
 * the send-push edge function (Solo-Code/supabase/functions/send-push) sends one for every
 * in-app notification once this device is registered with save_push_subscription.
 */
import { supabase } from "@/integrations/supabase/client";
import { isAndroidApp, isStandaloneDisplay } from "@/lib/appShell";

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

const vapidPublicKey = () => (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!isSupported()) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!isSupported()) return "unsupported";
  if (!vapidPublicKey()) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Call from a click handler — the permission prompt needs a user gesture. */
export async function enablePush(): Promise<PushState> {
  if (!isSupported()) return "unsupported";
  const key = vapidPublicKey();
  if (!key) return "unconfigured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const reg = (await registration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));

  const json = sub.toJSON();
  const { error } = await supabase.rpc(
    "save_push_subscription" as never,
    {
      _endpoint: sub.endpoint,
      _p256dh: json.keys?.p256dh ?? "",
      _auth: json.keys?.auth ?? "",
      _shell: isAndroidApp() ? "android" : isStandaloneDisplay() ? "pwa" : "web",
      _user_agent: navigator.userAgent,
    } as never,
  );
  if (error) {
    await sub.unsubscribe().catch(() => undefined);
    throw error;
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc("remove_push_subscription" as never, { _endpoint: sub.endpoint } as never);
    await sub.unsubscribe().catch(() => undefined);
  }
  return isSupported() ? "off" : "unsupported";
}
