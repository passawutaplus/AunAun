#!/usr/bin/env node
import { loadEnv } from "vite";
/**
 * Fail-closed build guard for Aplus1 launch scope and demo isolation.
 *
 * Usage:
 *   node scripts/check-build-env.mjs
 *   DEPLOY_TARGET=production node scripts/check-build-env.mjs
 */
const fileEnv = loadEnv(process.env.MODE || "production", process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const deployTarget = (env.DEPLOY_TARGET || env.VERCEL_ENV || "").toLowerCase();
const demoMode = (env.VITE_DEMO_MODE || "false").toLowerCase();
const demoEnabled = demoMode === "true" || demoMode === "1";
const fullProduct = (env.VITE_APLUS1_FULL_PRODUCT || "false").toLowerCase() === "true";
const paymentsEnabled = (env.VITE_APLUS1_PAYMENTS_ENABLED || "false").toLowerCase() === "true";
const soloEcosystem = (env.VITE_SOLO_ECOSYSTEM_ENABLED || "false").toLowerCase() === "true";

const isProductionTarget =
  deployTarget === "production" || deployTarget === "prod";
const isDemoTarget = deployTarget === "demo" || demoEnabled;

function fail(msg) {
  console.error(`[security] ${msg}`);
  process.exit(1);
}

if (isProductionTarget && demoEnabled) {
  fail(
    "VITE_DEMO_MODE must not be true for production deploys.\n" +
      "Use scripts/deploy-demo-vercel.sh for preview/demo only.",
  );
}

// Launch scope: fail-closed on production and demo deploys
if (isProductionTarget || isDemoTarget) {
  if (fullProduct) {
    fail(
      "VITE_APLUS1_FULL_PRODUCT=true is not allowed for launch deploys. " +
        "Remove it or deploy from a non-launch pipeline.",
    );
  }
  if (paymentsEnabled) {
    fail("VITE_APLUS1_PAYMENTS_ENABLED must be false for launch deploys.");
  }
  if (soloEcosystem) {
    fail("VITE_SOLO_ECOSYSTEM_ENABLED must be false for launch deploys.");
  }
}

if (demoEnabled || isDemoTarget) {
  const demoUrl = env.VITE_DEMO_SUPABASE_URL?.trim();
  const demoKey = env.VITE_DEMO_SUPABASE_PUBLISHABLE_KEY?.trim();
  const prodUrl = env.VITE_SUPABASE_URL?.trim();
  const prodKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  // Phase A (pre-launch): shared production DB + VITE_DEMO_MODE — see docs/ecosystem-deploy-policy.md
  const phaseA = (env.VITE_DEMO_PHASE_A || "").toLowerCase() === "true";

  if (phaseA) {
    if (!prodUrl || !prodKey) {
      fail(
        "Phase A demo requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY " +
          "(shared DB). Set VITE_DEMO_PHASE_A=true only for pre-launch shared demos.",
      );
    }
  } else {
    if (!demoUrl || !demoKey) {
      fail(
        "Demo build requires VITE_DEMO_SUPABASE_URL and VITE_DEMO_SUPABASE_PUBLISHABLE_KEY. " +
          "Do not fall back to production Supabase credentials. " +
          "Or set VITE_DEMO_PHASE_A=true for pre-launch shared-DB demos.",
      );
    }
    if (prodUrl && demoUrl === prodUrl) {
      fail("Demo and production Supabase URLs must be different (unless VITE_DEMO_PHASE_A=true).");
    }
  }
}

console.log("[check-build-env] OK", {
  deployTarget: deployTarget || "(unset)",
  demoMode,
  launchMinimal: !fullProduct,
  paymentsEnabled,
  soloEcosystem,
});
