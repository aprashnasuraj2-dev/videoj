//go:build linux

package actionprotocol

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
)

type upstreamWitnessFixture struct {
	ctx          Digest
	authorityPub []byte
	authorityKey []byte
	upstreamPub  []byte
	upstreamKey  []byte
	witnessPub   []byte
	witnessKey   []byte
	upstreamDir  string
	witnessDir   string
	upstream     *upstreamEffectAuthority
	witness      *AuthorityWitness
	witnessPtr   atomic.Pointer[AuthorityWitness]
	witnessSrv   *httptest.Server
	client       *WitnessClient
	coordinator  *upstreamWitnessCoordinator
}

func newUpstreamWitnessFixture(t *testing.T, limit uint32) *upstreamWitnessFixture {
	t.Helper()
	origin := "http://127.0.0.1:19120"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	upstreamPub, upstreamKey := closureKeys()
	witnessPub, witnessKey := keys(24)
	upstreamDir, witnessDir := privateTemp(t), privateTemp(t)
	u, e := createUpstreamEffectAuthority(upstreamDir, ctx, authorityPub, upstreamKey, limit)
	if e != nil { t.Fatal(e) }
	genesis, e := u.StateHead()
	if e != nil { t.Fatal(e) }
	w, e := CreateAuthorityWitness(witnessDir, ctx, upstreamPub, witnessKey, genesis)
	if e != nil { t.Fatal(e) }
	f := &upstreamWitnessFixture{
		ctx: ctx, authorityPub: authorityPub, authorityKey: authorityKey,
		upstreamPub: upstreamPub, upstreamKey: upstreamKey, witnessPub: witnessPub, witnessKey: witnessKey,
		upstreamDir: upstreamDir, witnessDir: witnessDir, upstream: u, witness: w,
	}
	f.witnessPtr.Store(w)
	f.witnessSrv = httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		current := f.witnessPtr.Load()
		if current == nil { rw.WriteHeader(http.StatusServiceUnavailable); return }
		current.ServeHTTP(rw, r)
	}))
	f.client, e = NewWitnessClient(f.witnessSrv.URL, ctx, upstreamPub, witnessPub, genesis)
	if e != nil { t.Fatal(e) }
	f.coordinator, e = newUpstreamWitnessCoordinator(u, f.client)
	if e != nil { t.Fatal(e) }
	t.Cleanup(func() {
		if f.upstream != nil { _ = f.upstream.Close() }
		if f.witness != nil { _ = f.witness.Close() }
		f.witnessSrv.Close()
	})
	return f
}

func TestUpstreamWitnessedAuthorityDetectsSignedStoreRollback(t *testing.T) {
	f := newUpstreamWitnessFixture(t, 2)
	initial, e := os.ReadFile(filepath.Join(f.upstreamDir, "upstream.bin"))
	if e != nil { t.Fatal(e) }
	r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{1}, Digest{2}, Digest{3}, Digest{4})
	if _, e = f.coordinator.Apply(r); e != nil { t.Fatal(e) }
	view, e := f.client.View()
	if e != nil || view.Sequence != 1 { t.Fatal("witness did not advance", e, view.Sequence) }
	_ = f.upstream.Close()
	if e = os.WriteFile(filepath.Join(f.upstreamDir, "upstream.bin"), initial, 0600); e != nil { t.Fatal(e) }
	f.upstream, e = openUpstreamEffectAuthorityStore(f.upstreamDir, f.ctx, f.authorityPub, f.upstreamKey, 2)
	if e != nil { t.Fatal(e) }
	f.coordinator, e = newUpstreamWitnessCoordinator(f.upstream, f.client)
	if e != nil { t.Fatal(e) }
	if e = f.coordinator.Recover(); !errors.Is(e, ErrWitnessRollback) { t.Fatal("older signed upstream store was not rejected", e) }
	if _, e = f.coordinator.Apply(r); !errors.Is(e, ErrWitnessRollback) { t.Fatal("rollback path reached a second witnessed effect", e) }
	if terminal, effects, er := f.upstream.Counts(); er != nil || terminal != 0 || effects != 0 {
		t.Fatal("restored raw snapshot was not expected empty state", terminal, effects, er)
	}
}

func TestUpstreamWitnessedAuthorityRecoversStoreAheadOfWitnessAfterRestart(t *testing.T) {
	f := newUpstreamWitnessFixture(t, 2)
	r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{10}, Digest{11}, Digest{12}, Digest{13})
	f.coordinator.fault = func(at string) error {
		if at == "upstream-witness-after-store" { return errors.New("lose witness acknowledgement") }
		return nil
	}
	if _, e := f.coordinator.Apply(r); !errors.Is(e, ErrUnknown) { t.Fatal("post-store gap not unknown", e) }
	if _, effects, e := f.upstream.Counts(); e != nil || effects != 1 { t.Fatal("effect not durable", effects, e) }
	view, e := f.client.View()
	if e != nil || view.Sequence != 0 { t.Fatal("witness advanced despite fault", e, view.Sequence) }
	_ = f.upstream.Close()
	f.upstream, e = openUpstreamEffectAuthorityStore(f.upstreamDir, f.ctx, f.authorityPub, f.upstreamKey, 2)
	if e != nil { t.Fatal(e) }
	f.coordinator, e = newUpstreamWitnessCoordinator(f.upstream, f.client)
	if e != nil { t.Fatal(e) }
	if e = f.coordinator.Recover(); e != nil { t.Fatal("restart did not bridge one transition", e) }
	view, e = f.client.View()
	if e != nil || view.Sequence != 1 { t.Fatal("recovered witness sequence", e, view.Sequence) }
	receipt, e := f.coordinator.Apply(r)
	if e != nil || receipt.EffectSequence != 1 { t.Fatal("idempotent retry", e, receipt.EffectSequence) }
	if _, effects, e := f.coordinator.Counts(); e != nil || effects != 1 { t.Fatal("recovery repeated effect", effects, e) }
}

