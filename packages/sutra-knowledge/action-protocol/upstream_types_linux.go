//go:build linux

package actionprotocol

// Bounded signed wire types for the synthetic upstream idempotency laboratory.
// A signature proves only what this authority signed; it does not prove a real
// provider performed or permanently suppressed an external-world effect.
import (
	"crypto/ed25519"
	"encoding/binary"
	"errors"
)

const upstreamStoreDomain = "SUTRA/upstream-effect-store/v1\x00"
const upstreamReceiptDomain = "SUTRA/upstream-effect-receipt/v1\x00"
const upstreamStatusDomain = "SUTRA/upstream-effect-status/v1\x00"
const upstreamMaxRecords = 8
const upstreamApplied byte = 1
const upstreamClosed byte = 2
const upstreamRecordSize = 1 + fenceReservationSize
const upstreamReceiptBodySize = 32*5 + 4
const upstreamReceiptSize = upstreamReceiptBodySize + ed25519.SignatureSize
const upstreamStatusBodySize = 1 + 4 + 4 + 32*5
const upstreamStatusSize = upstreamStatusBodySize + ed25519.SignatureSize

var ErrUpstreamUnavailable = errors.New("upstream effect authority unavailable or ambiguous")
var ErrUpstreamExhausted = errors.New("upstream terminal identity ledger exhausted")

type upstreamEffectReceipt struct {
	ReservationHash Digest
	RequestHash     Digest
	Before          Digest
	After           Digest
	Token           Digest
	EffectSequence  uint32
	Signature       [ed25519.SignatureSize]byte
}

func (r upstreamEffectReceipt) body() []byte {
	b := append([]byte(nil), r.ReservationHash[:]...)
	b = append(b, r.RequestHash[:]...)
	b = append(b, r.Before[:]...)
	b = append(b, r.After[:]...)
	b = append(b, r.Token[:]...)
	return binary.BigEndian.AppendUint32(b, r.EffectSequence)
}
func (r upstreamEffectReceipt) message(ctx Digest, authority ed25519.PublicKey) []byte {
	b := append([]byte(upstreamReceiptDomain), ctx[:]...)
	b = append(b, authority...)
	return append(b, r.body()...)
}
func (r upstreamEffectReceipt) Bytes() []byte { return append(r.body(), r.Signature[:]...) }
func parseUpstreamEffectReceipt(raw []byte) (upstreamEffectReceipt, error) {
	var r upstreamEffectReceipt
	if len(raw) != upstreamReceiptSize {
		return r, ErrPolicy
	}
	copy(r.ReservationHash[:], raw[:32])
	copy(r.RequestHash[:], raw[32:64])
	copy(r.Before[:], raw[64:96])
	copy(r.After[:], raw[96:128])
	copy(r.Token[:], raw[128:160])
	r.EffectSequence = binary.BigEndian.Uint32(raw[160:164])
	copy(r.Signature[:], raw[164:])
	if r.ReservationHash == (Digest{}) || r.RequestHash == (Digest{}) || r.Before == (Digest{}) ||
		r.After == (Digest{}) || r.Before == r.After || r.Token == (Digest{}) ||
		r.EffectSequence == 0 || r.EffectSequence > upstreamMaxRecords {
		return upstreamEffectReceipt{}, ErrPolicy
	}
	return r, nil
}
func verifyUpstreamEffectReceipt(r upstreamEffectReceipt, reservation FenceReservation, ctx Digest, authority, upstream ed25519.PublicKey) bool {
	return ctx != (Digest{}) && len(authority) == ed25519.PublicKeySize && len(upstream) == ed25519.PublicKeySize &&
		VerifyFenceReservation(reservation, ctx, authority) &&
		r.ReservationHash == reservation.Hash() && r.RequestHash == reservation.RequestHash &&
		r.Before == reservation.Before && r.After == reservation.After && r.Token == reservation.Token &&
		r.EffectSequence > 0 && r.EffectSequence <= upstreamMaxRecords &&
		ed25519.Verify(upstream, r.message(ctx, authority), r.Signature[:])
}

type upstreamEffectStatus struct {
	State           byte
	EffectCount     uint32
	TerminalCount   uint32
	ReservationHash Digest
	RequestHash     Digest
	Before          Digest
	After           Digest
	Token           Digest
	Signature       [ed25519.SignatureSize]byte
}

func (s upstreamEffectStatus) body() []byte {
	b := []byte{s.State}
	b = binary.BigEndian.AppendUint32(b, s.EffectCount)
	b = binary.BigEndian.AppendUint32(b, s.TerminalCount)
	b = append(b, s.ReservationHash[:]...)
	b = append(b, s.RequestHash[:]...)
	b = append(b, s.Before[:]...)
	b = append(b, s.After[:]...)
	return append(b, s.Token[:]...)
}
func (s upstreamEffectStatus) message(ctx Digest, authority ed25519.PublicKey) []byte {
	b := append([]byte(upstreamStatusDomain), ctx[:]...)
	b = append(b, authority...)
	return append(b, s.body()...)
}
func (s upstreamEffectStatus) Bytes() []byte { return append(s.body(), s.Signature[:]...) }
func parseUpstreamEffectStatus(raw []byte) (upstreamEffectStatus, error) {
	var s upstreamEffectStatus
	if len(raw) != upstreamStatusSize {
		return s, ErrPolicy
	}
	s.State = raw[0]
	s.EffectCount = binary.BigEndian.Uint32(raw[1:5])
	s.TerminalCount = binary.BigEndian.Uint32(raw[5:9])
	copy(s.ReservationHash[:], raw[9:41])
	copy(s.RequestHash[:], raw[41:73])
	copy(s.Before[:], raw[73:105])
	copy(s.After[:], raw[105:137])
	copy(s.Token[:], raw[137:169])
	copy(s.Signature[:], raw[169:])
	if (s.State != upstreamApplied && s.State != upstreamClosed) || s.EffectCount > upstreamMaxRecords ||
		s.TerminalCount == 0 || s.TerminalCount > upstreamMaxRecords || s.EffectCount > s.TerminalCount ||
		s.ReservationHash == (Digest{}) || s.RequestHash == (Digest{}) || s.Before == (Digest{}) ||
		s.After == (Digest{}) || s.Before == s.After || s.Token == (Digest{}) {
		return upstreamEffectStatus{}, ErrPolicy
	}
	return s, nil
}
func verifyUpstreamEffectStatus(s upstreamEffectStatus, reservation FenceReservation, ctx Digest, authority, upstream ed25519.PublicKey) bool {
	return ctx != (Digest{}) && len(authority) == ed25519.PublicKeySize && len(upstream) == ed25519.PublicKeySize &&
		VerifyFenceReservation(reservation, ctx, authority) &&
		(s.State == upstreamApplied || s.State == upstreamClosed) && s.EffectCount <= s.TerminalCount &&
		s.TerminalCount > 0 && s.TerminalCount <= upstreamMaxRecords &&
		s.ReservationHash == reservation.Hash() && s.RequestHash == reservation.RequestHash &&
		s.Before == reservation.Before && s.After == reservation.After && s.Token == reservation.Token &&
		ed25519.Verify(upstream, s.message(ctx, authority), s.Signature[:])
}

type upstreamRecord struct {
	state       byte
	reservation FenceReservation
}
