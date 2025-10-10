#!/bin/bash
# Send screenshot from kiosk via MMS
# Usage: ./scripts/send-screenshot.sh "Optional message"

ADB_DEVICE="192.168.2.112:40585"
SCREENSHOT_PATH="/sdcard/screenshot.png"
LOCAL_PATH="./screenshot.png"
MESSAGE="${1:-📸 Screenshot from kiosk}"
API_URL="https://chi-pins.vercel.app/api/screenshot-mms"

echo "📸 Taking screenshot from kiosk..."

# Take screenshot
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell screencap -p "$SCREENSHOT_PATH"

# Pull to local
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" pull "$SCREENSHOT_PATH" "$LOCAL_PATH"

echo "✅ Screenshot captured"

# Convert to base64
IMAGE_BASE64=$(base64 -i "$LOCAL_PATH")

echo "📤 Sending MMS..."

# Send via API
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\": \"$IMAGE_BASE64\", \"message\": \"$MESSAGE\"}"

echo ""
echo "✅ Screenshot sent via MMS!"

# Cleanup
rm "$LOCAL_PATH"
