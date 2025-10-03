FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata apache2-utils && update-ca-certificates

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
