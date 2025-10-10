#!/bin/bash

# Chi-Pins Kiosk Deployment Script with Debugging
# Deploys to kiosk device and captures logs for troubleshooting

set -e  # Exit on error

DEVICE_IP="192.168.2.112:40585"
PACKAGE_NAME="com.chipins.kiosk"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
BUILD_LOG="deployment-build.log"
INSTALL_LOG="deployment-install.log"

echo "🚀 Chi-Pins Kiosk Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Java version
echo -e "${BLUE}Step 1: Checking Java version...${NC}"
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "✓ Java found: $JAVA_VERSION"
else
    echo -e "${RED}✗ Java not found! Please install Java 21.${NC}"
    exit 1
fi

# Step 2: Clean previous build
echo ""
echo -e "${BLUE}Step 2: Cleaning previous build...${NC}"
rm -rf dist/
rm -rf android/app/build/
echo "✓ Cleaned dist/ and android/app/build/"

# Step 3: Run npm build
echo ""
echo -e "${BLUE}Step 3: Building web app...${NC}"
echo "Running: npm run build"
if npm run build 2>&1 | tee "$BUILD_LOG"; then
    echo -e "${GREEN}✓ Web build successful${NC}"

    # Check for large chunks warning
    if grep -q "Some chunks are larger than 500 kB" "$BUILD_LOG"; then
        echo -e "${YELLOW}⚠️  Warning: Large bundle size detected (this may cause slow loading)${NC}"
    fi
else
    echo -e "${RED}✗ Web build failed! Check $BUILD_LOG for details${NC}"
    exit 1
fi

# Step 4: Sync Capacitor
echo ""
echo -e "${BLUE}Step 4: Syncing Capacitor...${NC}"
npx cap sync android
echo "✓ Capacitor sync complete"

# Step 5: Build Android APK
echo ""
echo -e "${BLUE}Step 5: Building Android APK...${NC}"
echo "Using Java Home: ${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"

cd android
if ./gradlew assembleDebug --quiet; then
    cd ..
    echo -e "${GREEN}✓ Android APK built successfully${NC}"
else
    cd ..
    echo -e "${RED}✗ Android build failed!${NC}"
    exit 1
fi

# Check APK exists
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}✗ APK not found at $APK_PATH${NC}"
    exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "APK size: $APK_SIZE"

# Step 6: Connect to device
echo ""
echo -e "${BLUE}Step 6: Connecting to device...${NC}"
adb connect $DEVICE_IP 2>&1 | tee "$INSTALL_LOG"

# Wait for connection
sleep 2

# Check if device is connected
if adb devices | grep -q "$DEVICE_IP"; then
    echo -e "${GREEN}✓ Device connected${NC}"
else
    echo -e "${RED}✗ Device not connected. Make sure device is on network and ADB is enabled.${NC}"
    exit 1
fi

# Step 7: Install APK
echo ""
echo -e "${BLUE}Step 7: Installing APK on device...${NC}"
if adb -s $DEVICE_IP install -r "$APK_PATH" 2>&1 | tee -a "$INSTALL_LOG"; then
    echo -e "${GREEN}✓ APK installed successfully${NC}"
else
    echo -e "${RED}✗ APK installation failed! Check $INSTALL_LOG for details${NC}"
    exit 1
fi

# Step 8: Clear app data and cache (optional - helps with blank screen issues)
echo ""
echo -e "${BLUE}Step 8: Clearing app cache...${NC}"
adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME 2>&1 || echo "Note: Could not clear app data (app may not be installed yet)"

# Step 9: Launch app
echo ""
echo -e "${BLUE}Step 9: Launching app...${NC}"
adb -s $DEVICE_IP shell am start -n $PACKAGE_NAME/.MainActivity
sleep 2
echo "✓ App launched"

# Step 10: Monitor logs for errors
echo ""
echo -e "${BLUE}Step 10: Monitoring app logs for errors...${NC}"
echo "Watching logcat for 10 seconds (look for errors)..."
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop log monitoring${NC}"
echo ""

# Clear logcat and monitor for JavaScript errors
adb -s $DEVICE_IP logcat -c
timeout 10 adb -s $DEVICE_IP logcat -s chromium:E ReactNativeJS:E SystemWebViewClient:E 2>&1 | grep -i "error\|exception\|crash" || echo -e "${GREEN}✓ No errors detected in initial 10 seconds${NC}"

echo ""
echo "===================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Build log: $BUILD_LOG"
echo "Install log: $INSTALL_LOG"
echo ""
echo "To view live logs, run:"
echo "  adb -s $DEVICE_IP logcat | grep -i 'chromium\|capacitor\|error'"
echo ""
echo "To view full device logs:"
echo "  adb -s $DEVICE_IP logcat"
echo ""
