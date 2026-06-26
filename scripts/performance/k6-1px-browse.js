/**
 * Scenario A — 1PX browse (feed + static assets)
 * Usage: k6 run -e SUPABASE_ANON_KEY=... scripts/performance/k6-1px-browse.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.PX_BASE_URL || "https://aplus1-demo.vercel.app";
const SUPABASE = __ENV.SUPABASE_URL || "https://zkflkpbmbozrchqncpzi.supabase.co";
const ANON = __ENV.SUPABASE_ANON_KEY;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{name:static}": ["p(95)<800"],
    "http_req_failed{name:static}": ["rate<0.05"],
  },
};

export default function () {
  const home = http.get(`${BASE}/`, { redirects: 5, tags: { name: "static" } });
  check(home, {
    "home 200": (r) => r.status === 200,
    "home TTFB < 1s": (r) => r.timings.waiting < 1000,
  });

  const jobs = http.get(`${BASE}/jobs`, { redirects: 5, tags: { name: "static" } });
  check(jobs, { "jobs 200": (r) => r.status === 200 });

  if (ANON) {
    const headers = {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Accept-Profile": "anthem",
      "Content-Profile": "anthem",
    };
    const projects = http.get(
      `${SUPABASE}/rest/v1/projects?select=id,title&status=eq.Published&limit=10`,
      { headers, tags: { name: "postgrest" } },
    );
    check(projects, { "projects 200": (r) => r.status === 200 });
  }

  sleep(1 + Math.random());
}
