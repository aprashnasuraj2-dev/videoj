//go:build linux

package actionprotocol

// GrantPolicyWitness is an independently keyed monotonic witness for the exact
// signed GrantBook state. Its purpose is narrower than AdmissionFence: it makes
// an older valid GrantBook fail closed at dispatch when the independent policy
// witness has advanced. Static views are not dispatch authority; coordinator
// checks use a fresh challenge-bound attestation to reject replay of an older
// mutually valid book/view pair on the live witness. Coordinated rollback of
// both policy domains remains a retained counterexample.
import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

const grantPolicyStoreDomain = "SUTRA/grant-policy-witness/v1\x00"
const grantPolicyTransitionDomain = "SUTRA/grant-policy-transition/v1\x00"
const grantPolicyViewDomain = "SUTRA/grant-policy-view/v1\x00"
const grantPolicyAttestationDomain = "SUTRA/grant-policy-attestation/v1\x00"
const grantPolicyMembershipDomain = "SUTRA/grant-policy-membership/v1\x00"
const grantPolicyIntentDomain = "SUTRA/grant-policy-intent/v1\x00"
const grantPolicyIntentName = "grant-policy-intent.bin"
const grantPolicyMaxTransitions = 32
const grantPolicyTransitionSize = 32 + 32 + ed25519.SignatureSize
const grantPolicyViewSize = 4 + 32 + 32 + ed25519.SignatureSize
const grantPolicyAttestationSize = 32 + grantPolicyViewSize + ed25519.SignatureSize
const grantPolicyMembershipRequestSize = 32 + 4 + 32
const grantPolicyMembershipSize = 32 + 4 + 32 + grantPolicyViewSize + ed25519.SignatureSize
const grantPolicyIntentSize = 32 + 32 + ed25519.SignatureSize

var ErrGrantPolicyRollback = errors.New("grant policy head does not match independent witness")
var ErrGrantPolicyUnavailable = errors.New("grant policy witness unavailable or ambiguous")
var ErrGrantPolicyConflict = errors.New("grant policy witness head changed")

func (b *GrantBook) policyHeadFor(epoch uint64, revoked, admitted []GrantID) Digest {
	return sha256.Sum256(b.encode(epoch, revoked, admitted))
}
func (b *GrantBook) policyHeadLocked() Digest {
	return b.policyHeadFor(b.epoch, b.revoked, b.admitted)
}
func (b *GrantBook) PolicyHead() (Digest, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.lock == nil || b.poisoned {
		return Digest{}, ErrStore
	}
	return b.policyHeadLocked(), nil
}

type GrantPolicyTransition struct {
	Before    Digest
	After     Digest
	Signature [ed25519.SignatureSize]byte
}
func (t GrantPolicyTransition) message(ctx Digest) []byte {
	b := append([]byte(grantPolicyTransitionDomain), ctx[:]...)
	b = append(b, t.Before[:]...)
	return append(b, t.After[:]...)
}
func (t GrantPolicyTransition) Bytes() []byte {
	b := append([]byte(nil), t.Before[:]...)
	b = append(b, t.After[:]...)
	return append(b, t.Signature[:]...)
}
func ParseGrantPolicyTransition(raw []byte) (GrantPolicyTransition, error) {
	var t GrantPolicyTransition
	if len(raw) != grantPolicyTransitionSize {
		return t, ErrPolicy
	}
	copy(t.Before[:], raw[:32])
	copy(t.After[:], raw[32:64])
	copy(t.Signature[:], raw[64:])
	if t.Before == (Digest{}) || t.After == (Digest{}) || t.Before == t.After {
		return GrantPolicyTransition{}, ErrPolicy
	}
	return t, nil
}
func SignGrantPolicyTransition(ctx, before, after Digest, bookKey ed25519.PrivateKey) (GrantPolicyTransition, error) {
	if ctx == (Digest{}) || before == (Digest{}) || after == (Digest{}) || before == after || len(bookKey) != ed25519.PrivateKeySize {
		return GrantPolicyTransition{}, ErrPolicy
	}
	t := GrantPolicyTransition{Before: before, After: after}
	copy(t.Signature[:], ed25519.Sign(bookKey, t.message(ctx)))
	return t, nil
}
func VerifyGrantPolicyTransition(t GrantPolicyTransition, ctx Digest, bookSigner ed25519.PublicKey) bool {
	return ctx != (Digest{}) && len(bookSigner) == ed25519.PublicKeySize && t.Before != (Digest{}) && t.After != (Digest{}) && t.Before != t.After && ed25519.Verify(bookSigner, t.message(ctx), t.Signature[:])
}

