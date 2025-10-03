FROM alpine:3.21

COPY ./binaries/lib/*.tgz /tmp/libs/
COPY ./binaries/lib/*.tgz /tmp/libs/
RUN set -eux; \
  for f in /tmp/libs/*.tgz; do \
    tar -xzf "$f" -C / \
      --exclude=dev \
      --exclude=dev/* \
      --exclude=./dev \
      --exclude=./dev/* \
      --exclude=proc --exclude=./proc \
      --exclude=sys  --exclude=./sys \
      --exclude=run  --exclude=./run; \
  done; \
  rm -rf /tmp/libs; \
  update-ca-certificates || true

COPY ./binaries/traefik_v3.5.0_linux_amd64.tgz /tmp/traefik.tgz
RUN tar -xzf /tmp/traefik.tgz -C /usr/local/bin \
    && chmod +x /usr/local/bin/traefik \
    && rm -f /tmp/traefik.tgz

COPY ./config/traefik.yaml /etc/traefik/traefik.yaml
COPY ./config/dynamic.tmpl.yaml /etc/traefik/dynamic.tmpl.yaml

COPY ./scripts/entrypoint.sh /bin/entrypoint.sh
COPY ./scripts/healthcheck.sh /bin/healthcheck.sh
RUN chmod +x /bin/entrypoint.sh /bin/healthcheck.sh

EXPOSE 80 443
ENTRYPOINT ["/bin/sh", "/bin/entrypoint.sh"]
HEALTHCHECK --interval=10s --timeout=1s \
            --start-period=0s --start-interval=5s \
            --retries=1 \
            CMD ["/bin/sh", "/bin/healthcheck.sh"]
