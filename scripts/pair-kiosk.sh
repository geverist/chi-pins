#!/bin/bash
# Script to pair with kiosk via ADB wireless debugging
# Usage: ./scripts/pair-kiosk.sh <pairing-ip:port> <pairing-code>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <pairing-ip:port> <pairing-code>"
    echo "Example: $0 192.168.1.112:33751 456511"
    exit 1
fi

PAIRING_ADDR=$1
PAIRING_CODE=$2

echo "Pairing with $PAIRING_ADDR using code $PAIRING_CODE..."
echo "Please run this manually:"
echo ""
echo "  adb pair $PAIRING_ADDR"
echo ""
echo "Then enter the code when prompted: $PAIRING_CODE"
echo ""
echo "After pairing, you'll need the regular ADB port (not the pairing port)."
echo "Check the kiosk's 'Wireless debugging' screen for 'IP address & Port'."
echo "It will be something like 192.168.1.112:XXXXX"
echo ""
echo "Then connect with:"
echo "  adb connect <ip>:<port>"
