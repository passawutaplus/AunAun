/**
 * Copy Anthem email templates into Solo-Code for isolated builds (Vercel / Docker).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const anthemLib = join(root, "..", "Anthem-Code", "src", "lib");
const vendorRoot = join(root, "src", "lib", "email", "anthem-vendor");
const templatesSrc = join(anthemLib, "email-templates");
const templatesDest = join(vendorRoot, "templates");

if (!existsSync(templatesSrc)) {
  console.warn("[vendor-anthem] Anthem-Code not found — skipping (CI may use committed vendor)");
  process.exit(0);
}

mkdirSync(templatesDest, { recursive: true });
cpSync(templatesSrc, templatesDest, { recursive: true });
cpSync(join(anthemLib, "brandConfig.ts"), join(vendorRoot, "brandConfig.ts"));
cpSync(join(anthemLib, "copyConstants.ts"), join(vendorRoot, "copyConstants.ts"));

for (const file of readdirSync(templatesDest)) {
  if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
  const path = join(templatesDest, file);
  let content = readFileSync(path, "utf8");
  content = content
    .replace(/from '@\/lib\/copyConstants'/g, "from '../copyConstants'")
    .replace(/from '\.\.\/brandConfig'/g, "from '../brandConfig'");
  writeFileSync(path, content);
}

const brandMetaPath = join(templatesDest, "brandMeta.ts");
const brandMeta = readFileSync(brandMetaPath, "utf8");
writeFileSync(brandMetaPath, brandMeta.replace("from '../brandConfig'", "from '../brandConfig'"));

console.log("[vendor-anthem] vendored email templates → src/lib/email/anthem-vendor");
