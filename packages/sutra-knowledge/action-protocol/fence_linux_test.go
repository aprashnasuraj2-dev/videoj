//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func fenceKeys() (ed25519.PublicKey, ed25519.PrivateKey) { return keys(14) }
func absenceKeys() (ed25519.PublicKey, ed25519.PrivateKey) { return keys(19) }

func TestAdmissionFenceReservationCASIdempotenceAndForgery(t *testing.T) {
	origin := "http://127.0.0.1:1"
	ctx, _, ak, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	fencePub, fenceKey := fenceKeys()
	a, e := CreateSharedAuthority(privateTemp(t), ctx, keysPub(1), authorityKey, [authorityCallers]ed25519.PublicKey{keysPub(7), keysPub(8)}, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	genesis, e := a.Head()
	if e != nil {
		t.Fatal(e)
	}
	f, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer f.Close()
	r0 := approve(t, 0, ctx, ak)
	token := Digest{1}
	after0 := Digest{2}
	reservation, e := SignFenceReservation(ctx, genesis, after0, r0.Hash(), token, authorityKey)
	if e != nil {
		t.Fatal(e)
	}
	reserved, e := f.Reserve(reservation)
	if e != nil || reserved.Sequence != 0 || reserved.Head != genesis || reserved.Pending != reservation.Hash() || !VerifyFenceViewPinned(reserved, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("reserve", e, reserved)
	}
	again, e := f.Reserve(reservation)
	if e != nil || again != reserved {
		t.Fatal("idempotent reserve", e)
	}
	competing, _ := SignFenceReservation(ctx, genesis, Digest{3}, approve(t, 1, ctx, ak).Hash(), Digest{4}, authorityKey)
	if _, e = f.Reserve(competing); !errors.Is(e, ErrFenceConflict) {
		t.Fatal("competing reservation admitted", e)
	}
	forged := reservation
	forged.Signature[0] ^= 1
	if _, e = f.Finalize(forged); !errors.Is(e, ErrPolicy) {
		t.Fatal("forged finalize admitted", e)
	}
	finalized, e := f.Finalize(reservation)
	if e != nil || finalized.Sequence != 1 || finalized.Head != after0 || finalized.Pending != (Digest{}) {
		t.Fatal("finalize", e, finalized)
	}
	finalizedAgain, e := f.Finalize(reservation)
	if e != nil || finalizedAgain != finalized {
		t.Fatal("idempotent finalize", e)
	}
	if _, e = f.Abort(reservation); !errors.Is(e, ErrFenceConflict) {
		t.Fatal("committed reservation aborted", e)
	}
	rollback, _ := SignFenceReservation(ctx, after0, genesis, r0.Hash(), Digest{5}, authorityKey)
	if _, e = f.Reserve(rollback); !errors.Is(e, ErrPolicy) {
		t.Fatal("seen-head rollback admitted", e)
	}
	t.Log("reservation is exact and idempotent; competing, forged and seen-head rollback transitions fail closed")
}

// keysPub mirrors the deterministic test key helper without retaining a private key.
func keysPub(seed byte) ed25519.PublicKey {
	pub, _ := keys(seed)
	return pub
}

func TestFencedCoordinatorConcurrentAuthorityClonesSingleLocalEffect(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
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
	client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		t.Fatal(e)
	}
	c0, _ := NewFencedCoordinator(left, client)
	c1, _ := NewFencedCoordinator(right, client)
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
	r0, r1 := approve(t, 0, ctx, ak), approve(t, 1, ctx, ak)
	q0, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, r0, callerKey[0])
	q1, _ := SignAuthorityRequest(1, AuthorityCommit, genesis, r1, callerKey[1])
	n0, n1 := Digest{1}, Digest{2}
	type result struct {
		index    int
		envelope FencedEnvelope
		err      error
	}
	results := make(chan result, 2)
	go func() { r, e := c0.ProcessAttested(q0, n0); results <- result{0, r, e} }()
	go func() { r, e := c1.ProcessAttested(q1, n1); results <- result{1, r, e} }()
	for i := 0; i < 2; i++ {
		select {
		case <-arrived:
		case early := <-results:
			close(release)
			t.Fatalf("clone escaped pre-reservation barrier %d: %v", early.index, early.err)
		}
	}
	close(release)
	requests := []AuthorityRequest{q0, q1}
	challenges := []Digest{n0, n1}
	coordinators := []*FencedCoordinator{c0, c1}
	stores := []*SharedAuthority{left, right}
	winner, loser := -1, -1
	for i := 0; i < 2; i++ {
		r := <-results
		if r.err == nil {
			if winner != -1 || !VerifyFencedEnvelope(r.envelope, requests[r.index], challenges[r.index], ctx, authorityPub, fencePub, genesis) {
				t.Fatal("invalid or duplicate fenced winner", r.index)
			}
			winner = r.index
		} else if errors.Is(r.err, ErrFenceConflict) || errors.Is(r.err, ErrWitnessRollback) {
			if loser != -1 {
				t.Fatal("two losers")
			}
			loser = r.index
		} else {
			t.Fatal("unexpected clone result", r.index, r.err)
		}
	}
	if winner < 0 || loser < 0 || winner == loser {
		t.Fatal("missing winner/loser", winner, loser)
	}
	for i, store := range stores {
		spent, total, effects, e := store.Counts()
		if e != nil {
			t.Fatal(e)
		}
		if i == winner {
			if total != 1 || effects != 1 || int(spent[0])+int(spent[1]) != 1 {
				t.Fatal("winner accounting", i, spent, total, effects)
			}
		} else if spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
			t.Fatal("losing clone mutated before admission", i, spent, total, effects)
		}
	}
	view, e := client.View()
	winnerHead, _ := stores[winner].Head()
	if e != nil || view.Sequence != 1 || view.Head != winnerHead || view.Pending != (Digest{}) {
		t.Fatal("fence winner", e, view)
	}
	if _, e = os.Stat(coordinators[loser].intentPath()); e != nil {
		t.Fatal("loser reservation evidence missing", e)
	}
	if e = coordinators[loser].Recover(); !errors.Is(e, ErrWitnessRollback) {
		t.Fatal("stale losing clone recovered", e)
	}
	t.Log("independent pre-effect reservation permits one cloned authority to mutate; the losing clone remains at zero effects")
}

