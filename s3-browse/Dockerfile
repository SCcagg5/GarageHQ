# ---------- Build binary ----------
FROM golang:1.22-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates

# Go sources
COPY src/go.mod ./
COPY src/main.go ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /out/garage-s3-proxy

# ---------- Fetch UI assets ----------
FROM alpine:3.20 AS assets
WORKDIR /work
RUN apk add --no-cache curl
COPY src/public /public

# ---------- Runtime ----------
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /out/garage-s3-proxy /garage-s3-proxy
COPY --from=assets /public /public
EXPOSE 8088
ENV PORT=8088
ENTRYPOINT ["/garage-s3-proxy"]
