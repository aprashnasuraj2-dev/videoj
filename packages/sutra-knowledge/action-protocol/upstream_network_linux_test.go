//go:build linux

package actionprotocol

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
)

func TestUpstreamEffectAuthorityLostHTTPReplyReconcilesWithoutSecondEffect(t *testing.T) {
	var current atomic.Pointer[upstreamEffectAuthority]
	var drop atomic.Bool
	dropped := make(chan upstreamEffectReceipt, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := current.Load()
		if u == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		if drop.CompareAndSwap(true, false) {
			recorder := httptest.NewRecorder()
			u.serveHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("apply before loss: %d", recorder.Code)
				return
			}
			receipt, e := parseUpstreamEffectReceipt(recorder.Body.Bytes())
			if e != nil {
				t.Error(e)
				return
			}
			dropped <- receipt
			conn, _, e := w.(http.Hijacker).Hijack()
			if e != nil {
				t.Error(e)
				return
			}
			_ = conn.Close()
			return
		}
		u.serveHTTP(w, r)
	}))
	defer srv.Close()
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, srv.URL)
	upstreamPub, upstreamKey := closureKeys()
	dir := privateTemp(t)
	u, e := createUpstreamEffectAuthority(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	current.Store(u)
	client, e := newUpstreamEffectClient(srv.URL, ctx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{40}, Digest{41}, Digest{42}, Digest{43})
	drop.Store(true)
	if _, e = client.Apply(r); !errors.Is(e, ErrUpstreamUnavailable) {
		t.Fatal("lost reply not unknown", e)
	}
	first := <-dropped
	if !verifyUpstreamEffectReceipt(first, r, ctx, authorityPub, upstreamPub) {
		t.Fatal("dropped receipt invalid")
	}
	_ = u.Close()
	u, e = openUpstreamEffectAuthorityStore(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer u.Close()
	current.Store(u)
	status, e := client.Status(r)
	if e != nil || status.State != upstreamApplied || !verifyUpstreamEffectStatus(status, r, ctx, authorityPub, upstreamPub) {
		t.Fatal("signed reconciliation", e, status)
	}
	replayed, e := client.Apply(r)
	if e != nil || replayed != first {
		t.Fatal("same identity retry changed result", e)
	}
	_, effects, e := u.Counts()
	if e != nil || effects != 1 {
		t.Fatal("lost reply duplicated effect", effects, e)
	}
}

func TestUpstreamEffectAuthorityNetworkBoundaryRejectsForgeryRedirectAndAmbientCredentials(t *testing.T) {
	t.Setenv("HTTP_PROXY", "http://127.0.0.1:9")
	t.Setenv("HTTPS_PROXY", "http://127.0.0.1:9")
	// Proxy:nil must ignore ambient proxy configuration for this loopback-only client.
	var sawAuth, sawCookie atomic.Bool
	var current atomic.Pointer[upstreamEffectAuthority]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			sawAuth.Store(true)
		}
		if r.Header.Get("Cookie") != "" {
			sawCookie.Store(true)
		}
		current.Load().serveHTTP(w, r)
	}))
	defer srv.Close()
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, srv.URL)
	upstreamPub, upstreamKey := closureKeys()
	u, e := createUpstreamEffectAuthority(privateTemp(t), ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer u.Close()
	current.Store(u)
	client, e := newUpstreamEffectClient(srv.URL, ctx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{50}, Digest{51}, Digest{52}, Digest{53})
	forged := r
	forged.Signature[0] ^= 1
	if _, e = client.Apply(forged); !errors.Is(e, ErrPolicy) {
		t.Fatal("forged reservation accepted", e)
	}
	if terminal, effects, er := u.Counts(); er != nil || terminal != 0 || effects != 0 {
		t.Fatal("forgery consumed state", terminal, effects, er)
	}
	if _, e = client.Apply(r); e != nil {
		t.Fatal("valid apply", e)
	}
	if sawAuth.Load() || sawCookie.Load() {
		t.Fatal("ambient credentials attached")
	}
	if _, e = newUpstreamEffectClient("http://example.com:80", ctx, authorityPub, upstreamPub); !errors.Is(e, ErrPolicy) {
		t.Fatal("non-loopback accepted", e)
	}
	if _, e = newUpstreamEffectClient(srv.URL+"/path", ctx, authorityPub, upstreamPub); !errors.Is(e, ErrPolicy) {
		t.Fatal("origin path accepted", e)
	}

	var redirected atomic.Int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirected.Add(1) }))
	defer target.Close()
	redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer redirector.Close()
	redirectCtx, _ := Context(redirector.URL, "manifest-v1", "session-1")
	rr := signedUpstreamReservation(t, redirectCtx, authorityKey, Digest{54}, Digest{55}, Digest{56}, Digest{57})
	rc, e := newUpstreamEffectClient(redirector.URL, redirectCtx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = rc.Apply(rr); !errors.Is(e, ErrUpstreamUnavailable) {
		t.Fatal("redirect not rejected", e)
	}
	if redirected.Load() != 0 {
		t.Fatal("redirect followed", redirected.Load())
	}
}

