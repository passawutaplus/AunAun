#!/usr/bin/env node
/**
 * Generate public/sitemap.xml with static routes + demo catalog URLs.
 * Set VITE_SITE_URL or SITE_URL (default https://pixel100.com)
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildSitemapUrls, buildSitemapXml } from "./sitemap-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://pixel100.com").replace(/\/$/, "");

const xml = buildSitemapXml(base);
const out = join(root, "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${buildSitemapUrls().length} URLs to public/sitemap.xml (base: ${base})`);
