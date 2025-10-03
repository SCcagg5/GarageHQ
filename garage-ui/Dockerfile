FROM alpine:3.21

COPY ./binaries/lib/glibc-runtime-amd64.tgz /tmp/glibc.tgz
RUN tar -xzf /tmp/glibc.tgz -C / && rm -f /tmp/glibc.tgz
ENV LD_LIBRARY_PATH=/usr/glibc-compat/lib

COPY ./binaries/garage-webui-v1.1.0-linux-amd64.tgz /tmp/garage-webui.tgz

RUN tar -xzf /tmp/garage-webui.tgz -C /bin \
    && chmod +x /bin/garage-webui \
    && rm -f /tmp/garage-webui.tgz

COPY ./scripts/entrypoint.sh /bin/entrypoint.sh
COPY ./scripts/healthcheck.sh /bin/healthcheck.sh

EXPOSE 3909

ENTRYPOINT ["/bin/sh", "/bin/entrypoint.sh"]
HEALTHCHECK --interval=10s --timeout=1s \
            --start-period=0s --start-interval=5s \
            --retries=3 \
            CMD ["/bin/sh", "/bin/healthcheck.sh"]