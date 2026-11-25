//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func grantPolicyKeys() (ed25519.PublicKey, ed25519.PrivateKey) { return keys(15) }

type grantPolicyFixtureState struct {
	book       *GrantBook
	witness    *GrantPolicyWitness
	client     *GrantPolicyClient
	coordinator *GrantPolicyCoordinator
	server     *httptest.Server
	ctx        Digest
	approver   ed25519.PublicKey
	approverKey ed25519.PrivateKey
	consentPub ed25519.PublicKey
	consentKey ed25519.PrivateKey
	bookKey    ed25519.PrivateKey
	witnessKey ed25519.PrivateKey
	bookDir    string
	witnessDir string
}

func newGrantPolicyFixture(t *testing.T) *grantPolicyFixtureState {
	t.Helper()
	var current atomic.Pointer[GrantPolicyWitness]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		witness := current.Load()
		if witness == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		witness.ServeHTTP(w, r)
	}))
	ctx, approver, approverKey, _, _, _, _ := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	bookDir, witnessDir := privateTemp(t), privateTemp(t)
	book, e := CreateGrantBook(bookDir, ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		srv.Close()
		t.Fatal(e)
	}
	genesis, e := book.PolicyHead()
	if e != nil {
		book.Close()
		srv.Close()
		t.Fatal(e)
	}
	witness, e := CreateGrantPolicyWitness(witnessDir, ctx, bookKey.Public().(ed25519.PublicKey), policyKey, genesis)
	if e != nil {
		book.Close()
		srv.Close()
		t.Fatal(e)
	}
	current.Store(witness)
	client, e := NewGrantPolicyClient(srv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, genesis)
	if e != nil {
		witness.Close()
		book.Close()
		srv.Close()
		t.Fatal(e)
	}
	coordinator, e := NewGrantPolicyCoordinator(book, client)
	if e != nil {
		witness.Close()
		book.Close()
		srv.Close()
		t.Fatal(e)
	}
	t.Cleanup(func() {
		witness.Close()
		book.Close()
		srv.Close()
	})
	return &grantPolicyFixtureState{
		book: book, witness: witness, client: client, coordinator: coordinator, server: srv,
		ctx: ctx, approver: approver, approverKey: approverKey, consentPub: consentPub, consentKey: consentKey,
		bookKey: bookKey, witnessKey: policyKey, bookDir: bookDir, witnessDir: witnessDir,
	}
}

func TestGrantPolicyFreshAttestationRejectsStaticReplay(t *testing.T) {
	f := newGrantPolicyFixture(t)
	static, e := f.witness.View()
	if e != nil {
		t.Fatal(e)
	}
	challenge := Digest{1}
	attestation, e := f.witness.Attest(challenge)
	if e != nil {
		t.Fatal(e)
	}
	policyPub, _ := grantPolicyKeys()
	bookPub := f.bookKey.Public().(ed25519.PublicKey)
	if !VerifyGrantPolicyAttestation(attestation, challenge, f.ctx, bookPub, policyPub, static.Genesis) {
		t.Fatal("fresh policy attestation invalid")
	}
	if VerifyGrantPolicyAttestation(attestation, Digest{2}, f.ctx, bookPub, policyPub, static.Genesis) {
		t.Fatal("fresh policy attestation replayed under new challenge")
	}
	// A valid static view is intentionally not an attestation and cannot be
	// serialized into the attestation parser as a freshness proof.
	if _, e = ParseGrantPolicyAttestation(static.Bytes()); e == nil {
		t.Fatal("static policy view parsed as fresh attestation")
	}
	fresh, e := f.client.FreshView()
	if e != nil || fresh != static {
		t.Fatal("fresh client view", e)
	}
	t.Log("dispatch policy comparison is nonce-bound; static valid signatures are not freshness")
}

func TestGrantPolicyWitnessDetectsOldValidBookRollback(t *testing.T) {
	f := newGrantPolicyFixture(t)
	request := approve(t, 0, f.ctx, f.approverKey)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 11, f.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	oldBook, e := os.ReadFile(filepath.Join(f.bookDir, "grantbook.bin"))
	if e != nil {
		t.Fatal(e)
	}
	if e = f.coordinator.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	view, e := f.client.FreshView()
	if e != nil || view.Sequence != 1 {
		t.Fatal("policy witness did not advance", e, view.Sequence)
	}
	if e = f.book.CheckDispatch(grant, request, GrantPrimary); !errors.Is(e, ErrGrantRevoked) {
		t.Fatal("revocation did not apply", e)
	}
	if e = f.book.Close(); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(f.bookDir, "grantbook.bin"), oldBook, 0600); e != nil {
		t.Fatal(e)
	}
	rolled, e := OpenGrantBook(f.bookDir, f.ctx, f.consentPub, f.approver, f.bookKey)
	if e != nil {
		t.Fatal("old signed GrantBook should still parse", e)
	}
	defer rolled.Close()
	rolledCoordinator, e := NewGrantPolicyCoordinator(rolled, f.client)
	if e != nil {
		t.Fatal(e)
	}
	if e = rolledCoordinator.Recover(); !errors.Is(e, ErrGrantPolicyRollback) {
		t.Fatal("old valid policy snapshot matched advanced witness", e)
	}
	if e = rolled.CheckDispatch(grant, request, GrantPrimary); e != nil {
		t.Fatal("negative control: rolled local book should have resurrected grant absent witness", e)
	}
	t.Log("old signed GrantBook resurrects grant locally but fresh independent policy witness rejects that snapshot")
}

