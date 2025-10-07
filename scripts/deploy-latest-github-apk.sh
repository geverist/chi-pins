#!/bin/bash
# Download latest APK from GitHub releases and install via ADB
# Usage: ./scripts/deploy-latest-github-apk.sh <adb-device-ip:port>

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <adb-device-ip:port>"
    echo "Example: $0 192.168.1.112:45275"
    exit 1
fi

DEVICE=$1
TMP_DIR=$(mktemp -d)
APK_PATH="$TMP_DIR/chi-pins-latest.apk"

echo "📦 Fetching latest APK from GitHub..."

# Get latest APK URL
LATEST_APK_URL=$(curl -s 'https://api.github.com/repos/geverist/chi-pins/releases/latest' | \
    python3 -c "import sys, json; data = json.load(sys.stdin); apks = [a for a in data['assets'] if a['name'].endswith('.apk')]; apks.sort(key=lambda x: x['name'], reverse=True); print(apks[0]['browser_download_url'])")

if [ -z "$LATEST_APK_URL" ]; then
    echo "❌ Failed to get latest APK URL"
    exit 1
fi

echo "📥 Downloading from: $LATEST_APK_URL"
curl -sL -o "$APK_PATH" "$LATEST_APK_URL"

echo "✅ Downloaded APK ($(ls -lh "$APK_PATH" | awk '{print $5}'))"

echo "🔌 Connecting to device: $DEVICE"
adb connect "$DEVICE"

echo "📲 Installing APK..."
adb -s "$DEVICE" install -r "$APK_PATH"

echo "🧹 Cleaning up..."
rm -rf "$TMP_DIR"

echo "✅ Deployment complete!"
