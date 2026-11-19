/**
 * Push notifications inside the SAMECOR iOS app. WKWebView has no Web Push, so the app uses Apple's
 * APNs through @capacitor/push-notifications (Anthem-Code/capacitor-shell). The Capacitor bridge puts
 * the plugin on this page as window.Capacitor.Plugins.PushNotifications.
 *
 * The device token is saved with save_apns_token (migration 20261118120000_ios_push_tokens.sql) and
 * send-push delivers every in-app notification to it. pushNotifications.ts calls these on iOS.
 */
import { supabase } from "@/integrations/supabase/client";
import { isIosApp } from "@/lib/appShell";

export type NativePushState = "unsupported" | "denied" | "off" | "on";

type PermissionState =
  | "prompt"
  | "prompt-with-rationale"
  | "granted"
  | "denied";
type ListenerHandle = { remove: () => Promise<void> };
type NotificationAction = { notification?: { data?: Record<string, unknown> } };

// The remote-page bridge returns the handle itself from addListener, not a Promise (Sentry
// JAVASCRIPT-REACT-D: ".catch is not a function" on iOS), so treat the result as either.
type MaybeHandle = ListenerHandle | Promise<ListenerHandle>;
type PushNotificationsPlugin = {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  register(): Promise<void>;
  addListener(
    event: "registration",
    cb: (token: { value: string }) => void,
  ): MaybeHandle;
  addListener(
    event: "registrationError",
    cb: (err: { error?: string }) => void,
  ): MaybeHandle;
  addListener(
    event: "pushNotificationActionPerformed",
    cb: (action: NotificationAction) => void,
  ): MaybeHandle;
};

/** Runs addListener and always hands back a Promise, whether the bridge returns a handle, a Promise or throws. */
function listen(add: () => MaybeHandle): Promise<ListenerHandle | null> {
  return new Promise<MaybeHandle>((resolve) => resolve(add())).then(
    (handle) => handle,
    () => null,
  );
}

/** The token this device last saved for the signed-in user; cleared when push is turned off or on sign-out. */
const TOKEN_KEY = "samecor:apns-token";
const REGISTER_TIMEOUT_MS = 20_000;

function plugin(): PushNotificationsPlugin | null {
  if (typeof window === "undefined" || !isIosApp()) return null;
  const cap = (
    window as Window & { Capacitor?: { Plugins?: Record<string, unknown> } }
  ).Capacitor;
  return (
    (cap?.Plugins?.PushNotifications as PushNotificationsPlugin | undefined) ??
    null
  );
}

/** True inside an iOS app build that ships the push plugin. */
export function hasNativePush(): boolean {
  return plugin() !== null;
}

function storedToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the switch shows off next time */
  }
}

/** Asks iOS for the APNs device token and waits for the answer. */
function requestToken(push: PushNotificationsPlugin): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const handles: Promise<ListenerHandle | null>[] = [];
    let settled = false;
    let timer = 0;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      handles.forEach(
        (h) => void h.then((handle) => handle?.remove()).catch(() => undefined),
      );
      settle();
    };
    timer = window.setTimeout(
      () => finish(() => reject(new Error("APNS_TIMEOUT"))),
      REGISTER_TIMEOUT_MS,
    );
    handles.push(
      listen(() =>
        push.addListener("registration", (token) =>
          finish(() => resolve(token.value)),
        ),
      ),
    );
    handles.push(
      listen(() =>
        push.addListener("registrationError", (err) =>
          finish(() =>
            reject(new Error(err.error || "APNS_REGISTRATION_FAILED")),
          ),
        ),
      ),
    );
    push.register().catch((err: unknown) => finish(() => reject(err)));
  });
}

async function saveToken(token: string): Promise<void> {
  const { error } = await supabase.rpc(
    "save_apns_token" as never,
    { _token: token, _user_agent: navigator.userAgent } as never,
  );
  if (error) throw error;
}

async function removeToken(token: string): Promise<void> {
  await supabase.rpc(
    "remove_push_subscription" as never,
    { _endpoint: `apns:${token.toLowerCase()}` } as never,
  );
}

export async function getNativePushState(): Promise<NativePushState> {
  const push = plugin();
  if (!push) return "unsupported";
  const { receive } = await push.checkPermissions();
  if (receive === "denied") return "denied";
  return receive === "granted" && storedToken() ? "on" : "off";
}

/** Call from a click handler: shows the iOS permission prompt the first time. */
export async function enableNativePush(): Promise<NativePushState> {
  const push = plugin();
  if (!push) return "unsupported";
  let { receive } = await push.checkPermissions();
  if (receive !== "granted")
    receive = (await push.requestPermissions()).receive;
  if (receive !== "granted") return receive === "denied" ? "denied" : "off";

  const token = await requestToken(push);
  await saveToken(token);
  storeToken(token);
  return "on";
}

export async function disableNativePush(): Promise<NativePushState> {
  const push = plugin();
  if (!push) return "unsupported";
  const token = storedToken();
  storeToken(null);
  if (token) await removeToken(token);
  return "off";
}

/** Same-site links open inside the app's router; anything else is left to the shell (Safari). */
function openNotificationUrl(raw: unknown): void {
  if (typeof raw !== "string" || !raw) return;
  let target: URL;
  try {
    target = new URL(raw, window.location.origin);
  } catch {
    return;
  }
  if (target.origin !== window.location.origin) {
    window.location.assign(target.toString());
    return;
  }
  const path = `${target.pathname}${target.search}${target.hash}`;
  window.history.pushState(null, "", path);
  // BrowserRouter listens to popstate, so this moves the app without a reload.
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Tokens can change after an iOS update or restore; keep the saved one current while push is on. */
async function refreshToken(push: PushNotificationsPlugin): Promise<void> {
  const previous = storedToken();
  if (!previous) return;
  const { receive } = await push.checkPermissions();
  if (receive !== "granted") {
    // Turned off in iOS Settings: stop sending to this device.
    await disableNativePush();
    return;
  }
  const token = await requestToken(push);
  await saveToken(token);
  storeToken(token);
  if (previous !== token) await removeToken(previous);
}

/** Call once at startup. Does nothing outside the iOS app. */
export function installNativePush(): void {
  const push = plugin();
  if (!push) return;

  // Tapping a notification opens the page it is about (send-push puts it in data.url).
  void listen(() =>
    push.addListener("pushNotificationActionPerformed", (action) =>
      openNotificationUrl(action.notification?.data?.url),
    ),
  );

  supabase.auth.onAuthStateChange((event, session) => {
    if (!session || (event !== "INITIAL_SESSION" && event !== "SIGNED_IN"))
      return;
    // Supabase must not be called from inside its own auth callback; run it on the next tick.
    window.setTimeout(() => void refreshToken(push).catch(() => undefined), 0);
  });
}
