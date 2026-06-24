#!/usr/bin/env node
import { loadEnv } from "vite";
/**
 * Fail production builds that enable demo mode (known shared credentials in bundle).
 *
 * Usage:
 *   node scripts/check-build-env.mjs              # checks process.env
 *   DEPLOY_TARGET=production node scripts/check-build-env.mjs
 */
const fileEnv = loadEnv(process.env.MODE || "production", process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const deployTarget = (env.DEPLOY_TARGET || env.VERCEL_ENV || "").toLowerCase();
const demoMode = (env.VITE_DEMO_MODE || "false").toLowerCase();
const demoEnabled = demoMode === "true" || demoMode === "1";

const isProductionTarget =
  deployTarget === "production" ||
  deployTarget === "prod" ||
  env.VERCEL_ENV === "production";

if (isProductionTarget && demoEnabled) {
  console.error(
    "[security] VITE_DEMO_MODE must not be true for production deploys.\n" +
      "Use scripts/deploy-demo-vercel.sh for preview/demo only.",
  );
  process.exit(1);
}

if (demoEnabled) {
  const required = [
    "VITE_DEMO_SUPABASE_URL",
    "VITE_DEMO_SUPABASE_PUBLISHABLE_KEY",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) {
    console.error(`[security] Demo build is missing: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (
    env.VITE_SUPABASE_URL?.trim() &&
    env.VITE_DEMO_SUPABASE_URL.trim() === env.VITE_SUPABASE_URL.trim()
  ) {
    console.error("[security] Demo and production Supabase URLs must be different.");
    process.exit(1);
  }
}

console.log("[check-build-env] OK", { deployTarget: deployTarget || "(unset)", demoMode });
