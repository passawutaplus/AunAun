import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const soloEnvPath = resolve(__dirname, "../../Solo-Code/.env");
const soloEnv = readFileSync(soloEnvPath, "utf8");
const tokenMatch = soloEnv.match(/^SUPABASE_ACCESS_TOKEN="?([^"\n]+)"?/m);
if (!tokenMatch) {
  console.error("ไม่พบ SUPABASE_ACCESS_TOKEN ใน Solo-Code/.env");
  process.exit(1);
}

const token = tokenMatch[1];
const ref = "zkflkpbmbozrchqncpzi";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const getRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, { headers });
if (!getRes.ok) {
  console.error("GET postgrest failed:", getRes.status, await getRes.text());
  process.exit(1);
}

const current = await getRes.json();
const schemas = String(current.db_schema ?? "public")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!schemas.includes("ops")) schemas.push("ops");
const db_schema = schemas.join(",");

if (db_schema === current.db_schema) {
  console.log("db_schema มี ops อยู่แล้ว:", db_schema);
  process.exit(0);
}

const patchRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ db_schema }),
});

if (!patchRes.ok) {
  console.error("PATCH postgrest failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

const updated = await patchRes.json();
console.log("อัปเดต db_schema สำเร็จ:", updated.db_schema);
