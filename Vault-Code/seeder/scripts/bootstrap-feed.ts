/**
 * First visible Discover fill when ANTHROPIC_API_KEY is not set.
 * Still runs license gate, download, pHash, resolution, WebP, and blurhash.
 * Tags/colors come from the museum record and the image, not Claude.
 * Skips the photography query. Delete these rows before the real seeder if you want Claude moderation on them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdapter } from "../src/seeder/adapters/index";
import type { Candidate } from "../src/seeder/adapters/types";
import { processCandidate } from "../src/seeder/pipeline";
import { SupabaseSeederRepo } from "../src/seeder/repo";
import type { VisionInput, VisionResult } from "../src/seeder/vision";
import { extractPalette } from "./palette";

const PER_CATEGORY = 2;
const PAGE_SIZE = 8;
const MAX_PAGES = 5;
const CATEGORIES = [
  "poster",
  "typography",
  "illustration",
  "textile",
  "ceramic",
  "furniture",
  "architecture",
  "print",
  "pattern",
];
const BLOCKED = /\b(nude|nudes|naked|erotic|erotica|penis|phallus|genitals?|intercourse|pornograph\w*)\b/i;

function loadEnv(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function tagsFrom(c: Candidate): string[] {
  const raw = c.sourceMeta.source_tags;
  const fromMeta = Array.isArray(raw) ? raw.map(String) : [];
  const fromTitle = c.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  return [...new Set([...fromMeta, ...fromTitle].map((t) => t.toLowerCase().slice(0, 40)).filter((t) => t.length >= 2))].slice(0, 8);
}

function blocked(c: Candidate): boolean {
  const tags = Array.isArray(c.sourceMeta.source_tags) ? c.sourceMeta.source_tags.join(" ") : "";
  return BLOCKED.test(`${c.title} ${tags}`);
}

async function museumVision(input: VisionInput, c: Candidate): Promise<VisionResult> {
  const style = String(c.sourceMeta.classification || c.sourceMeta.medium || input.hintCategory || "museum").toLowerCase().slice(0, 60);
  const tags = tagsFrom(c);
  while (tags.length < 3) tags.push(input.hintCategory || "museum");
  return {
    safe: true,
    unsafe_reason: null,
    category: input.hintCategory && input.categories.includes(input.hintCategory) ? input.hintCategory : input.categories[0],
    tags: [...new Set(tags)].slice(0, 8),
    style: style.length >= 2 ? style : "museum",
    colors: await extractPalette(input.jpeg),
  };
}

async function main() {
  loadEnv(resolve(import.meta.dirname, "../../.env.local"));
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= process.env.SUPABASE_URL;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Vault .env.local is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const adapter = getAdapter("met");
  const repo = new SupabaseSeederRepo();
  const summary: string[] = [];

  for (const category of CATEGORIES) {
    const target = await repo.target(category, "met");
    if (!target?.enabled) {
      summary.push(`${category}: skipped (disabled)`);
      continue;
    }
    let published = 0;
    let cursor = 0;
    for (let page = 0; page < MAX_PAGES && published < PER_CATEGORY; page++) {
      const batch = await adapter.fetchBatch(target.query, cursor, PAGE_SIZE);
      cursor = batch.nextCursor ?? cursor + PAGE_SIZE;
      for (const candidate of batch.candidates) {
        if (published >= PER_CATEGORY) break;
        if (blocked(candidate)) {
          console.log(`skip blocked ${candidate.sourceId}`);
          continue;
        }
        const outcome = await processCandidate(candidate, { category, categories: CATEGORIES }, {
          repo,
          vision: (input) => museumVision(input, candidate),
        });
        console.log(`${category} ${candidate.sourceId} ${outcome.status}${"reason" in outcome ? " " + outcome.reason : ""}`);
        if (outcome.status === "published") published += 1;
      }
      if (batch.nextCursor == null) break;
    }
    summary.push(`${category}: ${published}`);
  }
  console.log(summary.join("\n"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