func TestFencedCoordinatorProcessCrashBoundaries(t *testing.T) {
	if os.Getenv("SUTRA_FENCE_CHILD") == "1" {
		origin := os.Getenv("SUTRA_FENCE_ORIGIN")
		stage := os.Getenv("SUTRA_FENCE_STAGE")
		dir := os.Getenv("SUTRA_FENCE_AUTHORITY_DIR")
		genesisPath := os.Getenv("SUTRA_FENCE_GENESIS")
		ctx, approver, _, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, origin)
		fencePub, _ := fenceKeys()
		var genesis Digest
		raw, e := os.ReadFile(genesisPath)
		if e != nil || len(raw) != len(genesis) {
			t.Fatal("genesis", e)
		}
		copy(genesis[:], raw)
		a, e := OpenSharedAuthority(dir, ctx, approver, authorityKey, callerPub, 2)
		if e != nil {
			t.Fatal(e)
		}
		client, e := NewFenceClient(origin, ctx, authorityPub, fencePub, genesis)
		if e != nil {
			t.Fatal(e)
		}
		coordinator, e := NewFencedCoordinator(a, client)
		if e != nil {
			t.Fatal(e)
		}
		coordinator.fault = func(at string) error {
			if at == stage {
				os.Exit(0)
			}
			return nil
		}
		requestRaw, e := os.ReadFile(os.Getenv("SUTRA_FENCE_REQUEST"))
		if e != nil {
			t.Fatal(e)
		}
		req, e := ParseRequest(requestRaw)
		if e != nil {
			t.Fatal(e)
		}
		wire, e := SignAuthorityRequest(0, AuthorityCommit, genesis, req, callerKey[0])
		if e != nil {
			t.Fatal(e)
		}
		if _, e = coordinator.Process(wire); e != nil {
			t.Fatal(e)
		}
		t.Fatal("child did not exit at requested fence stage")
	}
	for _, stage := range []string{"after-intent", "after-reserve", "after-authority", "after-finalize", "after-clear"} {
		t.Run(stage, func(t *testing.T) {
			var fencePtr atomic.Pointer[AdmissionFence]
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
			defer srv.Close()
			ctx, approver, ak, authorityPub, authorityKey, callerPub, _ := authorityFixture(t, srv.URL)
			fencePub, fenceKey := fenceKeys()
			authorityDir := privateTemp(t)
			a, e := CreateSharedAuthority(authorityDir, ctx, approver, authorityKey, callerPub, 2)
			if e != nil {
				t.Fatal(e)
			}
			genesis, e := a.Head()
			if e != nil {
				t.Fatal(e)
			}
			a.Close()
			fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
			if e != nil {
				t.Fatal(e)
			}
			defer fence.Close()
			fencePtr.Store(fence)
			genesisFile := filepath.Join(privateTemp(t), "genesis.bin")
			if e = os.WriteFile(genesisFile, genesis[:], 0600); e != nil {
				t.Fatal(e)
			}
			req := approve(t, 0, ctx, ak)
			requestFile := filepath.Join(privateTemp(t), "request.bin")
			if e = os.WriteFile(requestFile, req.Bytes(), 0600); e != nil {
				t.Fatal(e)
			}
			cmd := exec.Command(os.Args[0], "-test.run=^TestFencedCoordinatorProcessCrashBoundaries/"+stage+"$")
			cmd.Env = append(os.Environ(),
				"SUTRA_FENCE_CHILD=1",
				"SUTRA_FENCE_ORIGIN="+srv.URL,
				"SUTRA_FENCE_STAGE="+stage,
				"SUTRA_FENCE_AUTHORITY_DIR="+authorityDir,
				"SUTRA_FENCE_GENESIS="+genesisFile,
				"SUTRA_FENCE_REQUEST="+requestFile,
			)
			if out, e := cmd.CombinedOutput(); e != nil {
				t.Fatalf("fence child %s: %v\n%s", stage, e, out)
			}
			a, e = OpenSharedAuthority(authorityDir, ctx, approver, authorityKey, callerPub, 2)
			if e != nil {
				t.Fatal(e)
			}
			defer a.Close()
			client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
			if e != nil {
				t.Fatal(e)
			}
			coordinator, e := NewFencedCoordinator(a, client)
			if e != nil {
				t.Fatal(e)
			}
			if e = coordinator.Recover(); e != nil {
				t.Fatal("recover", stage, e)
			}
			view, e := client.View()
			if e != nil || view.Pending != (Digest{}) {
				t.Fatal("pending survived recovery", stage, e, view.Pending)
			}
			head, _ := a.Head()
			spent, total, effects, e := a.Counts()
			if e != nil || view.Head != head {
				t.Fatal("authority/fence divergence", stage, e)
			}
			if _, e = os.Stat(coordinator.intentPath()); !errors.Is(e, os.ErrNotExist) {
				t.Fatal("intent survived recovery", stage, e)
			}
			if stage == "after-intent" || stage == "after-reserve" {
				if head != genesis || view.Sequence != 0 || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
					t.Fatal("pre-effect crash mutated state", stage, spent, total, effects, view.Sequence)
				}
			} else if head == genesis || view.Sequence != 1 || spent != [authorityCallers]byte{1, 0} || total != 1 || effects != 1 {
				t.Fatal("post-effect crash lost fenced commit", stage, spent, total, effects, view.Sequence)
			}
		})
	}
	t.Log("five real process exits recover: reservation-only crashes abort with zero effects; post-authority crashes finalize exactly one effect")
}