func TestGrantPolicyCoordinatedDualRollbackCounterexample(t *testing.T) {
	var current atomic.Pointer[GrantPolicyWitness]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { current.Load().ServeHTTP(w, r) }))
	defer srv.Close()
	ctx, approver, ak, _, _, _, _ := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	bookDir, witnessDir := privateTemp(t), privateTemp(t)
	book, e := CreateGrantBook(bookDir, ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	genesis, _ := book.PolicyHead()
	witness, e := CreateGrantPolicyWitness(witnessDir, ctx, bookKey.Public().(ed25519.PublicKey), policyKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	current.Store(witness)
	client, _ := NewGrantPolicyClient(srv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, genesis)
	coordinator, _ := NewGrantPolicyCoordinator(book, client)
	oldBook, _ := os.ReadFile(filepath.Join(bookDir, "grantbook.bin"))
	oldWitness, _ := os.ReadFile(filepath.Join(witnessDir, "grant-policy.bin"))
	request := approve(t, 0, ctx, ak)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	if e = coordinator.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	book.Close()
	witness.Close()
	if e = os.WriteFile(filepath.Join(bookDir, "grantbook.bin"), oldBook, 0600); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(witnessDir, "grant-policy.bin"), oldWitness, 0600); e != nil {
		t.Fatal(e)
	}
	book, e = OpenGrantBook(bookDir, ctx, consentPub, approver, bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer book.Close()
	witness, e = OpenGrantPolicyWitness(witnessDir, ctx, bookKey.Public().(ed25519.PublicKey), policyKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer witness.Close()
	current.Store(witness)
	client, _ = NewGrantPolicyClient(srv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, genesis)
	coordinator, _ = NewGrantPolicyCoordinator(book, client)
	if e = coordinator.Recover(); e != nil {
		t.Fatal("coordinated old pair was detected unexpectedly", e)
	}
	if e = book.CheckDispatch(grant, request, GrantPrimary); e != nil {
		t.Fatal("coordinated rollback negative control should resurrect old policy", e)
	}
	view, e := client.FreshView()
	if e != nil || view.Sequence != 0 || view.Head != genesis {
		t.Fatal("coordinated rollback view", e, view)
	}
	t.Log("counterexample retained: restoring both valid policy domains recreates an old mutually consistent grant state")
}

func TestGrantPolicyLostAdvanceReplyRecoversRevocation(t *testing.T) {
	var current atomic.Pointer[GrantPolicyWitness]
	var drop atomic.Bool
	drop.Store(true)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		witness := current.Load()
		if r.URL.Path == "/grant-policy" && r.Method == http.MethodPost && drop.CompareAndSwap(true, false) {
			recorder := httptest.NewRecorder()
			witness.ServeHTTP(recorder, r)
			if recorder.Code != http.StatusOK {
				t.Errorf("policy witness advance failed: %d", recorder.Code)
				return
			}
			conn, _, e := w.(http.Hijacker).Hijack()
			if e != nil {
				t.Error(e)
				return
			}
			conn.Close()
			return
		}
		witness.ServeHTTP(w, r)
	}))
	defer srv.Close()
	ctx, approver, ak, _, _, _, _ := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	book := func() *GrantBook {
		b, e := CreateGrantBook(privateTemp(t), ctx, consentPub, approver, bookKey, 10)
		if e != nil {
			t.Fatal(e)
		}
		return b
	}()
	defer book.Close()
	genesis, _ := book.PolicyHead()
	witness, e := CreateGrantPolicyWitness(privateTemp(t), ctx, bookKey.Public().(ed25519.PublicKey), policyKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer witness.Close()
	current.Store(witness)
	client, _ := NewGrantPolicyClient(srv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, genesis)
	coordinator, _ := NewGrantPolicyCoordinator(book, client)
	request := approve(t, 0, ctx, ak)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	if e = coordinator.Revoke(grant, request); !errors.Is(e, ErrUnknown) {
		t.Fatal("lost witness response was not unknown", e)
	}
	if e = book.CheckDispatch(grant, request, GrantPrimary); !errors.Is(e, ErrGrantRevoked) {
		t.Fatal("local revocation not durable after lost reply", e)
	}
	if _, e = os.Stat(coordinator.intentPath()); e != nil {
		t.Fatal("recovery intent missing", e)
	}
	if e = coordinator.Recover(); e != nil {
		t.Fatal("lost policy response recovery", e)
	}
	if _, e = os.Stat(coordinator.intentPath()); !errors.Is(e, os.ErrNotExist) {
		t.Fatal("policy intent survived recovery", e)
	}
	view, e := client.FreshView()
	if e != nil || view.Sequence != 1 {
		t.Fatal("policy witness did not converge", e, view.Sequence)
	}
	t.Log("lost policy-witness response remains unknown; fresh reconciliation preserves revocation and clears intent")
}