func TestFencedCoordinatorResolvesOrphanThroughDurableUpstreamClosure(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	fenceServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer fenceServer.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, fenceServer.URL)
	fencePub, fenceKey := fenceKeys()
	upstreamPub, upstreamKey := closureKeys()
	a, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	genesis, _ := a.Head()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	fencePtr.Store(fence)
	fenceClient, e := NewFenceClient(fenceServer.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		t.Fatal(e)
	}

	var upstreamPtr atomic.Pointer[upstreamEffectAuthority]
	upstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { upstreamPtr.Load().serveHTTP(w, r) }))
	defer upstreamServer.Close()
	upstreamDir := privateTemp(t)
	upstream, e := createUpstreamEffectAuthority(upstreamDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	upstreamPtr.Store(upstream)
	upstreamClient, e := newUpstreamEffectClient(upstreamServer.URL, ctx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	coordinator, e := newFencedCoordinatorWithUpstreamAuthority(a, fenceClient, upstreamClient)
	if e != nil {
		t.Fatal(e)
	}
	coordinator.fault = func(at string) error {
		if at == "after-reserve" {
			return errors.New("drop owner evidence before effect")
		}
		return nil
	}
	action := approve(t, 0, ctx, ak)
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, action, callerKey[0])
	if _, e = coordinator.Process(wire); !errors.Is(e, ErrUnknown) {
		t.Fatal("reserve boundary not unknown", e)
	}
	pending, exists, e := fenceClient.PendingReservation()
	if e != nil || !exists {
		t.Fatal("missing pending", exists, e)
	}
	if e = os.Remove(coordinator.intentPath()); e != nil {
		t.Fatal(e)
	}
	_ = upstream.Close()
	upstream, e = openUpstreamEffectAuthorityStore(upstreamDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer upstream.Close()
	upstreamPtr.Store(upstream)
	if e = coordinator.resolveOrphanWithUpstreamClosure(); e != nil {
		t.Fatal("durable closure failed", e)
	}
	status, e := upstreamClient.Status(pending)
	if e != nil || status.State != upstreamClosed || !verifyUpstreamEffectStatus(status, pending, ctx, authorityPub, upstreamPub) {
		t.Fatal("CLOSED not durable", e, status)
	}
	if _, e = upstreamClient.Apply(pending); !errors.Is(e, ErrConflict) {
		t.Fatal("closed old identity applied", e)
	}
	if _, exists, e = fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("fence remained pending", exists, e)
	}
	spent, total, effects, e := a.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("closure crossed local effect", spent, total, effects, e)
	}
	coordinator.fault = nil
	fresh := approve(t, 1, ctx, ak)
	freshWire, _ := SignAuthorityRequest(1, AuthorityCommit, genesis, fresh, callerKey[1])
	result, e := coordinator.Process(freshWire)
	if e != nil || result.Authority.Outcome != AuthorityCommitted {
		t.Fatal("fresh work did not resume", e, result.Authority.Outcome)
	}
}

func TestUpstreamEffectAuthorityLostCloseReplyRecoversPermanentClosure(t *testing.T) {
	var current atomic.Pointer[upstreamEffectAuthority]
	var drop atomic.Bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := current.Load()
		if drop.CompareAndSwap(true, false) && r.URL.Path == "/upstream/close" {
			recorder := httptest.NewRecorder()
			u.serveHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("close before loss: %d", recorder.Code)
				return
			}
			conn, _, e := w.(http.Hijacker).Hijack()
			if e != nil {
				t.Error(e)
				return
			}
			_ = conn.Close()
			return
		}
		u.serveHTTP(w, r)
	}))
	defer srv.Close()
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, srv.URL)
	upstreamPub, upstreamKey := closureKeys()
	dir := privateTemp(t)
	u, e := createUpstreamEffectAuthority(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	current.Store(u)
	client, e := newUpstreamEffectClient(srv.URL, ctx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{80}, Digest{81}, Digest{82}, Digest{83})
	drop.Store(true)
	if _, e = client.CloseUnapplied(r); !errors.Is(e, ErrUpstreamUnavailable) {
		t.Fatal("lost close reply not unknown", e)
	}
	_ = u.Close()
	u, e = openUpstreamEffectAuthorityStore(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer u.Close()
	current.Store(u)
	status, e := client.Status(r)
	if e != nil || status.State != upstreamClosed {
		t.Fatal("closed status lost", e, status)
	}
	proof, e := client.CloseUnapplied(r)
	if e != nil || !VerifyEffectClosureProof(proof, ctx, authorityPub, r, upstreamPub) {
		t.Fatal("closure retry", e)
	}
	if _, e = client.Apply(r); !errors.Is(e, ErrConflict) {
		t.Fatal("lost close reply allowed later effect", e)
	}
	terminal, effects, e := u.Counts()
	if e != nil || terminal != 1 || effects != 0 {
		t.Fatal("closure accounting", terminal, effects, e)
	}
}
