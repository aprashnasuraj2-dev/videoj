//go:build linux

package actionprotocol

// upstreamEffectAuthority owns a synthetic effect and its terminal APPLIED/CLOSED
// idempotency state in one signed durable snapshot. This is a receiver-contract
// laboratory, not an externally enabled generic write service.
import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"
	"syscall"
)

type upstreamEffectAuthority struct {
	mu        sync.Mutex
	dir       string
	lock      *os.File
	ctx       Digest
	authority ed25519.PublicKey
	signer    ed25519.PrivateKey
	limit     uint32
	records   []upstreamRecord
	poisoned  bool
	fault     func(string) error
}

func createUpstreamEffectAuthority(dir string, ctx Digest, authority ed25519.PublicKey, signer ed25519.PrivateKey, limit uint32) (*upstreamEffectAuthority, error) {
	return openUpstreamEffectAuthority(dir, ctx, authority, signer, limit, true)
}
func openUpstreamEffectAuthorityStore(dir string, ctx Digest, authority ed25519.PublicKey, signer ed25519.PrivateKey, limit uint32) (*upstreamEffectAuthority, error) {
	return openUpstreamEffectAuthority(dir, ctx, authority, signer, limit, false)
}
func openUpstreamEffectAuthority(dir string, ctx Digest, authority ed25519.PublicKey, signer ed25519.PrivateKey, limit uint32, create bool) (*upstreamEffectAuthority, error) {
	if ctx == (Digest{}) || len(authority) != ed25519.PublicKeySize || len(signer) != ed25519.PrivateKeySize ||
		limit == 0 || limit > upstreamMaxRecords || bytes.Equal(authority, signer.Public().(ed25519.PublicKey)) ||
		!bytes.Equal(ed25519.NewKeyFromSeed(signer[:ed25519.SeedSize]), signer) {
		return nil, ErrPolicy
	}
	dir, e := filepath.Abs(dir)
	if e != nil {
		return nil, e
	}
	info, e := os.Stat(dir)
	if e != nil || !info.IsDir() || info.Mode().Perm()&0077 != 0 {
		return nil, ErrStore
	}
	lock, e := os.OpenFile(filepath.Join(dir, "upstream.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if e != nil {
		return nil, e
	}
	if e = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); e != nil {
		lock.Close()
		if errors.Is(e, syscall.EWOULDBLOCK) {
			return nil, ErrStoreBusy
		}
		return nil, e
	}
	u := &upstreamEffectAuthority{
		dir: dir, lock: lock, ctx: ctx,
		authority: append(ed25519.PublicKey(nil), authority...),
		signer:    append(ed25519.PrivateKey(nil), signer...), limit: limit,
	}
	ok := false
	defer func() {
		if !ok {
			_ = u.Close()
		}
	}()
	path := filepath.Join(dir, "upstream.bin")
	if create {
		if _, e = os.Lstat(path); !errors.Is(e, os.ErrNotExist) {
			return nil, ErrStore
		}
		if e = u.persist(nil); e != nil {
			return nil, e
		}
	} else {
		file, e := os.Open(path)
		if e != nil {
			return nil, e
		}
		raw, readErr := io.ReadAll(io.LimitReader(file, int64(u.maxSize()+1)))
		closeErr := file.Close()
		if readErr != nil || closeErr != nil {
			return nil, ErrStore
		}
		records, e := u.decode(raw)
		if e != nil {
			return nil, e
		}
		u.records = records
		if e = syncDirectory(dir); e != nil {
			return nil, e
		}
	}
	ok = true
	return u, nil
}
func (u *upstreamEffectAuthority) header(n int) []byte {
	b := append([]byte(upstreamStoreDomain), u.ctx[:]...)
	b = append(b, u.authority...)
	b = append(b, u.signer.Public().(ed25519.PublicKey)...)
	b = append(b, byte(u.limit), byte(n))
	return b
}
func (u *upstreamEffectAuthority) maxSize() int {
	return len(u.header(upstreamMaxRecords)) + upstreamMaxRecords*upstreamRecordSize + ed25519.SignatureSize
}
func (u *upstreamEffectAuthority) encode(records []upstreamRecord) []byte {
	body := u.header(len(records))
	for _, record := range records {
		body = append(body, record.state)
		body = append(body, record.reservation.Bytes()...)
	}
	return append(body, ed25519.Sign(u.signer, body)...)
}
func (u *upstreamEffectAuthority) stateHeadFor(records []upstreamRecord) Digest {
	return sha256.Sum256(u.encode(records))
}
func (u *upstreamEffectAuthority) stateHeadLocked() Digest { return u.stateHeadFor(u.records) }
func (u *upstreamEffectAuthority) StateHead() (Digest, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.lock == nil || u.poisoned {
		return Digest{}, ErrStore
	}
	return u.stateHeadLocked(), nil
}
func (u *upstreamEffectAuthority) decode(raw []byte) ([]upstreamRecord, error) {
	headerSize := len(u.header(0))
	if len(raw) < headerSize+ed25519.SignatureSize || len(raw) > u.maxSize() {
		return nil, ErrStore
	}
	body := raw[:len(raw)-ed25519.SignatureSize]
	if !ed25519.Verify(u.signer.Public().(ed25519.PublicKey), body, raw[len(body):]) {
		return nil, ErrStore
	}
	n := int(body[headerSize-1])
	if n > upstreamMaxRecords || len(body) != headerSize+n*upstreamRecordSize || !bytes.Equal(body[:headerSize], u.header(n)) {
		return nil, ErrStore
	}
	seenReservation := map[Digest]bool{}
	seenToken := map[Digest]bool{}
	appliedRequest := map[Digest]bool{}
	applied := uint32(0)
	records := make([]upstreamRecord, 0, n)
	for i := 0; i < n; i++ {
		offset := headerSize + i*upstreamRecordSize
		state := body[offset]
		reservation, e := ParseFenceReservation(body[offset+1 : offset+upstreamRecordSize])
		if e != nil || !VerifyFenceReservation(reservation, u.ctx, u.authority) ||
			(state != upstreamApplied && state != upstreamClosed) || seenReservation[reservation.Hash()] || seenToken[reservation.Token] ||
			appliedRequest[reservation.RequestHash] {
			return nil, ErrStore
		}
		seenReservation[reservation.Hash()] = true
		seenToken[reservation.Token] = true
		if state == upstreamApplied {
			appliedRequest[reservation.RequestHash] = true
			applied++
			if applied > u.limit {
				return nil, ErrStore
			}
		}
		records = append(records, upstreamRecord{state: state, reservation: reservation})
	}
	return records, nil
}
func (u *upstreamEffectAuthority) persist(records []upstreamRecord) error {
	file, e := os.CreateTemp(u.dir, ".upstream-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := u.encode(records)
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
	if u.fault != nil {
		if e = u.fault("before-rename"); e != nil {
			return e
		}
	}
	if e = os.Rename(file.Name(), filepath.Join(u.dir, "upstream.bin")); e != nil {
		return e
	}
	if u.fault != nil {
		if e = u.fault("after-rename"); e != nil {
			return e
		}
	}
	return syncDirectory(u.dir)
}
func (u *upstreamEffectAuthority) countsLocked() (terminal, effects uint32) {
	terminal = uint32(len(u.records))
	for _, record := range u.records {
		if record.state == upstreamApplied {
			effects++
		}
	}
	return terminal, effects
}
