#!/bin/bash
# Download latest APK from GitHub and push to kiosk via ADB
# Requires ADB connection (USB or wireless)

set -e

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

echo "📱 Checking ADB connection..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICE_COUNT" -eq "0" ]; then
  echo "❌ No ADB device connected"
  echo ""
  echo "To connect via WiFi:"
  echo "  adb connect 192.168.1.112:5555"
  echo ""
  echo "Or connect via USB and enable USB debugging"
  exit 1
fi

echo "📤 Installing APK to kiosk..."
# Use -r flag to reinstall, keeping app data (including cached map tiles)
# Use -s to specify device if multiple are connected
DEVICE_ID=$(adb devices | grep -v "List" | grep "device$" | head -1 | awk '{print $1}')

if [ -z "$DEVICE_ID" ]; then
  adb install -r "/tmp/$APK_NAME"
else
  adb -s "$DEVICE_ID" install -r "/tmp/$APK_NAME"
fi

echo "✅ Done! APK installed successfully."

# Cleanup
rm "/tmp/$APK_NAME"
