import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = join(root, "Anthem-Code/public/avatar-pool/manifest.json");

export function loadPoolUrlsFromManifest() {
  if (!existsSync(manifestPath)) return [];
  try {
    const data = JSON.parse(readFileSync(manifestPath, "utf8"));
    return Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function hashString(input) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function poolUrlForSeed(urls, seed) {
  if (!urls.length) return null;
  return urls[hashString(seed) % urls.length];
}

export async function fetchPoolUrlsFromDb(supabase) {
  const { data } = await supabase.from("avatar_pool").select("url").eq("active", true).order("id");
  return data?.map((r) => r.url).filter(Boolean) ?? [];
}

export async function resolveSeedAvatarUrls(supabase) {
  const fromDb = await fetchPoolUrlsFromDb(supabase);
  if (fromDb.length) return fromDb;
  return loadPoolUrlsFromManifest();
}
