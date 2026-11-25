//go:build linux

package actionprotocol

// Private strongest-composition laboratory for an external-effect transaction.
// It intentionally creates no HTTP surface. Exact grant/current policy/ancestry
// authority is checked before the transaction coordinator may persist intent,
// reserve the effect fence, or contact the synthetic upstream receiver.
import (
	"bytes"
	"crypto/ed25519"
	"errors"
)

type pinnedUpstreamTransactionEnvelope struct {
	Transaction upstreamFencedResult
	Attestation FenceAttestation
	Decision    GrantPolicyDecision
	Membership  GrantPolicyMembershipAttestation
}

func verifyPinnedUpstreamTransactionEnvelope(e pinnedUpstreamTransactionEnvelope,
	grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge, ctx Digest,
	caller, authority, fence, upstream, consent, bookSigner, policyWitness ed25519.PublicKey,
	fenceGenesis, policyGenesis Digest) bool {
	return req.Op == AuthorityCommit &&
		VerifyClientPolicyPin(pin, ctx, grant.ID, req.Hash(), caller) &&
		VerifyActionGrant(grant, req.Action, consent) &&
		VerifyGrantPolicyDecision(e.Decision, grant, req, ctx, bookSigner) &&
		VerifyGrantPolicyMembershipAttestation(e.Membership, challenge, pin.Sequence, pin.Head,
			ctx, bookSigner, policyWitness, policyGenesis) &&
		e.Decision.PolicyHead == e.Membership.View.Head &&
		verifyUpstreamFencedResult(e.Transaction, req, ctx, authority, fence, upstream, fenceGenesis) &&
		VerifyFenceAttestation(e.Attestation, challenge, ctx, authority, fence, fenceGenesis) &&
		e.Attestation.View == e.Transaction.Fence
}

type pinnedUpstreamTransactionGuard struct {
	policy      *GrantPolicyCoordinator
	transaction *upstreamTransactionCoordinator
}

func newPinnedUpstreamTransactionGuard(policy *GrantPolicyCoordinator, transaction *upstreamTransactionCoordinator) (*pinnedUpstreamTransactionGuard, error) {
	if policy == nil || transaction == nil || policy.book == nil ||
		policy.book.ctx != transaction.authority.ctx ||
		!bytes.Equal(policy.book.approver, transaction.authority.approver) {
		return nil, ErrPolicy
	}
	return &pinnedUpstreamTransactionGuard{policy: policy, transaction: transaction}, nil
}

