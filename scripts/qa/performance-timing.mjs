/**
 * HTTP timing smoke — TTFB thresholds (no Lighthouse).
 */
import { spawnSync } from "node:child_process";
import { ANTHEM_BASE, loadProjectEnv, SOLO_BASE } from "./load-env.mjs";

loadProjectEnv();

const TARGETS = [
  { name: "So1o", base: SOLO_BASE, paths: ["/", "/pricing", "/blog", "/auth"] },
  { name: "1px", base: ANTHEM_BASE, paths: ["/", "/jobs", "/research", "/auth"] },
];

const TTFB_MS = Number(process.env.QA_TTFB_MS ?? 2500);

function curlTiming(url) {
  const r = spawnSync(
    "curl",
    ["-sS", "-o", "/dev/null", "-w", "%{http_code} %{time_starttransfer}", "-L", "--max-time", "30", url],
    { encoding: "utf8" },
  );
  const parts = (r.stdout ?? "").trim().split(" ");
  const code = parts[0] ?? "000";
  const ttfb = Math.round(parseFloat(parts[1] ?? "99") * 1000);
  return { code, ttfb };
}

async function main() {
  console.log(`==> Performance timing (TTFB < ${TTFB_MS}ms)\n`);
  let fail = 0;

  for (const t of TARGETS) {
    console.log(`--- ${t.name} ---`);
    for (const p of t.paths) {
      const url = `${t.base}${p}`;
      const { code, ttfb } = curlTiming(url);
      const ok = code === "200" && ttfb < TTFB_MS;
      console.log(`${ok ? "OK" : "FAIL"} ${p} HTTP ${code} TTFB ${ttfb}ms`);
      if (!ok) fail++;
    }
  }

  if (fail) {
    console.log(`\n==> Performance timing FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Performance timing PASSED");
}

main();
