//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
)

type upstreamTxnHarness struct {
	ctx          Digest
	approver     ed25519.PublicKey
	approverKey  ed25519.PrivateKey
	authorityPub ed25519.PublicKey
	authorityKey ed25519.PrivateKey
	callerPub    [authorityCallers]ed25519.PublicKey
	callerKey    [authorityCallers]ed25519.PrivateKey
	root         Digest

	authorityDir string
	upstreamDir  string
	authority    *SharedAuthority
	fence        *AdmissionFence
	fenceClient  *FenceClient
	upstream     *upstreamEffectAuthority
	upstreamClient *upstreamEffectClient
	coordinator  *upstreamTransactionCoordinator

	fencePtr    atomic.Pointer[AdmissionFence]
	upstreamPtr atomic.Pointer[upstreamEffectAuthority]
	dropApplyBefore atomic.Bool
	dropApplyAfter  atomic.Bool
	dropFinalizeAfter atomic.Bool
	fenceServer *httptest.Server
	upstreamServer *httptest.Server
}

func newUpstreamTxnHarness(t *testing.T, upstreamLimit uint32) *upstreamTxnHarness {
	t.Helper()
	h := &upstreamTxnHarness{}
	h.fenceServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f := h.fencePtr.Load()
		if f == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		if r.URL.Path == "/fence/finalize" && h.dropFinalizeAfter.CompareAndSwap(true, false) {
			recorder := httptest.NewRecorder()
			f.ServeHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("finalize before dropped reply: %d", recorder.Code)
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
		f.ServeHTTP(w, r)
	}))
	h.upstreamServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := h.upstreamPtr.Load()
		if u == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		if r.URL.Path == "/upstream/apply" && h.dropApplyBefore.CompareAndSwap(true, false) {
			conn, _, e := w.(http.Hijacker).Hijack()
			if e != nil {
				t.Error(e)
				return
			}
			_ = conn.Close()
			return
		}
		if r.URL.Path == "/upstream/apply" && h.dropApplyAfter.CompareAndSwap(true, false) {
			recorder := httptest.NewRecorder()
			u.serveHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("apply before dropped reply: %d", recorder.Code)
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

	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, h.fenceServer.URL)
	h.ctx = ctx
	h.approver = append(ed25519.PublicKey(nil), approver...)
	h.approverKey = append(ed25519.PrivateKey(nil), ak...)
	h.authorityPub = append(ed25519.PublicKey(nil), authorityPub...)
	h.authorityKey = append(ed25519.PrivateKey(nil), authorityKey...)
	for i := range callerPub {
		h.callerPub[i] = append(ed25519.PublicKey(nil), callerPub[i]...)
		h.callerKey[i] = append(ed25519.PrivateKey(nil), callerKey[i]...)
	}
	h.authorityDir = privateTemp(t)
	a, e := CreateSharedAuthority(h.authorityDir, ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	h.authority = a
	h.root, e = a.Head()
	if e != nil {
		t.Fatal(e)
	}
	fencePub, fenceKey := fenceKeys()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, h.root)
	if e != nil {
		t.Fatal(e)
	}
	h.fence = fence
	h.fencePtr.Store(fence)
	h.fenceClient, e = NewFenceClient(h.fenceServer.URL, ctx, authorityPub, fencePub, h.root)
	if e != nil {
		t.Fatal(e)
	}
	upstreamPub, upstreamKey := closureKeys()
	h.upstreamDir = privateTemp(t)
	upstream, e := createUpstreamEffectAuthority(h.upstreamDir, ctx, authorityPub, upstreamKey, upstreamLimit)
	if e != nil {
		t.Fatal(e)
	}
	h.upstream = upstream
	h.upstreamPtr.Store(upstream)
	h.upstreamClient, e = newUpstreamEffectClient(h.upstreamServer.URL, ctx, authorityPub, upstreamPub)
	if e != nil {
		t.Fatal(e)
	}
	h.coordinator, e = newUpstreamTransactionCoordinator(a, h.fenceClient, h.upstreamClient)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if h.authority != nil {
			_ = h.authority.Close()
		}
		if h.fence != nil {
			_ = h.fence.Close()
		}
		if h.upstream != nil {
			_ = h.upstream.Close()
		}
		if h.fenceServer != nil {
			h.fenceServer.Close()
		}
		if h.upstreamServer != nil {
			h.upstreamServer.Close()
		}
	})
	return h
}

