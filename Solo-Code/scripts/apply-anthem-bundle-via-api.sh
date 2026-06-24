#!/usr/bin/env bash
# Apply supabase/manual/apply-anthem-ecosystem.sql in chunks via Management API
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-rvnzjiskqliexysicfmh}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"
BUNDLE="supabase/manual/apply-anthem-ecosystem.sql"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠  ตั้ง SUPABASE_ACCESS_TOKEN ก่อน"
  exit 1
fi

python3 - "$BUNDLE" "$API" <<'PY'
import json, re, subprocess, sys, tempfile, os

bundle_path, api = sys.argv[1:3]
token = os.environ["SUPABASE_ACCESS_TOKEN"]
raw = open(bundle_path, encoding="utf-8").read()
parts = re.split(r"(?=-- ── )", raw)
chunks = [p.strip() for p in parts if p.strip()]

ok = skip = 0
for i, sql in enumerate(chunks):
    if i == 0:
        skip += 1
        continue
    head = sql[:300].lower()
    if head.strip().startswith("-- skipped") or re.match(r"^-- skipped\b", sql.strip(), re.I):
        skip += 1
        continue
    title = sql.splitlines()[0][:80]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"query": sql}, f)
        payload = f.name
    try:
        proc = subprocess.run(
            [
                "curl", "-s", "-w", "\n%{http_code}",
                "-X", "POST", api,
                "-H", f"Authorization: Bearer {token}",
                "-H", "Content-Type: application/json",
                "-d", f"@{payload}",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
    finally:
        os.unlink(payload)
    out = proc.stdout
    if "\n" not in out:
        print(f"✗ [{i}] curl failed: {title}")
        print(proc.stderr[:400])
        sys.exit(1)
    body, code = out.rsplit("\n", 1)
    if code in ("200", "201"):
        ok += 1
        print(f"✓ [{i}] {title}")
        continue
    benign = False
    if benign:
        skip += 1
        print(f"~ [{i}] benign ({code}): {title}")
        continue
    print(f"✗ [{i}] HTTP {code}: {title}")
    print(body[:700])
    sys.exit(1)

print(f"\n✓ Applied {ok} chunks ({skip} skipped)")
PY