func TestAnchoredFencedGrantGuardBlocksRolledBackRevocationBeforeFence(t *testing.T) {
	var policyPtr atomic.Pointer[GrantPolicyWitness]
	var fencePtr atomic.Pointer[AdmissionFence]
	policyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { policyPtr.Load().ServeHTTP(w, r) }))
	defer policyServer.Close()
	fenceServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer fenceServer.Close()
	// The action context is pinned to the effect-fence origin. Policy witness has
	// a separate origin but signs the same context/book identity.
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, fenceServer.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	fencePub, fenceKey := fenceKeys()
	bookDir := privateTemp(t)
	book, e := CreateGrantBook(bookDir, ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	oldBook, _ := os.ReadFile(filepath.Join(bookDir, "grantbook.bin"))
	policyGenesis, _ := book.PolicyHead()
	policyWitness, e := CreateGrantPolicyWitness(privateTemp(t), ctx, bookKey.Public().(ed25519.PublicKey), policyKey, policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer policyWitness.Close()
	policyPtr.Store(policyWitness)
	policyClient, _ := NewGrantPolicyClient(policyServer.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, policyGenesis)
	policy, _ := NewGrantPolicyCoordinator(book, policyClient)
	request := approve(t, 0, ctx, ak)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	if e = policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	book.Close()
	if e = os.WriteFile(filepath.Join(bookDir, "grantbook.bin"), oldBook, 0600); e != nil {
		t.Fatal(e)
	}
	book, e = OpenGrantBook(bookDir, ctx, consentPub, approver, bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer book.Close()
	policy, _ = NewGrantPolicyCoordinator(book, policyClient)

	authority, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer authority.Close()
	authorityGenesis, _ := authority.Head()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, authorityGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	fencePtr.Store(fence)
	fenceClient, _ := NewFenceClient(fenceServer.URL, ctx, authorityPub, fencePub, authorityGenesis)
	fenced, _ := NewFencedCoordinator(authority, fenceClient)
	guard, _ := NewAnchoredFencedGrantGuard(policy, fenced)
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, authorityGenesis, request, callerKey[0])
	if _, e = guard.Commit(grant, wire, GrantPrimary); !errors.Is(e, ErrGrantPolicyRollback) {
		t.Fatal("rolled-back grant policy reached effect admission", e)
	}
	spent, total, effects, e := authority.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("rolled policy touched authority", spent, total, effects, e)
	}
	fv, e := fenceClient.View()
	if e != nil || fv.Sequence != 0 || fv.Head != authorityGenesis || fv.Pending != (Digest{}) {
		t.Fatal("rolled policy touched fence", e, fv)
	}
	t.Log("fresh policy witness rejects old valid GrantBook before effect fence or authority contact")
}

