#!/bin/bash
# Disable Android touch/pointer visual indicators
# This removes the finger tracking effects on the kiosk screen

ADB_DEVICE="192.168.2.112:40585"

echo "🔧 Disabling touch visual indicators on kiosk..."

# Disable "Show taps" (circles that appear when you touch the screen)
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell settings put system show_touches 0

# Disable "Pointer location" (crosshair/line tracking finger movement)
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell settings put system pointer_location 0

echo "✅ Touch indicators disabled"
echo ""
echo "Current settings:"
echo "  Show taps: $(/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell settings get system show_touches)"
echo "  Pointer location: $(/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s "$ADB_DEVICE" shell settings get system pointer_location)"
