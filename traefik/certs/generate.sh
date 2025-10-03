#!/bin/sh
set -euo pipefail

############################################
# Script: generate-certs.sh
# Purpose: Generates a local CA, server, and client certificates for mTLS.
#   Outputs in the same directory as this script:
#     - ca.key, ca.crt
#     - server.key, server.crt
#     - client.key, client.crt
#
# Usage:
#   ./generate-certs.sh
############################################

############################################
# Function: here
# Purpose: Resolve the absolute directory where this script lives.
############################################
here() {
  # BusyBox/Alpine friendly resolution
  local src="$0"
  [ -L "$src" ] && src="$(readlink "$src")"
  local dir
  dir="$(dirname "$src")"
  (CDPATH= cd -- "$dir" && pwd)
}

############################################
# Main Script Execution
############################################
CERTS_DIR="$(here)"
cd "$CERTS_DIR"

echo "Generating local CA..."
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/C=US/ST=Local/L=Local/O=Local CA/CN=local-ca" \
  -out ca.crt

echo "Generating server key/csr..."
openssl genrsa -out server.key 4096
openssl req -new -key server.key \
  -subj "/C=US/ST=Local/L=Local/O=Local Server/CN=localhost" \
  -out server.csr

cat > server.ext <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:localhost, DNS:traefik, IP:127.0.0.1
EOF

echo "Signing server certificate..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 825 -sha256 -extfile server.ext

echo "Generating client key/csr..."
openssl genrsa -out client.key 4096
openssl req -new -key client.key \
  -subj "/C=US/ST=Local/L=Local/O=Local Client/CN=local-client" \
  -out client.csr

cat > client.ext <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

echo "Signing client certificate..."
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 825 -sha256 -extfile client.ext

rm -f server.csr client.csr server.ext client.ext
echo "Done. Certificates are in: ${CERTS_DIR}"
