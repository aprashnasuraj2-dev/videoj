//go:build linux

package actionprotocol

import (
	"bytes"
	"crypto/ed25519"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

type compositeFixture struct {
	policyPtr    *atomic.Pointer[GrantPolicyWitness]
	fencePtr     *atomic.Pointer[AdmissionFence]
	guardPtr     *atomic.Pointer[AnchoredFencedGrantGuard]
	book         *GrantBook
	bookDir      string
	bookKey      ed25519.PrivateKey
	policyW      *GrantPolicyWitness
	policyDir    string
	policyKey    ed25519.PrivateKey
	policyPub    ed25519.PublicKey
	policyClient *GrantPolicyClient
	policy       *GrantPolicyCoordinator
	policyGenesis Digest
	fence        *AdmissionFence
	fenceClient  *FenceClient
	fenced       *FencedCoordinator
	authority    *SharedAuthority
	guard        *AnchoredFencedGrantGuard
	server       *httptest.Server
	policySrv    *httptest.Server
	fenceSrv     *httptest.Server
	ctx          Digest
	approver     ed25519.PublicKey
	approverKey  ed25519.PrivateKey
	consentPub   ed25519.PublicKey
	consentKey   ed25519.PrivateKey
	callerKeys   [authorityCallers]ed25519.PrivateKey
	authorityPub ed25519.PublicKey
	fencePub     ed25519.PublicKey
	fenceGenesis Digest
}

func newCompositeFixture(t *testing.T, wrap func(http.Handler) http.Handler) *compositeFixture {
	t.Helper()
	policyPtr := &atomic.Pointer[GrantPolicyWitness]{}
	fencePtr := &atomic.Pointer[AdmissionFence]{}
	guardPtr := &atomic.Pointer[AnchoredFencedGrantGuard]{}
	policySrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := policyPtr.Load()
		if p == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		p.ServeHTTP(w, r)
	}))
	fenceSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f := fencePtr.Load()
		if f == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		f.ServeHTTP(w, r)
	}))
	ctx, approver, approverKey, authorityPub, authorityKey, callerPub, callerKeys := authorityFixture(t, fenceSrv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	fencePub, fenceKey := fenceKeys()

	bookDir, policyDir := privateTemp(t), privateTemp(t)
	book, e := CreateGrantBook(bookDir, ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	policyGenesis, _ := book.PolicyHead()
	policyW, e := CreateGrantPolicyWitness(policyDir, ctx, bookKey.Public().(ed25519.PublicKey), policyKey, policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	policyPtr.Store(policyW)
	policyClient, e := NewGrantPolicyClient(policySrv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	policy, e := NewGrantPolicyCoordinator(book, policyClient)
	if e != nil {
		t.Fatal(e)
	}

	authority, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	fenceGenesis, _ := authority.Head()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, fenceGenesis)
	if e != nil {
		t.Fatal(e)
	}
	fencePtr.Store(fence)
	fenceClient, e := NewFenceClient(fenceSrv.URL, ctx, authorityPub, fencePub, fenceGenesis)
	if e != nil {
		t.Fatal(e)
	}
	fenced, e := NewFencedCoordinator(authority, fenceClient)
	if e != nil {
		t.Fatal(e)
	}
	guard, e := NewAnchoredFencedGrantGuard(policy, fenced)
	if e != nil {
		t.Fatal(e)
	}
	guardPtr.Store(guard)
	var handler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g := guardPtr.Load()
		if g == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		g.ServeHTTP(w, r)
	})
	if wrap != nil {
		handler = wrap(handler)
	}
	server := httptest.NewServer(handler)
	t.Cleanup(func() {
		server.Close()
		fence.Close()
		authority.Close()
		policyW.Close()
		book.Close()
		fenceSrv.Close()
		policySrv.Close()
	})
	return &compositeFixture{
		policyPtr: policyPtr, fencePtr: fencePtr, guardPtr: guardPtr,
		book: book, bookDir: bookDir, bookKey: bookKey, policyW: policyW, policyDir: policyDir,
		policyKey: policyKey, policyPub: policyPub, policyClient: policyClient, policy: policy, policyGenesis: policyGenesis,
		fence: fence, fenceClient: fenceClient, fenced: fenced, authority: authority, guard: guard,
		server: server, policySrv: policySrv, fenceSrv: fenceSrv, ctx: ctx, approver: approver, approverKey: approverKey,
		consentPub: consentPub, consentKey: consentKey, callerKeys: callerKeys, authorityPub: authorityPub,
		fencePub: fencePub, fenceGenesis: fenceGenesis,
	}
}

