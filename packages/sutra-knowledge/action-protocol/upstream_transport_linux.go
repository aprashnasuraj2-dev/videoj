//go:build linux

package actionprotocol

// Loopback-only transport for the upstream idempotency laboratory. The server
// method remains package-private so the type is not an accidental http.Handler.
import (
	"bytes"
	"crypto/ed25519"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"
)

// serveHTTP remains package-private: this is a loopback failure laboratory, not
// an externally mountable generic write service.
func (u *upstreamEffectAuthority) serveHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodPost || r.URL.RawQuery != "" || r.Header.Get("Content-Type") != media || r.Header.Get("Accept") != media ||
		(r.URL.Path != "/upstream/apply" && r.URL.Path != "/upstream/close" && r.URL.Path != "/upstream/status") {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(r.Body, fenceReservationSize+1))
	if e != nil || len(raw) != fenceReservationSize {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	reservation, e := ParseFenceReservation(raw)
	if e != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	var response []byte
	switch r.URL.Path {
	case "/upstream/apply":
		var receipt upstreamEffectReceipt
		receipt, e = u.Apply(reservation)
		if e == nil {
			response = receipt.Bytes()
		}
	case "/upstream/close":
		var proof EffectClosureProof
		proof, e = u.CloseUnapplied(reservation)
		if e == nil {
			response = proof.Bytes()
		}
	case "/upstream/status":
		var status upstreamEffectStatus
		status, e = u.Status(reservation)
		if e == nil {
			response = status.Bytes()
		}
	}
	if e != nil {
		switch {
		case errors.Is(e, ErrAbsent):
			w.WriteHeader(http.StatusNotFound)
		case errors.Is(e, ErrPolicy):
			w.WriteHeader(http.StatusForbidden)
		case errors.Is(e, ErrConflict):
			w.WriteHeader(http.StatusConflict)
		case errors.Is(e, ErrBudget), errors.Is(e, ErrUpstreamExhausted):
			w.WriteHeader(http.StatusTooManyRequests)
		default:
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		return
	}
	w.Header().Set("Content-Type", media)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(response)
}

type upstreamEffectClient struct {
	origin    string
	ctx       Digest
	authority ed25519.PublicKey
	upstream  ed25519.PublicKey
	http      *http.Client
}

func newUpstreamEffectClient(origin string, ctx Digest, authority, upstream ed25519.PublicKey) (*upstreamEffectClient, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" || u.Port() == "" || u.Host == "" {
		return nil, ErrPolicy
	}
	ip := net.ParseIP(u.Hostname())
	if ip == nil || !ip.IsLoopback() || origin != "http://"+u.Host || ctx == (Digest{}) ||
		len(authority) != ed25519.PublicKeySize || len(upstream) != ed25519.PublicKeySize || bytes.Equal(authority, upstream) {
		return nil, ErrPolicy
	}
	transport := &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: time.Second}).DialContext, DisableKeepAlives: true}
	client := &http.Client{Transport: transport, Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &upstreamEffectClient{origin: origin, ctx: ctx, authority: append(ed25519.PublicKey(nil), authority...), upstream: append(ed25519.PublicKey(nil), upstream...), http: client}, nil
}
func (c *upstreamEffectClient) exchange(path string, reservation FenceReservation) ([]byte, error) {
	if !VerifyFenceReservation(reservation, c.ctx, c.authority) {
		return nil, ErrPolicy
	}
	req, e := http.NewRequest(http.MethodPost, c.origin+path, bytes.NewReader(reservation.Bytes()))
	if e != nil {
		return nil, ErrUpstreamUnavailable
	}
	req.GetBody = nil
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil || res == nil {
		return nil, ErrUpstreamUnavailable
	}
	defer res.Body.Close()
	if res.Request == nil || res.Request.URL.String() != c.origin+path {
		return nil, ErrUpstreamUnavailable
	}
	switch res.StatusCode {
	case http.StatusNotFound:
		return nil, ErrAbsent
	case http.StatusForbidden:
		return nil, ErrPolicy
	case http.StatusConflict:
		return nil, ErrConflict
	case http.StatusTooManyRequests:
		return nil, ErrBudget
	case http.StatusOK:
		if res.Header.Get("Content-Type") != media {
			return nil, ErrUpstreamUnavailable
		}
	default:
		return nil, ErrUpstreamUnavailable
	}
	limit := int64(upstreamStatusSize + 1)
	if path == "/upstream/apply" {
		limit = upstreamReceiptSize + 1
	} else if path == "/upstream/close" {
		limit = effectClosureProofSize + 1
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, limit))
	if e != nil {
		return nil, ErrUpstreamUnavailable
	}
	return raw, nil
}
func (c *upstreamEffectClient) Apply(reservation FenceReservation) (upstreamEffectReceipt, error) {
	raw, e := c.exchange("/upstream/apply", reservation)
	if e != nil {
		return upstreamEffectReceipt{}, e
	}
	r, e := parseUpstreamEffectReceipt(raw)
	if e != nil || !verifyUpstreamEffectReceipt(r, reservation, c.ctx, c.authority, c.upstream) {
		return upstreamEffectReceipt{}, ErrUpstreamUnavailable
	}
	return r, nil
}
func (c *upstreamEffectClient) CloseUnapplied(reservation FenceReservation) (EffectClosureProof, error) {
	raw, e := c.exchange("/upstream/close", reservation)
	if e != nil {
		return EffectClosureProof{}, e
	}
	p, e := ParseEffectClosureProof(raw)
	if e != nil || !VerifyEffectClosureProof(p, c.ctx, c.authority, reservation, c.upstream) {
		return EffectClosureProof{}, ErrUpstreamUnavailable
	}
	return p, nil
}
func (c *upstreamEffectClient) Status(reservation FenceReservation) (upstreamEffectStatus, error) {
	raw, e := c.exchange("/upstream/status", reservation)
	if e != nil {
		return upstreamEffectStatus{}, e
	}
	s, e := parseUpstreamEffectStatus(raw)
	if e != nil || !verifyUpstreamEffectStatus(s, reservation, c.ctx, c.authority, c.upstream) {
		return upstreamEffectStatus{}, ErrUpstreamUnavailable
	}
	return s, nil
}
