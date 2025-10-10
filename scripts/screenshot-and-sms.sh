#!/bin/bash
# Screenshot and send via SMS
# Usage: ./scripts/screenshot-and-sms.sh "Message text"

ADB_DEVICE="192.168.2.112:40585"
SCREENSHOT_PATH="/sdcard/screenshot.png"
LOCAL_PATH="./screenshot.png"
MESSAGE="${1:-Screenshot from kiosk}"

echo "📸 Taking screenshot from kiosk..."

# Take screenshot on device
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell screencap -p "$SCREENSHOT_PATH"

# Pull screenshot to local machine
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" pull "$SCREENSHOT_PATH" "$LOCAL_PATH"

echo "✅ Screenshot saved to $LOCAL_PATH"

# Upload to image hosting (could use Vercel's /api/upload-screenshot endpoint)
# Then send via Twilio MMS

echo "📱 To send via MMS, you would need to:"
echo "1. Upload screenshot to a public URL (Vercel API, S3, etc.)"
echo "2. Use Twilio to send MMS with the image URL"
echo ""
echo "Example Twilio MMS code (Node.js):"
echo "const twilio = require('twilio');"
echo "const client = twilio(accountSid, authToken);"
echo "client.messages.create({"
echo "  body: '$MESSAGE',"
echo "  from: '+1234567890',"
echo "  to: '+17204507540',"
echo "  mediaUrl: ['https://your-domain.com/screenshot.png']"
echo "});"