func TestFencedCoordinatorLostReserveAndFinalizeReplies(t *testing.T) {
	for _, dropPath := range []string{"/fence/reserve", "/fence/finalize"} {
		t.Run(dropPath, func(t *testing.T) {
			var fencePtr atomic.Pointer[AdmissionFence]
			var drop atomic.Bool
			drop.Store(true)
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				f := fencePtr.Load()
				if r.URL.Path == dropPath && drop.CompareAndSwap(true, false) {
					recorder := httptest.NewRecorder()
					f.ServeHTTP(recorder, r)
					if recorder.Code != http.StatusOK {
						t.Errorf("fence operation failed before dropped response: %d", recorder.Code)
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
				f.ServeHTTP(w, r)
			}))
			defer srv.Close()
			ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
			fencePub, fenceKey := fenceKeys()
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
			client, _ := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
			coordinator, _ := NewFencedCoordinator(a, client)
			req := approve(t, 0, ctx, ak)
			wire, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, req, callerKey[0])
			if _, e = coordinator.Process(wire); e == nil {
				t.Fatal("dropped response reported success")
			}
			spent, total, effects, e := a.Counts()
			if e != nil {
				t.Fatal(e)
			}
			if dropPath == "/fence/reserve" {
				if spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
					t.Fatal("reserve-response loss crossed effect boundary", spent, total, effects)
				}
			} else if spent != [authorityCallers]byte{1, 0} || total != 1 || effects != 1 {
				t.Fatal("finalize-response loss did not preserve effect", spent, total, effects)
			}
			if e = coordinator.Recover(); e != nil {
				t.Fatal("recovery", dropPath, e)
			}
			view, e := client.View()
			head, _ := a.Head()
			if e != nil || view.Head != head || view.Pending != (Digest{}) {
				t.Fatal("recovery did not converge", dropPath, e, view)
			}
			if dropPath == "/fence/reserve" && view.Sequence != 0 {
				t.Fatal("aborted reservation advanced fence")
			}
			if dropPath == "/fence/finalize" && view.Sequence != 1 {
				t.Fatal("lost finalize response was not idempotently recovered")
			}
		})
	}
	t.Log("lost reserve reply aborts before effect; lost finalize reply recovers committed effect without a second transition")
}


