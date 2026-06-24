/**
 * Canonical Gemini model pins — edit via `npm run gemini:sync` (auto) or `config/gemini-models.json`.
 * See docs/ai-gemini.md
 */
import config from "../../config/gemini-models.json";

export type GeminiModelSlot = "fast" | "default" | "vision" | "embedding";

export type GeminiModelChangelogEntry = {
  at: string;
  changes: Array<{ slot: GeminiModelSlot; from: string; to: string }>;
  source?: string;
};

export type GeminiModelsConfig = {
  updated_at: string;
  models: Record<GeminiModelSlot, string>;
  aliases: Record<string, string>;
  changelog: GeminiModelChangelogEntry[];
};

const cfg = config as GeminiModelsConfig;

export function geminiModelsConfig(): GeminiModelsConfig {
  return cfg;
}

export function defaultFastModel(): string {
  return process.env.GEMINI_MODEL_FAST ?? cfg.models.fast;
}

export function defaultModel(): string {
  return process.env.GEMINI_MODEL ?? cfg.models.default;
}

export function defaultVisionModel(): string {
  return process.env.GEMINI_MODEL_VISION ?? cfg.models.vision;
}

export function defaultEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL ?? cfg.models.embedding;
}

export function geminiModelsUpdatedAt(): string {
  return cfg.updated_at;
}

export function latestGeminiModelChangelog(): GeminiModelChangelogEntry | null {
  const entries = cfg.changelog ?? [];
  return entries.length > 0 ? entries[entries.length - 1]! : null;
}

/** Map legacy / deprecated model ids to current pins. */
export function normalizeGeminiModel(model?: string, fallback?: string): string {
  if (!model?.trim()) return fallback ?? defaultFastModel();
  let m = model.trim();
  if (m.startsWith("google/")) m = m.slice(7);
  return cfg.aliases[m] ?? m;
}
