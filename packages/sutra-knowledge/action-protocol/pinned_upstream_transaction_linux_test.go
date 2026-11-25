//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

type pinnedTxnFixture struct {
	base                  *compositeFixture
	upstream              *upstreamEffectAuthority
	upstreamDir           string
	upstreamWitness       *AuthorityWitness
	upstreamWitnessServer *httptest.Server
	upstreamWitnessed     *upstreamWitnessCoordinator
	upstreamServer        *httptest.Server
	upstreamClient        *upstreamEffectClient
	transaction           *upstreamTransactionCoordinator
	guard                 *pinnedUpstreamTransactionGuard
}

func newPinnedTxnFixture(t *testing.T, upstreamLimit uint32) *pinnedTxnFixture {
	t.Helper()
	base := newCompositeFixture(t, nil)
	f := &pinnedTxnFixture{base: base}
	f.upstreamDir = privateTemp(t)
	upstream, e := createUpstreamEffectAuthority(
		f.upstreamDir, base.ctx, base.authorityPub, base.closureKey, upstreamLimit,
	)
	if e != nil {
		t.Fatal(e)
	}
	f.upstream = upstream
	genesis, e := upstream.StateHead()
	if e != nil {
		t.Fatal(e)
	}
	witnessPub, witnessKey := keys(30)
	f.upstreamWitness, e = CreateAuthorityWitness(privateTemp(t), base.ctx, base.closurePub, witnessKey, genesis)
	if e != nil {
		t.Fatal(e)
	}
	f.upstreamWitnessServer = httptest.NewServer(f.upstreamWitness)
	witnessClient, e := NewWitnessClient(f.upstreamWitnessServer.URL, base.ctx, base.closurePub, witnessPub, genesis)
	if e != nil {
		t.Fatal(e)
	}
	f.upstreamWitnessed, e = newUpstreamWitnessCoordinator(upstream, witnessClient)
	if e != nil {
		t.Fatal(e)
	}
	f.upstreamServer = httptest.NewServer(http.HandlerFunc(f.upstreamWitnessed.serveHTTP))
	f.upstreamClient, e = newUpstreamEffectClient(
		f.upstreamServer.URL, base.ctx, base.authorityPub, base.closurePub,
	)
	if e != nil {
		t.Fatal(e)
	}
	f.transaction, e = newUpstreamTransactionCoordinator(base.authority, base.fenceClient, f.upstreamClient)
	if e != nil {
		t.Fatal(e)
	}
	f.guard, e = newPinnedUpstreamTransactionGuard(base.policy, f.transaction)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if f.upstream != nil {
			_ = f.upstream.Close()
		}
		if f.upstreamWitness != nil {
			_ = f.upstreamWitness.Close()
		}
		f.upstreamServer.Close()
		f.upstreamWitnessServer.Close()
	})
	return f
}

func (f *pinnedTxnFixture) signedCommit(t *testing.T, caller byte, action Request, grant ActionGrant, expected Digest, view GrantPolicyView) (AuthorityRequest, ClientPolicyPin) {
	t.Helper()
	req, e := SignAuthorityRequest(caller, AuthorityCommit, expected, action, f.base.callerKeys[caller])
	if e != nil {
		t.Fatal(e)
	}
	pin, e := SignClientPolicyPin(f.base.ctx, grant.ID, req.Hash(), view.Sequence, view.Head, f.base.callerKeys[caller])
	if e != nil {
		t.Fatal(e)
	}
	return req, pin
}

func (f *pinnedTxnFixture) currentPinnedCommit(t *testing.T, caller byte, action Request, grant ActionGrant, expected Digest) (AuthorityRequest, ClientPolicyPin) {
	t.Helper()
	view, e := f.base.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	return f.signedCommit(t, caller, action, grant, expected, view)
}

func assertPinnedTxnZeroEffect(t *testing.T, f *pinnedTxnFixture) {
	t.Helper()
	if _, effects, e := f.upstream.Counts(); e != nil || effects != 0 {
		t.Fatal("unexpected upstream effect", effects, e)
	}
	spent, total, effects, e := f.base.authority.Counts()
	if e != nil || spent != [authorityCallers]byte{} || total != 0 || effects != 0 {
		t.Fatal("unexpected local authority mutation", spent, total, effects, e)
	}
	if _, exists, e := f.base.fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("unexpected pending fence", exists, e)
	}
}