func TestFencedEnvelopeBindsExactReservation(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	fencePub, fenceKey := fenceKeys()
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
	client, _ := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	coordinator, _ := NewFencedCoordinator(a, client)
	action := approve(t, 0, ctx, ak)
	req, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, action, callerKey[0])
	challenge := Digest{8}
	envelope, e := coordinator.ProcessAttested(req, challenge)
	if e != nil {
		t.Fatal(e)
	}
	if envelope.Reservation.RequestHash != req.Hash() ||
		envelope.Reservation.Before != envelope.Authority.Before ||
		envelope.Reservation.After != envelope.Authority.After ||
		envelope.Attestation.View.LastReservation != envelope.Reservation.Hash() ||
		!VerifyFencedEnvelope(envelope, req, challenge, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("exact reservation proof missing")
	}
	// Negative control 1: authority signs another internally valid reservation
	// for the same transition but the wrong exact caller request.
	wrong, e := SignFenceReservation(ctx, envelope.Authority.Before, envelope.Authority.After, Digest{9}, Digest{10}, authorityKey)
	if e != nil {
		t.Fatal(e)
	}
	forged := envelope
	forged.Reservation = wrong
	if !VerifyFenceReservation(forged.Reservation, ctx, authorityPub) {
		t.Fatal("negative control reservation lacks valid authority signature")
	}
	if VerifyFencedEnvelope(forged, req, challenge, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("validly signed wrong-request reservation accepted")
	}
	// Negative control 2: even a separately valid fence attestation cannot
	// substitute a different last-reservation commitment.
	forged = envelope
	forged.Attestation.View.LastReservation = Digest{11}
	copy(forged.Attestation.View.Signature[:], ed25519.Sign(fenceKey, forged.Attestation.View.message(ctx, authorityPub)))
	copy(forged.Attestation.Signature[:], ed25519.Sign(fenceKey, forged.Attestation.message(ctx, authorityPub)))
	if !VerifyFenceAttestation(forged.Attestation, challenge, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("negative control attestation not independently valid")
	}
	if VerifyFencedEnvelope(forged, req, challenge, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("fence-attested different reservation accepted")
	}
	if _, e = ParseFencedEnvelope(envelope.Bytes()[:len(envelope.Bytes())-fenceReservationSize]); e == nil {
		t.Fatal("envelope without reservation proof parsed")
	}
	t.Log("external fence proof binds exact request, before/after heads and retained admission reservation across two signatures")
}

