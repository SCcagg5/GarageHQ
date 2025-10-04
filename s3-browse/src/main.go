package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
)

type cfg struct {
	Endpoint string
	Region   string
	AKID     string
	Secret   string
	Bucket   string
	Port     string
}

func mustEnv(k string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		log.Fatalf("missing env: %s", k)
	}
	return v
}

func loadCfg() cfg {
	c := cfg{
		Endpoint: mustEnv("S3_ENDPOINT"),
		Region:   mustEnv("S3_REGION"),
		AKID:     mustEnv("S3_ACCESS_KEY_ID"),
		Secret:   mustEnv("S3_SECRET_ACCESS_KEY"),
		Bucket:   mustEnv("S3_BUCKET"),
		Port:     os.Getenv("PORT"),
	}
	if c.Port == "" {
		c.Port = "8088"
	}
	return c
}

type proxy struct {
	cfg     cfg
	origin  *url.URL
	client  *http.Client
	signer  *v4.Signer
	creds   aws.Credentials
	hostHdr string
}

func newProxy(c cfg) *proxy {
	u, err := url.Parse(strings.TrimRight(c.Endpoint, "/"))
	if err != nil {
		log.Fatalf("invalid S3_ENDPOINT: %v", err)
	}
	tr := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false,
		},
	}
	return &proxy{
		cfg:     c,
		origin:  u,
		client:  &http.Client{Transport: tr, Timeout: 0},
		signer:  v4.NewSigner(),
		creds:   aws.Credentials{AccessKeyID: c.AKID, SecretAccessKey: c.Secret, Source: "static"},
		hostHdr: u.Host,
	}
}

func (p *proxy) copySafeHeaders(dst http.ResponseWriter, src *http.Response) {
	hop := map[string]bool{
		"connection":          true,
		"keep-alive":          true,
		"proxy-authenticate":  true,
		"proxy-authorization": true,
		"te":                  true,
		"trailers":            true,
		"transfer-encoding":   true,
		"upgrade":             true,
	}
	for k, vv := range src.Header {
		if hop[strings.ToLower(k)] {
			continue
		}
		for _, v := range vv {
			dst.Header().Add(k, v)
		}
	}
	dst.Header().Set("Access-Control-Allow-Origin", "*")
	dst.Header().Set("Access-Control-Expose-Headers", "ETag, Last-Modified, Content-Length, Content-Type")
}

func (p *proxy) forwardRaw(w http.ResponseWriter, r *http.Request, method, pathUnescaped, rawPath, rawQuery string, body io.Reader, contentLength int64, contentType string) {
	ctx := r.Context()

	u := *p.origin
	u.Path = pathUnescaped
	u.RawPath = rawPath
	u.RawQuery = rawQuery

	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		http.Error(w, fmt.Sprintf("new request: %v", err), http.StatusInternalServerError)
		return
	}

	req.Host = p.hostHdr

	copyHdrs := []string{"Range", "If-None-Match", "If-Modified-Since", "Accept", "User-Agent", "Content-Type"}
	for _, h := range copyHdrs {
		if v := r.Header.Get(h); v != "" {
			req.Header.Set(h, v)
		}
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if contentLength >= 0 {
		req.ContentLength = contentLength
		req.Header.Set("Content-Length", strconv.FormatInt(contentLength, 10))
	}

	req.Header.Set("x-amz-content-sha256", "UNSIGNED-PAYLOAD")

	now := time.Now().UTC()
	if err := p.signer.SignHTTP(
		ctx, p.creds, req, "UNSIGNED-PAYLOAD", "s3", p.cfg.Region, now,
		func(o *v4.SignerOptions) { o.DisableURIPathEscaping = true },
	); err != nil {
		http.Error(w, fmt.Sprintf("sign: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("proxy %s -> %s%s", method, rawPath, func() string {
		if rawQuery == "" {
			return ""
		}
		return "?" + rawQuery
	}())

	resp, err := p.client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("upstream: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	for k := range w.Header() {
		w.Header().Del(k)
	}
	p.copySafeHeaders(w, resp)
	w.WriteHeader(resp.StatusCode)

	if method != http.MethodHead {
		_, _ = io.Copy(w, resp.Body)
	}
}

func (p *proxy) handleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	pathUnescaped := "/" + p.cfg.Bucket
	rawPath := "/" + url.PathEscape(p.cfg.Bucket)
	p.forwardRaw(w, r, r.Method, pathUnescaped, rawPath, r.URL.RawQuery, nil, 0, "")
}

func (p *proxy) splitKeyFromURL(r *http.Request) (pathUnescaped, rawPath string, err error) {
	escaped := r.URL.EscapedPath()
	keyPart := strings.TrimPrefix(escaped, "/s3/")
	keyPart = strings.TrimLeft(keyPart, "/")

	unescaped, err := url.PathUnescape(keyPart)
	if err != nil {
		return "", "", err
	}

	segs := strings.Split(unescaped, "/")
	segsClean := make([]string, 0, len(segs))
	segsEsc := make([]string, 0, len(segs))
	for _, s := range segs {
		if s == "" {
			continue
		}
		segsClean = append(segsClean, s)
		segsEsc = append(segsEsc, url.PathEscape(s))
	}

	pathUnescaped = "/" + p.cfg.Bucket
	rawPath = "/" + url.PathEscape(p.cfg.Bucket)
	if len(segsClean) > 0 {
		pathUnescaped += "/" + strings.Join(segsClean, "/")
		rawPath += "/" + strings.Join(segsEsc, "/")
	}
	return pathUnescaped, rawPath, nil
}

func (p *proxy) handleGetObject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	pathUnescaped, rawPath, err := p.splitKeyFromURL(r)
	if err != nil {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}
	p.forwardRaw(w, r, r.Method, pathUnescaped, rawPath, r.URL.RawQuery, nil, 0, "")
}

func (p *proxy) handlePutObject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	pathUnescaped, rawPath, err := p.splitKeyFromURL(r)
	if err != nil {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}

	ct := r.Header.Get("Content-Type")
	cl := r.ContentLength
	if cl < 0 {
	}

	p.forwardRaw(w, r, http.MethodPut, pathUnescaped, rawPath, r.URL.RawQuery, r.Body, cl, ct)
}

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Ajuste l’origins si besoin
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Range, If-None-Match, If-Modified-Since, Accept, User-Agent")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func (p *proxy) routes() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/", http.FileServer(http.Dir("/public")))

	mux.HandleFunc("/s3", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead:
			p.handleList(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/s3/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead:
			p.handleGetObject(w, r)
		case http.MethodPut:
			p.handlePutObject(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = ctx
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})

	return withCORS(mux)
}

func main() {
	c := loadCfg()
	p := newProxy(c)
	addr := ":" + c.Port
	log.Printf("garage-s3-proxy listening on %s (bucket=%s, endpoint=%s)", addr, c.Bucket, c.Endpoint)
	if err := http.ListenAndServe(addr, p.routes()); err != nil {
		log.Fatal(err)
	}
}
