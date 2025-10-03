#!/bin/sh
set -euo pipefail

############################################
# Script: healthcheck.sh
# Purpose: This script checks whether the Garage WebUI service
#          is available and responding on port 3909.
#   1. Sends an HTTP request to http://127.0.0.1:3909/ (using wget).
#   2. Verifies that the request succeeds and returns data.
#   3. Exits with code 0 if healthy, or 1 if not.
#
# Exit Codes:
#   0 - Service is healthy (responds successfully)
#   1 - Service is unhealthy (no response or error)
#
# Usage:
#   ./healthcheck.sh
############################################

############################################
# Function: check_service_health
# Purpose: Performs an HTTP check on the service port using wget.
############################################
check_service_health() {
    if wget -qO- http://127.0.0.1:3909/ > /dev/null 2>&1; then
        echo "Service health: OK"
        exit 0
    else
        echo "Service health: Unhealthy"
        exit 1
    fi
}

############################################
# Main Script Execution
############################################
check_service_health
