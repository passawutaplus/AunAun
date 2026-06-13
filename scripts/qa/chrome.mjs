import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

export function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    join(homedir(), ".cache/puppeteer/chrome/linux-149.0.7827.115/chrome-linux64/chrome"),
    join(homedir(), ".cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome"),
    join(homedir(), ".cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function launchBrowser() {
  const executablePath = resolveChromePath();
  if (!executablePath) {
    throw new Error("No Chrome — run install-chrome-deps.sh or set PUPPETEER_EXECUTABLE_PATH");
  }
  return puppeteer.launch({
    executablePath,
    headless: process.env.E2E_HEADED !== "1",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}
