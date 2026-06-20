#!/usr/bin/env bash
# Configure UFW on a VPS running Docker Compose (ecosystem / standalone).
# Opens SSH + HTTP/HTTPS only. Run as root on the VPS once after first boot.
#
# Usage:
#   sudo ./scripts/setup-vps-firewall.sh
#   sudo ./scripts/setup-vps-firewall.sh --ssh-port 2222
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssh-port)
      SSH_PORT="${2:?missing port}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: sudo $0 [--ssh-port PORT]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if ! command -v ufw >/dev/null 2>&1; then
  echo "Installing ufw…"
  apt-get update -qq
  apt-get install -y ufw
fi

echo "→ Resetting UFW to known baseline"
ufw --force reset

echo "→ Default deny incoming, allow outgoing"
ufw default deny incoming
ufw default allow outgoing

echo "→ Allow SSH (${SSH_PORT}), HTTP (80), HTTPS (443)"
ufw allow "${SSH_PORT}/tcp" comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

echo "→ Enabling UFW"
ufw --force enable
ufw status verbose

echo ""
echo "✓ VPS firewall active. Docker publishes only 80/443 via compose proxy/Caddy."
echo "  Production apps on Vercel do not need this script — see docs/firewall.md"
