//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func upstreamFixture(t *testing.T, origin string, limit uint32) (Digest, ed25519.PublicKey, ed25519.PrivateKey, ed25519.PublicKey, ed25519.PrivateKey, *upstreamEffectAuthority) {
	t.Helper()
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	upstreamPub, upstreamKey := closureKeys()
	u, e := createUpstreamEffectAuthority(privateTemp(t), ctx, authorityPub, upstreamKey, limit)
	if e != nil {
		t.Fatal(e)
	}
	return ctx, authorityPub, authorityKey, upstreamPub, upstreamKey, u
}

func signedUpstreamReservation(t *testing.T, ctx Digest, authorityKey ed25519.PrivateKey, before, after, requestHash, token Digest) FenceReservation {
	t.Helper()
	r, e := SignFenceReservation(ctx, before, after, requestHash, token, authorityKey)
	if e != nil {
		t.Fatal(e)
	}
	return r
}

func TestUpstreamEffectAuthorityAppliedOrClosedTerminalStates(t *testing.T) {
	ctx, authorityPub, authorityKey, upstreamPub, _, u := upstreamFixture(t, "http://127.0.0.1:19111", 2)
	defer u.Close()
	closed := signedUpstreamReservation(t, ctx, authorityKey, Digest{1}, Digest{2}, Digest{3}, Digest{4})
	if _, e := u.Status(closed); !errors.Is(e, ErrAbsent) {
		t.Fatal("unseen identity acquired terminal status", e)
	}
	proof, e := u.CloseUnapplied(closed)
	if e != nil || !VerifyEffectClosureProof(proof, ctx, authorityPub, closed, upstreamPub) {
		t.Fatal("close proof", e)
	}
	status, e := u.Status(closed)
	if e != nil || status.State != upstreamClosed || status.EffectCount != 0 || status.TerminalCount != 1 || !verifyUpstreamEffectStatus(status, closed, ctx, authorityPub, upstreamPub) {
		t.Fatal("closed status", e, status)
	}
	if _, e = u.Apply(closed); !errors.Is(e, ErrConflict) {
		t.Fatal("closed identity later applied", e)
	}
	again, e := u.CloseUnapplied(closed)
	if e != nil || again != proof {
		t.Fatal("closed retry changed proof", e)
	}

	// A fresh token is allowed only because the prior exact token is durably
	// CLOSED. Once any identity for the logical request APPLIES, further tokens
	// carrying the same request hash are refused.
	retry := signedUpstreamReservation(t, ctx, authorityKey, closed.Before, closed.After, closed.RequestHash, Digest{5})
	receipt, e := u.Apply(retry)
	if e != nil || receipt.EffectSequence != 1 || !verifyUpstreamEffectReceipt(receipt, retry, ctx, authorityPub, upstreamPub) {
		t.Fatal("fresh identity after closure", e, receipt)
	}
	if duplicate, er := u.Apply(retry); er != nil || duplicate != receipt {
		t.Fatal("exact retry was not idempotent", er)
	}
	third := signedUpstreamReservation(t, ctx, authorityKey, closed.Before, closed.After, closed.RequestHash, Digest{6})
	if _, e = u.Apply(third); !errors.Is(e, ErrConflict) {
		t.Fatal("new token repeated applied request", e)
	}
	if _, e = u.CloseUnapplied(third); !errors.Is(e, ErrConflict) {
		t.Fatal("closure contradicted applied request", e)
	}
	terminal, effects, e := u.Counts()
	if e != nil || terminal != 2 || effects != 1 {
		t.Fatal("accounting", terminal, effects, e)
	}
}

