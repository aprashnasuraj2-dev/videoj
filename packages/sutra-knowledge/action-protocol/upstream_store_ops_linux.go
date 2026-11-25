//go:build linux

package actionprotocol

import "crypto/ed25519"

func (u *upstreamEffectAuthority) findLocked(reservation FenceReservation) (upstreamRecord, bool, error) {
	for _, record := range u.records {
		sameBytes := sameReservation(record.reservation, reservation)
		if sameBytes {
			return record, true, nil
		}
		if record.reservation.Token == reservation.Token || record.reservation.Hash() == reservation.Hash() {
			return upstreamRecord{}, false, ErrConflict
		}
	}
	return upstreamRecord{}, false, nil
}
func (u *upstreamEffectAuthority) priorAppliedRequestLocked(requestHash Digest) bool {
	for _, record := range u.records {
		if record.state == upstreamApplied && record.reservation.RequestHash == requestHash {
			return true
		}
	}
	return false
}
func (u *upstreamEffectAuthority) receiptLocked(reservation FenceReservation) upstreamEffectReceipt {
	sequence := uint32(0)
	for _, record := range u.records {
		if record.state == upstreamApplied {
			sequence++
		}
		if sameReservation(record.reservation, reservation) {
			break
		}
	}
	r := upstreamEffectReceipt{
		ReservationHash: reservation.Hash(), RequestHash: reservation.RequestHash,
		Before: reservation.Before, After: reservation.After, Token: reservation.Token, EffectSequence: sequence,
	}
	copy(r.Signature[:], ed25519.Sign(u.signer, r.message(u.ctx, u.authority)))
	return r
}
func (u *upstreamEffectAuthority) statusLocked(record upstreamRecord) upstreamEffectStatus {
	terminal, effects := u.countsLocked()
	r := record.reservation
	s := upstreamEffectStatus{
		State: record.state, EffectCount: effects, TerminalCount: terminal,
		ReservationHash: r.Hash(), RequestHash: r.RequestHash, Before: r.Before, After: r.After, Token: r.Token,
	}
	copy(s.Signature[:], ed25519.Sign(u.signer, s.message(u.ctx, u.authority)))
	return s
}
func (u *upstreamEffectAuthority) Apply(reservation FenceReservation) (upstreamEffectReceipt, error) {
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return upstreamEffectReceipt{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return upstreamEffectReceipt{}, ErrStore
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
	next := append(append([]upstreamRecord(nil), u.records...), upstreamRecord{state: upstreamApplied, reservation: reservation})
	if e := u.persist(next); e != nil {
		u.poisoned = true
		return upstreamEffectReceipt{}, ErrUnknown
	}
	u.records = next
	return u.receiptLocked(reservation), nil
}
func (u *upstreamEffectAuthority) CloseUnapplied(reservation FenceReservation) (EffectClosureProof, error) {
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return EffectClosureProof{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return EffectClosureProof{}, ErrStore
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
	next := append(append([]upstreamRecord(nil), u.records...), upstreamRecord{state: upstreamClosed, reservation: reservation})
	if e := u.persist(next); e != nil {
		u.poisoned = true
		return EffectClosureProof{}, ErrUnknown
	}
	u.records = next
	return SignEffectClosureProof(u.ctx, u.authority, reservation, u.signer)
}
func (u *upstreamEffectAuthority) Status(reservation FenceReservation) (upstreamEffectStatus, error) {
	if !VerifyFenceReservation(reservation, u.ctx, u.authority) {
		return upstreamEffectStatus{}, ErrPolicy
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return upstreamEffectStatus{}, ErrStore
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
func (u *upstreamEffectAuthority) Counts() (terminal, effects uint32, e error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return 0, 0, ErrStore
	}
	terminal, effects = u.countsLocked()
	return terminal, effects, nil
}
func (u *upstreamEffectAuthority) Close() error {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil {
		return nil
	}
	e := u.lock.Close()
	u.lock = nil
	return e
}
