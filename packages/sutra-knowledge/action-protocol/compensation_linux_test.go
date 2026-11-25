//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"testing"
)

func primaryForCompensation(t *testing.T, f *pinnedTxnFixture) (ActionGrant, AuthorityRequest, pinnedUpstreamTransactionEnvelope) {
	t.Helper()
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, e := IssueActionGrant(action, GrantPrimary, 10, 12, f.base.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	out, e := f.guard.processPinned(grant, req, pin, Digest{0xC1})
	if e != nil {
		t.Fatal("primary source effect", e)
	}
	return grant, req, out
}

func compensationRequest(t *testing.T, f *pinnedTxnFixture, slot byte) (ActionGrant, AuthorityRequest, ClientPolicyPin) {
	t.Helper()
	action := approve(t, slot, f.base.ctx, f.base.approverKey)
	grant, e := IssueActionGrant(action, GrantCompensation, 10, 12, f.base.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	head, e := f.base.authority.Head()
	if e != nil {
		t.Fatal(e)
	}
	req, pin := f.currentPinnedCommit(t, 1, action, grant, head)
	return grant, req, pin
}

func assertOnePrimaryEffect(t *testing.T, f *pinnedTxnFixture) {
	t.Helper()
	if _, effects, e := f.upstream.Counts(); e != nil || effects != 1 {
		t.Fatal("upstream compensation refusal changed source effect count", effects, e)
	}
	if _, _, effects, e := f.base.authority.Counts(); e != nil || effects != 1 {
		t.Fatal("local compensation refusal changed source acknowledgement count", effects, e)
	}
}

func TestPinnedCompensationRequiresSeparateCausalAuthority(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	_, _, prior := primaryForCompensation(t, f)
	compPub, compKey := keys(31)
	guard, e := newPinnedCompensationGuard(f.guard, compPub)
	if e != nil {
		t.Fatal(e)
	}
	grant, req, pin := compensationRequest(t, f, 1)

	// A compensation-class grant cannot use the ordinary primary path.
	if _, e = f.guard.processPinned(grant, req, pin, Digest{0xC2}); !errors.Is(e, ErrGrantClass) {
		t.Fatal("compensation grant bypassed causal authorization", e)
	}
	assertOnePrimaryEffect(t, f)

	auth, e := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation,
		prior.Transaction.Upstream, grant, req, compKey)
	if e != nil {
		t.Fatal(e)
	}
	roundTrip, e := parseCompensationAuthorization(auth.Bytes())
	if e != nil || roundTrip != auth ||
		!verifyCompensationAuthorization(roundTrip, f.base.ctx, prior.Transaction.Reservation,
			prior.Transaction.Upstream, grant, req, compPub) {
		t.Fatal("compensation authorization round trip", e)
	}
	out, e := guard.Process(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
		grant, req, pin, Digest{0xC3})
	if e != nil {
		t.Fatal("separately authorized compensation", e)
	}
	if !verifyPinnedUpstreamTransactionEnvelope(out, grant, req, pin, Digest{0xC3}, f.base.ctx,
		f.base.callerKeys[1].Public().(ed25519.PublicKey), f.base.authorityPub, f.base.fencePub,
		f.base.closurePub, f.base.consentPub, f.base.bookKey.Public().(ed25519.PublicKey),
		f.base.policyPub, f.base.fenceGenesis, f.base.policyGenesis) {
		t.Fatal("compensation did not preserve strongest transaction envelope")
	}
	if _, effects, e := f.upstream.Counts(); e != nil || effects != 2 {
		t.Fatal("compensation did not create exactly one separately authorized follow-up effect", effects, e)
	}
	if _, _, effects, e := f.base.authority.Counts(); e != nil || effects != 2 {
		t.Fatal("compensation local acknowledgement count", effects, e)
	}
	t.Log("compensation is a separately authorized causal follow-up effect; no claim that it atomically reverses the primary effect")
}

func TestPinnedCompensationAuthoritySeparationAndSourceTamper(t *testing.T) {
	t.Run("authority-key-separation", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		for name, key := range map[string]ed25519.PublicKey{
			"consent": f.base.consentPub,
			"caller":  f.base.callerKeys[0].Public().(ed25519.PublicKey),
			"upstream": f.base.closurePub,
			"fence": f.base.fencePub,
			"policy-witness": f.base.policyPub,
		} {
			t.Run(name, func(t *testing.T) {
				if _, e := newPinnedCompensationGuard(f.guard, key); !errors.Is(e, ErrPolicy) {
					t.Fatal("compensation authority reused privileged key", name, e)
				}
			})
		}
	})

	t.Run("wrong-authorization-signer", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		_, _, prior := primaryForCompensation(t, f)
		compPub, _ := keys(31)
		_, wrongKey := keys(32)
		guard, _ := newPinnedCompensationGuard(f.guard, compPub)
		grant, req, pin := compensationRequest(t, f, 1)
		auth, e := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation,
			prior.Transaction.Upstream, grant, req, wrongKey)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = guard.Process(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
			grant, req, pin, Digest{0xC4}); !errors.Is(e, ErrCompensationAuthorization) {
			t.Fatal("wrong compensation signer accepted", e)
		}
		assertOnePrimaryEffect(t, f)
	})

	t.Run("tampered-source-receipt", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		_, _, prior := primaryForCompensation(t, f)
		compPub, compKey := keys(31)
		guard, _ := newPinnedCompensationGuard(f.guard, compPub)
		grant, req, pin := compensationRequest(t, f, 1)
		bad := prior.Transaction.Upstream
		bad.Signature[0] ^= 1
		auth, e := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation, bad, grant, req, compKey)
		if e != nil {
			t.Fatal("signing exact tampered source identity should remain possible for negative control", e)
		}
		if _, e = guard.Process(auth, prior.Transaction.Reservation, bad, grant, req, pin, Digest{0xC5}); !errors.Is(e, ErrCompensationSource) {
			t.Fatal("tampered prior receipt authorized compensation", e)
		}
		assertOnePrimaryEffect(t, f)
	})

	t.Run("authorization-request-substitution", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		_, _, prior := primaryForCompensation(t, f)
		compPub, compKey := keys(31)
		guard, _ := newPinnedCompensationGuard(f.guard, compPub)
		grantA, reqA, _ := compensationRequest(t, f, 1)
		auth, e := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation,
			prior.Transaction.Upstream, grantA, reqA, compKey)
		if e != nil {
			t.Fatal(e)
		}
		grantB, reqB, pinB := compensationRequest(t, f, 2)
		if _, e = guard.Process(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
			grantB, reqB, pinB, Digest{0xC6}); !errors.Is(e, ErrCompensationAuthorization) {
			t.Fatal("causal authorization was reusable for another compensation request", e)
		}
		assertOnePrimaryEffect(t, f)
	})
}

