#!/bin/sh
set -euo pipefail

############################################
# Script: entrypoint.sh
# Purpose: Render Traefik dynamic config from a template and launch Traefik.
#   1. Parse BASIC_AUTH_CREDENTIALS ("user:password") and write /etc/traefik/htpasswd.
#   2. Render /etc/traefik/dynamic.yaml from /etc/traefik/dynamic.tmpl.yaml
#      by injecting HTTPS_PUBLIC_PORT (defaults to 443).
#   3. Start Traefik with the static configuration file.
#
# Requirements:
#   - The command 'htpasswd' must be available in PATH.
#   - /etc/traefik/dynamic.tmpl.yaml must exist and be readable.
#   - /etc/traefik/traefik.yaml must exist and be readable.
#   - Environment variable BASIC_AUTH_CREDENTIALS must be set to "user:password".
#
# Environment:
#   BASIC_AUTH_CREDENTIALS  Required. Format: "user:password".
#   HTTPS_PUBLIC_PORT       Optional. Defaults to "443" (use "8443" for rootless setups).
#
# Usage:
#   ./entrypoint.sh
############################################

############################################
# Function: fail
# Purpose: Print an error message to stderr and exit with status 1.
############################################
fail() {
  echo "Error: $*" >&2
  exit 1
}

############################################
# Function: ensure_prereqs
# Purpose: Validate that required binaries and files are present.
############################################
ensure_prereqs() {
  command -v htpasswd >/dev/null 2>&1 || fail "'htpasswd' not found in PATH"
  [ -r /etc/traefik/dynamic.tmpl.yaml ] || fail "/etc/traefik/dynamic.tmpl.yaml not found or not readable"
  [ -r /etc/traefik/traefik.yaml ] || fail "/etc/traefik/traefik.yaml not found or not readable"
}

############################################
# Function: write_htpasswd
# Purpose: Create /etc/traefik/htpasswd from BASIC_AUTH_CREDENTIALS.
# Notes:
#   - Accepts "user:password" and writes a bcrypt hash.
############################################
write_htpasswd() {
  creds="${BASIC_AUTH_CREDENTIALS:-}"
  [ -n "$creds" ] || fail "BASIC_AUTH_CREDENTIALS is not set"
  case "$creds" in
    *:*) ;;
    *) fail "BASIC_AUTH_CREDENTIALS must be in the form 'user:password'" ;;
  esac

  user="${creds%%:*}"
  pass="${creds#*:}"
  [ -n "$user" ] || fail "Username is empty"
  [ -n "$pass" ] || fail "Password is empty"

  mkdir -p /etc/traefik
  htpasswd -nbB "$user" "$pass" > /etc/traefik/htpasswd
  echo "Wrote /etc/traefik/htpasswd"
}

############################################
# Function: render_dynamic_config
# Purpose: Render /etc/traefik/dynamic.yaml from template by substituting HTTPS_PUBLIC_PORT.
############################################
render_dynamic_config() {
  : "${HTTPS_PUBLIC_PORT:=443}"
  sed "s|\${HTTPS_PUBLIC_PORT}|${HTTPS_PUBLIC_PORT}|g" \
    /etc/traefik/dynamic.tmpl.yaml > /etc/traefik/dynamic.yaml
  echo "Rendered /etc/traefik/dynamic.yaml (HTTPS_PUBLIC_PORT=${HTTPS_PUBLIC_PORT})"
}

############################################
# Function: start_traefik
# Purpose: Execute Traefik with the static configuration file.
############################################
start_traefik() {
  exec /usr/local/bin/traefik --configFile=/etc/traefik/traefik.yaml
}

############################################
# Main Script Execution
############################################
ensure_prereqs
write_htpasswd
render_dynamic_config
start_traefik