// validatePinnedCurrentHistoryLocked rejects an alternate/stale branch before
// grant admission mutates. The caller must hold the GrantBook mutex.
func (g *pinnedUpstreamTransactionGuard) validatePinnedCurrentHistoryLocked(
	grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest,
) (GrantPolicyMembershipAttestation, error) {
	b := g.policy.book
	class := grant.Class
	if e := g.policy.validateGrantIdentityLocked(grant, req.Action, &class); e != nil {
		return GrantPolicyMembershipAttestation{}, e
	}
	if e := g.policy.recoverLocked(); e != nil {
		return GrantPolicyMembershipAttestation{}, e
	}
	current := b.policyHeadLocked()
	membership, e := g.policy.witness.AttestMembershipChallenge(challenge, pin.Sequence, pin.Head)
	if e != nil {
		if errors.Is(e, ErrGrantPolicyRollback) {
			return GrantPolicyMembershipAttestation{}, ErrGrantPolicyRollback
		}
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	if membership.View.Head != current ||
		!VerifyGrantPolicyMembershipAttestation(membership, challenge, pin.Sequence, pin.Head,
			b.ctx, b.signer.Public().(ed25519.PublicKey), g.policy.witness.witness, g.policy.witness.genesis) {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyRollback
	}
	return membership, nil
}

func (g *pinnedUpstreamTransactionGuard) processPinned(
	grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest,
) (pinnedUpstreamTransactionEnvelope, error) {
	if challenge == (Digest{}) || req.Op != AuthorityCommit {
		return pinnedUpstreamTransactionEnvelope{}, ErrPolicy
	}
	a := g.transaction.authority
	if e := a.preflight(req); e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}
	if req.Caller >= authorityCallers ||
		!VerifyClientPolicyPin(pin, a.ctx, grant.ID, req.Hash(), a.callers[req.Caller]) {
		return pinnedUpstreamTransactionEnvelope{}, ErrAuthorityAuth
	}

	// Reject an already-stale authority request before any policy admission
	// mutation. The transaction coordinator rechecks under a.mu later, so a
	// concurrent head change still fails before upstream dispatch.
	a.mu.Lock()
	if a.lock == nil || a.poisoned {
		a.mu.Unlock()
		return pinnedUpstreamTransactionEnvelope{}, ErrStore
	}
	currentAuthority := a.headLocked()
	a.mu.Unlock()
	if req.Expected != currentAuthority {
		return pinnedUpstreamTransactionEnvelope{}, ErrHeadConflict
	}

	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()

	// First prove that the caller's signed pin belongs to the currently retained
	// witness ancestry. This occurs before reserveDispatchLocked can add the
	// grant to the admitted set.
	if _, e := g.validatePinnedCurrentHistoryLocked(grant, req, pin, challenge); e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}
	if e := g.policy.reserveDispatchLocked(grant, req.Action, grant.Class); e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}

	// Admission may advance the policy head. Bind the final decision to that
	// exact head and prove the original pin remains an ancestor of the current
	// retained history before any effect transaction begins.
	policyHead := b.policyHeadLocked()
	decision, e := signGrantPolicyDecision(b.ctx, grant, req, policyHead, b.epoch, b.signer)
	if e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}
	membership, e := g.policy.witness.AttestMembershipChallenge(challenge, pin.Sequence, pin.Head)
	if e != nil {
		if errors.Is(e, ErrGrantPolicyRollback) {
			return pinnedUpstreamTransactionEnvelope{}, ErrGrantPolicyRollback
		}
		return pinnedUpstreamTransactionEnvelope{}, ErrGrantPolicyUnavailable
	}
	if membership.View.Head != policyHead ||
		!VerifyGrantPolicyMembershipAttestation(membership, challenge, pin.Sequence, pin.Head,
			b.ctx, b.signer.Public().(ed25519.PublicKey), g.policy.witness.witness, g.policy.witness.genesis) {
		return pinnedUpstreamTransactionEnvelope{}, ErrGrantPolicyRollback
	}

	transaction, e := g.transaction.Process(req)
	if e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}
	attestation, e := g.transaction.fence.AttestChallenge(challenge)
	if e != nil {
		return pinnedUpstreamTransactionEnvelope{}, ErrFenceUnavailable
	}
	if attestation.View != transaction.Fence {
		return pinnedUpstreamTransactionEnvelope{}, ErrWitnessRollback
	}
	out := pinnedUpstreamTransactionEnvelope{
		Transaction: transaction, Attestation: attestation,
		Decision: decision, Membership: membership,
	}
	if !verifyPinnedUpstreamTransactionEnvelope(out, grant, req, pin, challenge, b.ctx,
		a.callers[req.Caller], a.signer.Public().(ed25519.PublicKey), g.transaction.fence.fence,
		g.transaction.upstream.upstream, b.consent, b.signer.Public().(ed25519.PublicKey),
		g.policy.witness.witness, g.transaction.fence.genesis, g.policy.witness.genesis) {
		return pinnedUpstreamTransactionEnvelope{}, ErrWitnessRollback
	}
	return out, nil
}

// recoverPinned permits reconciliation after expiry/revocation only when the
// grant was already durably admitted. It never authorizes a fresh effect.
// The original caller pin must still be an ancestor of the current witnessed
// policy history, so coordinated/alternate policy branches remain fail-closed.
func (g *pinnedUpstreamTransactionGuard) recoverPinned(
	grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest,
) error {
	if challenge == (Digest{}) || req.Op != AuthorityCommit {
		return ErrPolicy
	}
	a := g.transaction.authority
	if e := a.preflight(req); e != nil {
		return e
	}
	if req.Caller >= authorityCallers ||
		!VerifyClientPolicyPin(pin, a.ctx, grant.ID, req.Hash(), a.callers[req.Caller]) {
		return ErrAuthorityAuth
	}
	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()

	// Reconciliation deliberately differs from fresh dispatch: an already
	// admitted grant may be expired/revoked, but a never-admitted grant may not
	// gain reconciliation authority.
	if e := g.policy.checkReconcileLocked(grant, req.Action); e != nil {
		return e
	}
	current := b.policyHeadLocked()
	membership, e := g.policy.witness.AttestMembershipChallenge(challenge, pin.Sequence, pin.Head)
	if e != nil {
		if errors.Is(e, ErrGrantPolicyRollback) {
			return ErrGrantPolicyRollback
		}
		return ErrGrantPolicyUnavailable
	}
	if membership.View.Head != current ||
		!VerifyGrantPolicyMembershipAttestation(membership, challenge, pin.Sequence, pin.Head,
			b.ctx, b.signer.Public().(ed25519.PublicKey), g.policy.witness.witness, g.policy.witness.genesis) {
		return ErrGrantPolicyRollback
	}
	return g.transaction.Recover()
}