func (f *compositeFixture) client(t *testing.T, caller byte, request Request, grant ActionGrant) *AnchoredFencedGrantClient {
	t.Helper()
	fencePin, e := f.fenceClient.View()
	if e != nil {
		t.Fatal(e)
	}
	policyPin, e := f.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	client, e := NewAnchoredFencedGrantClient(
		f.server.URL, caller, f.callerKeys[caller], f.authorityPub, f.fencePub, f.consentPub,
		f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.ctx, f.fenceGenesis, f.policyGenesis,
		fencePin, policyPin, request, grant,
	)
	if e != nil {
		t.Fatal(e)
	}
	return client
}

func TestAnchoredFencedExternalRejectsLegacyWriteRoutesWithoutStateChange(t *testing.T) {
	f := newCompositeFixture(t, nil)
	beforeFence, e := f.fenceClient.View()
	if e != nil {
		t.Fatal(e)
	}
	beforePolicy, e := f.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	beforeHead, e := f.authority.Head()
	if e != nil {
		t.Fatal(e)
	}
	beforeSpent, beforeTotal, beforeEffects, e := f.authority.Counts()
	if e != nil {
		t.Fatal(e)
	}

	legacy := []string{
		"/commit",
		"/status",
		"/authority",
		"/authority-witnessed",
		"/authority-granted",
		"/authority-granted-fenced?legacy=1",
	}
	for _, route := range legacy {
		req, e := http.NewRequest(http.MethodPost, f.server.URL+route, bytes.NewReader(make([]byte, pinnedGrantedAuthorityRequestSize)))
		if e != nil {
			t.Fatal(e)
		}
		req.Header.Set("Content-Type", media)
		req.Header.Set("Accept", media)
		res, e := http.DefaultClient.Do(req)
		if e != nil {
			t.Fatal(e)
		}
		res.Body.Close()
		if res.StatusCode != http.StatusBadRequest {
			t.Fatalf("legacy route %s returned %d", route, res.StatusCode)
		}
	}

	afterFence, e := f.fenceClient.View()
	if e != nil {
		t.Fatal(e)
	}
	afterPolicy, e := f.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	afterHead, e := f.authority.Head()
	if e != nil {
		t.Fatal(e)
	}
	afterSpent, afterTotal, afterEffects, e := f.authority.Counts()
	if e != nil {
		t.Fatal(e)
	}
	if beforeFence != afterFence || beforePolicy != afterPolicy || beforeHead != afterHead ||
		beforeSpent != afterSpent || beforeTotal != afterTotal || beforeEffects != afterEffects {
		t.Fatal("legacy route attempt changed composite state")
	}
}

