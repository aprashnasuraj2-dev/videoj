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

func fencedGrantFixture(t *testing.T) (*GrantBook, *FencedGrantGuard, *SharedAuthority, *AdmissionFence, *FenceClient, *httptest.Server, Digest, ed25519.PrivateKey, ed25519.PublicKey, ed25519.PrivateKey, [authorityCallers]ed25519.PrivateKey) {
	t.Helper()
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	fencePub, fenceKey := fenceKeys()
	a, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		srv.Close()
		t.Fatal(e)
	}
	genesis, _ := a.Head()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		a.Close()
		srv.Close()
		t.Fatal(e)
	}
	fencePtr.Store(fence)
	client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		fence.Close()
		a.Close()
		srv.Close()
		t.Fatal(e)
	}
	coordinator, e := NewFencedCoordinator(a, client)
	if e != nil {
		fence.Close()
		a.Close()
		srv.Close()
		t.Fatal(e)
	}
	book, e := CreateGrantBook(privateTemp(t), ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		fence.Close()
		a.Close()
		srv.Close()
		t.Fatal(e)
	}
	guard, e := NewFencedGrantGuard(book, coordinator)
	if e != nil {
		book.Close()
		fence.Close()
		a.Close()
		srv.Close()
		t.Fatal(e)
	}
	return book, guard, a, fence, client, srv, ctx, ak, consentPub, consentKey, callerKey
}

func TestFencedGrantGuardExactConsentBeforeAdmission(t *testing.T) {
	book, guard, a, fence, client, srv, ctx, ak, _, consentKey, callerKey := fencedGrantFixture(t)
	defer srv.Close()
	defer fence.Close()
	defer a.Close()
	defer book.Close()
	request := approve(t, 0, ctx, ak)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	if e != nil {
		t.Fatal(e)
	}
	root, _ := a.Head()
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, root, request, callerKey[0])
	challenge := Digest{7}
	envelope, e := guard.ProcessAttested(grant, wire, challenge)
	if e != nil || envelope.Authority.Outcome != AuthorityCommitted || envelope.Authority.Receipt.Version != 1 {
		t.Fatal("valid fenced grant", e)
	}
	fencePub, _ := fenceKeys()
	authorityPub := a.signer.Public().(ed25519.PublicKey)
	if !VerifyFencedEnvelope(envelope, wire, challenge, ctx, authorityPub, fencePub, root) {
		t.Fatal("invalid fenced grant envelope")
	}
	if e = book.Revoke(grant, request); e != nil {
		t.Fatal(e)
	}
	before, e := client.View()
	if e != nil {
		t.Fatal(e)
	}
	latest, _ := a.Head()
	retry, _ := SignAuthorityRequest(0, AuthorityCommit, latest, request, callerKey[0])
	if _, e = guard.Commit(grant, retry, GrantPrimary); !errors.Is(e, ErrGrantRevoked) {
		t.Fatal("revoked grant reached fence", e)
	}
	after, e := client.View()
	if e != nil || after != before {
		t.Fatal("revoked grant changed fence", e)
	}
	spent, total, effects, e := a.Counts()
	if e != nil || spent != [authorityCallers]byte{1, 0} || total != 1 || effects != 1 {
		t.Fatal("revoked grant changed authority", spent, total, effects, e)
	}
	t.Log("exact grant is checked before independent admission; revocation refuses without another authority/fence contact")
}

func TestFencedGrantGuardConcurrentClonesOneEffect(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	consentPub, consentKey := keys(11)
	_, bookKey := keys(12)
	fencePub, fenceKey := fenceKeys()
	leftDir, rightDir := privateTemp(t), privateTemp(t)
	left, e := CreateSharedAuthority(leftDir, ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer left.Close()
	genesis, _ := left.Head()
	raw, e := os.ReadFile(filepath.Join(leftDir, "authority.bin"))
	if e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(rightDir, "authority.bin"), raw, 0600); e != nil {
		t.Fatal(e)
	}
	right, e := OpenSharedAuthority(rightDir, ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer right.Close()
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	fencePtr.Store(fence)
	client, _ := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	c0, _ := NewFencedCoordinator(left, client)
	c1, _ := NewFencedCoordinator(right, client)

	book0Dir, book1Dir := privateTemp(t), privateTemp(t)
	book0, e := CreateGrantBook(book0Dir, ctx, consentPub, approver, bookKey, 10)
	if e != nil {
		t.Fatal(e)
	}
	book0.Close()
	bookRaw, e := os.ReadFile(filepath.Join(book0Dir, "grantbook.bin"))
	if e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(book1Dir, "grantbook.bin"), bookRaw, 0600); e != nil {
		t.Fatal(e)
	}
	book0, e = OpenGrantBook(book0Dir, ctx, consentPub, approver, bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer book0.Close()
	book1, e := OpenGrantBook(book1Dir, ctx, consentPub, approver, bookKey)
	if e != nil {
		t.Fatal(e)
	}
	defer book1.Close()
	g0, _ := NewFencedGrantGuard(book0, c0)
	g1, _ := NewFencedGrantGuard(book1, c1)

	arrived := make(chan struct{}, 2)
	release := make(chan struct{})
	pause := func(at string) error {
		if at == "after-intent" {
			arrived <- struct{}{}
			<-release
		}
		return nil
	}
	c0.fault, c1.fault = pause, pause
	request := approve(t, 0, ctx, ak)
	grant, e := IssueActionGrant(request, GrantPrimary, 10, 11, consentKey)
	if e != nil {
		t.Fatal(e)
	}
	q0, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, request, callerKey[0])
	q1, _ := SignAuthorityRequest(1, AuthorityCommit, genesis, request, callerKey[1])
	type result struct {
		index int
		err   error
	}
	results := make(chan result, 2)
	go func() { _, e := g0.Commit(grant, q0, GrantPrimary); results <- result{0, e} }()
	go func() { _, e := g1.Commit(grant, q1, GrantPrimary); results <- result{1, e} }()
	for i := 0; i < 2; i++ {
		select {
		case <-arrived:
		case r := <-results:
			close(release)
			t.Fatalf("grant clone escaped barrier %d: %v", r.index, r.err)
		}
	}
	close(release)
	winner, loser := -1, -1
	for i := 0; i < 2; i++ {
		r := <-results
		if r.err == nil {
			winner = r.index
		} else if errors.Is(r.err, ErrFenceConflict) || errors.Is(r.err, ErrWitnessRollback) {
			loser = r.index
		} else {
			t.Fatal("unexpected guard result", r.index, r.err)
		}
	}
	if winner < 0 || loser < 0 || winner == loser {
		t.Fatal("winner/loser", winner, loser)
	}
	stores := []*SharedAuthority{left, right}
	books := []*GrantBook{book0, book1}
	for i, store := range stores {
		_, total, effects, e := store.Counts()
		if e != nil {
			t.Fatal(e)
		}
		if i == winner {
			if total != 1 || effects != 1 {
				t.Fatal("winner", total, effects)
			}
		} else if total != 0 || effects != 0 {
			t.Fatal("losing consent clone crossed fence", total, effects)
		}
	}
	if len(books[0].admitted) != 1 || len(books[1].admitted) != 1 {
		t.Fatal("grant admission evidence not retained on both clones")
	}
	view, e := client.View()
	winnerHead, _ := stores[winner].Head()
	if e != nil || view.Head != winnerHead || view.Sequence != 1 || view.Pending != (Digest{}) {
		t.Fatal("fence", e, view)
	}
	t.Log("both cloned policy books can record local grant admission, but independent pre-effect fence allows only one authority effect; policy-book rollback/clone remains an open trust boundary")
}
