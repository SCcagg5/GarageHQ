#!/bin/sh
set -euo pipefail

############################################
# Script: healthcheck.sh
# Purpose: Check Traefik health by probing the ping endpoint.
#   1. Perform an HTTP GET request to http://127.0.0.1/ping.
#   2. Verify the response contains "OK".
#   3. Exit with status 0 if healthy, or 1 if unhealthy.
#
# Requirements:
#   - The 'wget' binary must be available in PATH.
#   - Traefik must be configured with the ping middleware enabled.
#
# Exit Codes:
#   0 - Traefik is healthy (response contains "OK").
#   1 - Traefik is unhealthy (response missing "OK").
#
# Usage:
#   ./healthcheck.sh
############################################

############################################
# Function: check_traefik_health
# Purpose: Probe the ping endpoint and determine health status.
############################################
check_traefik_health() {
  if wget -qO- "http://127.0.0.1/ping" | grep -q "OK"; then
    echo "Traefik health: OK"
    exit 0
  else
    echo "Traefik health: Unhealthy"
    exit 1
  fi
}

############################################
# Main Script Execution
############################################
check_traefik_health