func TestFencedBudgetResponseMintsNoReservation(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fencePtr.Load().ServeHTTP(w, r) }))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	fencePub, fenceKey := fenceKeys()
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
	client, _ := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	coordinator, _ := NewFencedCoordinator(a, client)
	action := approve(t, 0, ctx, ak)
	head := genesis
	// Three real contacts exhaust aggregate authority budget and therefore
	// produce exactly three finalized admission reservations.
	for _, caller := range []byte{0, 0, 1} {
		req, _ := SignAuthorityRequest(caller, AuthorityStatus, head, action, callerKey[caller])
		envelope, e := coordinator.ProcessAttested(req, Digest{byte(caller + 20)})
		if e != nil {
			t.Fatal("contact", caller, e)
		}
		head = envelope.Authority.After
		if envelope.Reservation == (FenceReservation{}) || envelope.Attestation.View.LastReservation != envelope.Reservation.Hash() {
			t.Fatal("accepted contact lacks reservation proof")
		}
	}
	req, _ := SignAuthorityRequest(1, AuthorityStatus, head, action, callerKey[1])
	challenge := Digest{30}
	budget, e := coordinator.ProcessAttested(req, challenge)
	if e != nil || budget.Authority.Outcome != AuthorityBudget || budget.Authority.Before != budget.Authority.After {
		t.Fatal("budget response", e, budget.Authority.Outcome)
	}
	if budget.Reservation != (FenceReservation{}) {
		t.Fatal("budget refusal minted reservation")
	}
	if !VerifyFencedEnvelope(budget, req, challenge, ctx, authorityPub, fencePub, genesis) {
		t.Fatal("budget no-op proof invalid")
	}
	view, e := client.View()
	if e != nil || view.Sequence != 3 || view.Head != head || view.LastReservation == (Digest{}) {
		t.Fatal("budget refusal changed fence", e, view)
	}
	t.Log("exhausted budget returns a signed no-op at the existing fence head with no phantom admission reservation")
}


func TestFencedCoordinatorOrphanedAdmissionFailsClosed(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fencePtr.Load().ServeHTTP(w, r)
	}))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	fencePub, fenceKey := fenceKeys()
	a, e := CreateSharedAuthority(privateTemp(t), ctx, approver, authorityKey, callerPub, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer a.Close()
	genesis, e := a.Head()
	if e != nil {
		t.Fatal(e)
	}
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	fencePtr.Store(fence)
	client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		t.Fatal(e)
	}
	coordinator, e := NewFencedCoordinator(a, client)
	if e != nil {
		t.Fatal(e)
	}
	coordinator.fault = func(at string) error {
		if at == "after-reserve" {
			return errors.New("simulated owner evidence loss boundary")
		}
		return nil
	}
	action := approve(t, 0, ctx, ak)
	wire, e := SignAuthorityRequest(0, AuthorityCommit, genesis, action, callerKey[0])
	if e != nil {
		t.Fatal(e)
	}
	if _, e = coordinator.Process(wire); !errors.Is(e, ErrUnknown) {
		t.Fatal("reserve boundary did not become unknown", e)
	}
	viewBefore, e := client.View()
	if e != nil || viewBefore.Head != genesis || viewBefore.Pending == (Digest{}) {
		t.Fatal("expected durable pending admission", e, viewBefore)
	}
	spent, total, effects, e := a.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("pre-effect reservation mutated authority", e, spent, total, effects)
	}
	if e = os.Remove(coordinator.intentPath()); e != nil {
		t.Fatal(e)
	}
	if e = coordinator.Recover(); !errors.Is(e, ErrFenceOrphaned) {
		t.Fatal("orphaned reservation was not distinguished", e)
	}
	second := approve(t, 1, ctx, ak)
	secondWire, e := SignAuthorityRequest(1, AuthorityCommit, genesis, second, callerKey[1])
	if e != nil {
		t.Fatal(e)
	}
	if _, e = coordinator.Process(secondWire); !errors.Is(e, ErrFenceOrphaned) {
		t.Fatal("new work bypassed orphaned admission", e)
	}
	viewAfter, e := client.View()
	if e != nil || viewAfter != viewBefore {
		t.Fatal("orphan recovery mutated the fence", e, viewBefore, viewAfter)
	}
	spent, total, effects, e = a.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("orphan path crossed effect boundary", e, spent, total, effects)
	}
	t.Log("lost owner evidence leaves the exact pending reservation fail-closed: zero effects and no automatic abort or second admission")
}