func TestPinnedUpstreamTransactionCurrentGrantPolicyAndCausalReceipt(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, e := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	challenge := Digest{1, 2, 3}
	out, e := f.guard.processPinned(grant, req, pin, challenge)
	if e != nil {
		t.Fatal(e)
	}
	if !verifyPinnedUpstreamTransactionEnvelope(out, grant, req, pin, challenge, f.base.ctx,
		f.base.callerKeys[0].Public().(ed25519.PublicKey), f.base.authorityPub, f.base.fencePub,
		f.base.closurePub, f.base.consentPub, f.base.bookKey.Public().(ed25519.PublicKey),
		f.base.policyPub, f.base.fenceGenesis, f.base.policyGenesis) {
		t.Fatal("strongest private transaction envelope failed verification")
	}
	if out.Decision.PolicyHead != out.Membership.View.Head ||
		out.Attestation.View != out.Transaction.Fence ||
		out.Transaction.Upstream.RequestHash != req.Hash() ||
		out.Transaction.Upstream.ReservationHash != out.Transaction.Reservation.Hash() {
		t.Fatal("causal chain not exact")
	}
	if _, effects, _ := f.upstream.Counts(); effects != 1 {
		t.Fatal("expected one upstream effect", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 1 {
		t.Fatal("expected one local acknowledgement effect", effects)
	}
	bad := out
	bad.Transaction.Upstream.Signature[0] ^= 1
	if verifyPinnedUpstreamTransactionEnvelope(bad, grant, req, pin, challenge, f.base.ctx,
		f.base.callerKeys[0].Public().(ed25519.PublicKey), f.base.authorityPub, f.base.fencePub,
		f.base.closurePub, f.base.consentPub, f.base.bookKey.Public().(ed25519.PublicKey),
		f.base.policyPub, f.base.fenceGenesis, f.base.policyGenesis) {
		t.Fatal("tampered upstream receipt verified through composite")
	}
}

func TestPinnedUpstreamTransactionRevokedAndExpiredGrantFailBeforeEffect(t *testing.T) {
	t.Run("revoked", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, e := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		if e != nil {
			t.Fatal(e)
		}
		if e = f.base.policy.Revoke(grant, action); e != nil {
			t.Fatal(e)
		}
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		if _, e = f.guard.processPinned(grant, req, pin, Digest{4}); !errors.Is(e, ErrGrantRevoked) {
			t.Fatal("revoked grant reached transaction path", e)
		}
		assertPinnedTxnZeroEffect(t, f)
	})
	t.Run("expired", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, e := IssueActionGrant(action, GrantPrimary, 10, 10, f.base.consentKey)
		if e != nil {
			t.Fatal(e)
		}
		if e = f.base.policy.AdvanceEpoch(10, 11); e != nil {
			t.Fatal(e)
		}
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		if _, e = f.guard.processPinned(grant, req, pin, Digest{5}); !errors.Is(e, ErrGrantInactive) {
			t.Fatal("expired grant reached transaction path", e)
		}
		assertPinnedTxnZeroEffect(t, f)
	})
}

func TestPinnedUpstreamTransactionAlternatePolicyPinRejectedBeforeAdmissionMutation(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, e := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	if e != nil {
		t.Fatal(e)
	}
	before, e := f.base.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	req, _ := f.signedCommit(t, 0, action, grant, f.base.fenceGenesis, before)
	badHead := Digest{0x99}
	badPin, e := SignClientPolicyPin(f.base.ctx, grant.ID, req.Hash(), before.Sequence, badHead, f.base.callerKeys[0])
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.guard.processPinned(grant, req, badPin, Digest{6}); !errors.Is(e, ErrGrantPolicyRollback) {
		t.Fatal("alternate policy pin was not rejected", e)
	}
	after, e := f.base.policyClient.View()
	if e != nil || after != before {
		t.Fatal("rejected alternate pin mutated policy", e, before, after)
	}
	f.base.book.mu.Lock()
	admitted := f.base.book.isAdmittedLocked(grant.ID)
	f.base.book.mu.Unlock()
	if admitted {
		t.Fatal("alternate policy branch marked grant admitted")
	}
	assertPinnedTxnZeroEffect(t, f)
}

func TestPinnedUpstreamTransactionWrongAuthorityHeadAndCallerPinFailBeforeEffect(t *testing.T) {
	t.Run("wrong-head", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		before, _ := f.base.policyClient.View()
		req, pin := f.signedCommit(t, 0, action, grant, Digest{0x77}, before)
		if _, e := f.guard.processPinned(grant, req, pin, Digest{7}); !errors.Is(e, ErrHeadConflict) {
			t.Fatal("wrong authority head was not rejected pre-admission", e)
		}
		after, _ := f.base.policyClient.View()
		if after != before {
			t.Fatal("wrong authority head mutated grant policy")
		}
		assertPinnedTxnZeroEffect(t, f)
	})
	t.Run("wrong-pin-key", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		view, _ := f.base.policyClient.View()
		req, _ := f.signedCommit(t, 0, action, grant, f.base.fenceGenesis, view)
		badPin, e := SignClientPolicyPin(f.base.ctx, grant.ID, req.Hash(), view.Sequence, view.Head, f.base.callerKeys[1])
		if e != nil {
			t.Fatal(e)
		}
		if _, e = f.guard.processPinned(grant, req, badPin, Digest{8}); !errors.Is(e, ErrAuthorityAuth) {
			t.Fatal("wrong caller policy signer accepted", e)
		}
		assertPinnedTxnZeroEffect(t, f)
	})
}