func (h *upstreamTxnHarness) request(t *testing.T, caller, slot byte, expected Digest) AuthorityRequest {
	t.Helper()
	action := approve(t, slot, h.ctx, h.approverKey)
	req, e := SignAuthorityRequest(caller, AuthorityCommit, expected, action, h.callerKey[caller])
	if e != nil {
		t.Fatal(e)
	}
	return req
}

func (h *upstreamTxnHarness) reopenAuthority(t *testing.T) {
	t.Helper()
	if e := h.authority.Close(); e != nil {
		t.Fatal(e)
	}
	a, e := OpenSharedAuthority(h.authorityDir, h.ctx, h.approver, h.authorityKey, h.callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	h.authority = a
	h.coordinator, e = newUpstreamTransactionCoordinator(a, h.fenceClient, h.upstreamClient)
	if e != nil {
		t.Fatal(e)
	}
}

func TestUpstreamTransactionHappyPathBindsExternalReceipt(t *testing.T) {
	h := newUpstreamTxnHarness(t, 2)
	req := h.request(t, 0, 0, h.root)
	result, e := h.coordinator.Process(req)
	if e != nil {
		t.Fatal(e)
	}
	if !verifyUpstreamFencedResult(result, req, h.ctx, h.authorityPub, h.fenceClient.fence, h.upstreamClient.upstream, h.root) {
		t.Fatal("causal result failed verification")
	}
	if result.Upstream.ReservationHash != result.Reservation.Hash() ||
		result.Upstream.RequestHash != req.Hash() || result.Authority.After != result.Reservation.After ||
		result.Fence.Head != result.Authority.After {
		t.Fatal("result chain is not exact")
	}
	bad := result
	bad.Upstream.Signature[0] ^= 1
	if verifyUpstreamFencedResult(bad, req, h.ctx, h.authorityPub, h.fenceClient.fence, h.upstreamClient.upstream, h.root) {
		t.Fatal("tampered upstream receipt verified")
	}
	spent, total, localEffects, e := h.authority.Counts()
	if e != nil || spent != [authorityCallers]byte{1, 0} || total != 1 || localEffects != 1 {
		t.Fatal("local accounting", spent, total, localEffects, e)
	}
	terminals, upstreamEffects, e := h.upstream.Counts()
	if e != nil || terminals != 1 || upstreamEffects != 1 {
		t.Fatal("upstream accounting", terminals, upstreamEffects, e)
	}
	if _, exists, e := h.fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("successful transaction left pending fence", exists, e)
	}
}

func TestUpstreamTransactionUnknownBeforeEffectClosesThenAborts(t *testing.T) {
	for _, stage := range []string{"txn-after-intent", "txn-after-reserve"} {
		t.Run(stage, func(t *testing.T) {
			h := newUpstreamTxnHarness(t, 2)
			req := h.request(t, 0, 0, h.root)
			h.coordinator.fault = func(at string) error {
				if at == stage {
					return errors.New("injected")
				}
				return nil
			}
			if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
				t.Fatal("pre-effect interruption not unknown", e)
			}
			h.coordinator.fault = nil
			if e := h.coordinator.Recover(); e != nil {
				t.Fatal("safe pre-effect recovery", e)
			}
			spent, total, localEffects, e := h.authority.Counts()
			if e != nil || spent != [authorityCallers]byte{} || total != 0 || localEffects != 0 {
				t.Fatal("pre-effect recovery mutated local authority", spent, total, localEffects, e)
			}
			terminals, upstreamEffects, e := h.upstream.Counts()
			if e != nil || terminals != 1 || upstreamEffects != 0 {
				t.Fatal("pre-effect recovery did not close zero-effect identity", terminals, upstreamEffects, e)
			}
			if _, exists, e := h.fenceClient.PendingReservation(); e != nil || exists {
				t.Fatal("pre-effect recovery left fence pending", exists, e)
			}
			result, e := h.coordinator.Process(req)
			if e != nil || result.Authority.Outcome != AuthorityCommitted {
				t.Fatal("fresh identity after CLOSED did not regain liveness", e)
			}
			_, upstreamEffects, _ = h.upstream.Counts()
			if upstreamEffects != 1 {
				t.Fatal("fresh retry did not produce exactly one effect", upstreamEffects)
			}
		})
	}
}

