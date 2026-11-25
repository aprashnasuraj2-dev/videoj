//go:build linux

package actionprotocol

// Separate compensation authority for the private synthetic transaction lab.
// A compensating action is a new effect. This file does not claim that it
// reverses the original real-world effect, only that the new action was
// separately authorized and causally bound to one exact prior APPLIED receipt.
import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"errors"
)

const compensationAuthorizationDomain = "SUTRA/compensation-authorization/v1\x00"
const compensationAuthorizationBodySize = 32 + 32 + grantIDSize + 32
const compensationAuthorizationSize = compensationAuthorizationBodySize + ed25519.SignatureSize

var ErrCompensationAuthorization = errors.New("compensation authorization invalid")
var ErrCompensationSource = errors.New("compensation source effect is not currently proven applied")

type compensationAuthorization struct {
	PriorReservationHash Digest
	PriorReceiptHash     Digest
	GrantID              GrantID
	RequestHash          Digest
	Signature            [ed25519.SignatureSize]byte
}

func (a compensationAuthorization) body() []byte {
	b := append([]byte(nil), a.PriorReservationHash[:]...)
	b = append(b, a.PriorReceiptHash[:]...)
	b = append(b, a.GrantID[:]...)
	return append(b, a.RequestHash[:]...)
}
func (a compensationAuthorization) message(ctx Digest) []byte {
	b := append([]byte(compensationAuthorizationDomain), ctx[:]...)
	return append(b, a.body()...)
}
func (a compensationAuthorization) Bytes() []byte { return append(a.body(), a.Signature[:]...) }

func parseCompensationAuthorization(raw []byte) (compensationAuthorization, error) {
	var a compensationAuthorization
	if len(raw) != compensationAuthorizationSize {
		return a, ErrPolicy
	}
	copy(a.PriorReservationHash[:], raw[:32])
	copy(a.PriorReceiptHash[:], raw[32:64])
	copy(a.GrantID[:], raw[64:64+grantIDSize])
	copy(a.RequestHash[:], raw[64+grantIDSize:compensationAuthorizationBodySize])
	copy(a.Signature[:], raw[compensationAuthorizationBodySize:])
	if a.PriorReservationHash == (Digest{}) || a.PriorReceiptHash == (Digest{}) ||
		a.GrantID == (GrantID{}) || a.RequestHash == (Digest{}) {
		return compensationAuthorization{}, ErrPolicy
	}
	return a, nil
}

func upstreamReceiptDigest(r upstreamEffectReceipt) Digest {
	return sha256.Sum256(r.Bytes())
}

func compensationSourceMatchesReservation(prior FenceReservation, receipt upstreamEffectReceipt) bool {
	return receipt.ReservationHash == prior.Hash() &&
		receipt.RequestHash == prior.RequestHash &&
		receipt.Before == prior.Before &&
		receipt.After == prior.After &&
		receipt.Token == prior.Token &&
		receipt.EffectSequence > 0
}

func signCompensationAuthorization(ctx Digest, prior FenceReservation, receipt upstreamEffectReceipt,
	grant ActionGrant, req AuthorityRequest, signer ed25519.PrivateKey,
) (compensationAuthorization, error) {
	if ctx == (Digest{}) || len(signer) != ed25519.PrivateKeySize ||
		grant.Class != GrantCompensation || grant.ID == (GrantID{}) ||
		grant.Context != ctx || grant.RequestHash != req.Action.Hash() ||
		req.Op != AuthorityCommit || !compensationSourceMatchesReservation(prior, receipt) {
		return compensationAuthorization{}, ErrPolicy
	}
	a := compensationAuthorization{
		PriorReservationHash: prior.Hash(),
		PriorReceiptHash:     upstreamReceiptDigest(receipt),
		GrantID:              grant.ID,
		RequestHash:          req.Hash(),
	}
	copy(a.Signature[:], ed25519.Sign(signer, a.message(ctx)))
	return a, nil
}

