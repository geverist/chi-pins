#!/bin/bash
# Quick Kiosk Commands - Chi-Pins
# Your tablet: 192.168.1.202

TABLET_IP="192.168.1.202"
PASSWORD="1234"
BASE_URL="http://$TABLET_IP:2323"

# Reload the kiosk (after deploying updates)
alias kiosk-reload='curl "$BASE_URL/?cmd=reload&password=$PASSWORD"'

# Clear cache and reload (force fresh load)
alias kiosk-refresh='curl "$BASE_URL/?cmd=clearCache&password=$PASSWORD" && sleep 1 && curl "$BASE_URL/?cmd=reload&password=$PASSWORD"'

# Take a screenshot
alias kiosk-screenshot='curl "$BASE_URL/?cmd=getScreenshot&password=$PASSWORD" > kiosk-$(date +%Y%m%d-%H%M%S).jpg && echo "Screenshot saved"'

# Get device info
alias kiosk-info='curl "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json" | python3 -m json.tool'

# Restart the Fully Kiosk app
alias kiosk-restart='curl "$BASE_URL/?cmd=restartApp&password=$PASSWORD"'

# Open web admin in browser
alias kiosk-admin='open "http://192.168.1.202:2323"'

echo "Kiosk commands loaded!"
echo ""
echo "Available commands:"
echo "  kiosk-reload       - Reload the page"
echo "  kiosk-refresh      - Clear cache and reload"
echo "  kiosk-screenshot   - Take a screenshot"
echo "  kiosk-info         - Get device information"
echo "  kiosk-restart      - Restart Fully Kiosk app"
echo "  kiosk-admin        - Open web admin"
echo ""
echo "Web Admin: http://192.168.1.202:2323"
echo "Password: 1234"
