import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "capacitor.config.json",
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/offline.html",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-512.png",
  "public/icons/apple-touch-icon.png",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing mobile assets:\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync("capacitor.config.json", "utf8"));
if (!config.appId || !config.appName || config.webDir !== "dist") {
  console.error("capacitor.config.json is incomplete.");
  process.exit(1);
}

console.log("[mobile:doctor] Web/PWA assets and Capacitor configuration are ready.");
console.log("[mobile:doctor] Native projects still require Capacitor packages plus Android Studio/Xcode.");
