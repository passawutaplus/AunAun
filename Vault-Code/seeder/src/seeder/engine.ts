import engineJson from "../../../config/engine.json";
import taxonomyJson from "../../../taxonomy/taxonomy.json";
import { loadTaxonomy } from "../../../lib/engine/taxonomy.mjs";

/** Shared pure engine (lib/engine) + the single taxonomy/config files, loaded once per process. */
export const cfg = engineJson;
export const tax = loadTaxonomy(taxonomyJson);
export * from "../../../lib/engine/palette.mjs";
export * from "../../../lib/engine/tags.mjs";
export * from "../../../lib/engine/publish.mjs";
export * from "../../../lib/engine/prompts.mjs";