type GrantPolicyView struct {
	Sequence  uint32
	Genesis   Digest
	Head      Digest
	Signature [ed25519.SignatureSize]byte
}
func (v GrantPolicyView) body() []byte {
	b := binary.BigEndian.AppendUint32(nil, v.Sequence)
	b = append(b, v.Genesis[:]...)
	return append(b, v.Head[:]...)
}
func (v GrantPolicyView) message(ctx Digest, bookSigner ed25519.PublicKey) []byte {
	b := append([]byte(grantPolicyViewDomain), ctx[:]...)
	b = append(b, bookSigner...)
	return append(b, v.body()...)
}
func (v GrantPolicyView) Bytes() []byte { return append(v.body(), v.Signature[:]...) }
func ParseGrantPolicyView(raw []byte) (GrantPolicyView, error) {
	var v GrantPolicyView
	if len(raw) != grantPolicyViewSize {
		return v, ErrPolicy
	}
	v.Sequence = binary.BigEndian.Uint32(raw[:4])
	copy(v.Genesis[:], raw[4:36])
	copy(v.Head[:], raw[36:68])
	copy(v.Signature[:], raw[68:])
	return v, nil
}
func VerifyGrantPolicyView(v GrantPolicyView, ctx Digest, bookSigner, witness ed25519.PublicKey) bool {
	return ctx != (Digest{}) && len(bookSigner) == ed25519.PublicKeySize && len(witness) == ed25519.PublicKeySize &&
		v.Genesis != (Digest{}) && v.Head != (Digest{}) && v.Sequence <= grantPolicyMaxTransitions &&
		((v.Sequence == 0) == (v.Head == v.Genesis)) &&
		ed25519.Verify(witness, v.message(ctx, bookSigner), v.Signature[:])
}
func VerifyGrantPolicyViewPinned(v GrantPolicyView, ctx Digest, bookSigner, witness ed25519.PublicKey, genesis Digest) bool {
	return genesis != (Digest{}) && v.Genesis == genesis && VerifyGrantPolicyView(v, ctx, bookSigner, witness)
}

type GrantPolicyAttestation struct {
	Challenge Digest
	View      GrantPolicyView
	Signature [ed25519.SignatureSize]byte
}
func (a GrantPolicyAttestation) message(ctx Digest, bookSigner ed25519.PublicKey) []byte {
	b := append([]byte(grantPolicyAttestationDomain), ctx[:]...)
	b = append(b, bookSigner...)
	b = append(b, a.Challenge[:]...)
	return append(b, a.View.Bytes()...)
}
func (a GrantPolicyAttestation) Bytes() []byte {
	b := append([]byte(nil), a.Challenge[:]...)
	b = append(b, a.View.Bytes()...)
	return append(b, a.Signature[:]...)
}
func ParseGrantPolicyAttestation(raw []byte) (GrantPolicyAttestation, error) {
	var a GrantPolicyAttestation
	if len(raw) != grantPolicyAttestationSize {
		return a, ErrPolicy
	}
	copy(a.Challenge[:], raw[:32])
	v, e := ParseGrantPolicyView(raw[32 : 32+grantPolicyViewSize])
	if e != nil {
		return a, e
	}
	a.View = v
	copy(a.Signature[:], raw[32+grantPolicyViewSize:])
	return a, nil
}
func VerifyGrantPolicyAttestation(a GrantPolicyAttestation, expected, ctx Digest, bookSigner, witness ed25519.PublicKey, genesis Digest) bool {
	return expected != (Digest{}) && a.Challenge == expected && VerifyGrantPolicyViewPinned(a.View, ctx, bookSigner, witness, genesis) &&
		ed25519.Verify(witness, a.message(ctx, bookSigner), a.Signature[:])
}


type GrantPolicyMembershipAttestation struct {
	Challenge        Digest
	RequestedSequence uint32
	RequestedHead    Digest
	View             GrantPolicyView
	Signature        [ed25519.SignatureSize]byte
}
func (a GrantPolicyMembershipAttestation) message(ctx Digest, bookSigner ed25519.PublicKey) []byte {
	b := append([]byte(grantPolicyMembershipDomain), ctx[:]...)
	b = append(b, bookSigner...)
	b = append(b, a.Challenge[:]...)
	b = binary.BigEndian.AppendUint32(b, a.RequestedSequence)
	b = append(b, a.RequestedHead[:]...)
	return append(b, a.View.Bytes()...)
}
func (a GrantPolicyMembershipAttestation) Bytes() []byte {
	b := append([]byte(nil), a.Challenge[:]...)
	b = binary.BigEndian.AppendUint32(b, a.RequestedSequence)
	b = append(b, a.RequestedHead[:]...)
	b = append(b, a.View.Bytes()...)
	return append(b, a.Signature[:]...)
}
func ParseGrantPolicyMembershipAttestation(raw []byte) (GrantPolicyMembershipAttestation, error) {
	var a GrantPolicyMembershipAttestation
	if len(raw) != grantPolicyMembershipSize {
		return a, ErrPolicy
	}
	copy(a.Challenge[:], raw[:32])
	a.RequestedSequence = binary.BigEndian.Uint32(raw[32:36])
	copy(a.RequestedHead[:], raw[36:68])
	v, e := ParseGrantPolicyView(raw[68 : 68+grantPolicyViewSize])
	if e != nil {
		return a, e
	}
	a.View = v
	copy(a.Signature[:], raw[68+grantPolicyViewSize:])
	if a.Challenge == (Digest{}) || a.RequestedHead == (Digest{}) || a.RequestedSequence > grantPolicyMaxTransitions {
		return GrantPolicyMembershipAttestation{}, ErrPolicy
	}
	return a, nil
}
func VerifyGrantPolicyMembershipAttestation(a GrantPolicyMembershipAttestation, expected Digest, requestedSequence uint32, requestedHead, ctx Digest, bookSigner, witness ed25519.PublicKey, genesis Digest) bool {
	return expected != (Digest{}) && a.Challenge == expected &&
		a.RequestedSequence == requestedSequence && a.RequestedHead == requestedHead &&
		requestedHead != (Digest{}) && requestedSequence <= a.View.Sequence &&
		VerifyGrantPolicyViewPinned(a.View, ctx, bookSigner, witness, genesis) &&
		ed25519.Verify(witness, a.message(ctx, bookSigner), a.Signature[:])
}

