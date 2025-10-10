#!/bin/bash
# scripts/smoke-tests.sh
# Automated smoke tests that run every 5 minutes to catch issues early
# Tests critical endpoints and functionality
#
# Usage:
#   ./scripts/smoke-tests.sh [environment]
#
# Environment:
#   production (default) - Test https://chi-pins.vercel.app
#   local - Test http://localhost:3000
#   custom - Test custom URL from SMOKE_TEST_URL env var

set -euo pipefail

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
ALERT_PHONE="${ALERT_PHONE:-+17204507540}"
ALERT_ON_FAILURE="${ALERT_ON_FAILURE:-true}"

# Set base URL based on environment
case "$ENVIRONMENT" in
  production)
    BASE_URL="https://chi-pins.vercel.app"
    ;;
  local)
    BASE_URL="http://localhost:3000"
    ;;
  custom)
    BASE_URL="${SMOKE_TEST_URL:-https://chi-pins.vercel.app}"
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [production|local|custom]"
    exit 1
    ;;
esac

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to print test header
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  SMOKE TESTS - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
  echo -e "${GREEN}Base URL:${NC} $BASE_URL"
  echo ""
}

# Function to run a test
run_test() {
  local test_name="$1"
  local test_command="$2"
  local expected_pattern="${3:-}"

  echo -e "${YELLOW}▶ Testing:${NC} $test_name"

  if eval "$test_command"; then
    if [[ -n "$expected_pattern" ]]; then
      # Check if output matches expected pattern
      if echo "$test_output" | grep -q "$expected_pattern"; then
        echo -e "  ${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
      else
        echo -e "  ${RED}✗ FAIL - Expected pattern not found: $expected_pattern${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
      fi
    else
      echo -e "  ${GREEN}✓ PASS${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name")
    return 1
  fi
}

# Test 1: Health endpoint
test_health() {
  local response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)

  if [[ "$http_code" == "200" ]]; then
    if echo "$body" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

# Test 2: Main app loads
test_app_loads() {
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
  [[ "$http_code" == "200" ]]
}

# Test 3: Admin settings API
test_admin_settings() {
  local response=$(curl -s "$BASE_URL/api/settings")
  echo "$response" | jq -e '.value' > /dev/null 2>&1
}

# Test 4: Pins API (read)
test_pins_api() {
  # Test with Supabase directly
  if [[ -z "${VITE_SUPABASE_URL:-}" ]] || [[ -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
    echo "  ${YELLOW}⚠ SKIP - Supabase credentials not configured${NC}"
    return 0
  fi

  local response=$(curl -s "$VITE_SUPABASE_URL/rest/v1/pins?limit=1" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY")

  echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1
}

# Test 5: Webhook processor endpoint
test_webhook_processor() {
  local test_payload='{
    "source": "smoke-test",
    "tenantId": "chicago-mikes",
    "events": [{
      "level": "info",
      "message": "Smoke test event",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }]
  }'

  local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/webhook-processor" \
    -H "Content-Type: application/json" \
    -d "$test_payload")

  [[ "$http_code" == "200" ]]
}

# Test 6: Database connectivity
test_database() {
  if [[ -z "${VITE_SUPABASE_URL:-}" ]] || [[ -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
    echo "  ${YELLOW}⚠ SKIP - Supabase credentials not configured${NC}"
    return 0
  fi

  local response=$(curl -s "$VITE_SUPABASE_URL/rest/v1/" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY")

  # Just check that we don't get an error
  [[ -n "$response" ]]
}

# Test 7: Static assets load
test_static_assets() {
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico")
  [[ "$http_code" == "200" ]]
}

# Test 8: Response time check
test_response_time() {
  local start=$(date +%s%3N)
  curl -s -o /dev/null "$BASE_URL/api/health"
  local end=$(date +%s%3N)
  local duration=$((end - start))

  echo "  Response time: ${duration}ms"

  # Fail if response time > 5 seconds
  [[ $duration -lt 5000 ]]
}

# Test 9: Check for common errors in logs (if monitoring kiosk)
test_kiosk_logs() {
  if [[ -z "${KIOSK_DEVICE:-}" ]]; then
    echo "  ${YELLOW}⚠ SKIP - KIOSK_DEVICE not configured${NC}"
    return 0
  fi

  # Check if device is connected
  if ! adb devices | grep -q "$KIOSK_DEVICE"; then
    echo "  ${YELLOW}⚠ SKIP - Kiosk device not connected${NC}"
    return 0
  fi

  # Check last 10 log lines for errors
  local error_count=$(adb -s "$KIOSK_DEVICE" logcat -d -t 10 chromium:E *:S 2>/dev/null | wc -l)

  echo "  Recent errors: $error_count"

  # Fail if more than 5 errors in last 10 lines
  [[ $error_count -lt 5 ]]
}

# Test 10: Auto-healer system
test_auto_healer() {
  if [[ -z "${VITE_SUPABASE_URL:-}" ]] || [[ -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
    echo "  ${YELLOW}⚠ SKIP - Supabase credentials not configured${NC}"
    return 0
  fi

  # Check if error_log table exists and is accessible
  local response=$(curl -s "$VITE_SUPABASE_URL/rest/v1/error_log?limit=1" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY")

  echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1
}

# Send alert if tests fail
send_failure_alert() {
  if [[ "$ALERT_ON_FAILURE" != "true" ]]; then
    return
  fi

  local failed_list=$(printf '%s\n' "${FAILED_TESTS[@]}")
  local message="🚨 SMOKE TEST FAILURES ($ENVIRONMENT)

Failed tests ($TESTS_FAILED):
$failed_list

Time: $(date '+%Y-%m-%d %H:%M:%S')
URL: $BASE_URL

Check logs immediately!"

  curl -s -X POST "$BASE_URL/api/send-sms" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"$ALERT_PHONE\",\"message\":\"$message\"}" \
    > /dev/null 2>&1 || true
}

# Run all tests
main() {
  print_header

  run_test "Health endpoint" test_health
  run_test "Main app loads" test_app_loads
  run_test "Admin settings API" test_admin_settings
  run_test "Pins API" test_pins_api
  run_test "Webhook processor" test_webhook_processor
  run_test "Database connectivity" test_database
  run_test "Static assets" test_static_assets
  run_test "Response time" test_response_time
  run_test "Kiosk logs check" test_kiosk_logs
  run_test "Auto-healer system" test_auto_healer

  # Print summary
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  RESULTS${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
  echo -e "${RED}Failed:${NC} $TESTS_FAILED"
  echo -e "${BLUE}Total:${NC} $((TESTS_PASSED + TESTS_FAILED))"
  echo ""

  if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Some tests failed!${NC}"
    send_failure_alert
    exit 1
  else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
  fi
}

# Run main
main