func TestUpstreamTransactionLostApplyReplyUsesApplyVsCloseRecovery(t *testing.T) {
	t.Run("lost-before-effect", func(t *testing.T) {
		h := newUpstreamTxnHarness(t, 2)
		req := h.request(t, 0, 0, h.root)
		h.dropApplyBefore.Store(true)
		if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
			t.Fatal("lost request not unknown", e)
		}
		if e := h.coordinator.Recover(); e != nil {
			t.Fatal("close did not win absent dispatch", e)
		}
		if _, effects, _ := h.upstream.Counts(); effects != 0 {
			t.Fatal("lost-before-effect fabricated effect", effects)
		}
		if _, _, localEffects, _ := h.authority.Counts(); localEffects != 0 {
			t.Fatal("lost-before-effect fabricated local acknowledgement", localEffects)
		}
	})

	t.Run("lost-after-effect", func(t *testing.T) {
		h := newUpstreamTxnHarness(t, 2)
		req := h.request(t, 0, 0, h.root)
		h.dropApplyAfter.Store(true)
		if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
			t.Fatal("lost response not unknown", e)
		}
		if _, effects, _ := h.upstream.Counts(); effects != 1 {
			t.Fatal("server-side effect missing before recovery", effects)
		}
		if _, _, localEffects, _ := h.authority.Counts(); localEffects != 0 {
			t.Fatal("local acknowledgement happened before upstream ambiguity resolved", localEffects)
		}
		if e := h.coordinator.Recover(); e != nil {
			t.Fatal("APPLIED did not win recovery", e)
		}
		if _, effects, _ := h.upstream.Counts(); effects != 1 {
			t.Fatal("recovery repeated upstream effect", effects)
		}
		if _, _, localEffects, _ := h.authority.Counts(); localEffects != 1 {
			t.Fatal("recovery did not complete local acknowledgement", localEffects)
		}
		view, e := h.fenceClient.View()
		if e != nil || view.Pending != (Digest{}) || view.Head == h.root {
			t.Fatal("recovery did not finalize fence", e, view)
		}
	})
}

func TestUpstreamTransactionRestartAfterEffectBeforeLocalAck(t *testing.T) {
	h := newUpstreamTxnHarness(t, 2)
	req := h.request(t, 0, 0, h.root)
	h.coordinator.fault = func(at string) error {
		if at == "txn-after-upstream" {
			return errors.New("process exit seam")
		}
		return nil
	}
	if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
		t.Fatal("post-effect interruption not unknown", e)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 1 {
		t.Fatal("upstream effect missing", effects)
	}
	if _, _, localEffects, _ := h.authority.Counts(); localEffects != 0 {
		t.Fatal("local acknowledgement preceded recovery", localEffects)
	}
	h.reopenAuthority(t)
	if e := h.coordinator.Recover(); e != nil {
		t.Fatal("restart recovery", e)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 1 {
		t.Fatal("restart repeated upstream effect", effects)
	}
	if _, _, localEffects, _ := h.authority.Counts(); localEffects != 1 {
		t.Fatal("restart did not commit local acknowledgement", localEffects)
	}
	if _, exists, e := h.fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("restart left admission pending", exists, e)
	}
}

func TestUpstreamTransactionLostFinalizeReplyReconcilesWithoutRedispatch(t *testing.T) {
	h := newUpstreamTxnHarness(t, 2)
	req := h.request(t, 0, 0, h.root)
	h.dropFinalizeAfter.Store(true)
	if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
		t.Fatal("lost finalize reply not unknown", e)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 1 {
		t.Fatal("upstream effect missing", effects)
	}
	if _, _, localEffects, _ := h.authority.Counts(); localEffects != 1 {
		t.Fatal("local acknowledgement missing", localEffects)
	}
	view, e := h.fenceClient.View()
	if e != nil || view.Pending != (Digest{}) || view.Head == h.root {
		t.Fatal("server-side finalize did not persist", e, view)
	}
	if e = h.coordinator.Recover(); e != nil {
		t.Fatal("finalize reconciliation", e)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 1 {
		t.Fatal("finalize recovery redispatched effect", effects)
	}
	if _, e = os.Stat(filepath.Join(h.authorityDir, upstreamTxnIntentName)); !errors.Is(e, os.ErrNotExist) {
		t.Fatal("reconciled intent not cleared", e)
	}
}

func TestUpstreamTransactionGlobalUpstreamBudgetFailsClosed(t *testing.T) {
	h := newUpstreamTxnHarness(t, 1)
	first := h.request(t, 0, 0, h.root)
	result, e := h.coordinator.Process(first)
	if e != nil {
		t.Fatal(e)
	}
	second := h.request(t, 1, 1, result.Authority.After)
	if _, e = h.coordinator.Process(second); !errors.Is(e, ErrUnknown) {
		t.Fatal("exhausted upstream dispatch not unknown/fail-closed", e)
	}
	if e = h.coordinator.Recover(); e != nil {
		t.Fatal("budget recovery did not close exact second identity", e)
	}
	terminals, upstreamEffects, e := h.upstream.Counts()
	if e != nil || terminals != 2 || upstreamEffects != 1 {
		t.Fatal("upstream budget escaped", terminals, upstreamEffects, e)
	}
	spent, total, localEffects, e := h.authority.Counts()
	if e != nil || spent != [authorityCallers]byte{1, 0} || total != 1 || localEffects != 1 {
		t.Fatal("failed second effect consumed local acknowledgement budget", spent, total, localEffects, e)
	}
	if _, exists, e := h.fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("budget recovery left fence pending", exists, e)
	}
}

