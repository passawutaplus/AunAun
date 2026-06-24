#!/usr/bin/env bash
# Install Supabase CLI binary to ./bin/supabase (works when npx supabase fails on Node 24+)
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${SUPABASE_CLI_VERSION:-2.20.12}"
ARCH="linux_amd64"
URL="https://github.com/supabase/cli/releases/download/v${VERSION}/supabase_${ARCH}.tar.gz"
DEST="bin/supabase"

mkdir -p bin
echo "→ Downloading Supabase CLI v${VERSION}..."
curl -fsSL "$URL" -o /tmp/supabase-cli.tar.gz
tar -xzf /tmp/supabase-cli.tar.gz -C /tmp supabase
mv /tmp/supabase "$DEST"
chmod +x "$DEST"
rm -f /tmp/supabase-cli.tar.gz

echo "✓ Installed: $DEST"
"$DEST" --version
