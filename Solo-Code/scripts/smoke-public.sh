#!/usr/bin/env bash
# Public-route smoke — no auth, no Playwright required.
# Usage:
#   ./scripts/smoke-public.sh
#   BASE_URL=https://solofreelancer.com ./scripts/smoke-public.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"

# Must pass — gate fails if any of these fail
CORE_PATHS=(
  "/"
  "/pricing"
  "/blog"
  "/terms"
  "/privacy"
  "/cookies"
  "/auth"
  "/apply"
  "/robots.txt"
  "/sitemap.xml"
)

# Warn only — newer routes may lag on production deploy
EXTENDED_PATHS=(
  "/auth/forgot"
  "/help"
  "/help/getting-started"
  "/help/payments"
  "/help/line"
  "/creative-partner"
  "/labs"
  "/refund"
  "/survey"
  "/research"
)

fail=0
body_file="/tmp/smoke-body-$$.html"

check_path() {
  local path="$1"
  local strict="$2"
  local url="${BASE_URL}${path}"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    if [[ "$strict" == "1" ]]; then
      echo "FAIL ${path} status=${code}"
      fail=1
    else
      echo "WARN ${path} status=${code} (extended — deploy หรือเทส local)"
    fi
    return
  fi
  if grep -qi 'service_role' "$body_file"; then
    echo "FAIL ${path} leaks service_role in HTML"
    fail=1
    return
  fi
  echo "OK   ${path} status=${code}"
}

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
  for rule in 'Disallow: /dashboard' 'Disallow: /admin' 'Sitemap:'; do
    if ! grep -qF "$rule" "$body_file"; then
      echo "FAIL /robots.txt missing ${rule}"
      seo_fail=1
    fi
  done
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /robots.txt SEO content"
  else
    fail=1
  fi
}

check_sitemap_xml() {
  if [[ "${SMOKE_SKIP_SITEMAP_CONTENT:-}" == "1" ]]; then
    echo "SKIP /sitemap.xml content (SMOKE_SKIP_SITEMAP_CONTENT=1)"
    return
  fi
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
  if ! grep -q '/pricing' "$body_file"; then
    if [[ "${SMOKE_SEO_STRICT:-}" == "1" ]]; then
      echo "FAIL /sitemap.xml missing /pricing"
      seo_fail=1
    else
      echo "WARN /sitemap.xml missing /pricing (set SMOKE_SEO_STRICT=1 to fail)"
    fi
  fi
  if ! grep -q '/help/payments' "$body_file"; then
    if [[ "${SMOKE_SEO_STRICT:-}" == "1" ]]; then
      echo "FAIL /sitemap.xml missing /help/payments"
      seo_fail=1
    else
      echo "WARN /sitemap.xml missing /help/payments (set SMOKE_SEO_STRICT=1 to fail)"
    fi
  fi
  if grep -qE '<loc>[^<]*/dashboard</loc>|<loc>[^<]*/admin</loc>' "$body_file"; then
    echo "FAIL /sitemap.xml contains private route"
    seo_fail=1
  fi
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /sitemap.xml SEO content"
  else
    fail=1
  fi
}

check_auth_noindex() {
  local url="${BASE_URL}/auth"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "WARN /auth noindex check skipped status=${code}"
    return
  fi
  if ! grep -qi 'noindex' "$body_file"; then
    echo "FAIL /auth missing noindex meta"
    fail=1
    return
  fi
  echo "OK   /auth noindex meta"
}

check_llms_txt() {
  local url="${BASE_URL}/llms.txt"
  local code
  local seo_fail=0
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /llms.txt SEO check status=${code}"
    fail=1
    return
  fi
  for needle in 'So1o Freelancer' '/pricing' '/blog' '/help'; do
    if ! grep -qF "$needle" "$body_file"; then
      if [[ "${SMOKE_SEO_STRICT:-}" == "1" ]]; then
        echo "FAIL /llms.txt missing ${needle}"
        seo_fail=1
      else
        echo "WARN /llms.txt missing ${needle}"
      fi
    fi
  done
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /llms.txt SEO content"
  else
    fail=1
  fi
}

echo "==> Public smoke against ${BASE_URL}"

for path in "${CORE_PATHS[@]}"; do
  check_path "$path" 1
done

for path in "${EXTENDED_PATHS[@]}"; do
  check_path "$path" 0
done

echo "==> SEO asset checks"
check_robots_txt
check_sitemap_xml
check_auth_noindex
check_llms_txt

admin_url=$(curl -sS -o /dev/null -w "%{url_effective}" -L --max-time 30 "${BASE_URL}/admin" || echo "")
if [[ "$admin_url" == *"/admin"* && "$admin_url" != *"/auth"* ]]; then
  echo "WARN /admin final URL still on /admin — verify redirect in browser (Puppeteer)"
else
  echo "OK   /admin guest redirect (final: ${admin_url})"
fi

dash_url=$(curl -sS -o /dev/null -w "%{url_effective}" -L --max-time 30 "${BASE_URL}/dashboard" || echo "")
if [[ "$dash_url" == *"/dashboard"* && "$dash_url" != *"/auth"* ]]; then
  echo "WARN /dashboard final URL still on /dashboard — verify redirect in browser (Puppeteer)"
else
  echo "OK   /dashboard guest redirect (final: ${dash_url})"
fi

labs_url=$(curl -sS -o /dev/null -w "%{url_effective}" -L --max-time 30 "${BASE_URL}/labs" || echo "")
if [[ "$labs_url" == *"/labs"* && "$labs_url" != *"/auth"* ]]; then
  echo "WARN /labs final URL still on /labs — verify RequireAuth redirect"
else
  echo "OK   /labs guest redirect (final: ${labs_url})"
fi

rm -f "$body_file"

if [[ "$fail" -ne 0 ]]; then
  echo "==> Public smoke FAILED"
  exit 1
fi

echo "==> Public smoke PASSED"
