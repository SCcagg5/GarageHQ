#!/bin/sh
set -euo pipefail

############################################
# Script: healthcheck.sh
# Purpose: Verifies Traefik health by calling the raw ping endpoint.
#   1. Sends an HTTP request to http://127.0.0.1/ping.
#   2. Expects "OK" if Traefik is healthy.
#   3. Exits with code 0 if healthy, or 1 if not.
#
# Exit Codes:
#   0 - Traefik is healthy
#   1 - Traefik is unhealthy
#
# Usage:
#   ./healthcheck.sh
############################################

check_traefik_ping() {
    if wget -qO- "http://127.0.0.1/ping" | grep -q "OK"; then
        echo "Traefik health: OK"
        exit 0
    else
        echo "Traefik health: Unhealthy"
        exit 1
    fi
}

check_traefik_ping
