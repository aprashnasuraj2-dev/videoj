//go:build linux

package actionprotocol

// upstreamWitnessCoordinator adds an independently keyed monotonic head to the
// synthetic APPLIED/CLOSED receiver. It detects rollback of the receiver store
// relative to the witness, but deliberately does not claim clone-safe physical
// exactly-once semantics: two cloned receivers can both perform an effect before
// either post-effect witness CAS is observed.
import (
	"bytes"
	"crypto/ed25519"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"syscall"
)

const upstreamWitnessIntentDomain = "SUTRA/upstream-witness-intent/v1\x00"
const upstreamWitnessIntentSignDomain = "SUTRA/upstream-witness-intent-sign/v1\x00"
const upstreamWitnessIntentName = "upstream-witness-intent.bin"
const upstreamWitnessIntentSize = len(upstreamWitnessIntentDomain) + 1 + fenceReservationSize + 32 + 32 + ed25519.SignatureSize

type upstreamWitnessIntent struct {
	State       byte
	Reservation FenceReservation
	Before      Digest
	After       Digest
	Signature   [ed25519.SignatureSize]byte
}

func (i upstreamWitnessIntent) body() []byte {
	b := append([]byte(upstreamWitnessIntentDomain), i.State)
	b = append(b, i.Reservation.Bytes()...)
	b = append(b, i.Before[:]...)
	return append(b, i.After[:]...)
}
func (i upstreamWitnessIntent) message(ctx Digest, actionAuthority ed25519.PublicKey) []byte {
	b := append([]byte(upstreamWitnessIntentSignDomain), ctx[:]...)
	b = append(b, actionAuthority...)
	return append(b, i.body()...)
}
func (i upstreamWitnessIntent) Bytes() []byte { return append(i.body(), i.Signature[:]...) }

func signUpstreamWitnessIntent(ctx Digest, actionAuthority ed25519.PublicKey, state byte, reservation FenceReservation, before, after Digest, upstream ed25519.PrivateKey) (upstreamWitnessIntent, error) {
	if ctx == (Digest{}) || len(actionAuthority) != ed25519.PublicKeySize || len(upstream) != ed25519.PrivateKeySize ||
		(state != upstreamApplied && state != upstreamClosed) || before == (Digest{}) || after == (Digest{}) || before == after ||
		!VerifyFenceReservation(reservation, ctx, actionAuthority) {
		return upstreamWitnessIntent{}, ErrPolicy
	}
	i := upstreamWitnessIntent{State: state, Reservation: reservation, Before: before, After: after}
	copy(i.Signature[:], ed25519.Sign(upstream, i.message(ctx, actionAuthority)))
	return i, nil
}

func parseUpstreamWitnessIntent(raw []byte, ctx Digest, actionAuthority, upstream ed25519.PublicKey) (upstreamWitnessIntent, error) {
	var i upstreamWitnessIntent
	if len(raw) != upstreamWitnessIntentSize || ctx == (Digest{}) || len(actionAuthority) != ed25519.PublicKeySize ||
		len(upstream) != ed25519.PublicKeySize || !bytes.Equal(raw[:len(upstreamWitnessIntentDomain)], []byte(upstreamWitnessIntentDomain)) {
		return i, ErrStore
	}
	offset := len(upstreamWitnessIntentDomain)
	i.State = raw[offset]
	offset++
	reservation, e := ParseFenceReservation(raw[offset : offset+fenceReservationSize])
	if e != nil || !VerifyFenceReservation(reservation, ctx, actionAuthority) {
		return upstreamWitnessIntent{}, ErrStore
	}
	i.Reservation = reservation
	offset += fenceReservationSize
	copy(i.Before[:], raw[offset:offset+32])
	offset += 32
	copy(i.After[:], raw[offset:offset+32])
	offset += 32
	copy(i.Signature[:], raw[offset:])
	if (i.State != upstreamApplied && i.State != upstreamClosed) || i.Before == (Digest{}) || i.After == (Digest{}) || i.Before == i.After ||
		!ed25519.Verify(upstream, i.message(ctx, actionAuthority), i.Signature[:]) {
		return upstreamWitnessIntent{}, ErrStore
	}
	return i, nil
}