type GrantPolicyWitness struct {
	mu         sync.Mutex
	dir        string
	lock       *os.File
	ctx        Digest
	bookSigner ed25519.PublicKey
	signer     ed25519.PrivateKey
	genesis    Digest
	transitions []GrantPolicyTransition
	poisoned   bool
	fault      func(string) error
}
func CreateGrantPolicyWitness(dir string, ctx Digest, bookSigner ed25519.PublicKey, witness ed25519.PrivateKey, genesis Digest) (*GrantPolicyWitness, error) {
	return openGrantPolicyWitness(dir, ctx, bookSigner, witness, genesis, true)
}
func OpenGrantPolicyWitness(dir string, ctx Digest, bookSigner ed25519.PublicKey, witness ed25519.PrivateKey, genesis Digest) (*GrantPolicyWitness, error) {
	return openGrantPolicyWitness(dir, ctx, bookSigner, witness, genesis, false)
}
func openGrantPolicyWitness(dir string, ctx Digest, bookSigner ed25519.PublicKey, witness ed25519.PrivateKey, genesis Digest, create bool) (*GrantPolicyWitness, error) {
	if ctx == (Digest{}) || genesis == (Digest{}) || len(bookSigner) != ed25519.PublicKeySize || len(witness) != ed25519.PrivateKeySize ||
		!bytes.Equal(ed25519.NewKeyFromSeed(witness[:ed25519.SeedSize]), witness) {
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
	lock, e := os.OpenFile(filepath.Join(dir, "grant-policy.lock"), os.O_CREATE|os.O_RDWR, 0600)
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
	w := &GrantPolicyWitness{dir: dir, lock: lock, ctx: ctx, bookSigner: append(ed25519.PublicKey(nil), bookSigner...), signer: append(ed25519.PrivateKey(nil), witness...), genesis: genesis}
	ok := false
	defer func() {
		if !ok {
			w.Close()
		}
	}()
	path := filepath.Join(dir, "grant-policy.bin")
	if create {
		if _, e = os.Lstat(path); !errors.Is(e, os.ErrNotExist) {
			return nil, ErrStore
		}
		if e = w.persist(nil); e != nil {
			return nil, e
		}
	} else {
		file, e := os.Open(path)
		if e != nil {
			return nil, e
		}
		raw, e := io.ReadAll(io.LimitReader(file, int64(w.maxSize()+1)))
		ce := file.Close()
		if e != nil || ce != nil {
			return nil, ErrStore
		}
		ts, e := w.decode(raw)
		if e != nil {
			return nil, e
		}
		w.transitions = ts
		if e = syncDirectory(dir); e != nil {
			return nil, e
		}
	}
	ok = true
	return w, nil
}
func (w *GrantPolicyWitness) header(n int) []byte {
	b := append([]byte(grantPolicyStoreDomain), w.ctx[:]...)
	b = append(b, w.bookSigner...)
	b = append(b, w.signer.Public().(ed25519.PublicKey)...)
	b = append(b, w.genesis[:]...)
	return append(b, byte(n))
}
func (w *GrantPolicyWitness) maxSize() int {
	return len(w.header(grantPolicyMaxTransitions)) + grantPolicyMaxTransitions*grantPolicyTransitionSize + ed25519.SignatureSize
}
func (w *GrantPolicyWitness) encode(ts []GrantPolicyTransition) []byte {
	body := w.header(len(ts))
	for _, t := range ts {
		body = append(body, t.Bytes()...)
	}
	return append(body, ed25519.Sign(w.signer, body)...)
}
func (w *GrantPolicyWitness) decode(raw []byte) ([]GrantPolicyTransition, error) {
	header := len(w.header(0))
	if len(raw) < header+ed25519.SignatureSize || len(raw) > w.maxSize() {
		return nil, ErrStore
	}
	body := raw[:len(raw)-ed25519.SignatureSize]
	if !ed25519.Verify(w.signer.Public().(ed25519.PublicKey), body, raw[len(body):]) {
		return nil, ErrStore
	}
	n := int(body[header-1])
	if n > grantPolicyMaxTransitions || len(body) != header+n*grantPolicyTransitionSize || !bytes.Equal(body[:header], w.header(n)) {
		return nil, ErrStore
	}
	current := w.genesis
	seen := map[Digest]bool{w.genesis: true}
	out := make([]GrantPolicyTransition, 0, n)
	for i := 0; i < n; i++ {
		start := header + i*grantPolicyTransitionSize
		t, e := ParseGrantPolicyTransition(body[start : start+grantPolicyTransitionSize])
		if e != nil || !VerifyGrantPolicyTransition(t, w.ctx, w.bookSigner) || t.Before != current || seen[t.After] {
			return nil, ErrStore
		}
		out = append(out, t)
		seen[t.After], current = true, t.After
	}
	return out, nil
}
func (w *GrantPolicyWitness) persist(ts []GrantPolicyTransition) error {
	file, e := os.CreateTemp(w.dir, ".grant-policy-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := w.encode(ts)
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
	if w.fault != nil {
		if e = w.fault("before-rename"); e != nil {
			return e
		}
	}
	if e = os.Rename(file.Name(), filepath.Join(w.dir, "grant-policy.bin")); e != nil {
		return e
	}
	if w.fault != nil {
		if e = w.fault("after-rename"); e != nil {
			return e
		}
	}
	return syncDirectory(w.dir)
}
func (w *GrantPolicyWitness) headLocked() Digest {
	if len(w.transitions) == 0 {
		return w.genesis
	}
	return w.transitions[len(w.transitions)-1].After
}
func (w *GrantPolicyWitness) viewLocked() (GrantPolicyView, error) {
	if w.lock == nil || w.poisoned {
		return GrantPolicyView{}, ErrStore
	}
	v := GrantPolicyView{Sequence: uint32(len(w.transitions)), Genesis: w.genesis, Head: w.headLocked()}
	copy(v.Signature[:], ed25519.Sign(w.signer, v.message(w.ctx, w.bookSigner)))
	return v, nil
}
func (w *GrantPolicyWitness) View() (GrantPolicyView, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.viewLocked()
}
func (w *GrantPolicyWitness) Attest(challenge Digest) (GrantPolicyAttestation, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if challenge == (Digest{}) {
		return GrantPolicyAttestation{}, ErrPolicy
	}
	view, e := w.viewLocked()
	if e != nil {
		return GrantPolicyAttestation{}, e
	}
	a := GrantPolicyAttestation{Challenge: challenge, View: view}
	copy(a.Signature[:], ed25519.Sign(w.signer, a.message(w.ctx, w.bookSigner)))
	return a, nil
}

func (w *GrantPolicyWitness) headAtSequenceLocked(sequence uint32) (Digest, bool) {
	if sequence == 0 {
		return w.genesis, true
	}
	if sequence > uint32(len(w.transitions)) {
		return Digest{}, false
	}
	return w.transitions[sequence-1].After, true
}
func (w *GrantPolicyWitness) AttestMembership(challenge Digest, requestedSequence uint32, requestedHead Digest) (GrantPolicyMembershipAttestation, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if challenge == (Digest{}) || requestedHead == (Digest{}) {
		return GrantPolicyMembershipAttestation{}, ErrPolicy
	}
	actual, ok := w.headAtSequenceLocked(requestedSequence)
	if !ok || actual != requestedHead {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyRollback
	}
	view, e := w.viewLocked()
	if e != nil {
		return GrantPolicyMembershipAttestation{}, e
	}
	a := GrantPolicyMembershipAttestation{
		Challenge: challenge, RequestedSequence: requestedSequence, RequestedHead: requestedHead, View: view,
	}
	copy(a.Signature[:], ed25519.Sign(w.signer, a.message(w.ctx, w.bookSigner)))
	return a, nil
}
func (w *GrantPolicyWitness) Advance(t GrantPolicyTransition) (GrantPolicyView, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.lock == nil || w.poisoned {
		return GrantPolicyView{}, ErrStore
	}
	if !VerifyGrantPolicyTransition(t, w.ctx, w.bookSigner) {
		return GrantPolicyView{}, ErrPolicy
	}
	current := w.headLocked()
	if t.Before != current {
		return GrantPolicyView{}, ErrGrantPolicyConflict
	}
	if len(w.transitions) >= grantPolicyMaxTransitions || t.After == w.genesis {
		return GrantPolicyView{}, ErrPolicy
	}
	for _, prior := range w.transitions {
		if prior.After == t.After {
			return GrantPolicyView{}, ErrPolicy
		}
	}
	next := append(append([]GrantPolicyTransition(nil), w.transitions...), t)
	if e := w.persist(next); e != nil {
		w.poisoned = true
		return GrantPolicyView{}, ErrUnknown
	}
	w.transitions = next
	return w.viewLocked()
}
func (w *GrantPolicyWitness) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.lock == nil {
		return nil
	}
	e := w.lock.Close()
	w.lock = nil
	return e
}
func (w *GrantPolicyWitness) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	rw.Header().Set("Cache-Control", "no-store")
	if r.URL.RawQuery != "" {
		rw.WriteHeader(http.StatusBadRequest)
		return
	}
	if r.URL.Path == "/grant-policy/membership" {
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != media {
			rw.WriteHeader(http.StatusBadRequest)
			return
		}
		defer r.Body.Close()
		raw, e := io.ReadAll(io.LimitReader(r.Body, grantPolicyMembershipRequestSize+1))
		if e != nil || len(raw) != grantPolicyMembershipRequestSize {
			rw.WriteHeader(http.StatusBadRequest)
			return
		}
		var challenge, requestedHead Digest
		copy(challenge[:], raw[:32])
		requestedSequence := binary.BigEndian.Uint32(raw[32:36])
		copy(requestedHead[:], raw[36:68])
		a, e := w.AttestMembership(challenge, requestedSequence, requestedHead)
		if e != nil {
			switch {
			case errors.Is(e, ErrGrantPolicyRollback):
				rw.WriteHeader(http.StatusConflict)
			case errors.Is(e, ErrPolicy):
				rw.WriteHeader(http.StatusBadRequest)
			default:
				rw.WriteHeader(http.StatusServiceUnavailable)
			}
			return
		}
		rw.Header().Set("Content-Type", media)
		_, _ = rw.Write(a.Bytes())
		return
	}
	if r.URL.Path == "/grant-policy/view" {
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != media {
			rw.WriteHeader(http.StatusBadRequest)
			return
		}
		defer r.Body.Close()
		raw, e := io.ReadAll(io.LimitReader(r.Body, 33))
		if e != nil || len(raw) != 32 {
			rw.WriteHeader(http.StatusBadRequest)
			return
		}
		var challenge Digest
		copy(challenge[:], raw)
		a, e := w.Attest(challenge)
		if e != nil {
			rw.WriteHeader(http.StatusInternalServerError)
			return
		}
		rw.Header().Set("Content-Type", media)
		_, _ = rw.Write(a.Bytes())
		return
	}
	if r.URL.Path == "/grant-policy" && r.Method == http.MethodGet {
		v, e := w.View()
		if e != nil {
			rw.WriteHeader(http.StatusInternalServerError)
			return
		}
		rw.Header().Set("Content-Type", media)
		_, _ = rw.Write(v.Bytes())
		return
	}
	if r.URL.Path != "/grant-policy" || r.Method != http.MethodPost || r.Header.Get("Content-Type") != media {
		rw.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(r.Body, grantPolicyTransitionSize+1))
	if e != nil || len(raw) != grantPolicyTransitionSize {
		rw.WriteHeader(http.StatusBadRequest)
		return
	}
	t, e := ParseGrantPolicyTransition(raw)
	if e != nil {
		rw.WriteHeader(http.StatusBadRequest)
		return
	}
	v, e := w.Advance(t)
	if e != nil {
		switch {
		case errors.Is(e, ErrGrantPolicyConflict):
			rw.WriteHeader(http.StatusConflict)
		case errors.Is(e, ErrPolicy):
			rw.WriteHeader(http.StatusForbidden)
		default:
			rw.WriteHeader(http.StatusServiceUnavailable)
		}
		return
	}
	rw.Header().Set("Content-Type", media)
	_, _ = rw.Write(v.Bytes())
}

