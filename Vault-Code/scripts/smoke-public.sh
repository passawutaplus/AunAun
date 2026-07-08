#!/usr/bin/env bash
# Public-route smoke for A+ Vault — no auth, no Playwright required.
# Usage:
#   ./scripts/smoke-public.sh
#   BASE_URL=https://aplus-vault.vercel.app ./scripts/smoke-public.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://aplus-vault.vercel.app}"

CORE_PATHS=(
  "/"
  "/vault"
  "/legal"
)

fail=0
body_file="/tmp/vault-smoke-body-$$.html"
json_file="/tmp/vault-smoke-json-$$.json"

check_path() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL ${path} status=${code}"
    fail=1
    return
  fi
  if grep -qi 'service_role' "$body_file"; then
    echo "FAIL ${path} leaks service_role in HTML"
    fail=1
    return
  fi
  echo "OK   ${path} status=${code}"
}

check_noindex() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL ${path} noindex check status=${code}"
    fail=1
    return
  fi
  if ! grep -qi 'noindex' "$body_file"; then
    echo "FAIL ${path} missing noindex meta"
    fail=1
    return
  fi
  echo "OK   ${path} noindex meta"
}

check_demo_redirect() {
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" -L --max-time 30 "${BASE_URL}/demo" || echo "000")
  if [[ "$code" != "200" ]]; then
    echo "FAIL /demo redirect status=${code}"
    fail=1
    return
  fi
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "${BASE_URL}/demo" || echo "000")
  if ! grep -qi 'A+ Vault' "$body_file" || grep -q 'Private Alpha Demo Guide' "$body_file"; then
    echo "FAIL /demo should redirect to vault workspace"
    fail=1
    return
  fi
  echo "OK   /demo redirects to vault"
}

check_legal_extension_privacy() {
  local url="${BASE_URL}/legal"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /legal extension-privacy check status=${code}"
    fail=1
    return
  fi
  if ! grep -q 'id="extension-privacy"' "$body_file"; then
    echo "FAIL /legal missing extension-privacy section"
    fail=1
    return
  fi
  echo "OK   /legal extension-privacy section"
}

check_health() {
  local url="${BASE_URL}/api/vault/health"
  local code
  code=$(curl -sS -o "$json_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /api/vault/health status=${code}"
    fail=1
    return
  fi
  if ! grep -q '"storage"' "$json_file" || ! grep -q 'supabase' "$json_file"; then
    echo "FAIL /api/vault/health missing storage:supabase"
    fail=1
    return
  fi
  echo "OK   /api/vault/health storage=supabase"
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
  for rule in 'Disallow: /vault' 'Disallow: /demo' 'Disallow: /api/' 'Sitemap:'; do
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
  if ! grep -q '/legal' "$body_file"; then
    echo "FAIL /sitemap.xml missing /legal"
    seo_fail=1
  fi
  if grep -qE '<loc>[^<]*/vault</loc>|<loc>[^<]*/demo</loc>' "$body_file"; then
    echo "FAIL /sitemap.xml contains private route"
    seo_fail=1
  fi
  if [[ "$seo_fail" -eq 0 ]]; then
    echo "OK   /sitemap.xml SEO content"
  else
    fail=1
  fi
}

check_llms_txt() {
  local url="${BASE_URL}/llms.txt"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /llms.txt SEO check status=${code}"
    fail=1
    return
  fi
  if ! grep -qF 'A+ Vault' "$body_file"; then
    echo "FAIL /llms.txt missing A+ Vault"
    fail=1
    return
  fi
  if ! grep -q '/legal' "$body_file"; then
    echo "FAIL /llms.txt missing /legal"
    fail=1
    return
  fi
  echo "OK   /llms.txt SEO content"
}

check_legal_indexable() {
  local url="${BASE_URL}/legal"
  local code
  code=$(curl -sS -o "$body_file" -w "%{http_code}" -L --max-time 30 "$url" || echo "000")
  if [[ "$code" == "000" ]] || [[ "$code" -ge 400 ]]; then
    echo "FAIL /legal indexable check status=${code}"
    fail=1
    return
  fi
  if grep -qi 'noindex' "$body_file"; then
    echo "FAIL /legal should be indexable (no noindex)"
    fail=1
    return
  fi
  echo "OK   /legal indexable meta"
}

echo "==> Vault public smoke against ${BASE_URL}"

for path in "${CORE_PATHS[@]}"; do
  check_path "$path"
done

check_demo_redirect
check_legal_extension_privacy
check_health

echo "==> SEO asset checks"
check_robots_txt
check_sitemap_xml
check_llms_txt

echo "==> noindex checks (private alpha app)"
for path in "/" ; do
  check_noindex "$path"
done

check_legal_indexable

rm -f "$body_file" "$json_file"

if [[ "$fail" -ne 0 ]]; then
  echo "==> Vault public smoke FAILED"
  exit 1
fi

echo "==> Vault public smoke PASSED"
