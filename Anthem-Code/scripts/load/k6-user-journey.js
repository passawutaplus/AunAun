/**
 * k6 load test — realistic Aplus1 visitor journey.
 *
 *   landing page → feed API → login (session check) → search → save (bookmark toggle)
 *
 * Stages: ramp 10 → 100 → 1,000 VUs (hold each), then ramp down.
 * Metrics: http_req_duration (p50/p95/p99), http_reqs (req/s), http_req_failed + journey_errors.
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="https://<preview>.vercel.app"
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_ANON_KEY="<publishable key>"
 *   $env:LOGIN_EMAIL="loadtest@example.com"; $env:LOGIN_PASSWORD="..."
 *   k6 run scripts/load/k6-user-journey.js
 *
 * Optional:
 *   WRITE=1          enable the "save data" step (inserts + deletes a bookmark for the test user)
 *   ALLOW_PROD=1     required when BASE_URL/SUPABASE_URL point at production
 *   PROFILE=smoke    1 VU × 30s sanity run before the full ramp
 *   VERCEL_BYPASS=…  Protection Bypass for Automation secret (preview deployments)
 *   SEARCH_TERMS=logo,poster,3d
 *
 * Supabase Auth rate-limits password sign-ins per IP, so the script signs in once in
 * setup() and every VU reuses that session; the per-iteration "login" step validates
 * the session via /auth/v1/user (what the SPA does on every load).
 */
import http from "k6/http";
import { check, group, sleep, fail } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/$/, "");
const SUPABASE_URL = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || "";
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || "";
const WRITE = __ENV.WRITE === "1";
const ALLOW_PROD = __ENV.ALLOW_PROD === "1";
const PROFILE = __ENV.PROFILE || "ramp";
const SEARCH_TERMS = (__ENV.SEARCH_TERMS || "logo,poster,brand,3d,ui,packaging,illustration,photo")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const LANDING_HEADERS = __ENV.VERCEL_BYPASS
  ? { "x-vercel-protection-bypass": __ENV.VERCEL_BYPASS }
  : {};

const PRODUCTION_HOSTS = ["samecor.com", "aplus1.app", "zkflkpbmbozrchqncpzi.supabase.co"];

const journeyErrors = new Rate("journey_errors");
const stepLanding = new Trend("step_landing_ms", true);
const stepFeed = new Trend("step_feed_ms", true);
const stepLogin = new Trend("step_login_ms", true);
const stepSearch = new Trend("step_search_ms", true);
const stepSave = new Trend("step_save_ms", true);
const rateLimited = new Counter("rate_limited_429");