func TestUpstreamTransactionConcurrentClonedCallersShareFenceAndUpstream(t *testing.T) {
	h := newUpstreamTxnHarness(t, 2)
	state, e := os.ReadFile(filepath.Join(h.authorityDir, "authority.bin"))
	if e != nil {
		t.Fatal(e)
	}
	cloneDir := privateTemp(t)
	if e = os.WriteFile(filepath.Join(cloneDir, "authority.bin"), state, 0600); e != nil {
		t.Fatal(e)
	}
	clone, e := OpenSharedAuthority(cloneDir, h.ctx, h.approver, h.authorityKey, h.callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer clone.Close()
	cloneCoordinator, e := newUpstreamTransactionCoordinator(clone, h.fenceClient, h.upstreamClient)
	if e != nil {
		t.Fatal(e)
	}
	req0 := h.request(t, 0, 0, h.root)
	req1 := h.request(t, 1, 1, h.root)
	type answer struct {
		who int
		err error
	}
	ch := make(chan answer, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, e := h.coordinator.Process(req0); ch <- answer{0, e} }()
	go func() { defer wg.Done(); _, e := cloneCoordinator.Process(req1); ch <- answer{1, e} }()
	wg.Wait()
	close(ch)
	success := 0
	for x := range ch {
		if x.err == nil {
			success++
			continue
		}
		if !errors.Is(x.err, ErrFenceConflict) && !errors.Is(x.err, ErrWitnessRollback) {
			t.Fatal("unexpected clone result", x.who, x.err)
		}
	}
	if success != 1 {
		t.Fatal("shared fence did not admit exactly one clone", success)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 1 {
		t.Fatal("cloned callers produced multiple upstream effects", effects)
	}
	_, _, leftEffects, _ := h.authority.Counts()
	_, _, rightEffects, _ := clone.Counts()
	if leftEffects+rightEffects != 1 {
		t.Fatal("cloned local authorities acknowledged more than one branch", leftEffects, rightEffects)
	}
}

func TestUpstreamTransactionIntentTamperFailsBeforeEffect(t *testing.T) {
	h := newUpstreamTxnHarness(t, 2)
	req := h.request(t, 0, 0, h.root)
	h.coordinator.fault = func(at string) error {
		if at == "txn-after-intent" {
			return errors.New("stop")
		}
		return nil
	}
	if _, e := h.coordinator.Process(req); !errors.Is(e, ErrUnknown) {
		t.Fatal(e)
	}
	path := filepath.Join(h.authorityDir, upstreamTxnIntentName)
	raw, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	raw[len(raw)-1] ^= 1
	if e = os.WriteFile(path, raw, 0600); e != nil {
		t.Fatal(e)
	}
	h.coordinator.fault = nil
	if e = h.coordinator.Recover(); !errors.Is(e, ErrStore) {
		t.Fatal("tampered intent accepted", e)
	}
	if _, effects, _ := h.upstream.Counts(); effects != 0 {
		t.Fatal("tampered intent reached upstream effect", effects)
	}
	if _, _, localEffects, _ := h.authority.Counts(); localEffects != 0 {
		t.Fatal("tampered intent reached local acknowledgement", localEffects)
	}
}