func TestUpstreamWitnessedAuthorityRejectsUnwitnessedRawMutation(t *testing.T) {
	f := newUpstreamWitnessFixture(t, 2)
	r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{20}, Digest{21}, Digest{22}, Digest{23})
	if _, e := f.upstream.Apply(r); e != nil { t.Fatal("negative-control raw mutation failed", e) }
	if e := f.coordinator.Recover(); !errors.Is(e, ErrWitnessRollback) {
		t.Fatal("raw mutation was silently promoted into witnessed history", e)
	}
}

func TestUpstreamWitnessedAuthorityCloneCounterexamplePreserved(t *testing.T) {
	origin := "http://127.0.0.1:19121"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	upstreamPub, upstreamKey := closureKeys()
	witnessPub, witnessKey := keys(25)
	leftDir, rightDir, witnessDir := privateTemp(t), privateTemp(t), privateTemp(t)
	left, e := createUpstreamEffectAuthority(leftDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil { t.Fatal(e) }
	initial, e := os.ReadFile(filepath.Join(leftDir, "upstream.bin"))
	if e != nil { t.Fatal(e) }
	if e = os.WriteFile(filepath.Join(rightDir, "upstream.bin"), initial, 0600); e != nil { t.Fatal(e) }
	genesis, _ := left.StateHead()
	w, e := CreateAuthorityWitness(witnessDir, ctx, upstreamPub, witnessKey, genesis)
	if e != nil { t.Fatal(e) }
	defer w.Close()
	srv := httptest.NewServer(w)
	defer srv.Close()
	client, e := NewWitnessClient(srv.URL, ctx, upstreamPub, witnessPub, genesis)
	if e != nil { t.Fatal(e) }
	right, e := openUpstreamEffectAuthorityStore(rightDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil { t.Fatal(e) }
	defer left.Close(); defer right.Close()
	lc, _ := newUpstreamWitnessCoordinator(left, client)
	rc, _ := newUpstreamWitnessCoordinator(right, client)
	arrived := make(chan struct{}, 2)
	release := make(chan struct{})
	barrier := func(at string) error {
		if at == "upstream-witness-after-store" { arrived <- struct{}{}; <-release }
		return nil
	}
	lc.fault, rc.fault = barrier, barrier
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{30}, Digest{31}, Digest{32}, Digest{33})
	type answer struct { side string; err error }
	results := make(chan answer, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, er := lc.Apply(r); results <- answer{"left", er} }()
	go func() { defer wg.Done(); _, er := rc.Apply(r); results <- answer{"right", er} }()
	<-arrived; <-arrived; close(release); wg.Wait(); close(results)
	success, unknown := 0, 0
	var loser *upstreamWitnessCoordinator
	for x := range results {
		if x.err == nil { success++ } else if errors.Is(x.err, ErrUnknown) {
			unknown++
			if x.side == "left" { loser = lc } else { loser = rc }
		} else { t.Fatal("unexpected clone result", x.side, x.err) }
	}
	if success != 1 || unknown != 1 { t.Fatal("expected one CAS winner and one ambiguous clone", success, unknown) }
	_, leffects, _ := left.Counts(); _, reffects, _ := right.Counts()
	if leffects != 1 || reffects != 1 { t.Fatal("clone physical-effect counterexample missing", leffects, reffects) }
	if loser == nil || loser.Recover() != nil { t.Fatal("identical losing clone could not reconcile to accepted identical head") }
	t.Log("COUNTEREXAMPLE: identical clones both effect before post-effect CAS; the accepted identical head cannot distinguish the duplicate physical effect")
}

func TestUpstreamWitnessedAuthorityCoordinatedRollbackCounterexample(t *testing.T) {
	f := newUpstreamWitnessFixture(t, 2)
	upstreamInitial, e := os.ReadFile(filepath.Join(f.upstreamDir, "upstream.bin"))
	if e != nil { t.Fatal(e) }
	witnessInitial, e := os.ReadFile(filepath.Join(f.witnessDir, "witness.bin"))
	if e != nil { t.Fatal(e) }
	r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{40}, Digest{41}, Digest{42}, Digest{43})
	if _, e = f.coordinator.Apply(r); e != nil { t.Fatal(e) }
	physicalEffects := 1
	_ = f.upstream.Close(); _ = f.witness.Close()
	if e = os.WriteFile(filepath.Join(f.upstreamDir, "upstream.bin"), upstreamInitial, 0600); e != nil { t.Fatal(e) }
	if e = os.WriteFile(filepath.Join(f.witnessDir, "witness.bin"), witnessInitial, 0600); e != nil { t.Fatal(e) }
	f.upstream, e = openUpstreamEffectAuthorityStore(f.upstreamDir, f.ctx, f.authorityPub, f.upstreamKey, 2)
	if e != nil { t.Fatal(e) }
	genesis, _ := f.upstream.StateHead()
	f.witness, e = OpenAuthorityWitness(f.witnessDir, f.ctx, f.upstreamPub, f.witnessKey, genesis)
	if e != nil { t.Fatal(e) }
	f.witnessPtr.Store(f.witness)
	f.coordinator, e = newUpstreamWitnessCoordinator(f.upstream, f.client)
	if e != nil { t.Fatal(e) }
	if _, e = f.coordinator.Apply(r); e != nil { t.Fatal("coordinated rollback did not reapply", e) }
	physicalEffects++
	if physicalEffects != 2 { t.Fatal("counterexample accounting") }
	t.Log("COUNTEREXAMPLE: coordinated receiver+witness rollback recreates an old consistent pair and permits the same physical effect again")
}
