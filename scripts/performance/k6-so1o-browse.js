/**
 * Scenario B — So1o browse (landing + dashboard shell)
 * Usage: k6 run scripts/performance/k6-so1o-browse.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.SO1O_BASE_URL || "https://solo-demo-liart.vercel.app";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{expected_response:true}": ["p(95)<1500"],
    "http_req_failed{expected_response:true}": ["rate<0.05"],
  },
};

const PATHS = ["/", "/pricing", "/help", "/auth"];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}${path}`, { redirects: 5, timeout: "30s" });
  check(res, {
    "page 200": (r) => r.status === 200,
    "TTFB < 1.2s": (r) => r.timings.waiting < 1200,
  });
  sleep(1 + Math.random());
}
