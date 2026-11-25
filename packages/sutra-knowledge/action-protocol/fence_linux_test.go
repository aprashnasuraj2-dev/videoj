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
