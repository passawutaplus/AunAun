/**
 * The ONE kill switch (seeder_control.kill_switch). It stops AI image fetching AND email.
 * Anything that spends money or sends mail (phase 05 enrichment, phase 08 digest, phase 09 jobs) must
 * `await assertNotKilled()` first. Fails CLOSED: if the flag cannot be read, treat it as on.
 */
import { serviceRoleKey, supabaseUrl } from "../supabase-rest.mjs";

let cache = { at: 0, value: false };
const TTL_MS = 15_000;

export async function isKillSwitchOn({ fetchImpl = fetch, now = Date.now() } = {}) {
  if (now - cache.at < TTL_MS) return cache.value;
  try {
    const key = serviceRoleKey();
    const res = await fetchImpl(`${supabaseUrl()}/rest/v1/seeder_control?id=eq.true&select=kill_switch`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const rows = await res.json();
    cache = { at: now, value: Boolean(rows?.[0]?.kill_switch) };
  } catch {
    return true; // cannot read the flag: stop spending rather than risk it
  }
  return cache.value;
}

export async function assertNotKilled(opts) {
  if (await isKillSwitchOn(opts)) {
    const error = new Error("Kill switch is on.");
    error.code = "KILL_SWITCH";
    error.status = 503;
    throw error;
  }
}

export function resetKillSwitchCache() {
  cache = { at: 0, value: false };
}
