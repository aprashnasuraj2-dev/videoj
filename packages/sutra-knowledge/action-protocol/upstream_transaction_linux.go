//go:build linux

package actionprotocol

// upstreamTransactionCoordinator is a private failure laboratory that couples
// the pre-effect admission fence to the durable upstream APPLIED/CLOSED
// idempotency authority. It deliberately exposes no HTTP handler or exported
// constructor. A real provider adapter is not implied by this synthetic path.
import (
	"bytes"
	"crypto/ed25519"
	"errors"
	"io"
	"os"
	"path/filepath"
	"syscall"
)

const upstreamTxnIntentDomain = "SUTRA/upstream-fenced-intent/v1\x00"
const upstreamTxnIntentName = "upstream-fenced-intent.bin"
const upstreamTxnIntentSize = len(upstreamTxnIntentDomain) + authorityRequestSize + fenceReservationSize

type upstreamTxnIntent struct {
	Request     AuthorityRequest
	Reservation FenceReservation
}

func (i upstreamTxnIntent) Bytes() []byte {
	b := append([]byte(upstreamTxnIntentDomain), i.Request.Bytes()...)
	return append(b, i.Reservation.Bytes()...)
}

func parseUpstreamTxnIntent(raw []byte) (upstreamTxnIntent, error) {
	var out upstreamTxnIntent
	if len(raw) != upstreamTxnIntentSize || !bytes.Equal(raw[:len(upstreamTxnIntentDomain)], []byte(upstreamTxnIntentDomain)) {
		return out, ErrStore
	}
	offset := len(upstreamTxnIntentDomain)
	req, e := ParseAuthorityRequest(raw[offset : offset+authorityRequestSize])
	if e != nil {
		return out, ErrStore
	}
	reservation, e := ParseFenceReservation(raw[offset+authorityRequestSize:])
	if e != nil {
		return out, ErrStore
	}
	out.Request, out.Reservation = req, reservation
	return out, nil
}

type upstreamFencedResult struct {
	Authority   AuthorityResponse
	Fence       FenceView
	Reservation FenceReservation
	Upstream    upstreamEffectReceipt
}

func verifyUpstreamFencedResult(r upstreamFencedResult, req AuthorityRequest, ctx Digest, authority, fence, upstream ed25519.PublicKey, genesis Digest) bool {
	base := FencedResponse{Authority: r.Authority, Fence: r.Fence, Reservation: r.Reservation}
	return VerifyFencedResponse(base, req, ctx, authority, fence, genesis) &&
		verifyUpstreamEffectReceipt(r.Upstream, r.Reservation, ctx, authority, upstream)
}

type upstreamTransactionCoordinator struct {
	authority *SharedAuthority
	fence     *FenceClient
	upstream  *upstreamEffectClient
	fault     func(string) error
}

func newUpstreamTransactionCoordinator(authority *SharedAuthority, fence *FenceClient, upstream *upstreamEffectClient) (*upstreamTransactionCoordinator, error) {
	if authority == nil || fence == nil || upstream == nil ||
		authority.ctx != fence.ctx || authority.ctx != upstream.ctx ||
		!bytes.Equal(authority.signer.Public().(ed25519.PublicKey), fence.authority) ||
		!bytes.Equal(authority.signer.Public().(ed25519.PublicKey), upstream.authority) ||
		bytes.Equal(upstream.upstream, authority.signer.Public().(ed25519.PublicKey)) ||
		bytes.Equal(upstream.upstream, fence.fence) {
		return nil, ErrPolicy
	}
	return &upstreamTransactionCoordinator{authority: authority, fence: fence, upstream: upstream}, nil
}

func (c *upstreamTransactionCoordinator) intentPath() string {
	return filepath.Join(c.authority.dir, upstreamTxnIntentName)
}