func TestUpstreamEffectAuthorityCrashRestartAndAmbiguousPersistence(t *testing.T) {
	origin := "http://127.0.0.1:19112"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	upstreamPub, upstreamKey := closureKeys()
	for _, stage := range []string{"before-rename", "after-rename"} {
		t.Run("apply-"+stage, func(t *testing.T) {
			dir := privateTemp(t)
			u, e := createUpstreamEffectAuthority(dir, ctx, authorityPub, upstreamKey, 2)
			if e != nil {
				t.Fatal(e)
			}
			r := signedUpstreamReservation(t, ctx, authorityKey, Digest{10}, Digest{11}, Digest{12}, Digest{13})
			u.fault = func(at string) error {
				if at == stage {
					return errors.New("injected")
				}
				return nil
			}
			if _, e = u.Apply(r); !errors.Is(e, ErrUnknown) {
				t.Fatal("fault was not unknown", e)
			}
			if _, _, e = u.Counts(); !errors.Is(e, ErrStore) {
				t.Fatal("poisoned owner remained readable", e)
			}
			_ = u.Close()
			u, e = openUpstreamEffectAuthorityStore(dir, ctx, authorityPub, upstreamKey, 2)
			if e != nil {
				t.Fatal(e)
			}
			defer u.Close()
			terminal, effects, e := u.Counts()
			if e != nil {
				t.Fatal(e)
			}
			if stage == "before-rename" {
				if terminal != 0 || effects != 0 {
					t.Fatal("pre-effect crash committed", terminal, effects)
				}
				if _, e = u.Status(r); !errors.Is(e, ErrAbsent) {
					t.Fatal("pre-effect crash fabricated status", e)
				}
			} else {
				if terminal != 1 || effects != 1 {
					t.Fatal("post-effect crash lost effect", terminal, effects)
				}
				status, er := u.Status(r)
				if er != nil || status.State != upstreamApplied || !verifyUpstreamEffectStatus(status, r, ctx, authorityPub, upstreamPub) {
					t.Fatal("post-effect status", er)
				}
				if _, er = u.Apply(r); er != nil {
					t.Fatal("same identity did not reconcile", er)
				}
				_, after, _ := u.Counts()
				if after != 1 {
					t.Fatal("reconcile repeated effect", after)
				}
			}
		})
	}

	t.Run("close-after-rename", func(t *testing.T) {
		dir := privateTemp(t)
		u, e := createUpstreamEffectAuthority(dir, ctx, authorityPub, upstreamKey, 2)
		if e != nil {
			t.Fatal(e)
		}
		r := signedUpstreamReservation(t, ctx, authorityKey, Digest{20}, Digest{21}, Digest{22}, Digest{23})
		u.fault = func(at string) error {
			if at == "after-rename" {
				return errors.New("lost close ack")
			}
			return nil
		}
		if _, e = u.CloseUnapplied(r); !errors.Is(e, ErrUnknown) {
			t.Fatal("ambiguous close not unknown", e)
		}
		_ = u.Close()
		u, e = openUpstreamEffectAuthorityStore(dir, ctx, authorityPub, upstreamKey, 2)
		if e != nil {
			t.Fatal(e)
		}
		defer u.Close()
		proof, e := u.CloseUnapplied(r)
		if e != nil || !VerifyEffectClosureProof(proof, ctx, authorityPub, r, upstreamPub) {
			t.Fatal("closure lost across restart", e)
		}
		if _, e = u.Apply(r); !errors.Is(e, ErrConflict) {
			t.Fatal("closed identity applied after restart", e)
		}
	})
}

func TestUpstreamEffectAuthorityConcurrentApplyCloseAndGlobalBudget(t *testing.T) {
	ctx, _, authorityKey, _, _, u := upstreamFixture(t, "http://127.0.0.1:19113", 1)
	defer u.Close()
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{30}, Digest{31}, Digest{32}, Digest{33})
	type answer struct{ err error }
	ch := make(chan answer, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, e := u.Apply(r); ch <- answer{e} }()
	go func() { defer wg.Done(); _, e := u.CloseUnapplied(r); ch <- answer{e} }()
	wg.Wait()
	close(ch)
	success, conflict := 0, 0
	for x := range ch {
		if x.err == nil {
			success++
		} else if errors.Is(x.err, ErrConflict) {
			conflict++
		} else {
			t.Fatal(x.err)
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatal("apply/close race not linearized", success, conflict)
	}
	terminal, effects, e := u.Counts()
	if e != nil || terminal != 1 || effects > 1 {
		t.Fatal("race accounting", terminal, effects, e)
	}
	other := signedUpstreamReservation(t, ctx, authorityKey, Digest{34}, Digest{35}, Digest{36}, Digest{37})
	if effects == 0 {
		if _, e = u.Apply(other); e != nil {
			t.Fatal("unused budget unavailable", e)
		}
	} else if _, e = u.Apply(other); !errors.Is(e, ErrBudget) {
		t.Fatal("global budget oversubscribed", e)
	}
	_, effects, _ = u.Counts()
	if effects != 1 {
		t.Fatal("global effect cap failed", effects)
	}
}

func TestUpstreamEffectAuthorityCloneCounterexamplePreserved(t *testing.T) {
	origin := "http://127.0.0.1:19114"
	ctx, _, _, authorityPub, authorityKey, _, _ := authorityFixture(t, origin)
	_, upstreamKey := closureKeys()
	leftDir, rightDir := privateTemp(t), privateTemp(t)
	left, e := createUpstreamEffectAuthority(leftDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	raw, e := os.ReadFile(filepath.Join(leftDir, "upstream.bin"))
	if e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(rightDir, "upstream.bin"), raw, 0600); e != nil {
		t.Fatal(e)
	}
	left.Close()
	left, e = openUpstreamEffectAuthorityStore(leftDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer left.Close()
	right, e := openUpstreamEffectAuthorityStore(rightDir, ctx, authorityPub, upstreamKey, 2)
	if e != nil {
		t.Fatal(e)
	}
	defer right.Close()
	r := signedUpstreamReservation(t, ctx, authorityKey, Digest{60}, Digest{61}, Digest{62}, Digest{63})
	l, le := left.Apply(r)
	rr, re := right.Apply(r)
	if le != nil || re != nil || l != rr {
		t.Fatal("clone counterexample missing", le, re)
	}
	_, leffects, _ := left.Counts()
	_, reffects, _ := right.Counts()
	if leffects != 1 || reffects != 1 {
		t.Fatal("clones did not each effect", leffects, reffects)
	}
	t.Log("COUNTEREXAMPLE: cloned signer+snapshot can apply the same identity twice globally; identical signed receipts do not prove one physical effect")
}
