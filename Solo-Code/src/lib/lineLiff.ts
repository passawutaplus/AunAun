import { LINE_LIFF_ID } from "@/lib/lineConfig";

export type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type LiffSdk = {
  init: (opts: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
  isLoggedIn: () => boolean;
  login: (opts?: { redirectUri?: string }) => void;
  getProfile: () => Promise<LiffProfile>;
  getIDToken: () => string | null;
  logout: () => void;
};

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

export function liffConfigured(): boolean {
  return Boolean(LINE_LIFF_ID);
}

export function loadLiffSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.liff) {
      resolve();
      return;
    }
    const existing = document.getElementById("line-liff-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("โหลด LINE LIFF SDK ไม่สำเร็จ")));
      return;
    }
    const script = document.createElement("script");
    script.id = "line-liff-sdk";
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด LINE LIFF SDK ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

export async function initLiff(): Promise<LiffSdk> {
  if (!LINE_LIFF_ID) throw new Error("ยังไม่ได้ตั้งค่า VITE_LINE_LIFF_ID");
  await loadLiffSdk();
  if (!window.liff) throw new Error("LINE LIFF SDK ไม่พร้อม");
  await window.liff.init({ liffId: LINE_LIFF_ID });
  return window.liff;
}

export function isLineInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Line\//i.test(navigator.userAgent);
}