func TestAnchoredFencedExternalCompositeCommitRevokeStatus(t *testing.T) {
	f := newCompositeFixture(t, nil)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	client := f.client(t, 0, request, grant)
	receipt, envelope, e := client.Commit()
	if e != nil || receipt.Version != 1 || client.FenceSequence() != 1 || client.PolicySequence() != 1 || client.Contacts() != 1 {
		t.Fatal("composite commit", e, receipt.Version, client.FenceSequence(), client.PolicySequence(), client.Contacts())
	}
	if envelope.Decision.Operation != AuthorityCommit ||
		envelope.Decision.PolicyHead != envelope.Membership.View.Head ||
		envelope.Membership.RequestedSequence != 0 || envelope.Membership.RequestedHead != f.policyGenesis ||
		envelope.Fenced.Reservation.RequestHash == (Digest{}) {
		t.Fatal("composite proof missing cross-domain bindings")
	}
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, f.fenceGenesis, request, f.callerKeys[0])
	pin, e := SignClientPolicyPin(f.ctx, grant.ID, wire.Hash(), 0, f.policyGenesis, f.callerKeys[0])
	if e != nil {
		t.Fatal(e)
	}
	if !VerifyAnchoredFencedEnvelope(envelope, grant, wire, pin, envelope.Membership.Challenge, f.ctx,
		f.callerKeys[0].Public().(ed25519.PublicKey), f.authorityPub, f.fencePub, f.consentPub,
		f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.fenceGenesis, f.policyGenesis) {
		t.Fatal("composite envelope independently invalid")
	}
	if e = f.policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	beforeFence, _ := f.fenceClient.View()
	if _, _, e = client.Commit(); !errors.Is(e, ErrPolicy) {
		t.Fatal("revoked external commit not forbidden", e)
	}
	afterFence, _ := f.fenceClient.View()
	if beforeFence != afterFence {
		t.Fatal("revoked request reached effect fence")
	}
	historical, statusEnvelope, e := client.Status()
	if e != nil || historical != receipt || statusEnvelope.Decision.Operation != AuthorityStatus ||
		client.FenceSequence() != 2 || client.PolicySequence() != 2 {
		t.Fatal("historical composite status", e, client.FenceSequence(), client.PolicySequence())
	}
	spent, total, effects, e := f.authority.Counts()
	if e != nil || spent != [authorityCallers]byte{2, 0} || total != 2 || effects != 1 {
		t.Fatal("final composite accounting", spent, total, effects, e)
	}
	t.Log("external proof carries fresh policy decision and exact pre-effect reservation; revocation blocks new effect while exact historical receipt remains reconcilable")
}

func TestAnchoredFencedExternalLostFinalReplyRecoversTwoDomains(t *testing.T) {
	var drop atomic.Bool
	drop.Store(true)
	var captured atomic.Pointer[AnchoredFencedEnvelope]
	wrap := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !drop.CompareAndSwap(true, false) {
				next.ServeHTTP(w, r)
				return
			}
			recorder := httptest.NewRecorder()
			next.ServeHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("composite server failed before transport loss: %d", recorder.Code)
				w.WriteHeader(500)
				return
			}
			envelope, e := ParseAnchoredFencedEnvelope(recorder.Body.Bytes())
			if e != nil {
				t.Error(e)
				w.WriteHeader(500)
				return
			}
			captured.Store(&envelope)
			conn, _, e := w.(http.Hijacker).Hijack()
			if e != nil {
				t.Error(e)
				return
			}
			conn.Close()
		})
	}
	f := newCompositeFixture(t, wrap)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	client := f.client(t, 0, request, grant)
	if _, _, e := client.Commit(); !errors.Is(e, ErrUnknown) {
		t.Fatal("lost final composite reply not unknown", e)
	}
	first := captured.Load()
	if first == nil || first.Fenced.Authority.Outcome != AuthorityCommitted || first.Fenced.Authority.Receipt.Version != 1 ||
		first.Membership.View.Sequence != 1 || first.Membership.RequestedSequence != 0 ||
		first.Membership.RequestedHead != f.policyGenesis || first.Fenced.Attestation.View.Sequence != 1 {
		t.Fatal("server did not complete both domains before transport loss")
	}
	if client.Head() != f.fenceGenesis || client.FenceSequence() != 0 || client.PolicySequence() != 0 || client.Contacts() != 1 {
		t.Fatal("client advanced without composite proof")
	}
	receipt, recovered, e := client.Status()
	if e != nil || receipt != first.Fenced.Authority.Receipt || recovered.Fenced.Authority.Stale != 1 ||
		client.FenceSequence() != 2 || client.PolicySequence() != 1 || client.Contacts() != 2 {
		t.Fatal("two-domain status recovery", e, client.FenceSequence(), client.PolicySequence(), client.Contacts())
	}
	_, total, effects, e := f.authority.Counts()
	if e != nil || total != 2 || effects != 1 {
		t.Fatal("lost response repeated effect", total, effects, e)
	}
	t.Log("lost final response leaves both client pins stale; fresh composite status recovers policy version 1 and effect-fence version 2 without repeating effect")
}