type upstreamWitnessCoordinator struct {
	authority *upstreamEffectAuthority
	witness   *WitnessClient
	fault     func(string) error
}

func newUpstreamWitnessCoordinator(authority *upstreamEffectAuthority, witness *WitnessClient) (*upstreamWitnessCoordinator, error) {
	if authority == nil || witness == nil || authority.ctx != witness.ctx ||
		!bytes.Equal(authority.signer.Public().(ed25519.PublicKey), witness.authority) ||
		witness.genesis != authority.stateHeadFor(nil) ||
		bytes.Equal(witness.witness, authority.signer.Public().(ed25519.PublicKey)) ||
		bytes.Equal(witness.witness, authority.authority) {
		return nil, ErrPolicy
	}
	return &upstreamWitnessCoordinator{authority: authority, witness: witness}, nil
}

func (c *upstreamWitnessCoordinator) intentPath() string {
	return filepath.Join(c.authority.dir, upstreamWitnessIntentName)
}
func (c *upstreamWitnessCoordinator) loadIntentLocked() (upstreamWitnessIntent, bool, error) {
	path := c.intentPath()
	info, e := os.Lstat(path)
	if errors.Is(e, os.ErrNotExist) {
		return upstreamWitnessIntent{}, false, nil
	}
	if e != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() != int64(upstreamWitnessIntentSize) {
		return upstreamWitnessIntent{}, false, ErrStore
	}
	f, e := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if e != nil {
		return upstreamWitnessIntent{}, false, ErrStore
	}
	opened, e := f.Stat()
	if e != nil || !opened.Mode().IsRegular() || opened.Mode().Perm()&0077 != 0 || opened.Size() != int64(upstreamWitnessIntentSize) || !os.SameFile(info, opened) {
		f.Close()
		return upstreamWitnessIntent{}, false, ErrStore
	}
	raw, e := io.ReadAll(io.LimitReader(f, int64(upstreamWitnessIntentSize+1)))
	ce := f.Close()
	if e != nil || ce != nil || len(raw) != upstreamWitnessIntentSize {
		return upstreamWitnessIntent{}, false, ErrStore
	}
	i, e := parseUpstreamWitnessIntent(raw, c.authority.ctx, c.authority.authority, c.authority.signer.Public().(ed25519.PublicKey))
	if e != nil {
		return upstreamWitnessIntent{}, false, e
	}
	return i, true, nil
}
func (c *upstreamWitnessCoordinator) persistIntentLocked(i upstreamWitnessIntent) error {
	if _, exists, e := c.loadIntentLocked(); e != nil {
		return e
	} else if exists {
		return ErrStore
	}
	f, e := os.CreateTemp(c.authority.dir, ".upstream-witness-intent-")
	if e != nil {
		return e
	}
	defer os.Remove(f.Name())
	defer f.Close()
	raw := i.Bytes()
	n, e := f.Write(raw)
	if e != nil {
		return e
	}
	if n != len(raw) {
		return io.ErrShortWrite
	}
	if e = f.Sync(); e != nil {
		return e
	}
	if e = f.Close(); e != nil {
		return e
	}
	if e = os.Rename(f.Name(), c.intentPath()); e != nil {
		return e
	}
	return syncDirectory(c.authority.dir)
}
func (c *upstreamWitnessCoordinator) clearIntentLocked() error {
	e := os.Remove(c.intentPath())
	if errors.Is(e, os.ErrNotExist) {
		return nil
	}
	if e != nil {
		return e
	}
	return syncDirectory(c.authority.dir)
}

func (c *upstreamWitnessCoordinator) plannedAfterLocked(state byte, reservation FenceReservation) Digest {
	next := append(append([]upstreamRecord(nil), c.authority.records...), upstreamRecord{state: state, reservation: reservation})
	return c.authority.stateHeadFor(next)
}
func (c *upstreamWitnessCoordinator) intentMatchesCurrentAppendLocked(i upstreamWitnessIntent) bool {
	u := c.authority
	if len(u.records) == 0 {
		return false
	}
	last := u.records[len(u.records)-1]
	return last.state == i.State && sameReservation(last.reservation, i.Reservation) &&
		u.stateHeadFor(u.records[:len(u.records)-1]) == i.Before && u.stateHeadLocked() == i.After
}
func (c *upstreamWitnessCoordinator) advanceWitnessLocked(i upstreamWitnessIntent) error {
	u := c.authority
	t, e := SignWitnessTransition(u.ctx, i.Before, i.After, u.signer)
	if e != nil {
		return e
	}
	view, e := c.witness.Advance(t)
	if e != nil {
		return ErrUnknown
	}
	if view.Head != i.After || view.Sequence != uint32(len(u.records)) {
		return ErrWitnessRollback
	}
	return nil
}