func verifyCompensationAuthorization(a compensationAuthorization, ctx Digest, prior FenceReservation,
	receipt upstreamEffectReceipt, grant ActionGrant, req AuthorityRequest, signer ed25519.PublicKey,
) bool {
	return ctx != (Digest{}) && len(signer) == ed25519.PublicKeySize &&
		grant.Class == GrantCompensation && grant.ID != (GrantID{}) &&
		grant.Context == ctx && grant.RequestHash == req.Action.Hash() && req.Op == AuthorityCommit &&
		compensationSourceMatchesReservation(prior, receipt) &&
		a.PriorReservationHash == prior.Hash() &&
		a.PriorReceiptHash == upstreamReceiptDigest(receipt) &&
		a.GrantID == grant.ID && a.RequestHash == req.Hash() &&
		ed25519.Verify(signer, a.message(ctx), a.Signature[:])
}

type pinnedCompensationGuard struct {
	primary   *pinnedUpstreamTransactionGuard
	authority ed25519.PublicKey
}

func newPinnedCompensationGuard(primary *pinnedUpstreamTransactionGuard, compensationAuthority ed25519.PublicKey) (*pinnedCompensationGuard, error) {
	if primary == nil || primary.policy == nil || primary.policy.book == nil ||
		primary.transaction == nil || primary.transaction.authority == nil ||
		primary.transaction.fence == nil || primary.transaction.upstream == nil ||
		len(compensationAuthority) != ed25519.PublicKeySize {
		return nil, ErrPolicy
	}
	b := primary.policy.book
	t := primary.transaction
	distinctFrom := []ed25519.PublicKey{
		b.consent,
		b.approver,
		b.signer.Public().(ed25519.PublicKey),
		t.authority.signer.Public().(ed25519.PublicKey),
		t.fence.fence,
		t.upstream.upstream,
		primary.policy.witness.witness,
	}
	for _, caller := range t.authority.callers {
		distinctFrom = append(distinctFrom, caller)
	}
	for _, other := range distinctFrom {
		if bytes.Equal(compensationAuthority, other) {
			return nil, ErrPolicy
		}
	}
	return &pinnedCompensationGuard{
		primary:   primary,
		authority: append(ed25519.PublicKey(nil), compensationAuthority...),
	}, nil
}

func (g *pinnedCompensationGuard) validatePriorApplied(prior FenceReservation, receipt upstreamEffectReceipt) error {
	t := g.primary.transaction
	if !verifyUpstreamEffectReceipt(receipt, prior, t.authority.ctx,
		t.authority.signer.Public().(ed25519.PublicKey), t.upstream.upstream) {
		return ErrCompensationSource
	}
	status, e := t.upstream.Status(prior)
	if e != nil {
		if errors.Is(e, ErrAbsent) {
			return ErrCompensationSource
		}
		return e
	}
	if status.State != upstreamApplied || status.EffectCount < receipt.EffectSequence {
		return ErrCompensationSource
	}
	return nil
}

func (g *pinnedCompensationGuard) Process(auth compensationAuthorization, prior FenceReservation,
	receipt upstreamEffectReceipt, grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest,
) (pinnedUpstreamTransactionEnvelope, error) {
	if grant.Class != GrantCompensation {
		return pinnedUpstreamTransactionEnvelope{}, ErrGrantClass
	}
	ctx := g.primary.transaction.authority.ctx
	if !verifyCompensationAuthorization(auth, ctx, prior, receipt, grant, req, g.authority) {
		return pinnedUpstreamTransactionEnvelope{}, ErrCompensationAuthorization
	}
	if e := g.validatePriorApplied(prior, receipt); e != nil {
		return pinnedUpstreamTransactionEnvelope{}, e
	}
	return g.primary.processPinnedClass(grant, req, pin, challenge, GrantCompensation)
}

// Recover never creates a fresh compensation effect. It requires the same exact
// causal authorization and a cryptographically valid source receipt, then relies
// on the already-admitted compensation grant plus the transaction recovery state.
func (g *pinnedCompensationGuard) Recover(auth compensationAuthorization, prior FenceReservation,
	receipt upstreamEffectReceipt, grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest,
) error {
	if grant.Class != GrantCompensation {
		return ErrGrantClass
	}
	ctx := g.primary.transaction.authority.ctx
	if !verifyCompensationAuthorization(auth, ctx, prior, receipt, grant, req, g.authority) {
		return ErrCompensationAuthorization
	}
	t := g.primary.transaction
	if !verifyUpstreamEffectReceipt(receipt, prior, ctx,
		t.authority.signer.Public().(ed25519.PublicKey), t.upstream.upstream) {
		return ErrCompensationSource
	}
	return g.primary.recoverPinnedClass(grant, req, pin, challenge, GrantCompensation)
}
