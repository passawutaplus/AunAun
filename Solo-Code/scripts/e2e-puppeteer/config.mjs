import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const baseURL = (process.env.E2E_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");

export function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    join(homedir(), ".cache/puppeteer/chrome/linux-149.0.7827.115/chrome-linux64/chrome"),
    join(homedir(), ".cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome"),
    join(homedir(), ".cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    // WSL — Windows Chrome (อาจใช้ไม่ได้กับ puppeteer-core บน Linux Node)
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export function getAccount(role) {
  const map = {
    user: ["E2E_USER_EMAIL", "E2E_USER_PASSWORD"],
    admin: ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"],
  };
  const [emailKey, passKey] = map[role] ?? [];
  const email = process.env[emailKey];
  const password = process.env[passKey];
  if (!email || !password) {
    throw new Error(
      `Missing ${emailKey}/${passKey} — set in .env.local (see docs/test-accounts.md)`,
    );
  }
  return { email, password };
}