func (c *upstreamWitnessCoordinator) recoverLocked() error {
	u := c.authority
	if u.lock == nil || u.poisoned {
		return ErrStore
	}
	i, exists, e := c.loadIntentLocked()
	if e != nil {
		return e
	}
	view, e := c.witness.View()
	if e != nil {
		return ErrWitnessUnavailable
	}
	current := u.stateHeadLocked()
	if !exists {
		if view.Head != current || view.Sequence != uint32(len(u.records)) {
			return ErrWitnessRollback
		}
		return nil
	}
	switch {
	case current == i.Before && view.Head == i.Before:
		if view.Sequence != uint32(len(u.records)) || c.plannedAfterLocked(i.State, i.Reservation) != i.After {
			return ErrWitnessRollback
		}
		return c.clearIntentLocked()
	case current == i.After && view.Head == i.Before:
		if view.Sequence+1 != uint32(len(u.records)) || !c.intentMatchesCurrentAppendLocked(i) {
			return ErrWitnessRollback
		}
		if e = c.advanceWitnessLocked(i); e != nil {
			return e
		}
		if c.fault != nil {
			if e = c.fault("upstream-witness-after-recover-advance"); e != nil {
				return ErrUnknown
			}
		}
		return c.clearIntentLocked()
	case current == i.After && view.Head == i.After:
		if view.Sequence != uint32(len(u.records)) || !c.intentMatchesCurrentAppendLocked(i) {
			return ErrWitnessRollback
		}
		return c.clearIntentLocked()
	default:
		return ErrWitnessRollback
	}
}

func (c *upstreamWitnessCoordinator) Recover() error {
	u := c.authority
	u.mu.Lock()
	defer u.mu.Unlock()
	return c.recoverLocked()
}

func (c *upstreamWitnessCoordinator) appendTerminalLocked(state byte, reservation FenceReservation) error {
	u := c.authority
	before := u.stateHeadLocked()
	after := c.plannedAfterLocked(state, reservation)
	i, e := signUpstreamWitnessIntent(u.ctx, u.authority, state, reservation, before, after, u.signer)
	if e != nil {
		return e
	}
	if e = c.persistIntentLocked(i); e != nil {
		return e
	}
	if c.fault != nil {
		if e = c.fault("upstream-witness-after-intent"); e != nil {
			return ErrUnknown
		}
	}
	next := append(append([]upstreamRecord(nil), u.records...), upstreamRecord{state: state, reservation: reservation})
	if e = u.persist(next); e != nil {
		u.poisoned = true
		return ErrUnknown
	}
	u.records = next
	if u.stateHeadLocked() != after {
		u.poisoned = true
		return ErrStore
	}
	if c.fault != nil {
		if e = c.fault("upstream-witness-after-store"); e != nil {
			return ErrUnknown
		}
	}
	if e = c.advanceWitnessLocked(i); e != nil {
		return e
	}
	if c.fault != nil {
		if e = c.fault("upstream-witness-after-witness"); e != nil {
			return ErrUnknown
		}
	}
	if e = c.clearIntentLocked(); e != nil {
		return ErrUnknown
	}
	return nil
}

func (c *upstreamWitnessCoordinator) Apply(reservation FenceReservation) (upstreamEffectReceipt, error) {
	u := c.authority
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return upstreamEffectReceipt{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return upstreamEffectReceipt{}, ErrStore
	}
	if e := c.recoverLocked(); e != nil {
		return upstreamEffectReceipt{}, e
	}
	if record, exists, e := u.findLocked(reservation); e != nil {
		return upstreamEffectReceipt{}, e
	} else if exists {
		if record.state == upstreamClosed {
			return upstreamEffectReceipt{}, ErrConflict
		}
		return u.receiptLocked(reservation), nil
	}
	if u.priorAppliedRequestLocked(reservation.RequestHash) {
		return upstreamEffectReceipt{}, ErrConflict
	}
	if len(u.records) >= upstreamMaxRecords {
		return upstreamEffectReceipt{}, ErrUpstreamExhausted
	}
	_, effects := u.countsLocked()
	if effects >= u.limit {
		return upstreamEffectReceipt{}, ErrBudget
	}
	if e := c.appendTerminalLocked(upstreamApplied, reservation); e != nil {
		return upstreamEffectReceipt{}, e
	}
	return u.receiptLocked(reservation), nil
}

