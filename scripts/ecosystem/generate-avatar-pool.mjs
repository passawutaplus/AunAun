#!/usr/bin/env node
/**
 * Generate AI illustration avatars and upload to Supabase Storage.
 *
 * Provider: Magnific (default when MAGNIFIC_API_KEY is set) or Google Gemini.
 *
 * Usage:
 *   node scripts/ecosystem/generate-avatar-pool.mjs
 *   node scripts/ecosystem/generate-avatar-pool.mjs --count=80
 *   node scripts/ecosystem/generate-avatar-pool.mjs --provider=gemini
 *
 * Env (scripts/ecosystem/.env.seed.local or process env):
 *   MAGNIFIC_API_KEY — Magnific REST API key (Business/Enterprise)
 *   AVATAR_IMAGE_PROVIDER — magnific | gemini (auto: magnific if key present)
 *   MAGNIFIC_IMAGE_MODEL — hyperflux | flux-2-klein | flux-2-turbo (default hyperflux)
 *   GEMINI_API_KEY (or GOOGLE_API_KEY) — required when provider=gemini
 *   SUPABASE_URL
 *   SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
 *   AVATAR_POOL_COUNT (default 80)
 *   GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { magnificGenerateImageBytes } from "./magnific-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const anthemCandidates = [
  join(root, "Anthem-Code"),
  "F:/So1o/Anthem Code",
];
const anthemRoot = anthemCandidates.find((p) =>
  existsSync(join(p, "node_modules/@supabase/supabase-js/dist/index.mjs")),
) ?? anthemCandidates[0];
const manifestPath = join(
  existsSync(join(root, "Anthem-Code/public/avatar-pool/manifest.json"))
    ? join(root, "Anthem-Code")
    : anthemRoot,
  "public/avatar-pool/manifest.json",
);
const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env.seed.local");
const soloEnvPath = join(root, "Solo-Code/.env");

function loadEnv(path) {
  if (!existsSync(path)) return;
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(soloEnvPath);
loadEnv(envPath);

const countArg = process.argv.find((a) => a.startsWith("--count="));
const providerArg = process.argv.find((a) => a.startsWith("--provider="));
const count = Number(countArg?.split("=")[1] ?? process.env.AVATAR_POOL_COUNT ?? 80);

const magnificKey = process.env.MAGNIFIC_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const provider =
  providerArg?.split("=")[1] ??
  process.env.AVATAR_IMAGE_PROVIDER ??
  (magnificKey ? "magnific" : "gemini");

const magnificModel = process.env.MAGNIFIC_IMAGE_MODEL ?? "hyperflux";
const geminiModel = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const bucket = "project-media";
const storagePrefix = "anthem/avatar-pool";

const url = process.env.SUPABASE_URL ?? process.env.ANTHEM_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (provider === "magnific" && !magnificKey) {
  console.error("Missing MAGNIFIC_API_KEY (provider=magnific)");
  process.exit(1);
}
if (provider === "gemini" && !geminiKey) {
  console.error("Missing GEMINI_API_KEY (provider=gemini)");
  process.exit(1);
}

const { createClient } = await import(
  pathToFileURL(join(anthemRoot, "node_modules/@supabase/supabase-js/dist/index.mjs")).href
);

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TRAITS = [
  "short curly hair, peach shirt",
  "long straight hair, teal jacket",
  "wavy bob, mustard sweater",
  "buzz cut, navy hoodie",
  "ponytail, coral blouse",
  "side part, lavender cardigan",
  "braids, olive t-shirt",
  "glasses, cream turtleneck",
  "headband, sky blue shirt",
  "beanie, rust orange top",
];

const BASE_PROMPT =
  "Minimal flat cartoon character portrait avatar, friendly Thai creative freelancer, " +
  "centered head and shoulders, soft pastel circular background, clean vector illustration, " +
  "no text, no watermark, no logo, wholesome professional look";

function avatarPrompt(index) {
  const trait = TRAITS[index % TRAITS.length];
  return `${BASE_PROMPT}, ${trait}, variation ${index + 1}`;
}

function extractGeminiImageBytes(json) {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      return Buffer.from(inline.data, "base64");
    }
  }
  const pred = json?.predictions?.[0];
  if (pred?.bytesBase64Encoded) {
    return Buffer.from(pred.bytesBase64Encoded, "base64");
  }
  if (pred?.image?.imageBytes) {
    return Buffer.from(pred.image.imageBytes, "base64");
  }
  return null;
}

async function generateWithGemini(index) {
  const prompt = avatarPrompt(index);
  const isImagen = geminiModel.startsWith("imagen");
  const endpoint = isImagen
    ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:predict?key=${encodeURIComponent(geminiKey)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;

  const body = isImagen
    ? {
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "1:1" },
      }
    : {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 500)}`);
  }

  const json = await res.json();
  const buf = extractGeminiImageBytes(json);
  if (!buf?.length) throw new Error("Gemini response missing image bytes");
  return buf;
}

async function generateWithMagnific(index) {
  return magnificGenerateImageBytes({
    apiKey: magnificKey,
    prompt: avatarPrompt(index),
    model: magnificModel,
    aspectRatio: "square_1_1",
    seed: 10_000 + index,
    styling: { effects: { framing: "portrait" } },
  });
}

async function generateImage(index) {
  if (provider === "magnific") return generateWithMagnific(index);
  return generateWithGemini(index);
}

async function uploadImage(buffer, fileName) {
  const path = `${storagePrefix}/${fileName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  const modelLabel = provider === "magnific" ? magnificModel : geminiModel;
  console.log(`Generating ${count} avatars with ${provider} (${modelLabel})…`);

  const { data: existingRows, error: poolErr } = await supabase
    .from("avatar_pool")
    .select("url")
    .eq("active", true);

  if (poolErr?.message?.includes("does not exist")) {
    console.error("avatar_pool table missing — push migration first:");
    console.error("  cd Solo-Code && ./scripts/supabase-push-via-api.sh");
    process.exit(1);
  }
  if (poolErr) throw new Error(poolErr.message);

  const urls = [...(existingRows?.map((r) => r.url) ?? [])];
  const startIndex = urls.length;

  if (startIndex >= count) {
    console.log(`Pool already has ${urls.length} URLs (>= ${count}). Updating manifest only.`);
  }

  for (let i = startIndex; i < count; i++) {
    const fileName = `avatar-${String(i + 1).padStart(3, "0")}.png`;
    process.stdout.write(`[${i + 1}/${count}] generating… `);
    const buf = await generateImage(i);
    const publicUrl = await uploadImage(buf, fileName);
    const { error: insErr } = await supabase
      .from("avatar_pool")
      .upsert({ url: publicUrl, active: true }, { onConflict: "url" });
    if (insErr) throw new Error(insErr.message);
    urls.push(publicUrl);
    console.log("OK");
    await new Promise((r) => setTimeout(r, provider === "magnific" ? 300 : 500));
  }

  mkdirSync(dirname(manifestPath), { recursive: true });
  const manifest = { version: Date.now(), urls };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Done. ${urls.length} URLs in pool.`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