func TestFencedCoordinatorOrphanResolutionRequiresExactAbsenceProof(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fencePtr.Load().ServeHTTP(w, r)
	}))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	fencePub, fenceKey := fenceKeys()
	absencePub, absenceKey := absenceKeys()
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
	client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		t.Fatal(e)
	}
	coordinator, e := NewFencedCoordinatorWithAbsenceAuthority(a, client, absencePub)
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
		t.Fatal("expected unknown reserve boundary", e)
	}
	pending, exists, e := client.PendingReservation()
	if e != nil || !exists || pending.Before != genesis || pending.RequestHash != wire.Hash() {
		t.Fatal("pending reservation unavailable", exists, e, pending)
	}
	viewBefore, e := client.View()
	if e != nil || viewBefore.Pending != pending.Hash() {
		t.Fatal("pending/view mismatch", e, viewBefore.Pending, pending.Hash())
	}
	if e = os.Remove(coordinator.intentPath()); e != nil {
		t.Fatal(e)
	}
	_, wrongKey := keys(20)
	forged, e := SignEffectAbsenceProof(ctx, authorityPub, pending, wrongKey)
	if e != nil {
		t.Fatal(e)
	}
	if e = coordinator.ResolveOrphanWithAbsenceProof(forged); !errors.Is(e, ErrPolicy) {
		t.Fatal("wrong absence signer resolved orphan", e)
	}
	stillPending, exists, e := client.PendingReservation()
	if e != nil || !exists || !sameReservation(stillPending, pending) {
		t.Fatal("forged proof changed pending reservation", e)
	}
	valid, e := SignEffectAbsenceProof(ctx, authorityPub, pending, absenceKey)
	if e != nil || !VerifyEffectAbsenceProof(valid, ctx, authorityPub, pending, absencePub) {
		t.Fatal("valid absence proof", e)
	}
	roundTrip, e := ParseEffectAbsenceProof(valid.Bytes())
	if e != nil || roundTrip != valid {
		t.Fatal("absence proof round trip", e)
	}
	altered := valid
	altered.RequestHash[0] ^= 1
	if VerifyEffectAbsenceProof(altered, ctx, authorityPub, pending, absencePub) {
		t.Fatal("altered absence proof verified")
	}
	if e = coordinator.ResolveOrphanWithAbsenceProof(valid); e != nil {
		t.Fatal("exact absence proof did not resolve pre-effect orphan", e)
	}
	if _, exists, e = client.PendingReservation(); e != nil || exists {
		t.Fatal("resolved orphan still exposes pending reservation", exists, e)
	}
	viewAfter, e := client.View()
	if e != nil || viewAfter.Head != genesis || viewAfter.Pending != (Digest{}) || viewAfter.Sequence != 0 {
		t.Fatal("absence resolution advanced fence", e, viewAfter)
	}
	spent, total, effects, e := a.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("absence resolution crossed effect boundary", e, spent, total, effects)
	}

	coordinator.fault = nil
	second := approve(t, 1, ctx, ak)
	secondWire, _ := SignAuthorityRequest(1, AuthorityCommit, genesis, second, callerKey[1])
	response, e := coordinator.Process(secondWire)
	if e != nil || response.Authority.Outcome != AuthorityCommitted {
		t.Fatal("fresh work did not resume after proven absence", e, response.Authority.Outcome)
	}
	spent, total, effects, e = a.Counts()
	if e != nil || spent != [authorityCallers]byte{0, 1} || total != 1 || effects != 1 {
		t.Fatal("post-resolution effect accounting", e, spent, total, effects)
	}
	t.Log("only an exact independently signed absence proof clears a pre-effect orphan; forged proof preserves the pending fence")
}

