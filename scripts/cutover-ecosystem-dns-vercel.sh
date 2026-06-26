#!/usr/bin/env bash
# DNS + Vercel domain setup for ecosystem hosts (Ops Hub hq, Pixel100 an1hem).
#
# Usage:
#   ./scripts/cutover-ecosystem-dns-vercel.sh              # status + instructions
#   ./scripts/cutover-ecosystem-dns-vercel.sh --apply      # update name.com (needs env)
#   ./scripts/cutover-ecosystem-dns-vercel.sh --wait       # poll hq DNS then smoke
#
# name.com API (for --apply on solofreelancer.com subdomain):
#   export NAMECOM_USERNAME=your_name.com_username
#   export NAMECOM_API_TOKEN=your_api_token
set -euo pipefail
cd "$(dirname "$0")/.."

VERCEL_A="76.76.21.21"
VERCEL_WWW_CNAME="cname.vercel-dns.com"
PARENT_DOMAIN="solofreelancer.com"
HQ_HOST="hq.solofreelancer.com"
ANTHEM_APEX="aplus1.app"
ANTHEM_WWW="www.aplus1.app"
OPS_PROJECT="so1o-ops-hub"
ANTHEM_PROJECT="aplus1-prod"
NAMECOM_API="https://api.name.com/v4/domains/${PARENT_DOMAIN}/records"

resolve_a() {
  local host="$1"
  curl -sS "https://dns.google/resolve?name=${host}&type=A" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((a['data'] for a in d.get('Answer',[]) if a.get('type')==1), ''))"
}

ensure_vercel_domain() {
  local dir="$1" project="$2" domain="$3"
  if [[ ! -f "$dir/.vercel/project.json" ]]; then
    (cd "$dir" && npx vercel link --yes --project="$project")
  fi
  if (cd "$dir" && npx vercel domains inspect "$domain" >/dev/null 2>&1); then
    echo "✓ Vercel: $domain already on $project"
  else
    echo "→ Adding $domain to Vercel project $project…"
    (cd "$dir" && npx vercel domains add "$domain") || echo "  (add failed — check prod deploy / domain ownership)"
  fi
}

print_status() {
  local hq_a an1hem_a
  hq_a="$(resolve_a "$HQ_HOST" || true)"
  an1hem_a="$(resolve_a "$ANTHEM_APEX" || true)"

  cat <<EOF

Ecosystem DNS status ($(date -u +%Y-%m-%dT%H:%MZ))

  ${PARENT_DOMAIN}          → $(resolve_a "$PARENT_DOMAIN" || echo "?") (expected ${VERCEL_A})
  ${HQ_HOST}                → ${hq_a:-NXDOMAIN} (expected ${VERCEL_A})
  ${ANTHEM_APEX}            → ${an1hem_a:-NXDOMAIN} (expected ${VERCEL_A} after domain registration)
  ${ANTHEM_WWW}             → CNAME → ${VERCEL_WWW_CNAME}
  pixel100.com              → not registered yet — use https://aplus1-demo.vercel.app

Required DNS records:

  Ops Hub (${HQ_HOST}) on ${PARENT_DOMAIN} zone at name.com:
    Type   Host   Value
    A      hq     ${VERCEL_A}

  Pixel100 production (${ANTHEM_APEX}) after registering an1hem.app:
    Type   Host   Value
    A      @      ${VERCEL_A}
    CNAME  www    ${VERCEL_WWW_CNAME}

After DNS propagates (~5 min):
  curl -sS -o /dev/null -w "%{http_code}" https://${HQ_HOST}/
  ANTHEM_URL=https://${ANTHEM_APEX} ./scripts/health-check.sh

EOF
}

namecom_auth() {
  : "${NAMECOM_USERNAME:?Set NAMECOM_USERNAME (name.com account username)}"
  : "${NAMECOM_API_TOKEN:?Set NAMECOM_API_TOKEN (name.com API token)}"
}

namecom_upsert_record() {
  local host="$1" type="$2" answer="$3" id="${4:-}"
  local payload
  payload=$(python3 - <<PY
import json
print(json.dumps({"host": "${host}", "type": "${type}", "answer": "${answer}", "ttl": 300}))
PY
)
  if [[ -n "$id" ]]; then
    curl -sS -u "${NAMECOM_USERNAME}:${NAMECOM_API_TOKEN}" \
      -X PUT "${NAMECOM_API}/${id}" -H "Content-Type: application/json" -d "$payload"
  else
    curl -sS -u "${NAMECOM_USERNAME}:${NAMECOM_API_TOKEN}" \
      -X POST "${NAMECOM_API}" -H "Content-Type: application/json" -d "$payload"
  fi
}

apply_hq_dns() {
  namecom_auth
  echo "→ Updating hq A record at name.com (${PARENT_DOMAIN})…"
  local records_json hq_id
  records_json=$(curl -sS -u "${NAMECOM_USERNAME}:${NAMECOM_API_TOKEN}" "${NAMECOM_API}")
  hq_id=$(echo "$records_json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('records',[]):
  if r.get('type')=='A' and r.get('host')=='hq':
    print(r['id']); break
")
  namecom_upsert_record "hq" "A" "${VERCEL_A}" "${hq_id:-}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ok id', r.get('id','?'))" 2>/dev/null || true
  echo "✓ hq A record submitted"
}

WAIT=false
APPLY=false
for arg in "$@"; do
  case "$arg" in
    --wait) WAIT=true ;;
    --apply) APPLY=true ;;
  esac
done

echo "→ Linking Vercel domains…"
ensure_vercel_domain "Ops-Hub" "$OPS_PROJECT" "$HQ_HOST"
ensure_vercel_domain "Anthem-Code" "$ANTHEM_PROJECT" "$ANTHEM_APEX"
ensure_vercel_domain "Anthem-Code" "$ANTHEM_PROJECT" "$ANTHEM_WWW"

if [[ "$APPLY" == true ]]; then
  apply_hq_dns
  WAIT=true
fi

hq_current="$(resolve_a "$HQ_HOST" || true)"
if [[ "$hq_current" == "$VERCEL_A" ]]; then
  echo "✓ ${HQ_HOST} points to Vercel"
  curl -sS -o /dev/null -w "hq HTTP %{http_code}\n" "https://${HQ_HOST}/" || true
  exit 0
fi

print_status

if [[ "$WAIT" != true ]]; then
  exit 0
fi

echo "→ Waiting for ${HQ_HOST} → ${VERCEL_A}…"
for _ in $(seq 1 60); do
  sleep 10
  hq_current="$(resolve_a "$HQ_HOST" || true)"
  if [[ "$hq_current" == "$VERCEL_A" ]]; then
    echo "✓ DNS propagated"
    curl -sS -o /dev/null -w "hq HTTP %{http_code}\n" "https://${HQ_HOST}/"
    exit 0
  fi
  echo "   still ${hq_current:-unknown}…"
done

echo "Timed out. Set hq A → ${VERCEL_A} at name.com then re-run: $0 --wait" >&2
exit 1
