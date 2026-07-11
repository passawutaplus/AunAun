#!/usr/bin/env bash
# Public-route smoke — no auth, no Playwright required.
# Usage:
#   ./scripts/smoke-public.sh
#   BASE_URL=https://aplus1-demo.vercel.app ./scripts/smoke-public.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
PATHS=(
  "/"
  "/auth"
  "/auth/forgot"
  "/reset-password"
  "/jobs"
  "/advertise"
  "/research"
  "/research/feedback"
  "/upgrade"
  "/legal/terms"
  "/legal/privacy"
  "/legal/cookies"
  "/legal/rights"
  "/legal/ip"
  "/error/404"
  "/robots.txt"
  "/sitemap.xml"
  "/sitemap-index.xml"
)

fail=0
body_file="/tmp/anthem-smoke-body-$$.html"

check_robots_txt() {
  local url="${BASE_URL}/robots.txt"
  local code
  local seo_fail=0
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /robots.txt SEO check status=${code}"
    fail=1
    return
  fi
  if (!grep -qF 'Sitemap: https://aplus1.app/sitemap.xml' "$body_file"; then
    echo "FAIL /robots.txt missing Sitemap aplus1.app"
    seo_fail=1
  fi
  if ! grep -qF 'Disallow: /portfolio/saved' "$body_file"; then
    echo "FAIL /robots.txt missing Disallow /portfolio/saved"
    seo_fail=1
  fi
  if grep -qi 'Sitemap:.*pixel100\.com' "$body_file"; then
    echo "FAIL /robots.txt Sitemap still points at pixel100.com"
    seo_fail=1
  fi
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /robots.txt SEO content"
  else
    fail=1
  fi
}

check_sitemap_xml() {
  local url="${BASE_URL}/sitemap.xml"
  local code
  local seo_fail=0
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /sitemap.xml SEO check status=${code}"
    fail=1
    return
  fi
  if ! grep -q '<urlset' "$body_file"; then
    echo "FAIL /sitemap.xml missing urlset root"
    seo_fail=1
  fi
  if ! grep -q '/legal/community' "$body_file"; then
    echo "FAIL /sitemap.xml missing /legal/community"
    seo_fail=1
  fi
  if grep -qE '<loc>[^<]*/admin</loc>|<loc>[^<]*/auth</loc>' "$body_file"; then
    echo "FAIL /sitemap.xml contains private route"
    seo_fail=1
  fi
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /sitemap.xml SEO content"
  else
    fail=1
  fi
}

check_sitemap_index() {
  local url="${BASE_URL}/sitemap-index.xml"
  local code
  local seo_fail=0
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /sitemap-index.xml SEO check status=${code}"
    fail=1
    return
  fi
  if ! grep -q '<sitemapindex' "$body_file"; then
    echo "FAIL /sitemap-index.xml missing sitemapindex root"
    seo_fail=1
  fi
  if ! grep -q 'sitemap-static.xml' "$body_file"; then
    echo "FAIL /sitemap-index.xml missing sitemap-static.xml"
    seo_fail=1
  fi
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /sitemap-index.xml SEO content"
  else
    fail=1
  fi
}

echo "==> Public smoke against ${BASE_URL}"

check_security_headers() {
  local headers
  headers=$(curl -sSI --max-time 30 "${BASE_URL}/" 2>/dev/null || true)
  if echo "$headers" | grep -qi "strict-transport-security:"; then
    echo "OK   HSTS response header"
  else
    echo "WARN HSTS header missing (expected on Vercel/nginx production)"
  fi
  if echo "$headers" | grep -Eiq "content-security-policy:"; then
    echo "OK   CSP enforce response header"
  elif echo "$headers" | grep -Eiq "content-security-policy-report-only:"; then
    echo "OK   CSP report-only response header"
  else
    echo "WARN CSP header missing on response (local dev uses index.html meta)"
  fi
}

check_security_headers

for path in "${PATHS[@]}"; do
  url="${BASE_URL}${path}"
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL ${path} status=${code}"
    fail=1
    continue
  fi
  if grep -qi 'service_role' "$body_file"; then
    echo "FAIL ${path} leaks service_role in HTML"
    fail=1
    continue
  fi
  echo "OK   ${path} status=${code}"
done

echo "==> SEO asset checks"
check_robots_txt
check_sitemap_xml
check_sitemap_index

dash_url=$(curl -sS -o /dev/null -w "%{url_effective}" -L --max-time 30 "${BASE_URL}/chat" || echo "")
if [[ "$dash_url" == *"/chat"* && "$dash_url" != *"/auth"* ]]; then
  echo "WARN /chat final URL still on /chat — verify client redirect to /auth in browser"
else
  echo "OK   /chat guest redirect (final: ${dash_url})"
fi

admin_url=$(curl -sS -o /dev/null -w "%{url_effective}" -L --max-time 30 "${BASE_URL}/admin" || echo "")
if [[ "$admin_url" == *"/admin"* && "$admin_url" != *"/auth"* ]]; then
  echo "WARN /admin final URL still on /admin — verify redirect in browser"
else
  echo "OK   /admin guest redirect (final: ${admin_url})"
fi

rm -f "$body_file"

if [[ "$fail" -ne 0 ]]; then
  echo "==> Public smoke FAILED"
  exit 1
fi

echo "==> Public smoke PASSED"
