#!/bin/bash
# scripts/monitor-logs.sh
# Continuously monitors kiosk logs and sends SMS alerts for critical errors
# Run this on the kiosk device: ./scripts/monitor-logs.sh 192.168.2.112:40585

set -euo pipefail

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEVICE="${1:-}"
ALERT_PHONE="+17204507540"
API_URL="${DEPLOY_API_URL:-https://chi-pins.vercel.app}"
CHECK_INTERVAL=5  # Check logs every 5 seconds
ALERT_COOLDOWN=300  # Don't send duplicate alerts for 5 minutes

# Error patterns to watch for
ERROR_PATTERNS=(
  "FATAL ERROR"
  "Cannot read properties of undefined"
  "Failed to fetch"
  "NetworkError"
  "Database connection failed"
  "Proximity detection failed"
  "Camera initialization failed"
  "Uncaught"
  "TypeError"
)

# Track last alert times to avoid spam
declare -A LAST_ALERT_TIME

# Function to send SMS alert
send_alert() {
  local message="$1"
  local error_type="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # Check cooldown
  if [[ -n "${LAST_ALERT_TIME[$error_type]:-}" ]]; then
    local time_since_last=$(($(date +%s) - LAST_ALERT_TIME[$error_type]))
    if [[ $time_since_last -lt $ALERT_COOLDOWN ]]; then
      echo -e "${YELLOW}⚠ Skipping alert (cooldown): $error_type${NC}"
      return
    fi
  fi

  # Send SMS
  echo -e "${RED}🚨 ALERT: $message${NC}"

  local sms_response=$(curl -s -X POST "$API_URL/api/send-sms" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"$ALERT_PHONE\",\"message\":\"🚨 KIOSK ALERT\\n\\n$message\\n\\nTime: $timestamp\\n\\nCheck logs immediately!\"}" \
    2>/dev/null)

  if echo "$sms_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Alert sent to $ALERT_PHONE${NC}"
    LAST_ALERT_TIME[$error_type]=$(date +%s)
  else
    echo -e "${RED}✗ Failed to send alert SMS${NC}"
  fi
}

# Function to check logs for errors
check_logs() {
  local device="$1"

  # Get last 50 lines of logs
  local logs=$(adb -s "$device" logcat -d -t 50 chromium:E *:S 2>/dev/null)

  # Check for each error pattern
  for pattern in "${ERROR_PATTERNS[@]}"; do
    if echo "$logs" | grep -q "$pattern"; then
      local error_line=$(echo "$logs" | grep "$pattern" | tail -1)
      local short_error=$(echo "$error_line" | cut -c 1-100)
      send_alert "Error detected: $short_error" "$pattern"
    fi
  done
}

# Function to check if app is responding
check_app_health() {
  local device="$1"

  # Check if app process is running
  local app_running=$(adb -s "$device" shell "ps | grep com.chicagomikes.chipins" 2>/dev/null)

  if [[ -z "$app_running" ]]; then
    send_alert "App is not running on kiosk!" "APP_CRASHED"
    return 1
  fi

  return 0
}

# Main monitoring loop
main() {
  if [[ -z "$DEVICE" ]]; then
    echo "Usage: $0 <device-ip:port>"
    echo "Example: $0 192.168.2.112:40585"
    exit 1
  fi

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  KIOSK LOG MONITOR${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${GREEN}📱 Device:${NC} $DEVICE"
  echo -e "${GREEN}📞 Alerts to:${NC} $ALERT_PHONE"
  echo -e "${GREEN}⏱️  Check interval:${NC} ${CHECK_INTERVAL}s"
  echo -e "${GREEN}❄️  Alert cooldown:${NC} ${ALERT_COOLDOWN}s"
  echo ""
  echo -e "${BLUE}Watching for errors:${NC}"
  for pattern in "${ERROR_PATTERNS[@]}"; do
    echo "  • $pattern"
  done
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
  echo ""

  # Check device connection
  if ! adb devices | grep -q "$DEVICE"; then
    echo -e "${RED}✗ Device $DEVICE not connected${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Connected to device${NC}"
  echo -e "${GREEN}✓ Monitoring started...${NC}"
  echo ""

  # Clear logcat buffer
  adb -s "$DEVICE" logcat -c 2>/dev/null

  # Monitor loop
  local check_count=0
  while true; do
    check_count=$((check_count + 1))

    # Check app health every 10 checks (50 seconds)
    if [[ $((check_count % 10)) -eq 0 ]]; then
      if ! check_app_health "$DEVICE"; then
        echo -e "${RED}[$(date '+%H:%M:%S')] App health check failed${NC}"
      else
        echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ App healthy (check #$check_count)${NC}"
      fi
    fi

    # Check logs for errors
    check_logs "$DEVICE"

    # Wait before next check
    sleep "$CHECK_INTERVAL"
  done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Monitoring stopped${NC}"; exit 0' INT TERM

# Run main function
main