func (c *upstreamTransactionCoordinator) loadIntentLocked() (upstreamTxnIntent, bool, error) {
	path := c.intentPath()
	info, e := os.Lstat(path)
	if errors.Is(e, os.ErrNotExist) {
		return upstreamTxnIntent{}, false, nil
	}
	if e != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() != upstreamTxnIntentSize {
		return upstreamTxnIntent{}, false, ErrStore
	}
	file, e := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if e != nil {
		return upstreamTxnIntent{}, false, ErrStore
	}
	opened, e := file.Stat()
	if e != nil || !opened.Mode().IsRegular() || opened.Mode().Perm()&0077 != 0 ||
		opened.Size() != upstreamTxnIntentSize || !os.SameFile(info, opened) {
		file.Close()
		return upstreamTxnIntent{}, false, ErrStore
	}
	raw, e := io.ReadAll(io.LimitReader(file, upstreamTxnIntentSize+1))
	ce := file.Close()
	if e != nil || ce != nil || len(raw) != upstreamTxnIntentSize {
		return upstreamTxnIntent{}, false, ErrStore
	}
	intent, e := parseUpstreamTxnIntent(raw)
	if e != nil || c.authority.preflight(intent.Request) != nil || intent.Request.Op != AuthorityCommit ||
		!VerifyFenceReservation(intent.Reservation, c.authority.ctx, c.authority.signer.Public().(ed25519.PublicKey)) ||
		intent.Reservation.RequestHash != intent.Request.Hash() {
		return upstreamTxnIntent{}, false, ErrStore
	}
	return intent, true, nil
}