func TestAnchoredFencedGrantGuardValidCommitRevokeAndStatus(t *testing.T) {
	var policyPtr atomic.Pointer[GrantPolicyWitness]
	var fencePtr atomic.Pointer[AdmissionFence]
	policyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { policyPtr.Load().ServeHTTP(w, r) }))
	defer policyServer.Close()
	fenceServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer fenceServer.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, fenceServer.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	fencePub, fenceKey := fenceKeys()

	book, e := CreateGrantBook(privateTemp(t), ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	defer book.Close()
	policyGenesis, _ := book.PolicyHead()
	policyWitness, e := CreateGrantPolicyWitness(privateTemp(t), ctx, bookKey.Public().(ed25519.PublicKey), policyKey, policyGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer policyWitness.Close()
	policyPtr.Store(policyWitness)
	policyClient, _ := NewGrantPolicyClient(policyServer.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, policyGenesis)
	policy, _ := NewGrantPolicyCoordinator(book, policyClient)

	authority, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer authority.Close()
	authorityGenesis, _ := authority.Head()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, authorityGenesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	fencePtr.Store(fence)
	fenceClient, _ := NewFenceClient(fenceServer.URL, ctx, authorityPub, fencePub, authorityGenesis)
	fenced, _ := NewFencedCoordinator(authority, fenceClient)
	guard, _ := NewAnchoredFencedGrantGuard(policy, fenced)

	request := approve(t, 0, ctx, ak)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, authorityGenesis, request, callerKey[0])
	challenge := Digest{9}
	envelope, e := guard.ProcessAttested(grant, wire, challenge)
	if e != nil || envelope.Authority.Outcome != AuthorityCommitted || envelope.Authority.Receipt.Version != 1 {
		t.Fatal("anchored fenced commit", e)
	}
	if !VerifyFencedEnvelope(envelope, wire, challenge, ctx, authorityPub, fencePub, authorityGenesis) {
		t.Fatal("fenced result invalid")
	}
	pv, e := policyClient.FreshView()
	bookHead, _ := book.PolicyHead()
	if e != nil || pv.Sequence != 1 || pv.Head != bookHead {
		t.Fatal("admission policy not anchored", e, pv)
	}
	fv, e := fenceClient.View()
	if e != nil || fv.Sequence != 1 || fv.Head != envelope.Authority.After {
		t.Fatal("effect fence not finalized", e, fv)
	}
	if e = policy.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	pv, e = policyClient.FreshView()
	if e != nil || pv.Sequence != 2 {
		t.Fatal("revocation policy not anchored", e, pv.Sequence)
	}
	latest, _ := authority.Head()
	retry, _ := SignAuthorityRequest(0, AuthorityCommit, latest, request, callerKey[0])
	if _, e = guard.Commit(grant, retry, GrantPrimary); !errors.Is(e, ErrGrantRevoked) {
		t.Fatal("anchored revocation failed", e)
	}
	// Reconciliation is deliberately still allowed for the already-admitted
	// historical dispatch and must not repeat the effect.
	status, _ := SignAuthorityRequest(0, AuthorityStatus, latest, request, callerKey[0])
	response, e := guard.Status(grant, status)
	if e != nil || response.Authority.Outcome != AuthorityCommitted || response.Authority.Receipt != envelope.Authority.Receipt {
		t.Fatal("revoked historical reconcile", e)
	}
	spent, total, effects, e := authority.Counts()
	if e != nil || spent != [authorityCallers]byte{2, 0} || total != 2 || effects != 1 {
		t.Fatal("final accounting", spent, total, effects, e)
	}
	pv2, e := policyClient.FreshView()
	if e != nil || pv2 != pv {
		t.Fatal("status unexpectedly mutated policy", e)
	}
	t.Log("policy admission, effect admission and external result are independently monotonic; later revocation blocks new effects but preserves exact historical reconciliation")
}


func TestGrantPolicyInvalidGrantRejectedBeforeWitnessContact(t *testing.T) {
	var current atomic.Pointer[GrantPolicyWitness]
	var contacts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contacts.Add(1)
		current.Load().ServeHTTP(w, r)
	}))
	defer srv.Close()
	ctx, approver, ak, _, _, _, _ := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	policyPub, policyKey := grantPolicyKeys()
	book, e := CreateGrantBook(privateTemp(t), ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	defer book.Close()
	genesis, _ := book.PolicyHead()
	witness, e := CreateGrantPolicyWitness(privateTemp(t), ctx, bookKey.Public().(ed25519.PublicKey), policyKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer witness.Close()
	current.Store(witness)
	client, _ := NewGrantPolicyClient(srv.URL, ctx, bookKey.Public().(ed25519.PublicKey), policyPub, genesis)
	coordinator, _ := NewGrantPolicyCoordinator(book, client)
	request := approve(t, 0, ctx, ak)
	grant, _ := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	forged := grant
	forged.Signature[0] ^= 1
	book.mu.Lock()
	e = coordinator.reserveDispatchLocked(forged, request, GrantPrimary)
	book.mu.Unlock()
	if !errors.Is(e, ErrPolicy) {
		t.Fatal("forged grant not refused locally", e)
	}
	if contacts.Load() != 0 {
		t.Fatal("forged grant contacted policy witness", contacts.Load())
	}
	book.mu.Lock()
	e = coordinator.reserveDispatchLocked(grant, request, GrantCompensation)
	book.mu.Unlock()
	if !errors.Is(e, ErrGrantClass) {
		t.Fatal("class substitution not refused locally", e)
	}
	if contacts.Load() != 0 {
		t.Fatal("class substitution contacted policy witness", contacts.Load())
	}
	if e = coordinator.Revoke(forged, request); !errors.Is(e, ErrPolicy) {
		t.Fatal("forged revocation grant not refused locally", e)
	}
	if contacts.Load() != 0 {
		t.Fatal("forged revocation contacted policy witness", contacts.Load())
	}
	t.Log("invalid signature and class substitution are rejected before any fresh policy-witness request")
}