func TestPinnedUpstreamTransactionMissingFenceHasZeroEffectAndRecoversClosed(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	f.base.fencePtr.Store(nil)
	if _, e := f.guard.processPinned(grant, req, pin, Digest{9}); !errors.Is(e, ErrFenceUnavailable) {
		t.Fatal("missing fence did not fail closed", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 0 {
		t.Fatal("missing fence reached upstream", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 0 {
		t.Fatal("missing fence reached local effect", effects)
	}
	f.base.fencePtr.Store(f.base.fence)
	if e := f.guard.recoverPinned(grant, req, pin, Digest{10}); e != nil {
		t.Fatal("admitted/no-fence intent did not close safely after fence returned", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 0 {
		t.Fatal("recovery after missing fence fabricated effect", effects)
	}
	if _, exists, e := f.base.fenceClient.PendingReservation(); e != nil || exists {
		t.Fatal("recovery after missing fence left pending", exists, e)
	}
	if _, e := os.Stat(filepath.Join(f.base.authority.dir, upstreamTxnIntentName)); !errors.Is(e, os.ErrNotExist) {
		t.Fatal("closed pre-effect intent remained", e)
	}
}

func TestPinnedUpstreamTransactionRevocationAfterAmbiguousAppliedEffectStillReconciles(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	f.transaction.fault = func(at string) error {
		if at == "txn-after-upstream" {
			return errors.New("ambiguous after upstream apply")
		}
		return nil
	}
	if _, e := f.guard.processPinned(grant, req, pin, Digest{11}); !errors.Is(e, ErrUnknown) {
		t.Fatal("post-effect ambiguity not preserved", e)
	}
	f.transaction.fault = nil
	if _, effects, _ := f.upstream.Counts(); effects != 1 {
		t.Fatal("upstream did not apply before ambiguity", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 0 {
		t.Fatal("local acknowledgement preceded recovery", effects)
	}
	if e := f.base.policy.Revoke(grant, action); e != nil {
		t.Fatal("revocation after admitted ambiguity", e)
	}
	// Reconciliation is non-effect-creating and remains authorized for the
	// already admitted grant even though fresh dispatch is now revoked.
	if e := f.guard.recoverPinned(grant, req, pin, Digest{12}); e != nil {
		t.Fatal("revocation prevented safe reconciliation", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 1 {
		t.Fatal("reconciliation repeated upstream effect", effects)
	}
	if _, _, effects, _ := f.base.authority.Counts(); effects != 1 {
		t.Fatal("reconciliation failed local acknowledgement", effects)
	}
	head, _ := f.base.authority.Head()
	freshReq, freshPin := f.currentPinnedCommit(t, 1, action, grant, head)
	if _, e := f.guard.processPinned(grant, freshReq, freshPin, Digest{13}); !errors.Is(e, ErrGrantRevoked) {
		t.Fatal("revoked grant permitted fresh effect after reconciliation", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 1 {
		t.Fatal("revoked fresh dispatch changed upstream count", effects)
	}
}

func TestPinnedUpstreamTransactionGrantRevocationCannotInterleaveAdmissionToEffect(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	reached := make(chan struct{})
	release := make(chan struct{})
	f.transaction.fault = func(at string) error {
		if at == "txn-after-reserve" {
			close(reached)
			<-release
		}
		return nil
	}
	done := make(chan error, 1)
	go func() {
		_, e := f.guard.processPinned(grant, req, pin, Digest{14})
		done <- e
	}()
	<-reached
	if f.base.book.mu.TryLock() {
		f.base.book.mu.Unlock()
		t.Fatal("grant-policy mutex was not held across admission to effect")
	}
	close(release)
	if e := <-done; e != nil {
		t.Fatal("dispatch after release", e)
	}
	f.transaction.fault = nil
	if e := f.base.policy.Revoke(grant, action); e != nil {
		t.Fatal("post-dispatch revocation", e)
	}
	if _, effects, _ := f.upstream.Counts(); effects != 1 {
		t.Fatal("revocation race changed effect count", effects)
	}
}

func TestPinnedUpstreamTransactionNeverAdmittedGrantCannotGainRecoveryAuthority(t *testing.T) {
	f := newPinnedTxnFixture(t, 2)
	action := approve(t, 0, f.base.ctx, f.base.approverKey)
	grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
	req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
	if e := f.guard.recoverPinned(grant, req, pin, Digest{15}); !errors.Is(e, ErrGrantNotDispatched) {
		t.Fatal("never-admitted grant gained reconciliation authority", e)
	}
	assertPinnedTxnZeroEffect(t, f)
}
