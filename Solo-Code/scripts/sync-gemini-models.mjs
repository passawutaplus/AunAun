#!/usr/bin/env node
/**
 * Sync pinned Gemini models with Google API — updates config/gemini-models.json
 * and mirrors to supabase/functions/_shared/gemini-models.json.
 *
 * Usage:
 *   node scripts/sync-gemini-models.mjs           # check + update if newer models exist
 *   node scripts/sync-gemini-models.mjs --dry-run # report only, no file writes
 *
 * Requires GEMINI_API_KEY (or reads Solo-Code/.env).
 */
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "config", "gemini-models.json");
const EDGE_CONFIG_PATH = join(ROOT, "supabase", "functions", "_shared", "gemini-models.json");
const CHANGELOG_MD = join(ROOT, "docs", "gemini-models-changelog.md");

const SLOTS = ["fast", "default", "vision", "embedding"];
const SLOT_LABELS = {
  fast: "Fast (chat / lightweight)",
  default: "Default (general)",
  vision: "Vision (PDF / image / WHT 50ทวิ)",
  embedding: "Embedding",
};

function loadEnvKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  try {
    const envText = readFileSync(join(ROOT, ".env"), "utf8");
    const m = envText.match(/^GEMINI_API_KEY=(.+)$/m);
    if (m?.[1]) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env */
  }
  return "";
}

function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

function writeConfig(config) {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  copyFileSync(CONFIG_PATH, EDGE_CONFIG_PATH);
}

function parseVersion(name) {
  const m = String(name).match(/gemini-(\d+)\.(\d+)/);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number(m[2]);
}

function shortName(fullName) {
  return String(fullName).replace(/^models\//, "");
}

function supportsGenerateContent(model) {
  return (model.supportedGenerationMethods ?? []).includes("generateContent");
}

function pickBestModel(candidates, kind) {
  const filtered = candidates.filter((m) => {
    const id = shortName(m.name);
    if (!id.startsWith("gemini-")) return false;
    if (kind === "flash-lite") return /flash-lite/.test(id) && !/embedding|audio|tts|image/i.test(id);
    if (kind === "flash") {
      return (
        /flash/.test(id) &&
        !/flash-lite|flash-8b|embedding|audio|tts|image/i.test(id) &&
        !/pro|ultra|deep/i.test(id)
      );
    }
    return false;
  });

  filtered.sort((a, b) => {
    const va = parseVersion(a.name);
    const vb = parseVersion(b.name);
    if (vb !== va) return vb - va;
    const aPreview = /preview|exp/i.test(a.name) ? 0 : 1;
    const bPreview = /preview|exp/i.test(b.name) ? 0 : 1;
    return bPreview - aPreview;
  });

  return filtered[0] ? shortName(filtered[0].name) : null;
}

function pickEmbeddingModel(candidates) {
  const filtered = candidates
    .filter((m) => {
      const id = shortName(m.name);
      return id.includes("embedding") && supportsGenerateContent(m);
    })
    .sort((a, b) => parseVersion(b.name) - parseVersion(a.name));
  return filtered[0] ? shortName(filtered[0].name) : null;
}

async function fetchAvailableModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini models API ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.models ?? []).filter(supportsGenerateContent);
}

function appendChangelogMd(entry) {
  const lines = entry.changes.map(
    (c) => `- **${SLOT_LABELS[c.slot] ?? c.slot}**: \`${c.from}\` → \`${c.to}\``,
  );
  const block = `\n## ${entry.at.slice(0, 10)}\n\n${lines.join("\n")}\n\n_อัปเดตอัตโนมัติโดย \`npm run gemini:sync\`_\n`;

  let existing = "";
  try {
    existing = readFileSync(CHANGELOG_MD, "utf8");
  } catch {
    existing = `# Gemini Models Changelog\n\nบันทึกการอัปเดต model อัตโนมัติ — แอดมินดูที่ Admin → AI Monitor หรือไฟล์นี้\n`;
  }
  writeFileSync(CHANGELOG_MD, existing + block, "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = loadEnvKey();
  const config = readConfig();
  const before = { ...config.models };

  let remote = null;
  if (apiKey) {
    try {
      remote = await fetchAvailableModels(apiKey);
    } catch (e) {
      console.warn(`[gemini:sync] API unavailable: ${e instanceof Error ? e.message : e}`);
    }
  } else {
    console.warn("[gemini:sync] GEMINI_API_KEY not set — skip remote check, sync edge copy only");
  }

  const recommended = { ...config.models };
  if (remote) {
    const flashLite = pickBestModel(remote, "flash-lite");
    const flash = pickBestModel(remote, "flash");
    const embedding = pickEmbeddingModel(remote);
    if (flashLite) recommended.fast = flashLite;
    if (flash) {
      recommended.default = flash;
      recommended.vision = flash;
    }
    if (embedding) recommended.embedding = embedding;
  }

  const changes = [];
  const aliasUpdates = {};
  for (const slot of SLOTS) {
    if (recommended[slot] && recommended[slot] !== before[slot]) {
      changes.push({ slot, from: before[slot], to: recommended[slot] });
      aliasUpdates[before[slot]] = recommended[slot];
    }
  }

  if (changes.length === 0) {
    console.log("[gemini:sync] Models are current:", before);
    if (!dryRun) writeConfig(config);
    return;
  }

  console.log("[gemini:sync] Model updates detected:");
  for (const c of changes) {
    console.log(`  ${c.slot}: ${c.from} → ${c.to}`);
  }

  if (dryRun) {
    console.log("[gemini:sync] Dry run — no files written");
    return;
  }

  const entry = {
    at: new Date().toISOString(),
    changes,
    source: remote ? "google_api" : "manual",
  };

  config.models = {
    fast: recommended.fast,
    default: recommended.default,
    vision: recommended.vision,
    embedding: recommended.embedding,
  };
  config.updated_at = entry.at;
  config.aliases = { ...(config.aliases ?? {}), ...aliasUpdates };
  config.changelog = [...(config.changelog ?? []), entry].slice(-20);
  writeConfig(config);
  appendChangelogMd(entry);

  console.log("[gemini:sync] Updated config + edge mirror + changelog");
  console.log("[gemini:sync] Admin: see docs/gemini-models-changelog.md and Admin → AI Monitor");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