func (c *upstreamTransactionCoordinator) persistIntentLocked(intent upstreamTxnIntent) error {
	if _, exists, e := c.loadIntentLocked(); e != nil {
		return e
	} else if exists {
		return ErrStore
	}
	file, e := os.CreateTemp(c.authority.dir, ".upstream-intent-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := intent.Bytes()
	n, e := file.Write(raw)
	if e != nil {
		return e
	}
	if n != len(raw) {
		return io.ErrShortWrite
	}
	if e = file.Sync(); e != nil {
		return e
	}
	if e = file.Close(); e != nil {
		return e
	}
	if e = os.Rename(file.Name(), c.intentPath()); e != nil {
		return e
	}
	return syncDirectory(c.authority.dir)
}

func (c *upstreamTransactionCoordinator) clearIntentLocked() error {
	e := os.Remove(c.intentPath())
	if errors.Is(e, os.ErrNotExist) {
		return nil
	}
	if e != nil {
		return e
	}
	return syncDirectory(c.authority.dir)
}

func (c *upstreamTransactionCoordinator) abortClosedLocked(reservation FenceReservation, view FenceView) error {
	next, e := c.fence.Abort(reservation)
	if e != nil {
		if errors.Is(e, ErrFenceConflict) {
			return e
		}
		return ErrFenceUnavailable
	}
	if next.Head != reservation.Before || next.Pending != (Digest{}) ||
		next.Sequence != view.Sequence || next.Genesis != view.Genesis || next.LastReservation != view.LastReservation {
		return ErrWitnessRollback
	}
	return c.clearIntentLocked()
}

func (c *upstreamTransactionCoordinator) finalizeLocked(reservation FenceReservation) (FenceView, error) {
	next, e := c.fence.Finalize(reservation)
	if e != nil {
		return FenceView{}, ErrUnknown
	}
	if next.Head != reservation.After || next.Pending != (Digest{}) || next.LastReservation != reservation.Hash() {
		return FenceView{}, ErrWitnessRollback
	}
	return next, nil
}

func (c *upstreamTransactionCoordinator) planIntentLocked(intent upstreamTxnIntent) (authorityPlan, error) {
	a := c.authority
	plan, e := a.planLocked(intent.Request)
	if e != nil {
		return authorityPlan{}, e
	}
	if !plan.persist || plan.outcome != AuthorityCommitted || plan.before != intent.Reservation.Before ||
		plan.after != intent.Reservation.After || len(plan.nextRequests) != len(a.requests)+1 {
		return authorityPlan{}, ErrWitnessRollback
	}
	return plan, nil
}

func (c *upstreamTransactionCoordinator) appliedReceiptLocked(reservation FenceReservation) (upstreamEffectReceipt, error) {
	status, e := c.upstream.Status(reservation)
	if e != nil {
		if errors.Is(e, ErrUpstreamUnavailable) {
			return upstreamEffectReceipt{}, ErrUnknown
		}
		return upstreamEffectReceipt{}, e
	}
	if status.State != upstreamApplied {
		return upstreamEffectReceipt{}, ErrWitnessRollback
	}
	receipt, e := c.upstream.Apply(reservation)
	if e != nil {
		if errors.Is(e, ErrUpstreamUnavailable) {
			return upstreamEffectReceipt{}, ErrUnknown
		}
		return upstreamEffectReceipt{}, e
	}
	return receipt, nil
}

func (c *upstreamTransactionCoordinator) commitAppliedLocked(intent upstreamTxnIntent, receipt upstreamEffectReceipt) (upstreamFencedResult, error) {
	a := c.authority
	plan, e := c.planIntentLocked(intent)
	if e != nil {
		return upstreamFencedResult{}, e
	}
	response, e := a.applyPlanLocked(intent.Request, plan)
	if e != nil {
		return upstreamFencedResult{}, e
	}
	if c.fault != nil {
		if e = c.fault("txn-after-authority"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	finalized, e := c.finalizeLocked(intent.Reservation)
	if e != nil {
		return upstreamFencedResult{}, e
	}
	if c.fault != nil {
		if e = c.fault("txn-after-finalize"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	if e = c.clearIntentLocked(); e != nil {
		return upstreamFencedResult{}, ErrUnknown
	}
	if c.fault != nil {
		if e = c.fault("txn-after-clear"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	out := upstreamFencedResult{Authority: response, Fence: finalized, Reservation: intent.Reservation, Upstream: receipt}
	if !verifyUpstreamFencedResult(out, intent.Request, a.ctx, a.signer.Public().(ed25519.PublicKey), c.fence.fence, c.upstream.upstream, c.fence.genesis) {
		return upstreamFencedResult{}, ErrWitnessRollback
	}
	return out, nil
}

func (c *upstreamTransactionCoordinator) recoverLocked() error {
	a := c.authority
	if a.lock == nil || a.poisoned {
		return ErrStore
	}
	intent, exists, e := c.loadIntentLocked()
	if e != nil {
		return e
	}
	view, e := c.fence.View()
	if e != nil {
		return ErrFenceUnavailable
	}
	current := a.headLocked()
	if !exists {
		if view.Head != current {
			return ErrWitnessRollback
		}
		if view.Pending != (Digest{}) {
			return ErrFenceOrphaned
		}
		return nil
	}
	reservation := intent.Reservation
	hash := reservation.Hash()

	switch {
	case current == reservation.Before && view.Head == reservation.Before && view.Pending == (Digest{}):
		// No successful admission was observed, so dispatch must not begin.
		// Permanently close the exact identity before discarding its intent;
		// a delayed Apply can then only lose the APPLIED-vs-CLOSED race.
		if _, e = c.upstream.CloseUnapplied(reservation); e != nil {
			if errors.Is(e, ErrUpstreamUnavailable) {
				return ErrUnknown
			}
			return ErrWitnessRollback
		}
		return c.clearIntentLocked()

	case current == reservation.Before && view.Head == reservation.Before && view.Pending == hash:
		// Ambiguous dispatch: never treat status absence as permission to abort.
		// CloseUnapplied races the exact Apply in the upstream authority. If
		// CLOSED wins, the local fence can be released. If APPLIED already won,
		// complete the durable local acknowledgement and then finalize.
		if _, e = c.upstream.CloseUnapplied(reservation); e == nil {
			return c.abortClosedLocked(reservation, view)
		}
		if !errors.Is(e, ErrConflict) {
			if errors.Is(e, ErrUpstreamUnavailable) {
				return ErrUnknown
			}
			return e
		}
		receipt, e := c.appliedReceiptLocked(reservation)
		if e != nil {
			return e
		}
		_, e = c.commitAppliedLocked(intent, receipt)
		return e

	case current == reservation.After && view.Head == reservation.Before && view.Pending == hash:
		// The local acknowledgement exists. Upstream APPLIED must be observable
		// in the same authority history before the fence may advance.
		receipt, e := c.appliedReceiptLocked(reservation)
		if e != nil {
			return e
		}
		_ = receipt
		finalized, e := c.finalizeLocked(reservation)
		if e != nil {
			return e
		}
		if finalized.Head != current {
			return ErrWitnessRollback
		}
		return c.clearIntentLocked()

	case current == reservation.After && view.Head == reservation.After && view.Pending == (Digest{}):
		// Finalization may have succeeded while its reply was lost. Do not
		// create a missing effect here: require signed APPLIED status.
		status, e := c.upstream.Status(reservation)
		if e != nil {
			if errors.Is(e, ErrUpstreamUnavailable) {
				return ErrUnknown
			}
			return ErrWitnessRollback
		}
		if status.State != upstreamApplied {
			return ErrWitnessRollback
		}
		return c.clearIntentLocked()

	default:
		return ErrWitnessRollback
	}
}

func (c *upstreamTransactionCoordinator) Recover() error {
	a := c.authority
	a.mu.Lock()
	defer a.mu.Unlock()
	return c.recoverLocked()
}

func (c *upstreamTransactionCoordinator) Process(req AuthorityRequest) (upstreamFencedResult, error) {
	a := c.authority
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.lock == nil || a.poisoned {
		return upstreamFencedResult{}, ErrStore
	}
	if req.Op != AuthorityCommit {
		return upstreamFencedResult{}, ErrPolicy
	}
	if e := a.preflight(req); e != nil {
		return upstreamFencedResult{}, e
	}
	if e := c.recoverLocked(); e != nil {
		return upstreamFencedResult{}, e
	}
	plan, e := a.planLocked(req)
	if e != nil {
		return upstreamFencedResult{}, e
	}
	if !plan.persist || plan.outcome != AuthorityCommitted || len(plan.nextRequests) != len(a.requests)+1 {
		if plan.outcome == AuthorityBudget {
			return upstreamFencedResult{}, ErrContacts
		}
		return upstreamFencedResult{}, ErrConflict
	}
	token, e := randomFenceToken()
	if e != nil {
		return upstreamFencedResult{}, e
	}
	reservation, e := SignFenceReservation(a.ctx, plan.before, plan.after, req.Hash(), token, a.signer)
	if e != nil {
		return upstreamFencedResult{}, e
	}
	intent := upstreamTxnIntent{Request: req, Reservation: reservation}
	if e = c.persistIntentLocked(intent); e != nil {
		return upstreamFencedResult{}, e
	}
	if c.fault != nil {
		if e = c.fault("txn-after-intent"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	reserved, e := c.fence.Reserve(reservation)
	if e != nil {
		if errors.Is(e, ErrFenceConflict) || errors.Is(e, ErrFenceExhausted) {
			return upstreamFencedResult{}, e
		}
		return upstreamFencedResult{}, ErrFenceUnavailable
	}
	if reserved.Head != plan.before || reserved.Pending != reservation.Hash() {
		return upstreamFencedResult{}, ErrWitnessRollback
	}
	if c.fault != nil {
		if e = c.fault("txn-after-reserve"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	receipt, e := c.upstream.Apply(reservation)
	if e != nil {
		// Once admission exists, any failed/ambiguous dispatch remains unknown
		// until recovery wins APPLIED-vs-CLOSED for the exact identity.
		return upstreamFencedResult{}, ErrUnknown
	}
	if c.fault != nil {
		if e = c.fault("txn-after-upstream"); e != nil {
			return upstreamFencedResult{}, ErrUnknown
		}
	}
	return c.commitAppliedLocked(intent, receipt)
}