func TestAnchoredFencedExternalRejectsChallengeReuseBeforeNetwork(t *testing.T) {
	var requests atomic.Int32
	wrap := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requests.Add(1)
			next.ServeHTTP(w, r)
		})
	}
	f := newCompositeFixture(t, wrap)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	client := f.client(t, 0, request, grant)
	challenge := Digest{44}
	client.challenge = func() (Digest, error) { return challenge, nil }
	if _, _, e := client.Commit(); e != nil {
		t.Fatal(e)
	}
	if _, _, e := client.Status(); !errors.Is(e, ErrUnknown) {
		t.Fatal("challenge reuse accepted", e)
	}
	if requests.Load() != 1 || client.Contacts() != 1 {
		t.Fatal("reused challenge reached external server", requests.Load(), client.Contacts())
	}
	t.Log("one challenge cannot authorize two composite contacts; reuse is rejected before network")
}

func TestAnchoredFencedExternalRejectsValidlyResignedPolicySubstitution(t *testing.T) {
	var fixture *compositeFixture
	wrap := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			recorder := httptest.NewRecorder()
			next.ServeHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				w.WriteHeader(recorder.Code)
				return
			}
			envelope, e := ParseAnchoredFencedEnvelope(recorder.Body.Bytes())
			if e != nil {
				t.Error(e)
				w.WriteHeader(500)
				return
			}
			envelope.Decision.PolicyHead = Digest{55}
			copy(envelope.Decision.Signature[:], ed25519.Sign(fixture.bookKey, envelope.Decision.message(fixture.ctx)))
			if !ed25519.Verify(fixture.bookKey.Public().(ed25519.PublicKey), envelope.Decision.message(fixture.ctx), envelope.Decision.Signature[:]) {
				t.Error("negative control decision was not re-signed")
			}
			w.Header().Set("Content-Type", media)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(envelope.Bytes())
		})
	}
	f := newCompositeFixture(t, wrap)
	fixture = f
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	client := f.client(t, 0, request, grant)
	if _, _, e := client.Commit(); !errors.Is(e, ErrUnknown) {
		t.Fatal("re-signed mismatched policy head accepted", e)
	}
	_, total, effects, e := f.authority.Counts()
	if e != nil || total != 1 || effects != 1 {
		t.Fatal("server transaction lost after caller rejected substitution", total, effects, e)
	}
	if client.FenceSequence() != 0 || client.PolicySequence() != 0 {
		t.Fatal("client pins advanced on cross-domain substitution")
	}
	t.Log("a valid book-signer signature cannot substitute a policy head that the independent policy witness did not attest")
}