func TestPinnedCompensationRequiresCurrentWitnessedSourceStatus(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	_, _, prior := primaryForCompensation(t, f)
	compPub, compKey := keys(31)
	guard, _ := newPinnedCompensationGuard(f.guard, compPub)
	grant, req, pin := compensationRequest(t, f, 1)
	auth, _ := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation,
		prior.Transaction.Upstream, grant, req, compKey)
	if e := f.upstreamWitness.Close(); e != nil {
		t.Fatal(e)
	}
	if _, e := guard.Process(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
		grant, req, pin, Digest{0xC7}); !errors.Is(e, ErrUpstreamUnavailable) {
		t.Fatal("fresh compensation ignored unavailable witnessed source status", e)
	}
	assertOnePrimaryEffect(t, f)
}

func TestPinnedCompensationAmbiguousRecoveryRequiresSameCausalAuthorization(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	_, _, prior := primaryForCompensation(t, f)
	compPub, compKey := keys(31)
	guard, _ := newPinnedCompensationGuard(f.guard, compPub)
	grant, req, pin := compensationRequest(t, f, 1)
	auth, _ := signCompensationAuthorization(f.base.ctx, prior.Transaction.Reservation,
		prior.Transaction.Upstream, grant, req, compKey)

	f.transaction.fault = func(at string) error {
		if at == "txn-after-upstream" {
			return errors.New("ambiguous compensation after upstream apply")
		}
		return nil
	}
	if _, e := guard.Process(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
		grant, req, pin, Digest{0xC8}); !errors.Is(e, ErrUnknown) {
		t.Fatal("compensation ambiguity not preserved", e)
	}
	f.transaction.fault = nil
	if _, effects, _ := f.upstream.Counts(); effects != 2 {
		t.Fatal("compensation upstream effect missing before ambiguity", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 1 {
		t.Fatal("compensation local acknowledgement occurred before recovery", effects)
	}

	bad := auth
	bad.Signature[0] ^= 1
	if e := guard.Recover(bad, prior.Transaction.Reservation, prior.Transaction.Upstream,
		grant, req, pin, Digest{0xC9}); !errors.Is(e, ErrCompensationAuthorization) {
		t.Fatal("recovery accepted wrong compensation authorization", e)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 1 {
		t.Fatal("rejected recovery mutated local authority", effects)
	}

	if e := f.base.policy.Revoke(grant, req.Action); e != nil {
		t.Fatal("post-admission compensation revocation", e)
	}
	if e := guard.Recover(auth, prior.Transaction.Reservation, prior.Transaction.Upstream,
		grant, req, pin, Digest{0xCA}); e != nil {
		t.Fatal("exact compensation recovery after revocation", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 2 {
		t.Fatal("compensation recovery repeated upstream effect", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 2 {
		t.Fatal("compensation recovery failed exact local acknowledgement", effects)
	}
}
