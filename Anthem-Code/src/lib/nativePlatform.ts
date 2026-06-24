type CapacitorBridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.Capacitor;
  if (!bridge) return false;
  if (bridge.isNativePlatform?.()) return true;
  const platform = bridge.getPlatform?.();
  return platform === "ios" || platform === "android";
}

export function assertExternalDigitalPurchaseAllowed(): void {
  if (isNativeShell()) {
    throw new Error("Purchases are not available in this app version.");
  }
}
