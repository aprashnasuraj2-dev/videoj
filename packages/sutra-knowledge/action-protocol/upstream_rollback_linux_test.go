//go:build linux

package actionprotocol

import (
	"os"
	"path/filepath"
	"testing"
)

func TestUpstreamEffectAuthoritySignedSnapshotRollbackCounterexample(t *testing.T) {
	origin := "http://127.0.0.1:19115"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	_, upstreamKey := closureKeys()
	dir := privateTemp(t)
	u, e := createUpstreamEffectAuthority(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	initial, e := os.ReadFile(filepath.Join(dir, "upstream.bin"))
	if e != nil {
		t.Fatal(e)
	}
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{70}, Digest{71}, Digest{72}, Digest{73})
	first, e := u.Apply(r)
	if e != nil {
		t.Fatal(e)
	}
	if _, effects, _ := u.Counts(); effects != 1 {
		t.Fatal("first effect missing", effects)
	}
	_ = u.Close()

	// The snapshot is correctly signed but stale. Without an independently
	// retained monotonic pin, restoring it is indistinguishable from a fresh store.
	if e = os.WriteFile(filepath.Join(dir, "upstream.bin"), initial, 0600); e != nil {
		t.Fatal(e)
	}
	u, e = openUpstreamEffectAuthorityStore(dir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal("stale signed snapshot did not reproduce counterexample", e)
	}
	defer u.Close()
	second, e := u.Apply(r)
	if e != nil || second != first {
		t.Fatal("rollback replay counterexample missing", e)
	}
	if _, effects, _ := u.Counts(); effects != 1 {
		t.Fatal("restored store local count", effects)
	}
	t.Log("COUNTEREXAMPLE: restoring a valid older signed upstream snapshot permits the same identity to apply again across histories; signatures are not monotonic freshness")
}
