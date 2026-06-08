import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function test(label, client, table, extra) {
  let q = client.from(table).select("*").limit(1);
  if (extra) q = extra(q);
  const { error } = await q;
  console.log(`${label}: ${error ? `${error.code} ${error.message}` : "OK"}`);
}

const pub = createClient(url, key);
const anthem = createClient(url, key, { db: { schema: "anthem" } });
const ops = createClient(url, key, { db: { schema: "ops" } });

await test("app_feedback.status", anthem, "app_feedback", (q) => q.in("status", ["new"]));
await test("platform_events", pub, "platform_events");
await test("ops.issues", ops, "issues");
await test("ops.cycles", ops, "cycles");
await test("ops.roadmap_items", ops, "roadmap_items");