func (c *upstreamWitnessCoordinator) CloseUnapplied(reservation FenceReservation) (EffectClosureProof, error) {
	u := c.authority
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return EffectClosureProof{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return EffectClosureProof{}, ErrStore
	}
	if e := c.recoverLocked(); e != nil {
		return EffectClosureProof{}, e
	}
	if record, exists, e := u.findLocked(reservation); e != nil {
		return EffectClosureProof{}, e
	} else if exists {
		if record.state == upstreamApplied {
			return EffectClosureProof{}, ErrConflict
		}
		return SignEffectClosureProof(u.ctx, u.authority, reservation, u.signer)
	}
	if u.priorAppliedRequestLocked(reservation.RequestHash) {
		return EffectClosureProof{}, ErrConflict
	}
	if len(u.records) >= upstreamMaxRecords {
		return EffectClosureProof{}, ErrUpstreamExhausted
	}
	if e := c.appendTerminalLocked(upstreamClosed, reservation); e != nil {
		return EffectClosureProof{}, e
	}
	return SignEffectClosureProof(u.ctx, u.authority, reservation, u.signer)
}

func (c *upstreamWitnessCoordinator) Status(reservation FenceReservation) (upstreamEffectStatus, error) {
	u := c.authority
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return upstreamEffectStatus{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return upstreamEffectStatus{}, ErrStore
	}
	if e := c.recoverLocked(); e != nil {
		return upstreamEffectStatus{}, e
	}
	record, exists, e := u.findLocked(reservation)
	if e != nil {
		return upstreamEffectStatus{}, e
	}
	if !exists {
		return upstreamEffectStatus{}, ErrAbsent
	}
	return u.statusLocked(record), nil
}

func (c *upstreamWitnessCoordinator) Counts() (terminal, effects uint32, e error) {
	u := c.authority
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return 0, 0, ErrStore
	}
	if e = c.recoverLocked(); e != nil {
		return 0, 0, e
	}
	terminal, effects = u.countsLocked()
	return terminal, effects, nil
}

func (c *upstreamWitnessCoordinator) serveHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodPost || r.URL.RawQuery != "" || r.Header.Get("Content-Type") != media || r.Header.Get("Accept") != media ||
		(r.URL.Path != "/upstream/apply" && r.URL.Path != "/upstream/close" && r.URL.Path != "/upstream/status") {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(r.Body, fenceReservationSize+1))
	if e != nil || len(raw) != fenceReservationSize {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	reservation, e := ParseFenceReservation(raw)
	if e != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	var response []byte
	switch r.URL.Path {
	case "/upstream/apply":
		var receipt upstreamEffectReceipt
		receipt, e = c.Apply(reservation)
		if e == nil {
			response = receipt.Bytes()
		}
	case "/upstream/close":
		var proof EffectClosureProof
		proof, e = c.CloseUnapplied(reservation)
		if e == nil {
			response = proof.Bytes()
		}
	case "/upstream/status":
		var status upstreamEffectStatus
		status, e = c.Status(reservation)
		if e == nil {
			response = status.Bytes()
		}
	}
	if e != nil {
		switch {
		case errors.Is(e, ErrAbsent):
			w.WriteHeader(http.StatusNotFound)
		case errors.Is(e, ErrPolicy):
			w.WriteHeader(http.StatusForbidden)
		case errors.Is(e, ErrConflict):
			w.WriteHeader(http.StatusConflict)
		case errors.Is(e, ErrBudget), errors.Is(e, ErrUpstreamExhausted):
			w.WriteHeader(http.StatusTooManyRequests)
		default:
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		return
	}
	w.Header().Set("Content-Type", media)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(response)
}
