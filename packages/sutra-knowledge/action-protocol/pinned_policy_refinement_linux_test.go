//go:build linux

package actionprotocol

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

type pinnedPolicyTraceEvent struct {
	Op              string `json:"op"`
	Result          string `json:"result"`
	Epoch           uint64 `json:"epoch"`
	NotBefore       uint64 `json:"notBefore"`
	ExpiresAfter    uint64 `json:"expiresAfter"`
	Revoked         bool   `json:"revoked"`
	Admitted        bool   `json:"admitted"`
	Reconciled      bool   `json:"reconciled"`
	PinMember       bool   `json:"pinMember"`
	PolicySequence  uint32 `json:"policySequence"`
	PolicyHead      string `json:"policyHead"`
	UpstreamEffects uint32 `json:"upstreamEffects"`
	LocalEffects    uint32 `json:"localEffects"`
}

type pinnedPolicyTraceScenario struct {
	Name   string                   `json:"name"`
	Events []pinnedPolicyTraceEvent `json:"events"`
}

type pinnedPolicyTrace struct {
	Profile   string                      `json:"profile"`
	Scenarios []pinnedPolicyTraceScenario `json:"scenarios"`
}

func pinMemberNow(t *testing.T, f *pinnedTxnFixture, pin ClientPolicyPin, challenge Digest) bool {
	t.Helper()
	m, e := f.base.policyW.AttestMembership(challenge, pin.Sequence, pin.Head)
	if e != nil {
		return false
	}
	return VerifyGrantPolicyMembershipAttestation(m, challenge, pin.Sequence, pin.Head, f.base.ctx,
		f.base.bookKey.Public().(ed25519.PublicKey), f.base.policyPub, f.base.policyGenesis)
}

func pinnedPolicyTraceState(t *testing.T, f *pinnedTxnFixture, grant ActionGrant, pin ClientPolicyPin,
	op, result string, reconciled bool, challenge Digest) pinnedPolicyTraceEvent {
	t.Helper()
	f.base.book.mu.Lock()
	epoch := f.base.book.epoch
	revoked := f.base.book.isRevokedLocked(grant.ID)
	admitted := f.base.book.isAdmittedLocked(grant.ID)
	f.base.book.mu.Unlock()
	view, e := f.base.policyClient.View()
	if e != nil {
		t.Fatal(e)
	}
	_, upstreamEffects, e := f.upstream.Counts()
	if e != nil {
		t.Fatal(e)
	}
	_, _, localEffects, e := f.base.authority.Counts()
	if e != nil {
		t.Fatal(e)
	}
	return pinnedPolicyTraceEvent{
		Op: op, Result: result, Epoch: epoch, NotBefore: grant.NotBefore, ExpiresAfter: grant.ExpiresAfter,
		Revoked: revoked, Admitted: admitted, Reconciled: reconciled,
		PinMember: pinMemberNow(t, f, pin, challenge), PolicySequence: view.Sequence,
		PolicyHead: hex.EncodeToString(view.Head[:]), UpstreamEffects: upstreamEffects, LocalEffects: localEffects,
	}
}

func TestPinnedUpstreamTransactionPolicyRefinementTrace(t *testing.T) {
	trace := pinnedPolicyTrace{Profile: "SUTRA/pinned-policy-refinement/v1"}

	t.Run("active", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		s := pinnedPolicyTraceScenario{Name: "active"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "init", "ready", false, Digest{21}))
		if _, e := f.guard.processPinned(grant, req, pin, Digest{22}); e != nil {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "process", "success", false, Digest{23}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("revoked", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		if e := f.base.policy.Revoke(grant, action); e != nil {
			t.Fatal(e)
		}
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		s := pinnedPolicyTraceScenario{Name: "revoked"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "init", "revoked", false, Digest{24}))
		if _, e := f.guard.processPinned(grant, req, pin, Digest{25}); !errors.Is(e, ErrGrantRevoked) {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "process", "grant-revoked", false, Digest{26}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("expired", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 10, f.base.consentKey)
		if e := f.base.policy.AdvanceEpoch(10, 11); e != nil {
			t.Fatal(e)
		}
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		s := pinnedPolicyTraceScenario{Name: "expired"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "init", "expired", false, Digest{27}))
		if _, e := f.guard.processPinned(grant, req, pin, Digest{28}); !errors.Is(e, ErrGrantInactive) {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "process", "grant-inactive", false, Digest{29}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("alternate-pin", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		view, _ := f.base.policyClient.View()
		req, _ := f.signedCommit(t, 0, action, grant, f.base.fenceGenesis, view)
		badPin, e := SignClientPolicyPin(f.base.ctx, grant.ID, req.Hash(), view.Sequence, Digest{0x91}, f.base.callerKeys[0])
		if e != nil {
			t.Fatal(e)
		}
		s := pinnedPolicyTraceScenario{Name: "alternate-pin"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, badPin, "init", "alternate", false, Digest{30}))
		if _, e = f.guard.processPinned(grant, req, badPin, Digest{31}); !errors.Is(e, ErrGrantPolicyRollback) {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, badPin, "process", "policy-rollback", false, Digest{32}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("revoked-reconcile", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		s := pinnedPolicyTraceScenario{Name: "revoked-reconcile"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "init", "ready", false, Digest{33}))
		f.transaction.fault = func(at string) error {
			if at == "txn-after-upstream" {
				return errors.New("trace ambiguity")
			}
			return nil
		}
		if _, e := f.guard.processPinned(grant, req, pin, Digest{34}); !errors.Is(e, ErrUnknown) {
			t.Fatal(e)
		}
		f.transaction.fault = nil
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "process", "unknown-applied", false, Digest{35}))
		if e := f.base.policy.Revoke(grant, action); e != nil {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "revoke", "revoked-after-admission", false, Digest{36}))
		if e := f.guard.recoverPinned(grant, req, pin, Digest{37}); e != nil {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "recover", "reconciled", true, Digest{38}))
		head, _ := f.base.authority.Head()
		freshReq, freshPin := f.currentPinnedCommit(t, 1, action, grant, head)
		if _, e := f.guard.processPinned(grant, freshReq, freshPin, Digest{39}); !errors.Is(e, ErrGrantRevoked) {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, freshPin, "fresh-process", "grant-revoked", true, Digest{40}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("never-admitted-recovery", func(t *testing.T) {
		f := newPinnedTxnFixture(t, 2)
		action := approve(t, 0, f.base.ctx, f.base.approverKey)
		grant, _ := IssueActionGrant(action, GrantPrimary, 10, 11, f.base.consentKey)
		req, pin := f.currentPinnedCommit(t, 0, action, grant, f.base.fenceGenesis)
		s := pinnedPolicyTraceScenario{Name: "never-admitted-recovery"}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "init", "ready", false, Digest{41}))
		if e := f.guard.recoverPinned(grant, req, pin, Digest{42}); !errors.Is(e, ErrGrantNotDispatched) {
			t.Fatal(e)
		}
		s.Events = append(s.Events, pinnedPolicyTraceState(t, f, grant, pin, "recover", "not-dispatched", false, Digest{43}))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	if path := os.Getenv("SUTRA_PINNED_POLICY_TRACE"); path != "" {
		raw, e := json.MarshalIndent(trace, "", "  ")
		if e != nil {
			t.Fatal(e)
		}
		if e = os.WriteFile(path, append(raw, '\n'), 0600); e != nil {
			t.Fatal(e)
		}
	}
	t.Log("actual pinned consent/policy traces exported for independent GrantLifecycle/ClientPolicyAncestry mapping")
}
