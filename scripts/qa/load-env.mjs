import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");

/** Load .env then .env.local from Solo-Code and Anthem-Code into process.env (no overwrite). */
export function loadProjectEnv() {
  for (const dir of ["Solo-Code", "Anthem-Code"]) {
    for (const name of [".env", ".env.local"]) {
      const path = join(ROOT, dir, name);
      if (!existsSync(path)) continue;
      for (const line of readFileSync(path, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

export const SOLO_BASE = (process.env.SOLO_BASE_URL ?? "https://solofreelancer.com").replace(/\/$/, "");
export const ANTHEM_BASE = (process.env.ANTHEM_BASE_URL ?? "https://aplus1-demo.vercel.app").replace(/\/$/, "");

export function supabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  return { url, anon };
}

export async function supabaseLogin(email, password) {
  const { url, anon } = supabaseConfig();
  if (!url || !anon) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error_description ?? body.message ?? `auth ${res.status}`);
  return body.access_token;
}

export function hasE2EUser() {
  return Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
}

export function hasE2EAdmin() {
  return Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
}

export function hasE2EUserB() {
  return Boolean(process.env.E2E_USERB_EMAIL && process.env.E2E_USERB_PASSWORD);
}
