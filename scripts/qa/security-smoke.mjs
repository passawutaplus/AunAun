/**
 * Security smoke — open redirect + service_role leak on public pages.
 */
import { ANTHEM_BASE, loadProjectEnv, SOLO_BASE } from "./load-env.mjs";

loadProjectEnv();

const REDIRECT_PATHS = ["/auth?redirect=//evil.com", "/auth?redirect=https://evil.com"];

async function checkNoServiceRole(base, paths) {
  let fail = 0;
  for (const path of paths) {
    const url = `${base}${path}`;
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    if (/service_role/i.test(text)) {
      console.log(`FAIL ${url} leaks service_role`);
      fail++;
    } else if (res.status >= 400) {
      console.log(`FAIL ${url} status ${res.status}`);
      fail++;
    } else {
      console.log(`OK   ${path} no service_role (${res.status})`);
    }
  }
  return fail;
}

async function checkOpenRedirect(base) {
  let fail = 0;
  for (const path of REDIRECT_PATHS) {
    const url = `${base}${path}`;
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    if (loc.includes("evil.com")) {
      console.log(`FAIL ${path} redirects to evil (${loc})`);
      fail++;
    } else {
      console.log(`OK   ${path} no evil redirect`);
    }
  }
  return fail;
}

async function main() {
  console.log("==> Security smoke\n");
  const soloPaths = ["/", "/pricing", "/auth", "/dashboard", "/admin"];
  const anthemPaths = ["/", "/auth", "/chat", "/admin", "/portfolio/manage"];

  let fail = 0;
  console.log("--- Solo ---");
  fail += await checkNoServiceRole(SOLO_BASE, soloPaths);
  fail += await checkOpenRedirect(SOLO_BASE);

  console.log("\n--- Anthem ---");
  fail += await checkNoServiceRole(ANTHEM_BASE, anthemPaths);
  fail += await checkOpenRedirect(ANTHEM_BASE);

  if (fail) {
    console.log(`\n==> Security smoke FAILED (${fail})`);
    process.exit(1);
  }
  console.log("\n==> Security smoke PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
