#!/bin/sh
set -eu

############################################
# Script: generate-certs.sh
# Purpose: Generate a local CA, server, and client certificates for Traefik mTLS.
#   1. Parse CLI arguments (--host <FQDN>, --force).
#   2. Ensure required tools and paths exist.
#   3. Create a local CA (if missing).
#   4. Create a server certificate signed by the local CA (if missing).
#   5. Create a client certificate signed by the local CA (if missing).
#   6. Print a summary of generated artifacts.
#
# Requirements:
#   - POSIX shell (no bashisms).
#   - OpenSSL available in PATH.
#   - mktemp, dirname, readlink available in PATH.
#
# Arguments:
#   --host   Required. The FQDN to set as certificate CN and SAN (e.g., garage.local).
#   --force  Optional. If provided, removes existing CA/server/client artifacts before regenerating.
#
# Exit Codes:
#   0 - Success.
#   1 - Invalid usage or missing prerequisites.
#
# Usage:
#   sh traefik/certs/generate-certs.sh --host example.com
#   sh traefik/certs/generate-certs.sh --host example.com --force
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
# Function: need
# Purpose: Ensure a required command exists in PATH.
############################################
need() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

############################################
# Function: resolve_script_dir
# Purpose: Resolve the absolute directory of this script, following a single symlink.
############################################
resolve_script_dir() {
  src="$0"
  if [ -L "$src" ]; then
    # Follow the symlink target (single level, sufficient for common setups)
    src="$(readlink "$src")"
  fi
  dir="$(dirname "$src")"
  (CDPATH= cd "$dir" && pwd)
}

############################################
# Function: parse_args
# Purpose: Parse CLI arguments into HOST and FORCE.
############################################
parse_args() {
  HOST=""
  FORCE=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --host)
        HOST="${2:-}"
        [ -n "$HOST" ] || fail "--host requires a value"
        shift 2
        ;;
      --force)
        FORCE=1
        shift
        ;;
      *)
        fail "Unknown arg: $1"
        ;;
    esac
  done

  [ -n "$HOST" ] || fail "--host <FQDN> is required (e.g., --host garage.local)"

  # Export for downstream functions
  EXPORT_HOST="$HOST"; export EXPORT_HOST
  EXPORT_FORCE="$FORCE"; export EXPORT_FORCE
}

############################################
# Function: ensure_prereqs
# Purpose: Verify required tools are available.
############################################
ensure_prereqs() {
  need openssl
  need mktemp
  need dirname
  need readlink
}

############################################
# Function: init_paths
# Purpose: Initialize directory paths for CA, server, and client.
############################################
init_paths() {
  CERTS_DIR="$(resolve_script_dir)"
  SERVER_DIR="${CERTS_DIR}/server"
  CLIENT_DIR="${CERTS_DIR}/client"

  mkdir -p "$SERVER_DIR" "$CLIENT_DIR"

  CA_KEY="${CERTS_DIR}/ca.key"
  CA_CRT="${CERTS_DIR}/ca.crt"
  CA_SRL="${CERTS_DIR}/ca.srl"

  SRV_KEY="${SERVER_DIR}/server.key"
  SRV_CSR="${SERVER_DIR}/server.csr"
  SRV_CRT="${SERVER_DIR}/server.crt"

  CLI_KEY="${CLIENT_DIR}/client.key"
  CLI_CSR="${CLIENT_DIR}/client.csr"
  CLI_CRT="${CLIENT_DIR}/client.crt"

  export CERTS_DIR SERVER_DIR CLIENT_DIR \
         CA_KEY CA_CRT CA_SRL \
         SRV_KEY SRV_CSR SRV_CRT \
         CLI_KEY CLI_CSR CLI_CRT
}

############################################
# Function: remove_existing_if_force
# Purpose: Remove existing artifacts if --force was provided.
############################################
remove_existing_if_force() {
  if [ "${EXPORT_FORCE:-0}" -eq 1 ]; then
    rm -f "$CA_KEY" "$CA_CRT" "$CA_SRL" \
          "$SRV_KEY" "$SRV_CRT" "$SRV_CSR" \
          "$CLI_KEY" "$CLI_CRT" "$CLI_CSR" || true
  fi
}

############################################
# Function: generate_ca
# Purpose: Generate a local CA (key + certificate) if missing.
############################################
generate_ca() {
  if [ ! -f "$CA_KEY" ] || [ ! -f "$CA_CRT" ]; then
    echo "[certs] Generating local CA..."
    openssl genrsa -out "$CA_KEY" 4096
    openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
      -subj "/C=US/ST=Local/L=Local/O=Local CA/CN=${EXPORT_HOST}-ca" \
      -out "$CA_CRT"
  fi
}

############################################
# Function: generate_server_cert
# Purpose: Generate server key/cert signed by the local CA if missing.
# Notes:
#   - SubjectAltName includes FQDN, 'traefik', 'localhost', and 127.0.0.1.
############################################
generate_server_cert() {
  if [ ! -f "$SRV_KEY" ] || [ ! -f "$SRV_CRT" ]; then
    echo "[certs] Generating server key/csr..."
    openssl genrsa -out "$SRV_KEY" 4096
    openssl req -new -key "$SRV_KEY" \
      -subj "/C=US/ST=Local/L=Local/O=Local Server/CN=${EXPORT_HOST}" \
      -out "$SRV_CSR"

    EXT_FILE="$(mktemp)"
    cat > "$EXT_FILE" <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:${EXPORT_HOST}, DNS:traefik, DNS:localhost, IP:127.0.0.1
EOF

    echo "[certs] Signing server certificate..."
    openssl x509 -req -in "$SRV_CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
      -out "$SRV_CRT" -days 825 -sha256 -extfile "$EXT_FILE"

    rm -f "$EXT_FILE" "$SRV_CSR"
    cp -f "$CA_CRT" "${SERVER_DIR}/ca.crt"
  fi
}

############################################
# Function: generate_client_cert
# Purpose: Generate client key/cert signed by the local CA if missing.
############################################
generate_client_cert() {
  if [ ! -f "$CLI_KEY" ] || [ ! -f "$CLI_CRT" ]; then
    echo "[certs] Generating client key/csr..."
    openssl genrsa -out "$CLI_KEY" 4096
    openssl req -new -key "$CLI_KEY" \
      -subj "/C=US/ST=Local/L=Local/O=Local Client/CN=${EXPORT_HOST}-client" \
      -out "$CLI_CSR"

    EXT_FILE="$(mktemp)"
    cat > "$EXT_FILE" <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

    echo "[certs] Signing client certificate..."
    openssl x509 -req -in "$CLI_CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
      -out "$CLI_CRT" -days 825 -sha256 -extfile "$EXT_FILE"

    rm -f "$EXT_FILE" "$CLI_CSR"
    cp -f "$CA_CRT" "${CLIENT_DIR}/ca.crt"
  fi
}

############################################
# Function: print_summary
# Purpose: Display paths of generated artifacts.
############################################
print_summary() {
  echo "[certs] Done."
  echo "  CA:      ${CA_CRT}, ${CA_KEY}"
  echo "  Server:  ${SRV_CRT}, ${SRV_KEY} (+ ca.crt)"
  echo "  Client:  ${CLI_CRT}, ${CLI_KEY} (+ ca.crt)"
}

############################################
# Main Script Execution
############################################
parse_args "$@"
ensure_prereqs
init_paths
remove_existing_if_force
generate_ca
generate_server_cert
generate_client_cert
print_summary