func TestFencedCoordinatorAbsenceProofCannotUndoKnownLocalEffect(t *testing.T) {
	var fencePtr atomic.Pointer[AdmissionFence]
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fencePtr.Load().ServeHTTP(w, r)
	}))
	defer srv.Close()
	ctx, approver, ak, authorityPub, authorityKey, callerPub, callerKey := authorityFixture(t, srv.URL)
	fencePub, fenceKey := fenceKeys()
	absencePub, absenceKey := absenceKeys()
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
	client, _ := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	coordinator, _ := NewFencedCoordinatorWithAbsenceAuthority(a, client, absencePub)
	coordinator.fault = func(at string) error {
		if at == "after-authority" {
			return errors.New("lose coordinator evidence after effect")
		}
		return nil
	}
	action := approve(t, 0, ctx, ak)
	wire, _ := SignAuthorityRequest(0, AuthorityCommit, genesis, action, callerKey[0])
	if _, e = coordinator.Process(wire); !errors.Is(e, ErrUnknown) {
		t.Fatal("post-effect fault did not become unknown", e)
	}
	pending, exists, e := client.PendingReservation()
	if e != nil || !exists {
		t.Fatal("post-effect pending reservation missing", e)
	}
	if e = os.Remove(coordinator.intentPath()); e != nil {
		t.Fatal(e)
	}
	// The configured signer can lie. Local durable authority state must still
	// prevent that proof from rewinding a transition known to have occurred.
	lying, e := SignEffectAbsenceProof(ctx, authorityPub, pending, absenceKey)
	if e != nil {
		t.Fatal(e)
	}
	if e = coordinator.ResolveOrphanWithAbsenceProof(lying); !errors.Is(e, ErrWitnessRollback) {
		t.Fatal("absence proof rewound known local effect", e)
	}
	head, _ := a.Head()
	spent, total, effects, e := a.Counts()
	view, ve := client.View()
	if e != nil || ve != nil || head == genesis || spent != [authorityCallers]byte{1, 0} || total != 1 || effects != 1 ||
		view.Pending != pending.Hash() || view.Head != genesis {
		t.Fatal("lying proof mutated known-effect state", e, ve, spent, total, effects, view)
	}
	t.Log("an absence signer cannot override a locally persisted effect; unresolved fence remains fail-closed")
}

func TestAdmissionFenceExhaustionIsExplicitAndNonMutating(t *testing.T) {
	origin := "http://127.0.0.1:1"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	fencePub, fenceKey := fenceKeys()
	genesis := Digest{240}
	fence, e := CreateAdmissionFence(privateTemp(t), ctx, authorityPub, fenceKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	defer fence.Close()
	before := genesis
	for i := 0; i < fenceMaxTransitions; i++ {
		after := Digest{byte(i + 1)}
		reservation, er := SignFenceReservation(ctx, before, after, Digest{byte(64 + i)}, Digest{byte(128 + i)}, authorityKey)
		if er != nil {
			t.Fatal(er)
		}
		if _, er = fence.Reserve(reservation); er != nil {
			t.Fatal("reserve", i, er)
		}
		view, er := fence.Finalize(reservation)
		if er != nil || view.Sequence != uint32(i+1) || view.Head != after || view.Pending != (Digest{}) {
			t.Fatal("finalize", i, er, view)
		}
		before = after
	}
	atCapacity, e := fence.View()
	if e != nil || atCapacity.Sequence != fenceMaxTransitions || atCapacity.Head != before || atCapacity.Pending != (Digest{}) {
		t.Fatal("capacity view", e, atCapacity)
	}
	extra, e := SignFenceReservation(ctx, before, Digest{99}, Digest{201}, Digest{202}, authorityKey)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = fence.Reserve(extra); !errors.Is(e, ErrFenceExhausted) {
		t.Fatal("direct capacity refusal not explicit", e)
	}
	afterDirect, e := fence.View()
	if e != nil || afterDirect != atCapacity {
		t.Fatal("direct exhaustion mutated fence", e, atCapacity, afterDirect)
	}
	srv := httptest.NewServer(fence)
	defer srv.Close()
	client, e := NewFenceClient(srv.URL, ctx, authorityPub, fencePub, genesis)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = client.Reserve(extra); !errors.Is(e, ErrFenceExhausted) {
		t.Fatal("wire capacity refusal not preserved", e)
	}
	afterWire, e := fence.View()
	if e != nil || afterWire != atCapacity {
		t.Fatal("wire exhaustion mutated fence", e, atCapacity, afterWire)
	}
	t.Log("bounded laboratory capacity is explicit and fail-closed; exhaustion never creates a pending reservation or synthetic effect")
}
