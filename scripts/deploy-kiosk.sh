#!/bin/bash
# Deploy Chi-Pins to Kiosk Device
# Usage: ./scripts/deploy-kiosk.sh [device_ip:port] [--fresh]
#
# Examples:
#   ./scripts/deploy-kiosk.sh 192.168.2.112:38081          # Quick update
#   ./scripts/deploy-kiosk.sh 192.168.2.112:38081 --fresh  # Full reinstall

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default device
DEVICE="${1:-192.168.2.112:38081}"
FRESH_INSTALL="${2}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Chi-Pins Kiosk Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Target Device:${NC} $DEVICE"
echo -e "${YELLOW}Install Type:${NC} $([ "$FRESH_INSTALL" = "--fresh" ] && echo "Fresh (uninstall + reinstall)" || echo "Quick update")"
echo ""

# Step 1: Check device connection
echo -e "${BLUE}[1/7]${NC} Checking device connection..."
if ! adb -s "$DEVICE" shell "echo connected" > /dev/null 2>&1; then
    echo -e "${RED}✗ Device $DEVICE not connected!${NC}"
    echo ""
    echo "Available devices:"
    adb devices -l
    echo ""
    echo "To connect: adb connect $DEVICE"
    exit 1
fi
echo -e "${GREEN}✓ Device connected${NC}"
echo ""

# Step 2: Build web assets
echo -e "${BLUE}[2/7]${NC} Building web assets..."
npm run build
echo -e "${GREEN}✓ Web build complete${NC}"
echo ""

# Step 3: Sync Capacitor
echo -e "${BLUE}[3/7]${NC} Syncing Capacitor..."
npx cap sync android
npx cap copy android
echo -e "${GREEN}✓ Capacitor sync complete${NC}"
echo ""

# Step 4: Build Android APK
echo -e "${BLUE}[4/7]${NC} Building Android APK..."
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./android/gradlew -p ./android assembleDebug --quiet
echo -e "${GREEN}✓ APK build complete${NC}"
echo ""

# Step 5: Stop any running audio
echo -e "${BLUE}[5/7]${NC} Stopping audio and app..."
adb -s "$DEVICE" shell "input keyevent 85" 2>/dev/null || true
adb -s "$DEVICE" shell "am force-stop com.chicagomikes.chipins" 2>/dev/null || true
echo -e "${GREEN}✓ App stopped${NC}"
echo ""

# Step 6: Install APK
echo -e "${BLUE}[6/7]${NC} Installing APK..."
if [ "$FRESH_INSTALL" = "--fresh" ]; then
    echo "  • Uninstalling old version..."
    adb -s "$DEVICE" uninstall com.chicagomikes.chipins 2>/dev/null || true
    echo "  • Installing fresh APK..."
    adb -s "$DEVICE" install android/app/build/outputs/apk/debug/app-debug.apk
else
    echo "  • Updating existing installation..."
    adb -s "$DEVICE" install -r android/app/build/outputs/apk/debug/app-debug.apk
fi
echo -e "${GREEN}✓ Installation complete${NC}"
echo ""

# Step 7: Launch app
echo -e "${BLUE}[7/7]${NC} Launching app..."
adb -s "$DEVICE" shell "am start -n com.chicagomikes.chipins/.MainActivity"
echo -e "${GREEN}✓ App launched${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "To monitor logs:"
echo "  adb -s $DEVICE logcat | grep -i 'proximity\\|ambient\\|beep\\|console'"
echo ""
