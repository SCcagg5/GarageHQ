#!/usr/bin/env bash
set -euo pipefail

ALPINE_TAG="3.21"
ARCH_SUFFIX="amd64"
OUT_DIR="${OUT_DIR:-$PWD}"
PACKAGES="${PACKAGES:-ca-certificates ca-certificates-bundle tzdata apache2-utils}"

docker run --rm -v "$OUT_DIR:/out" alpine:${ALPINE_TAG} sh -lc '
set -euo pipefail

make_rootfs() {
  pkg="$1"
  root="/rootfs-$pkg"

  mkdir -p "$root"

  apk \
    --root "$root" \
    --initdb \
    --no-cache \
    --update-cache \
    --keys-dir /etc/apk/keys \
    --repositories-file /etc/apk/repositories \
    add "$pkg"

  rm -rf "$root/var/cache/apk" || true

  tar --numeric-owner -C "$root" -czf "/out/${pkg}-alpine'"${ALPINE_TAG}"'-'"${ARCH_SUFFIX}"'.tgz" .
}

for P in '"$PACKAGES"'; do
  make_rootfs "$P"
done
'

echo "Done:"
for P in ${PACKAGES}; do
  echo "  ${OUT_DIR}/${P}-alpine${ALPINE_TAG}-${ARCH_SUFFIX}.tgz"
done
