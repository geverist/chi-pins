#!/bin/bash
# Deploy latest APK to kiosk via SCP
# Usage: ./scripts/deploy-to-kiosk.sh [kiosk-ip] [kiosk-user]

set -e

KIOSK_IP="${1:-192.168.1.112}"
KIOSK_USER="${2:-defaultuser}"
REMOTE_PATH="/sdcard/Download/"

echo "📦 Fetching latest APK from GitHub releases..."

# Get latest APK name
APK_NAME=$(gh release view latest --json assets --jq '.assets[] | select(.name | endswith(".apk")) | .name' | sort -r | head -1)

if [ -z "$APK_NAME" ]; then
  echo "❌ No APK found in latest release"
  exit 1
fi

APK_URL="https://github.com/geverist/chi-pins/releases/download/latest/$APK_NAME"

echo "📥 Downloading $APK_NAME..."
curl -L -o "/tmp/$APK_NAME" "$APK_URL"

echo "📤 Uploading to kiosk at $KIOSK_IP..."
scp "/tmp/$APK_NAME" "$KIOSK_USER@$KIOSK_IP:$REMOTE_PATH"

echo "✅ APK uploaded to $REMOTE_PATH$APK_NAME"
echo ""
echo "On the kiosk, navigate to Downloads and tap $APK_NAME to install"

# Cleanup
rm "/tmp/$APK_NAME"