func TestAnchoredFencedExternalPolicyPinPreventsCoordinatedRollbackEffect(t *testing.T) {
	f := newCompositeFixture(t, nil)
	request := approve(t, 0, f.ctx, f.approverKey)
	// Keep grant active at epoch 11 so the sequence-1 snapshot is a real
	// resurrectable authorization after coordinated rollback.
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 12, f.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	if e = f.policy.AdvanceEpoch(10, 11); e != nil {
		t.Fatal(e)
	}
	bookSeq1, _ := os.ReadFile(filepath.Join(f.bookDir, "grantbook.bin"))
	witnessSeq1, _ := os.ReadFile(filepath.Join(f.policyDir, "grant-policy.bin"))
	if e = f.policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	policyPin, e := f.policyClient.View()
	if e != nil || policyPin.Sequence != 2 {
		t.Fatal("policy high-water setup", e, policyPin.Sequence)
	}
	fencePin, _ := f.fenceClient.View()
	client, e := NewAnchoredFencedGrantClient(
		f.server.URL, 0, f.callerKeys[0], f.authorityPub, f.fencePub, f.consentPub,
		f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.ctx, f.fenceGenesis, f.policyGenesis,
		fencePin, policyPin, request, grant,
	)
	if e != nil {
		t.Fatal(e)
	}
	// Restore both policy trust domains to sequence 1. A freshly provisioned
	// caller would see a mutually valid active grant at this point.
	f.book.Close()
	f.policyW.Close()
	if e = os.WriteFile(filepath.Join(f.bookDir, "grantbook.bin"), bookSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(f.policyDir, "grant-policy.bin"), witnessSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	rolledBook, e := OpenGrantBook(f.bookDir, f.ctx, f.consentPub, f.approver, f.bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledBook.Close()
	rolledWitness, e := OpenGrantPolicyWitness(f.policyDir, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyKey, f.policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledWitness.Close()
	f.policyPtr.Store(rolledWitness)
	rolledClient, _ := NewGrantPolicyClient(f.policySrv.URL, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.policyGenesis)
	rolledPolicy, _ := NewGrantPolicyCoordinator(rolledBook, rolledClient)
	rolledGuard, _ := NewAnchoredFencedGrantGuard(rolledPolicy, f.fenced)
	f.guardPtr.Store(rolledGuard)

	if _, _, e = client.Commit(); !errors.Is(e, ErrWitnessRollback) {
		t.Fatal("signed client high-water did not block coordinated rollback before effect", e)
	}
	_, total, effects, e := f.authority.Counts()
	if e != nil || total != 0 || effects != 0 {
		t.Fatal("rolled policy crossed authority boundary", total, effects, e)
	}
	fv, e := f.fenceClient.View()
	if e != nil || fv.Sequence != 0 || fv.Head != f.fenceGenesis {
		t.Fatal("rolled policy crossed effect fence", e, fv)
	}
	if client.PolicySequence() != 2 || client.FenceSequence() != 0 {
		t.Fatal("client lowered pins", client.PolicySequence(), client.FenceSequence())
	}
	t.Log("returning client signs policy sequence 2 into the request; coordinated rollback to valid sequence 1 is rejected before effect-fence admission")
}

func TestAnchoredFencedExternalFreshClientCannotDetectProvisionedRolledPolicyPair(t *testing.T) {
	f := newCompositeFixture(t, nil)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 12, f.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	if e = f.policy.AdvanceEpoch(10, 11); e != nil {
		t.Fatal(e)
	}
	bookSeq1, _ := os.ReadFile(filepath.Join(f.bookDir, "grantbook.bin"))
	witnessSeq1, _ := os.ReadFile(filepath.Join(f.policyDir, "grant-policy.bin"))
	if e = f.policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	f.book.Close()
	f.policyW.Close()
	if e = os.WriteFile(filepath.Join(f.bookDir, "grantbook.bin"), bookSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(f.policyDir, "grant-policy.bin"), witnessSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	rolledBook, e := OpenGrantBook(f.bookDir, f.ctx, f.consentPub, f.approver, f.bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledBook.Close()
	rolledWitness, e := OpenGrantPolicyWitness(f.policyDir, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyKey, f.policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledWitness.Close()
	f.policyPtr.Store(rolledWitness)
	rolledClient, _ := NewGrantPolicyClient(f.policySrv.URL, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.policyGenesis)
	rolledPolicy, _ := NewGrantPolicyCoordinator(rolledBook, rolledClient)
	rolledGuard, _ := NewAnchoredFencedGrantGuard(rolledPolicy, f.fenced)
	f.guardPtr.Store(rolledGuard)
	// Permanent counterexample: provisioning a brand-new caller from the rolled
	// pair gives it sequence 1 as its legitimate starting high-water.
	f.policyClient = rolledClient
	f.book = rolledBook
	client := f.client(t, 0, request, grant)
	if client.PolicySequence() != 1 {
		t.Fatal("fresh rolled client pin", client.PolicySequence())
	}
	receipt, _, e := client.Commit()
	if e != nil || receipt.Version != 1 {
		t.Fatal("negative control did not execute resurrected policy", e)
	}
	_, total, effects, e := f.authority.Counts()
	if e != nil || total != 1 || effects != 1 {
		t.Fatal("negative control effect", total, effects, e)
	}
	t.Log("counterexample retained: a brand-new client provisioned from a coordinated rolled policy pair cannot know a newer revocation existed; an external provisioning root is still required")
}

func TestAnchoredFencedExternalForgedGrantRefusedAtConstruction(t *testing.T) {
	var requests atomic.Int32
	wrap := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requests.Add(1)
			next.ServeHTTP(w, r)
		})
	}
	f := newCompositeFixture(t, wrap)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	grant.Signature[0] ^= 1
	fencePin, _ := f.fenceClient.View()
	policyPin, _ := f.policyClient.View()
	if _, e := NewAnchoredFencedGrantClient(
		f.server.URL, 0, f.callerKeys[0], f.authorityPub, f.fencePub, f.consentPub,
		f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.ctx, f.fenceGenesis, f.policyGenesis,
		fencePin, policyPin, request, grant,
	); !errors.Is(e, ErrPolicy) {
		t.Fatal("forged grant client constructed", e)
	}
	if requests.Load() != 0 {
		t.Fatal("forged grant contacted external server")
	}
	t.Log("external action session verifies exact grant before gaining a network-capable client")
}


func TestAnchoredFencedExternalRejectsAlternateHistoryPastClientHighWater(t *testing.T) {
	f := newCompositeFixture(t, nil)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 20, f.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	// Canonical history: epoch 11 at sequence 1, then target revocation at
	// sequence 2. The client pins that exact sequence-2 revocation head.
	if e = f.policy.AdvanceEpoch(10, 11); e != nil {
		t.Fatal(e)
	}
	bookSeq1, _ := os.ReadFile(filepath.Join(f.bookDir, "grantbook.bin"))
	witnessSeq1, _ := os.ReadFile(filepath.Join(f.policyDir, "grant-policy.bin"))
	if e = f.policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	policyPin, e := f.policyClient.View()
	if e != nil || policyPin.Sequence != 2 {
		t.Fatal("canonical client pin", e, policyPin.Sequence)
	}
	fencePin, _ := f.fenceClient.View()
	client, e := NewAnchoredFencedGrantClient(
		f.server.URL, 0, f.callerKeys[0], f.authorityPub, f.fencePub, f.consentPub,
		f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.ctx, f.fenceGenesis, f.policyGenesis,
		fencePin, policyPin, request, grant,
	)
	if e != nil {
		t.Fatal(e)
	}

	// Roll both policy domains back to sequence 1, then build a valid alternate
	// history past the client's numeric high-water without revoking the target:
	// seq2' = epoch 12, seq3' = epoch 13.
	f.book.Close()
	f.policyW.Close()
	if e = os.WriteFile(filepath.Join(f.bookDir, "grantbook.bin"), bookSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(f.policyDir, "grant-policy.bin"), witnessSeq1, 0600); e != nil {
		t.Fatal(e)
	}
	rolledBook, e := OpenGrantBook(f.bookDir, f.ctx, f.consentPub, f.approver, f.bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledBook.Close()
	rolledWitness, e := OpenGrantPolicyWitness(f.policyDir, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyKey, f.policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer rolledWitness.Close()
	f.policyPtr.Store(rolledWitness)
	rolledClient, _ := NewGrantPolicyClient(f.policySrv.URL, f.ctx, f.bookKey.Public().(ed25519.PublicKey), f.policyPub, f.policyGenesis)
	rolledPolicy, _ := NewGrantPolicyCoordinator(rolledBook, rolledClient)
	if e = rolledPolicy.AdvanceEpoch(11, 12); e != nil {
		t.Fatal("alternate seq2", e)
	}
	if e = rolledPolicy.AdvanceEpoch(12, 13); e != nil {
		t.Fatal("alternate seq3", e)
	}
	view, e := rolledClient.FreshView()
	if e != nil || view.Sequence != 3 || view.Head == policyPin.Head {
		t.Fatal("alternate history setup", e, view.Sequence)
	}
	rolledGuard, _ := NewAnchoredFencedGrantGuard(rolledPolicy, f.fenced)
	f.guardPtr.Store(rolledGuard)

	// Security requirement: a sequence higher than the caller's pin is not
	// sufficient. The live witness must prove that the caller's exact pinned
	// head exists at the pinned sequence in its retained history.
	if _, _, e = client.Commit(); !errors.Is(e, ErrWitnessRollback) {
		t.Fatal("alternate history past numeric high-water reached effect; ancestry proof missing", e)
	}
	_, total, effects, e := f.authority.Counts()
	if e != nil || total != 0 || effects != 0 {
		t.Fatal("alternate policy history crossed effect boundary", total, effects, e)
	}
	fv, e := f.fenceClient.View()
	if e != nil || fv.Sequence != 0 || fv.Head != f.fenceGenesis {
		t.Fatal("alternate policy history crossed admission fence", e, fv)
	}
	t.Log("client high-water is an exact history pin, not only a sequence counter; alternate 2-prime/3-prime history is rejected before effect")
}
