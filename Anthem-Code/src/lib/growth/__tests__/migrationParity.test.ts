import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TRANSITIONS } from "../engine";

// The draft migration enforces the same state machine in SQL; keep the two lists identical.
const MIGRATION = resolve(__dirname, "../../../../../Solo-Code/supabase/migrations/20261120100000_growth_engine_schema.sql");

describe("growth migration ↔ engine parity", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("ge_status_transitions matches TRANSITIONS", () => {
    const block = sql.slice(sql.indexOf("INSERT INTO growth.ge_status_transitions"), sql.indexOf("ON CONFLICT DO NOTHING;", sql.indexOf("INSERT INTO growth.ge_status_transitions")));
    const fromSql = Array.from(block.matchAll(/\('([A-Z_]+)', '([A-Z_]+)'\)/g), (m) => `${m[1]}>${m[2]}`).sort();
    const fromTs = Object.entries(TRANSITIONS)
      .flatMap(([from, tos]) => tos.map((to) => `${from}>${to}`))
      .sort();
    expect(fromSql).toEqual(fromTs);
  });

  it("every campaign status in the engine is allowed by the table CHECK", () => {
    const check = sql.slice(sql.indexOf("CREATE TABLE IF NOT EXISTS growth.ge_campaigns"), sql.indexOf("paused_from text"));
    for (const status of Object.keys(TRANSITIONS)) expect(check, status).toContain(`'${status}'`);
  });

  it("keeps secrets and budgets out of the public repo", () => {
    expect(sql).not.toMatch(/sk-ant-|sb_secret_|service_role_key/i);
    expect(sql).not.toMatch(/ai_monthly_cap_usd\s*=\s*\d/);
  });
});
