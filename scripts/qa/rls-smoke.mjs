/**
 * RLS smoke — anon cannot read wallets; authenticated user can auth.
 */
import {
  hasE2EUser,
  hasE2EUserB,
  loadProjectEnv,
  supabaseConfig,
  supabaseLogin,
} from "./load-env.mjs";

loadProjectEnv();

async function restGet(path, token) {
  const { url, anon } = supabaseConfig();
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, { headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log("==> RLS smoke\n");
  const { url, anon } = supabaseConfig();
  if (!url || !anon) {
    console.log("SKIP — no Supabase URL/anon key in env");
    return;
  }

  let fail = 0;

  // Anon with anon key — wallets should not expose other users' data
  const anonRes = await restGet("wallets?select=id,user_id&limit=5", anon);
  if (anonRes.status === 200 && Array.isArray(anonRes.data) && anonRes.data.length > 0) {
    console.log("FAIL anon can read wallets rows (RLS too open?)");
    fail++;
  } else {
    console.log(`OK   anon wallets → ${anonRes.status} (no bulk leak)`);
  }

  if (!hasE2EUser()) {
    console.log("SKIP user login — set E2E_USER_EMAIL/PASSWORD in .env.local");
  } else {
    try {
      const tokenA = await supabaseLogin(process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASSWORD);
      const userRes = await restGet("profiles?select=id&limit=1", tokenA);
      if (userRes.status === 200) {
        console.log("OK   user A can read profiles");
      } else {
        console.log(`FAIL user A profiles → ${userRes.status}`);
        fail++;
      }
      const walletA = await restGet("wallets?select=id&limit=5", tokenA);
      if (walletA.status === 200) {
        console.log(`OK   user A wallets → ${walletA.status} (${Array.isArray(walletA.data) ? walletA.data.length : "?"} rows)`);
      } else if (walletA.status === 404 || walletA.status === 406) {
        console.log(`OK   user A wallets → ${walletA.status} (table/policy)`);
      } else {
        console.log(`WARN user A wallets → ${walletA.status}`);
      }
    } catch (e) {
      console.log(`FAIL user A login: ${e.message}`);
      fail++;
    }
  }

  if (hasE2EUserB()) {
    try {
      const tokenB = await supabaseLogin(process.env.E2E_USERB_EMAIL, process.env.E2E_USERB_PASSWORD);
      console.log("OK   user B login");
      const profiles = await restGet("profiles?select=id&limit=1", tokenB);
      if (profiles.status !== 200) {
        console.log(`WARN user B profiles → ${profiles.status}`);
      }
    } catch (e) {
      console.log(`FAIL user B login: ${e.message}`);
      fail++;
    }
  } else {
    console.log("SKIP user B — set E2E_USERB_* for cross-user tests");
  }

  if (fail) {
    console.log(`\n==> RLS smoke FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> RLS smoke PASSED");
}

main();