type GrantPolicyClient struct {
	origin     string
	ctx        Digest
	bookSigner ed25519.PublicKey
	witness    ed25519.PublicKey
	genesis    Digest
	http       *http.Client
}
func NewGrantPolicyClient(origin string, ctx Digest, bookSigner, witness ed25519.PublicKey, genesis Digest) (*GrantPolicyClient, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" || u.Port() == "" || u.Host == "" {
		return nil, ErrPolicy
	}
	ip := net.ParseIP(u.Hostname())
	if ip == nil || !ip.IsLoopback() || origin != "http://"+u.Host || ctx == (Digest{}) || genesis == (Digest{}) || len(bookSigner) != ed25519.PublicKeySize || len(witness) != ed25519.PublicKeySize {
		return nil, ErrPolicy
	}
	tr := &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: time.Second}).DialContext, DisableKeepAlives: true}
	return &GrantPolicyClient{
		origin: origin, ctx: ctx, bookSigner: append(ed25519.PublicKey(nil), bookSigner...), witness: append(ed25519.PublicKey(nil), witness...), genesis: genesis,
		http: &http.Client{Transport: tr, Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
	}, nil
}
func (c *GrantPolicyClient) parseView(res *http.Response, path string) (GrantPolicyView, error) {
	if res == nil {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusConflict {
		return GrantPolicyView{}, ErrGrantPolicyConflict
	}
	if res.StatusCode == http.StatusForbidden {
		return GrantPolicyView{}, ErrPolicy
	}
	if res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media || res.Request == nil || res.Request.URL.String() != c.origin+path {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, grantPolicyViewSize+1))
	if e != nil || len(raw) != grantPolicyViewSize {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	v, e := ParseGrantPolicyView(raw)
	if e != nil || !VerifyGrantPolicyViewPinned(v, c.ctx, c.bookSigner, c.witness, c.genesis) {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	return v, nil
}
func (c *GrantPolicyClient) Advance(t GrantPolicyTransition) (GrantPolicyView, error) {
	req, e := http.NewRequest(http.MethodPost, c.origin+"/grant-policy", bytes.NewReader(t.Bytes()))
	if e != nil {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	return c.parseView(res, "/grant-policy")
}
func (c *GrantPolicyClient) View() (GrantPolicyView, error) {
	req, e := http.NewRequest(http.MethodGet, c.origin+"/grant-policy", nil)
	if e != nil {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	res, e := c.http.Do(req)
	if e != nil {
		return GrantPolicyView{}, ErrGrantPolicyUnavailable
	}
	return c.parseView(res, "/grant-policy")
}
func (c *GrantPolicyClient) AttestMembershipChallenge(challenge Digest, requestedSequence uint32, requestedHead Digest) (GrantPolicyMembershipAttestation, error) {
	if challenge == (Digest{}) || requestedHead == (Digest{}) || requestedSequence > grantPolicyMaxTransitions {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	body := append([]byte(nil), challenge[:]...)
	body = binary.BigEndian.AppendUint32(body, requestedSequence)
	body = append(body, requestedHead[:]...)
	req, e := http.NewRequest(http.MethodPost, c.origin+"/grant-policy/membership", bytes.NewReader(body))
	if e != nil {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil || res == nil {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusConflict {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyRollback
	}
	if res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media ||
		res.Request == nil || res.Request.URL.String() != c.origin+"/grant-policy/membership" {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, grantPolicyMembershipSize+1))
	if e != nil || len(raw) != grantPolicyMembershipSize {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	a, e := ParseGrantPolicyMembershipAttestation(raw)
	if e != nil || !VerifyGrantPolicyMembershipAttestation(a, challenge, requestedSequence, requestedHead, c.ctx, c.bookSigner, c.witness, c.genesis) {
		return GrantPolicyMembershipAttestation{}, ErrGrantPolicyUnavailable
	}
	return a, nil
}

func (c *GrantPolicyClient) FreshView() (GrantPolicyView, error) {
	for attempts := 0; attempts < 2; attempts++ {
		var challenge Digest
		if _, e := rand.Read(challenge[:]); e != nil {
			return GrantPolicyView{}, ErrGrantPolicyUnavailable
		}
		if challenge == (Digest{}) {
			continue
		}
		req, e := http.NewRequest(http.MethodPost, c.origin+"/grant-policy/view", bytes.NewReader(challenge[:]))
		if e != nil {
			return GrantPolicyView{}, ErrGrantPolicyUnavailable
		}
		req.Header.Set("Content-Type", media)
		req.Header.Set("Accept", media)
		res, e := c.http.Do(req)
		if e != nil || res == nil {
			return GrantPolicyView{}, ErrGrantPolicyUnavailable
		}
		raw, readErr := io.ReadAll(io.LimitReader(res.Body, grantPolicyAttestationSize+1))
		closeErr := res.Body.Close()
		if readErr != nil || closeErr != nil || len(raw) != grantPolicyAttestationSize || res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media || res.Request == nil || res.Request.URL.String() != c.origin+"/grant-policy/view" {
			return GrantPolicyView{}, ErrGrantPolicyUnavailable
		}
		a, e := ParseGrantPolicyAttestation(raw)
		if e != nil || !VerifyGrantPolicyAttestation(a, challenge, c.ctx, c.bookSigner, c.witness, c.genesis) {
			return GrantPolicyView{}, ErrGrantPolicyUnavailable
		}
		return a.View, nil
	}
	return GrantPolicyView{}, ErrGrantPolicyUnavailable
}

type GrantPolicyIntent struct {
	Before    Digest
	After     Digest
	Signature [ed25519.SignatureSize]byte
}
func (i GrantPolicyIntent) message(ctx Digest) []byte {
	b := append([]byte(grantPolicyIntentDomain), ctx[:]...)
	b = append(b, i.Before[:]...)
	return append(b, i.After[:]...)
}
func (i GrantPolicyIntent) Bytes() []byte {
	b := append([]byte(nil), i.Before[:]...)
	b = append(b, i.After[:]...)
	return append(b, i.Signature[:]...)
}
func signGrantPolicyIntent(ctx, before, after Digest, bookKey ed25519.PrivateKey) (GrantPolicyIntent, error) {
	if ctx == (Digest{}) || before == (Digest{}) || after == (Digest{}) || before == after || len(bookKey) != ed25519.PrivateKeySize {
		return GrantPolicyIntent{}, ErrPolicy
	}
	i := GrantPolicyIntent{Before: before, After: after}
	copy(i.Signature[:], ed25519.Sign(bookKey, i.message(ctx)))
	return i, nil
}
func parseGrantPolicyIntent(raw []byte, ctx Digest, bookSigner ed25519.PublicKey) (GrantPolicyIntent, error) {
	var i GrantPolicyIntent
	if len(raw) != grantPolicyIntentSize || ctx == (Digest{}) || len(bookSigner) != ed25519.PublicKeySize {
		return i, ErrStore
	}
	copy(i.Before[:], raw[:32])
	copy(i.After[:], raw[32:64])
	copy(i.Signature[:], raw[64:])
	if i.Before == (Digest{}) || i.After == (Digest{}) || i.Before == i.After || !ed25519.Verify(bookSigner, i.message(ctx), i.Signature[:]) {
		return GrantPolicyIntent{}, ErrStore
	}
	return i, nil
}

type GrantPolicyCoordinator struct {
	book    *GrantBook
	witness *GrantPolicyClient
	fault   func(string) error
}
func NewGrantPolicyCoordinator(book *GrantBook, witness *GrantPolicyClient) (*GrantPolicyCoordinator, error) {
	if book == nil || witness == nil || book.ctx != witness.ctx || !bytes.Equal(book.signer.Public().(ed25519.PublicKey), witness.bookSigner) {
		return nil, ErrPolicy
	}
	return &GrantPolicyCoordinator{book: book, witness: witness}, nil
}
func (c *GrantPolicyCoordinator) intentPath() string { return filepath.Join(c.book.dir, grantPolicyIntentName) }
func (c *GrantPolicyCoordinator) loadIntentLocked() (GrantPolicyIntent, bool, error) {
	path := c.intentPath()
	info, e := os.Lstat(path)
	if errors.Is(e, os.ErrNotExist) {
		return GrantPolicyIntent{}, false, nil
	}
	if e != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() != grantPolicyIntentSize {
		return GrantPolicyIntent{}, false, ErrStore
	}
	file, e := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if e != nil {
		return GrantPolicyIntent{}, false, ErrStore
	}
	opened, e := file.Stat()
	if e != nil || !opened.Mode().IsRegular() || opened.Mode().Perm()&0077 != 0 || opened.Size() != grantPolicyIntentSize || !os.SameFile(info, opened) {
		file.Close()
		return GrantPolicyIntent{}, false, ErrStore
	}
	raw, e := io.ReadAll(io.LimitReader(file, grantPolicyIntentSize+1))
	ce := file.Close()
	if e != nil || ce != nil {
		return GrantPolicyIntent{}, false, ErrStore
	}
	i, e := parseGrantPolicyIntent(raw, c.book.ctx, c.book.signer.Public().(ed25519.PublicKey))
	if e != nil {
		return GrantPolicyIntent{}, false, e
	}
	return i, true, nil
}
func (c *GrantPolicyCoordinator) persistIntentLocked(i GrantPolicyIntent) error {
	if _, exists, e := c.loadIntentLocked(); e != nil {
		return e
	} else if exists {
		return ErrStore
	}
	file, e := os.CreateTemp(c.book.dir, ".grant-policy-intent-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := i.Bytes()
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
	return syncDirectory(c.book.dir)
}
func (c *GrantPolicyCoordinator) clearIntentLocked() error {
	e := os.Remove(c.intentPath())
	if errors.Is(e, os.ErrNotExist) {
		return nil
	}
	if e != nil {
		return e
	}
	return syncDirectory(c.book.dir)
}
func (c *GrantPolicyCoordinator) recoverLocked() error {
	if c.book.lock == nil || c.book.poisoned {
		return ErrStore
	}
	i, exists, e := c.loadIntentLocked()
	if e != nil {
		return e
	}
	view, e := c.witness.FreshView()
	if e != nil {
		return ErrGrantPolicyUnavailable
	}
	current := c.book.policyHeadLocked()
	if !exists {
		if view.Head != current {
			return ErrGrantPolicyRollback
		}
		return nil
	}
	switch {
	case current == i.Before && view.Head == i.Before:
		return c.clearIntentLocked()
	case current == i.After && view.Head == i.Before:
		t, e := SignGrantPolicyTransition(c.book.ctx, i.Before, i.After, c.book.signer)
		if e != nil {
			return e
		}
		next, e := c.witness.Advance(t)
		if e != nil {
			return ErrGrantPolicyUnavailable
		}
		if next.Head != i.After {
			return ErrGrantPolicyRollback
		}
		if c.fault != nil {
			if e = c.fault("after-recover-witness"); e != nil {
				return ErrUnknown
			}
		}
		return c.clearIntentLocked()
	case current == i.After && view.Head == i.After:
		return c.clearIntentLocked()
	default:
		return ErrGrantPolicyRollback
	}
}
func (c *GrantPolicyCoordinator) Recover() error {
	c.book.mu.Lock()
	defer c.book.mu.Unlock()
	return c.recoverLocked()
}
func (c *GrantPolicyCoordinator) anchorMutationLocked(before, after Digest, apply func() error) error {
	if before == after {
		return nil
	}
	i, e := signGrantPolicyIntent(c.book.ctx, before, after, c.book.signer)
	if e != nil {
		return e
	}
	if e = c.persistIntentLocked(i); e != nil {
		return e
	}
	if c.fault != nil {
		if e = c.fault("after-intent"); e != nil {
			return ErrUnknown
		}
	}
	if e = apply(); e != nil {
		return e
	}
	if c.book.policyHeadLocked() != after {
		c.book.poisoned = true
		return ErrStore
	}
	if c.fault != nil {
		if e = c.fault("after-book"); e != nil {
			return ErrUnknown
		}
	}
	t, e := SignGrantPolicyTransition(c.book.ctx, before, after, c.book.signer)
	if e != nil {
		return e
	}
	view, e := c.witness.Advance(t)
	if e != nil {
		return ErrUnknown
	}
	if view.Head != after {
		return ErrGrantPolicyRollback
	}
	if c.fault != nil {
		if e = c.fault("after-witness"); e != nil {
			return ErrUnknown
		}
	}
	if e = c.clearIntentLocked(); e != nil {
		return ErrUnknown
	}
	return nil
}
func (c *GrantPolicyCoordinator) validateGrantIdentityLocked(g ActionGrant, req Request, class *GrantClass) error {
	b := c.book
	if b.lock == nil || b.poisoned {
		return ErrStore
	}
	if !b.validApprovedRequestLocked(req) || !VerifyActionGrant(g, req, b.consent) || g.Context != b.ctx {
		return ErrPolicy
	}
	if class != nil && g.Class != *class {
		return ErrGrantClass
	}
	return nil
}

func (c *GrantPolicyCoordinator) AdvanceEpoch(expected, next uint64) error {
	c.book.mu.Lock()
	defer c.book.mu.Unlock()
	if e := c.recoverLocked(); e != nil {
		return e
	}
	b := c.book
	if expected != b.epoch {
		return ErrHeadConflict
	}
	if next <= b.epoch || next > maxGrantEpoch {
		return ErrPolicy
	}
	before := b.policyHeadLocked()
	after := b.policyHeadFor(next, b.revoked, b.admitted)
	return c.anchorMutationLocked(before, after, func() error {
		if e := b.persist(next, b.revoked, b.admitted); e != nil {
			b.poisoned = true
			return ErrUnknown
		}
		b.epoch = next
		return nil
	})
}
func (c *GrantPolicyCoordinator) Revoke(g ActionGrant, req Request) error {
	c.book.mu.Lock()
	defer c.book.mu.Unlock()
	if e := c.validateGrantIdentityLocked(g, req, nil); e != nil {
		return e
	}
	if e := c.recoverLocked(); e != nil {
		return e
	}
	b := c.book
	if b.isRevokedLocked(g.ID) {
		return nil
	}
	if len(b.revoked) >= maxGrantRevocations {
		return ErrBudget
	}
	nextRevoked := append(append([]GrantID(nil), b.revoked...), g.ID)
	before := b.policyHeadLocked()
	after := b.policyHeadFor(b.epoch, nextRevoked, b.admitted)
	return c.anchorMutationLocked(before, after, func() error {
		if e := b.persist(b.epoch, nextRevoked, b.admitted); e != nil {
			b.poisoned = true
			return ErrUnknown
		}
		b.revoked = nextRevoked
		return nil
	})
}
func (c *GrantPolicyCoordinator) reserveDispatchLocked(g ActionGrant, req Request, class GrantClass) error {
	if e := c.validateGrantIdentityLocked(g, req, &class); e != nil {
		return e
	}
	if e := c.recoverLocked(); e != nil {
		return e
	}
	b := c.book
	if e := b.checkDispatchLocked(g, req, class); e != nil {
		return e
	}
	if b.isAdmittedLocked(g.ID) {
		return nil
	}
	if len(b.admitted) >= maxGrantRevocations {
		return ErrBudget
	}
	nextAdmitted := append(append([]GrantID(nil), b.admitted...), g.ID)
	before := b.policyHeadLocked()
	after := b.policyHeadFor(b.epoch, b.revoked, nextAdmitted)
	return c.anchorMutationLocked(before, after, func() error {
		if e := b.persist(b.epoch, b.revoked, nextAdmitted); e != nil {
			b.poisoned = true
			return ErrUnknown
		}
		b.admitted = nextAdmitted
		return nil
	})
}
func (c *GrantPolicyCoordinator) checkReconcileLocked(g ActionGrant, req Request) error {
	if e := c.validateGrantIdentityLocked(g, req, nil); e != nil {
		return e
	}
	if e := c.recoverLocked(); e != nil {
		return e
	}
	b := c.book
	if !b.isAdmittedLocked(g.ID) {
		return ErrGrantNotDispatched
	}
	return nil
}

type AnchoredFencedGrantGuard struct {
	policy      *GrantPolicyCoordinator
	coordinator *FencedCoordinator
}
func NewAnchoredFencedGrantGuard(policy *GrantPolicyCoordinator, coordinator *FencedCoordinator) (*AnchoredFencedGrantGuard, error) {
	if policy == nil || coordinator == nil || policy.book.ctx != coordinator.authority.ctx ||
		!bytes.Equal(policy.book.approver, coordinator.authority.approver) {
		return nil, ErrPolicy
	}
	return &AnchoredFencedGrantGuard{policy: policy, coordinator: coordinator}, nil
}
func (g *AnchoredFencedGrantGuard) Commit(grant ActionGrant, req AuthorityRequest, class GrantClass) (FencedResponse, error) {
	if req.Op != AuthorityCommit {
		return FencedResponse{}, ErrPolicy
	}
	if e := g.coordinator.authority.preflight(req); e != nil {
		return FencedResponse{}, e
	}
	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()
	if e := g.policy.reserveDispatchLocked(grant, req.Action, class); e != nil {
		return FencedResponse{}, e
	}
	// Policy lock remains held: a revocation or epoch change cannot interleave
	// between the anchored final check and pre-effect fence admission.
	return g.coordinator.Process(req)
}
func (g *AnchoredFencedGrantGuard) Status(grant ActionGrant, req AuthorityRequest) (FencedResponse, error) {
	if req.Op != AuthorityStatus {
		return FencedResponse{}, ErrPolicy
	}
	if e := g.coordinator.authority.preflight(req); e != nil {
		return FencedResponse{}, e
	}
	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()
	if e := g.policy.checkReconcileLocked(grant, req.Action); e != nil {
		return FencedResponse{}, e
	}
	return g.coordinator.Process(req)
}
func (g *AnchoredFencedGrantGuard) ProcessAttested(grant ActionGrant, req AuthorityRequest, challenge Digest) (FencedEnvelope, error) {
	if challenge == (Digest{}) {
		return FencedEnvelope{}, ErrPolicy
	}
	switch req.Op {
	case AuthorityCommit:
		if e := g.coordinator.authority.preflight(req); e != nil {
			return FencedEnvelope{}, e
		}
		b := g.policy.book
		b.mu.Lock()
		defer b.mu.Unlock()
		if e := g.policy.reserveDispatchLocked(grant, req.Action, grant.Class); e != nil {
			return FencedEnvelope{}, e
		}
		return g.coordinator.ProcessAttested(req, challenge)
	case AuthorityStatus:
		if e := g.coordinator.authority.preflight(req); e != nil {
			return FencedEnvelope{}, e
		}
		b := g.policy.book
		b.mu.Lock()
		defer b.mu.Unlock()
		if e := g.policy.checkReconcileLocked(grant, req.Action); e != nil {
			return FencedEnvelope{}, e
		}
		return g.coordinator.ProcessAttested(req, challenge)
	default:
		return FencedEnvelope{}, ErrPolicy
	}
}

// grantPolicyChallengeHeader is reserved for a future external policy status
// endpoint. Keeping strict canonical parsing here prevents callers from
// constructing alternate byte representations if that boundary is exposed.
func grantPolicyChallengeHeader(value string) (Digest, error) {
	var challenge Digest
	if len(value) != 64 {
		return challenge, ErrPolicy
	}
	raw, e := hex.DecodeString(value)
	if e != nil || len(raw) != 32 || hex.EncodeToString(raw) != value {
		return challenge, ErrPolicy
	}
	copy(challenge[:], raw)
	if challenge == (Digest{}) {
		return Digest{}, ErrPolicy
	}
	return challenge, nil
}
