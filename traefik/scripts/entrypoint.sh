#!/bin/sh
set -euo pipefail

############################################
# Script: entrypoint.sh
# Purpose: Render dynamic config from template and launch Traefik.
#   1) Reads BASIC_AUTH_CREDENTIALS ("user:password") and writes htpasswd.
#   2) Renders /etc/traefik/dynamic.yaml from /etc/traefik/dynamic.tmpl.yaml
#      using HTTPS_PUBLIC_PORT (defaults to 443).
#   3) Starts Traefik with static config.
#
# Env:
#   BASIC_AUTH_CREDENTIALS  Required, "user:password"
#   HTTPS_PUBLIC_PORT       Optional, defaults to "443" (use "8443" in rootless)
############################################

fail() { echo "Error: $*" >&2; exit 1; }

write_htpasswd() {
  creds="${BASIC_AUTH_CREDENTIALS:-}"; [ -n "$creds" ] || fail "BASIC_AUTH_CREDENTIALS is not set"
  case "$creds" in *:*) ;; *) fail "BASIC_AUTH_CREDENTIALS must be 'user:password'";; esac
  user="${creds%%:*}"; pass="${creds#*:}"
  [ -n "$user" ] || fail "Username is empty"
  [ -n "$pass" ] || fail "Password is empty"
  mkdir -p /etc/traefik
  htpasswd -nbB "$user" "$pass" > /etc/traefik/htpasswd
}

render_dynamic() {
  : "${HTTPS_PUBLIC_PORT:=443}"
  sed "s|\${HTTPS_PUBLIC_PORT}|${HTTPS_PUBLIC_PORT}|g" \
      /etc/traefik/dynamic.tmpl.yaml > /etc/traefik/dynamic.yaml
}

write_htpasswd
render_dynamic
exec /usr/local/bin/traefik --configFile=/etc/traefik/traefik.yaml
