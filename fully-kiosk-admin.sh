#!/bin/bash

# Fully Kiosk Browser - Remote Admin Quick Access Script
# This script helps you manage your kiosk tablet remotely

# Configuration - UPDATE THESE VALUES
TABLET_IP="192.168.1.202"  # Your tablet's IP address
PASSWORD="1234"             # Change to your Fully Kiosk remote admin password

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://$TABLET_IP:2323"

# Function to show menu
show_menu() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}    Fully Kiosk Browser - Remote Admin${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}Tablet IP:${NC} $TABLET_IP"
    echo -e "${GREEN}Web Admin:${NC} $BASE_URL"
    echo ""
    echo "1) Reload Page"
    echo "2) Clear Cache & Reload"
    echo "3) Take Screenshot"
    echo "4) Restart Fully Kiosk App"
    echo "5) Reboot Device"
    echo "6) Get Device Info"
    echo "7) Screen On"
    echo "8) Screen Off"
    echo "9) Open Web Admin in Browser"
    echo "10) Test Connection"
    echo ""
    echo "0) Exit"
    echo ""
    echo -e "${YELLOW}Enter choice:${NC} "
}

# Function to execute command
execute_cmd() {
    local cmd=$1
    local description=$2

    echo -e "${BLUE}$description...${NC}"

    response=$(curl -s "$BASE_URL/?cmd=$cmd&password=$PASSWORD")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        if [ ! -z "$response" ]; then
            echo "$response"
        fi
    else
        echo -e "${RED}✗ Failed - check IP address and password${NC}"
    fi
}

# Test connection
test_connection() {
    echo -e "${BLUE}Testing connection to $TABLET_IP...${NC}"

    if ping -c 1 -W 2 $TABLET_IP &> /dev/null; then
        echo -e "${GREEN}✓ Tablet is reachable${NC}"

        # Test Fully Kiosk API
        response=$(curl -s -w "%{http_code}" "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json")
        http_code="${response: -3}"

        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✓ Fully Kiosk Remote Admin is working${NC}"
        else
            echo -e "${RED}✗ Can't access Fully Kiosk API${NC}"
            echo -e "${YELLOW}Make sure Remote Administration is enabled in Fully Kiosk settings${NC}"
        fi
    else
        echo -e "${RED}✗ Cannot reach tablet${NC}"
        echo -e "${YELLOW}Check if tablet IP is correct: $TABLET_IP${NC}"
    fi
}

# Open web admin in browser
open_web_admin() {
    echo -e "${BLUE}Opening web admin in browser...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$BASE_URL"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$BASE_URL" 2>/dev/null || sensible-browser "$BASE_URL" 2>/dev/null
    else
        echo -e "${YELLOW}Open this URL in your browser:${NC} $BASE_URL"
    fi
}

# Get screenshot
get_screenshot() {
    echo -e "${BLUE}Taking screenshot...${NC}"
    filename="kiosk-screenshot-$(date +%Y%m%d-%H%M%S).jpg"
    curl -s "$BASE_URL/?cmd=getScreenshot&password=$PASSWORD" > "$filename"

    if [ -f "$filename" ]; then
        size=$(ls -lh "$filename" | awk '{print $5}')
        echo -e "${GREEN}✓ Screenshot saved: $filename ($size)${NC}"

        # Try to open the image
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$filename"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "$filename" 2>/dev/null
        fi
    else
        echo -e "${RED}✗ Failed to get screenshot${NC}"
    fi
}

# Get device info
get_device_info() {
    echo -e "${BLUE}Getting device info...${NC}"
    response=$(curl -s "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json")

    if [ ! -z "$response" ]; then
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}✗ Failed to get device info${NC}"
    fi
}

# Main loop
while true; do
    show_menu
    read choice

    case $choice in
        1)
            execute_cmd "reload" "Reloading page"
            ;;
        2)
            execute_cmd "clearCache" "Clearing cache"
            sleep 1
            execute_cmd "reload" "Reloading page"
            ;;
        3)
            get_screenshot
            ;;
        4)
            execute_cmd "restartApp" "Restarting Fully Kiosk app"
            ;;
        5)
            echo -e "${RED}⚠️  This will reboot the entire device!${NC}"
            echo -e "${YELLOW}Are you sure? (yes/no):${NC} "
            read confirm
            if [ "$confirm" = "yes" ]; then
                execute_cmd "rebootDevice" "Rebooting device"
            else
                echo "Cancelled"
            fi
            ;;
        6)
            get_device_info
            ;;
        7)
            execute_cmd "screenOn" "Turning screen on"
            ;;
        8)
            execute_cmd "screenOff" "Turning screen off"
            ;;
        9)
            open_web_admin
            ;;
        10)
            test_connection
            ;;
        0)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac

    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
done
