#!/usr/bin/env node
/**
 * Vercel ecosystem map — verify aliases and print setup checklist.
 * Usage: node scripts/setup-vercel-ecosystem.mjs
 */
import { spawnSync } from "node:child_process";

const TEAM = "passawutaplus-9338s-projects";

const PROJECTS = [
  {
    name: "solo-demo",
    role: "So1o production",
    urls: ["https://solofreelancer.com", "https://www.solofreelancer.com"],
    git: "passawutaplus/Solo-Code (or AunAun + root Solo-Code)",
    deploy: "./scripts/deploy-vercel.sh production solo",
  },
  {
    name: "solo-demo-liart",
    role: "So1o demo",
    urls: ["https://solo-demo-liart.vercel.app"],
    git: "passawutaplus/Solo-Code (or AunAun + root Solo-Code)",
    deploy: "./scripts/deploy-vercel.sh demo solo",
  },
  {
    name: "aplus1-prod",
    role: "Aplus1 production",
    urls: ["https://aplus1.app", "https://www.aplus1.app"],
    git: "passawutaplus/Anthem-Code (or AunAun + root Anthem-Code)",
    deploy: "./scripts/deploy-vercel.sh production 1px",
  },
  {
    name: "aplus1-demo",
    role: "Aplus1 demo",
    urls: ["https://aplus1-demo.vercel.app"],
    git: "passawutaplus/Anthem-Code (or AunAun + root Anthem-Code)",
    deploy: "./scripts/deploy-vercel.sh demo 1px",
  },
  {
    name: "so1o-ops-hub",
    role: "Ops Hub (admin)",
    urls: ["https://so1o-ops-hub.vercel.app"],
    git: "passawutaplus/AunAun — Root Directory: Ops-Hub",
    deploy: "cd Ops-Hub && npm run deploy:demo",
  },
];

const DEPRECATED = ["solo-code", "so1o-freelancer-managment", "anthem-freelancehub"];

function curlHead(url) {
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const r = spawnSync("curl", ["-sS", "-o", nullDevice, "-w", "%{http_code}", "-L", "--max-time", "15", url], {
    encoding: "utf8",
  });
  const code = (r.stdout || "").trim();
  return r.status === 0 && code && !code.startsWith("0") ? code : `err(${r.status})`;
}

async function patchOpsHubRoot() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return false;
  const teamId = "team_8pKBsu4WiiF7aNv9s8gGyZIT";
  const res = await fetch(`https://api.vercel.com/v9/projects/so1o-ops-hub?teamId=${teamId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rootDirectory: "Ops-Hub" }),
  });
  if (!res.ok) {
    console.error("PATCH rootDirectory failed:", res.status, await res.text());
    return false;
  }
  console.log("✓ so1o-ops-hub rootDirectory → Ops-Hub");
  return true;
}

console.log("=== Vercel ecosystem (team: %s) ===\n", TEAM);

for (const p of PROJECTS) {
  console.log(`## ${p.name} — ${p.role}`);
  for (const url of p.urls) {
    console.log(`   ${url} → HTTP ${curlHead(url)}`);
  }
  console.log(`   Git: ${p.git}`);
  console.log(`   Deploy: ${p.deploy}`);
  if (p.note) console.log(`   ⚠ ${p.note}`);
  console.log("");
}

console.log("## Ops Hub monorepo (one-time in Vercel Dashboard)");
console.log("   Project so1o-ops-hub → Settings → General → Root Directory = Ops-Hub");
console.log("   Or: VERCEL_TOKEN=... node scripts/setup-vercel-ecosystem.mjs --patch-ops-root\n");

if (process.argv.includes("--patch-ops-root")) {
  const ok = await patchOpsHubRoot();
  process.exit(ok ? 0 : 1);
}

console.log("## Safe to delete on Vercel (if still present)");
for (const d of DEPRECATED) console.log(`   - ${d}`);

console.log("\n## Quick verify");
console.log("   npx vercel project ls");
console.log("   npx vercel inspect solofreelancer.com");
console.log("   npx vercel inspect solo-demo-liart.vercel.app");