const STAGES = {
  smoke: [{ duration: "30s", target: 1 }],
  ramp: [
    { duration: "1m", target: 10 },
    { duration: "2m", target: 10 },
    { duration: "2m", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "4m", target: 1000 },
    { duration: "3m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
};

export const options = {
  scenarios: {
    journey: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: STAGES[PROFILE] || STAGES.ramp,
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    journey_errors: ["rate<0.02"],
    http_req_duration: ["p(95)<1000", "p(99)<2500"],
    "http_req_duration{step:feed}": ["p(95)<800"],
    "http_req_duration{step:search}": ["p(95)<800"],
    "http_req_duration{step:login}": ["p(95)<500"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function restHeaders(token, schema, extra = {}) {
  const h = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token || ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
  if (schema) {
    h["Accept-Profile"] = schema;
    h["Content-Profile"] = schema;
  }
  return h;
}

function ok(res, label, expected = [200]) {
  if (res.status === 429) rateLimited.add(1);
  const passed = check(res, { [`${label} status ${expected.join("/")}`]: (r) => expected.includes(r.status) });
  journeyErrors.add(!passed);
  return passed;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function setup() {
  if (!BASE_URL || !SUPABASE_URL || !ANON_KEY) {
    fail("Set BASE_URL, SUPABASE_URL and SUPABASE_ANON_KEY");
  }
  const targetsProd = PRODUCTION_HOSTS.some((h) => BASE_URL.includes(h) || SUPABASE_URL.includes(h));
  if (targetsProd && !ALLOW_PROD) {
    fail(
      "Target is production (shared Supabase). Use a separate Supabase project / preview, or set ALLOW_PROD=1 deliberately during a maintenance window.",
    );
  }

  let session = null;
  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    const res = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
      { headers: { apikey: ANON_KEY, "Content-Type": "application/json" } },
    );
    if (res.status !== 200) fail(`Login failed in setup (${res.status}): ${res.body}`);
    const body = res.json();
    session = { token: body.access_token, userId: body.user && body.user.id };
  } else if (WRITE) {
    fail("WRITE=1 needs LOGIN_EMAIL / LOGIN_PASSWORD");
  }

  const feed = http.get(
    `${SUPABASE_URL}/rest/v1/projects?select=id&status=eq.Published&order=created_at.desc&limit=50`,
    { headers: restHeaders(null, "anthem") },
  );
  const projectIds = feed.status === 200 ? feed.json().map((p) => p.id) : [];
  if (WRITE && projectIds.length === 0) fail("No published projects to bookmark");

  return { session, projectIds };
}

export default function (data) {
  const token = data.session && data.session.token;
  const userId = data.session && data.session.userId;

  group("1. landing", () => {
    const res = http.get(`${BASE_URL}/`, { headers: LANDING_HEADERS, tags: { step: "landing" } });
    stepLanding.add(res.timings.duration);
    ok(res, "landing");
  });
  sleep(1 + Math.random() * 2);

  let feedIds = data.projectIds;
  group("2. feed API", () => {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=id,title,cover_url,category,owner_id,likes,views,created_at&status=eq.Published&order=created_at.desc&limit=24`,
      { headers: restHeaders(token, "anthem"), tags: { step: "feed" } },
    );
    stepFeed.add(res.timings.duration);
    if (ok(res, "feed")) {
      const rows = res.json();
      if (rows.length) feedIds = rows.map((r) => r.id);
    }
    if (feedIds.length) {
      const ids = feedIds.slice(0, 24);
      const likes = http.post(
        `${SUPABASE_URL}/rest/v1/rpc/project_like_summary`,
        JSON.stringify({ ids }),
        { headers: restHeaders(token), tags: { step: "feed" } },
      );
      // 404 = migration 20261002080000 not applied yet; count it separately instead of as an error.
      ok(likes, "like summary", [200, 404]);
    }
  });
  sleep(1 + Math.random() * 3);

  if (token) {
    group("3. login (session)", () => {
      const res = http.get(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        tags: { step: "login" },
      });
      stepLogin.add(res.timings.duration);
      ok(res, "auth user");
    });
    sleep(0.5 + Math.random());
  }

  group("4. search", () => {
    const q = encodeURIComponent(`*${pick(SEARCH_TERMS)}*`);
    const projects = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=id,title,cover_url,owner_id&status=eq.Published&title=ilike.${q}&limit=24`,
      { headers: restHeaders(token, "anthem"), tags: { step: "search" } },
    );
    stepSearch.add(projects.timings.duration);
    ok(projects, "search projects");

    const people = http.get(
      `${SUPABASE_URL}/rest/v1/profiles?select=user_id,display_name,username,avatar_url&display_name=ilike.${q}&limit=12`,
      { headers: restHeaders(token, "public"), tags: { step: "search" } },
    );
    stepSearch.add(people.timings.duration);
    ok(people, "search people");
  });
  sleep(2 + Math.random() * 3);

  if (WRITE && token && userId && feedIds.length) {
    group("5. save (bookmark toggle)", () => {
      const projectId = pick(feedIds);
      const ins = http.post(
        `${SUPABASE_URL}/rest/v1/project_bookmarks`,
        JSON.stringify({ project_id: projectId, user_id: userId }),
        {
          headers: restHeaders(token, "anthem", { Prefer: "return=minimal,resolution=ignore-duplicates" }),
          tags: { step: "save" },
        },
      );
      stepSave.add(ins.timings.duration);
      ok(ins, "bookmark insert", [201, 204, 409]);

      const del = http.del(
        `${SUPABASE_URL}/rest/v1/project_bookmarks?project_id=eq.${projectId}&user_id=eq.${userId}`,
        null,
        { headers: restHeaders(token, "anthem", { Prefer: "return=minimal" }), tags: { step: "save" } },
      );
      stepSave.add(del.timings.duration);
      ok(del, "bookmark delete", [200, 204]);
    });
    sleep(1 + Math.random() * 2);
  }
}

export function handleSummary(data) {
  const m = data.metrics;
  const val = (name, stat) => (m[name] && m[name].values[stat] != null ? m[name].values[stat] : null);
  const fmt = (v, unit = "ms") => (v == null ? "-" : `${v.toFixed(1)}${unit}`);
  const lines = [
    "",
    "Aplus1 load test summary",
    "------------------------",
    `requests/sec      ${fmt(val("http_reqs", "rate"), "")}`,
    `total requests    ${val("http_reqs", "count") ?? "-"}`,
    `error rate (http) ${fmt((val("http_req_failed", "rate") ?? 0) * 100, "%")}`,
    `error rate (flow) ${fmt((val("journey_errors", "rate") ?? 0) * 100, "%")}`,
    `429 responses     ${val("rate_limited_429", "count") ?? 0}`,
    `latency p50/p95/p99  ${fmt(val("http_req_duration", "med"))} / ${fmt(val("http_req_duration", "p(95)"))} / ${fmt(val("http_req_duration", "p(99)"))}`,
    ...["landing", "feed", "login", "search", "save"].map(
      (s) => `  ${s.padEnd(8)} p95 ${fmt(val(`step_${s}_ms`, "p(95)"))}`,
    ),
    "",
  ];
  return {
    stdout: lines.join("\n"),
    "k6-summary.json": JSON.stringify(data, null, 2),
  };
}
