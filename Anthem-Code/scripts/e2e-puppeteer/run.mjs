import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runAuth } from "./auth.mjs";
import { runChat } from "./chat.mjs";
import { baseURL } from "./config.mjs";
import { runSmoke } from "./smoke.mjs";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const suite = process.env.E2E_SUITE ?? "all";

async function main() {
  console.log(`==> Puppeteer E2E (${suite}) @ ${baseURL}\n`);

  if (suite === "smoke" || suite === "all") {
    await runSmoke();
    console.log("");
  }

  if (suite === "auth" || suite === "all") {
    await runAuth();
    console.log("");
  }

  if (suite === "chat" || suite === "all") {
    await runChat();
    console.log("");
  }

  console.log("==> Puppeteer E2E PASSED");
}

main().catch((err) => {
  console.error(`==> Puppeteer E2E FAILED: ${err.message}`);
  process.exit(1);
});
