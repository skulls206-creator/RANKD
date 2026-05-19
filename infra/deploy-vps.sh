#!/usr/bin/env bash
# Deploy RANKD API server to VPS (uam.khurk.xyz)
#
# Run this ON THE VPS after pulling the built dist/
#
# 1. Copy the bundle to the VPS:
#    scp -r artifacts/api-server/dist/ root@15.204.177.133:/opt/rankd-api/
#    scp infra/rankd-api.service root@15.204.177.133:/etc/systemd/system/
#
# 2. SSH into VPS and run this script

set -euo pipefail

API_DIR="/opt/rankd-api"
PORT="${RANKD_API_PORT:-3001}"
UAM_TOKEN="${UAM_API_TOKEN}"

if [[ -z "$UAM_TOKEN" ]]; then
  echo "ERROR: UAM_API_TOKEN env var required"
  echo "Set it before running or add to rankd-api.service"
  exit 1
fi

echo "=== Installing RANKD API server ==="

# Create directory if needed
mkdir -p "$API_DIR"

# Copy dist files (they should already be scp'd)
if [[ ! -f "$API_DIR/index.mjs" ]]; then
  echo "ERROR: $API_DIR/index.mjs not found. scp the dist/ contents first."
  exit 1
fi

# Create env file
cat > "$API_DIR/.env" <<EOF
PORT=$PORT
UAM_API_TOKEN=$UAM_TOKEN
CORS_ALLOWED_ORIGINS=https://skulls206-creator.github.io,https://rankd.khurk.xyz
EOF

# Setup systemd service
cp /opt/rankd-api/rankd-api.service /etc/systemd/system/rankd-api.service
systemctl daemon-reload
systemctl enable rankd-api
systemctl restart rankd-api

echo "=== rankd-api service started on port $PORT ==="

# Update Caddy config
CADDYFILE="/etc/caddy/Caddyfile"
if grep -q "uam.khurk.xyz" "$CADDYFILE"; then
  # Add handle_path if not already there
  if ! grep -q "handle_path /api/rankd" "$CADDYFILE"; then
    echo ""

    # Find the closing brace of the uam.khurk.xyz block and insert before it
    # This is fragile — manually add the handle_path block instead
    echo "⚠️  MANUAL STEP REQUIRED:"
    echo "   Add this to /etc/caddy/Caddyfile inside the uam.khurk.xyz block:"
    echo ""
    echo "       handle_path /api/rankd/* {"
    echo "           reverse_proxy localhost:${PORT}"
    echo "       }"
    echo ""
    echo "   Then: caddy reload --config /etc/caddy/Caddyfile"
  else
    systemctl reload caddy || caddy reload --config "$CADDYFILE"
  fi
else
  echo "⚠️  No uam.khurk.xyz site block found in Caddyfile"
  echo "   Manual Caddy config required"
fi

echo ""
echo "=== Deployment complete ==="
echo "Test: curl https://uam.khurk.xyz/api/rankd/healthz"
