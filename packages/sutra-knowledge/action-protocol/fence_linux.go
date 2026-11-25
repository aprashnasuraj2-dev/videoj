//go:build linux

package actionprotocol

// AdmissionFence is an independently keyed durable transaction-admission
// laboratory. Unlike WitnessCoordinator, it reserves one exact transition
// before SharedAuthority may persist its synthetic effect. This closes the
// demonstrated simultaneous-clone local-effect race only for callers that use
// this fenced path. It is not consensus, trusted time, or an arbitrary remote
// side-effect transaction manager.
import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
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

const fenceStoreDomain = "SUTRA/admission-fence-store/v1\x00"
const fenceReservationDomain = "SUTRA/admission-fence-reservation/v1\x00"
const fenceViewDomain = "SUTRA/admission-fence-view/v1\x00"
const fenceAttestationDomain = "SUTRA/admission-fence-attestation/v1\x00"
const fenceIntentName = "fence-intent.bin"
const fenceMaxTransitions = 8
const fenceReservationBodySize = 32 * 4
const fenceReservationSize = fenceReservationBodySize + ed25519.SignatureSize
const fenceViewSize = 4 + 32 + 32 + 32 + 32 + ed25519.SignatureSize
const fenceAttestationSize = 32 + fenceViewSize + ed25519.SignatureSize
const fencedResponseSize = authorityResponseSize + fenceViewSize + fenceReservationSize
const fencedEnvelopeSize = authorityResponseSize + fenceAttestationSize + fenceReservationSize

var ErrFenceConflict = errors.New("admission fence conflict")
var ErrFenceUnavailable = errors.New("admission fence unavailable or ambiguous")
var ErrFenceOrphaned = errors.New("admission fence orphaned; owner evidence unavailable")
var ErrFenceExhausted = errors.New("admission fence exhausted")

type FenceReservation struct {
	Before      Digest
	After       Digest
	RequestHash Digest
	Token       Digest
	Signature   [ed25519.SignatureSize]byte
}

func (r FenceReservation) body() []byte {
	b := append([]byte(nil), r.Before[:]...)
	b = append(b, r.After[:]...)
	b = append(b, r.RequestHash[:]...)
	return append(b, r.Token[:]...)
}
func (r FenceReservation) message(ctx Digest) []byte {
	b := append([]byte(fenceReservationDomain), ctx[:]...)
	return append(b, r.body()...)
}
func (r FenceReservation) Bytes() []byte { return append(r.body(), r.Signature[:]...) }
func (r FenceReservation) Hash() Digest  { return sha256.Sum256(r.Bytes()) }
func ParseFenceReservation(raw []byte) (FenceReservation, error) {
	var r FenceReservation
	if len(raw) != fenceReservationSize {
		return r, ErrPolicy
	}
	copy(r.Before[:], raw[:32])
	copy(r.After[:], raw[32:64])
	copy(r.RequestHash[:], raw[64:96])
	copy(r.Token[:], raw[96:128])
	copy(r.Signature[:], raw[128:])
	if r.Before == (Digest{}) || r.After == (Digest{}) || r.Before == r.After || r.RequestHash == (Digest{}) || r.Token == (Digest{}) {
		return FenceReservation{}, ErrPolicy
	}
	return r, nil
}
func SignFenceReservation(ctx, before, after, requestHash, token Digest, authority ed25519.PrivateKey) (FenceReservation, error) {
	if ctx == (Digest{}) || before == (Digest{}) || after == (Digest{}) || before == after || requestHash == (Digest{}) || token == (Digest{}) || len(authority) != ed25519.PrivateKeySize {
		return FenceReservation{}, ErrPolicy
	}
	r := FenceReservation{Before: before, After: after, RequestHash: requestHash, Token: token}
	copy(r.Signature[:], ed25519.Sign(authority, r.message(ctx)))
	return r, nil
}
func VerifyFenceReservation(r FenceReservation, ctx Digest, authority ed25519.PublicKey) bool {
	return ctx != (Digest{}) && len(authority) == ed25519.PublicKeySize && r.Before != (Digest{}) && r.After != (Digest{}) && r.Before != r.After && r.RequestHash != (Digest{}) && r.Token != (Digest{}) && ed25519.Verify(authority, r.message(ctx), r.Signature[:])
}

type FenceView struct {
	Sequence        uint32
	Genesis         Digest
	Head            Digest
	Pending         Digest
	LastReservation Digest
	Signature       [ed25519.SignatureSize]byte
}

func (v FenceView) body() []byte {
	b := binary.BigEndian.AppendUint32(nil, v.Sequence)
	b = append(b, v.Genesis[:]...)
	b = append(b, v.Head[:]...)
	b = append(b, v.Pending[:]...)
	return append(b, v.LastReservation[:]...)
}
func (v FenceView) message(ctx Digest, authority ed25519.PublicKey) []byte {
	b := append([]byte(fenceViewDomain), ctx[:]...)
	b = append(b, authority...)
	return append(b, v.body()...)
}
func (v FenceView) Bytes() []byte { return append(v.body(), v.Signature[:]...) }
func ParseFenceView(raw []byte) (FenceView, error) {
	var v FenceView
	if len(raw) != fenceViewSize {
		return v, ErrPolicy
	}
	v.Sequence = binary.BigEndian.Uint32(raw[:4])
	copy(v.Genesis[:], raw[4:36])
	copy(v.Head[:], raw[36:68])
	copy(v.Pending[:], raw[68:100])
	copy(v.LastReservation[:], raw[100:132])
	copy(v.Signature[:], raw[132:])
	return v, nil
}
func VerifyFenceView(v FenceView, ctx Digest, authority, fence ed25519.PublicKey) bool {
	if ctx == (Digest{}) || len(authority) != ed25519.PublicKeySize || len(fence) != ed25519.PublicKeySize ||
		v.Genesis == (Digest{}) || v.Head == (Digest{}) || v.Sequence > fenceMaxTransitions {
		return false
	}
	if v.Sequence == 0 {
		if v.Head != v.Genesis || v.LastReservation != (Digest{}) {
			return false
		}
	} else if v.Head == v.Genesis || v.LastReservation == (Digest{}) {
		return false
	}
	return ed25519.Verify(fence, v.message(ctx, authority), v.Signature[:])
}
func VerifyFenceViewPinned(v FenceView, ctx Digest, authority, fence ed25519.PublicKey, genesis Digest) bool {
	return genesis != (Digest{}) && v.Genesis == genesis && VerifyFenceView(v, ctx, authority, fence)
}

type FenceAttestation struct {
	Challenge Digest
	View      FenceView
	Signature [ed25519.SignatureSize]byte
}

func (a FenceAttestation) message(ctx Digest, authority ed25519.PublicKey) []byte {
	b := append([]byte(fenceAttestationDomain), ctx[:]...)
	b = append(b, authority...)
	b = append(b, a.Challenge[:]...)
	return append(b, a.View.Bytes()...)
}
func (a FenceAttestation) Bytes() []byte {
	b := append([]byte(nil), a.Challenge[:]...)
	b = append(b, a.View.Bytes()...)
	return append(b, a.Signature[:]...)
}
func ParseFenceAttestation(raw []byte) (FenceAttestation, error) {
	var a FenceAttestation
	if len(raw) != fenceAttestationSize {
		return a, ErrPolicy
	}
	copy(a.Challenge[:], raw[:32])
	v, e := ParseFenceView(raw[32 : 32+fenceViewSize])
	if e != nil {
		return a, e
	}
	a.View = v
	copy(a.Signature[:], raw[32+fenceViewSize:])
	return a, nil
}
func VerifyFenceAttestation(a FenceAttestation, expected, ctx Digest, authority, fence ed25519.PublicKey, genesis Digest) bool {
	return expected != (Digest{}) && a.Challenge == expected && VerifyFenceViewPinned(a.View, ctx, authority, fence, genesis) && ed25519.Verify(fence, a.message(ctx, authority), a.Signature[:])
}

type AdmissionFence struct {
	mu        sync.Mutex
	dir       string
	lock      *os.File
	ctx       Digest
	authority ed25519.PublicKey
	signer    ed25519.PrivateKey
	genesis   Digest
	commits   []FenceReservation
	pending   *FenceReservation
	poisoned  bool
	fault     func(string) error
}

func CreateAdmissionFence(dir string, ctx Digest, authority ed25519.PublicKey, fence ed25519.PrivateKey, genesis Digest) (*AdmissionFence, error) {
	return openAdmissionFence(dir, ctx, authority, fence, genesis, true)
}
func OpenAdmissionFence(dir string, ctx Digest, authority ed25519.PublicKey, fence ed25519.PrivateKey, genesis Digest) (*AdmissionFence, error) {
	return openAdmissionFence(dir, ctx, authority, fence, genesis, false)
}
func openAdmissionFence(dir string, ctx Digest, authority ed25519.PublicKey, fence ed25519.PrivateKey, genesis Digest, create bool) (*AdmissionFence, error) {
	if ctx == (Digest{}) || genesis == (Digest{}) || len(authority) != ed25519.PublicKeySize || len(fence) != ed25519.PrivateKeySize || !bytes.Equal(ed25519.NewKeyFromSeed(fence[:ed25519.SeedSize]), fence) {
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
	lock, e := os.OpenFile(filepath.Join(dir, "fence.lock"), os.O_CREATE|os.O_RDWR, 0600)
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
	f := &AdmissionFence{dir: dir, lock: lock, ctx: ctx, authority: append(ed25519.PublicKey(nil), authority...), signer: append(ed25519.PrivateKey(nil), fence...), genesis: genesis}
	ok := false
	defer func() {
		if !ok {
			f.Close()
		}
	}()
	path := filepath.Join(dir, "fence.bin")
	if create {
		if _, e = os.Lstat(path); !errors.Is(e, os.ErrNotExist) {
			return nil, ErrStore
		}
		if e = f.persist(nil, nil); e != nil {
			return nil, e
		}
	} else {
		file, e := os.Open(path)
		if e != nil {
			return nil, e
		}
		raw, e := io.ReadAll(io.LimitReader(file, int64(f.maxSize()+1)))
		ce := file.Close()
		if e != nil || ce != nil {
			return nil, ErrStore
		}
		commits, pending, e := f.decode(raw)
		if e != nil {
			return nil, e
		}
		f.commits, f.pending = commits, pending
		if e = syncDirectory(dir); e != nil {
			return nil, e
		}
	}
	ok = true
	return f, nil
}
func (f *AdmissionFence) header(n int, pending bool) []byte {
	b := append([]byte(fenceStoreDomain), f.ctx[:]...)
	b = append(b, f.authority...)
	b = append(b, f.signer.Public().(ed25519.PublicKey)...)
	b = append(b, f.genesis[:]...)
	b = append(b, byte(n))
	if pending {
		return append(b, 1)
	}
	return append(b, 0)
}
func (f *AdmissionFence) maxSize() int {
	return len(f.header(fenceMaxTransitions, true)) + (fenceMaxTransitions+1)*fenceReservationSize + ed25519.SignatureSize
}
func (f *AdmissionFence) encode(commits []FenceReservation, pending *FenceReservation) []byte {
	body := f.header(len(commits), pending != nil)
	for _, r := range commits {
		body = append(body, r.Bytes()...)
	}
	if pending != nil {
		body = append(body, pending.Bytes()...)
	}
	return append(body, ed25519.Sign(f.signer, body)...)
}
func (f *AdmissionFence) decode(raw []byte) ([]FenceReservation, *FenceReservation, error) {
	header := len(f.header(0, false))
	if len(raw) < header+ed25519.SignatureSize || len(raw) > f.maxSize() {
		return nil, nil, ErrStore
	}
	body := raw[:len(raw)-ed25519.SignatureSize]
	if !ed25519.Verify(f.signer.Public().(ed25519.PublicKey), body, raw[len(body):]) {
		return nil, nil, ErrStore
	}
	n := int(body[header-2])
	pendingFlag := body[header-1]
	if n > fenceMaxTransitions || pendingFlag > 1 || len(body) != header+(n+int(pendingFlag))*fenceReservationSize || !bytes.Equal(body[:header], f.header(n, pendingFlag == 1)) {
		return nil, nil, ErrStore
	}
	current := f.genesis
	seenHead := map[Digest]bool{f.genesis: true}
	seenToken := map[Digest]bool{}
	commits := make([]FenceReservation, 0, n)
	for i := 0; i < n; i++ {
		start := header + i*fenceReservationSize
		r, e := ParseFenceReservation(body[start : start+fenceReservationSize])
		if e != nil || !VerifyFenceReservation(r, f.ctx, f.authority) || r.Before != current || seenHead[r.After] || seenToken[r.Token] {
			return nil, nil, ErrStore
		}
		commits = append(commits, r)
		seenHead[r.After], seenToken[r.Token], current = true, true, r.After
	}
	var pending *FenceReservation
	if pendingFlag == 1 {
		start := header + n*fenceReservationSize
		r, e := ParseFenceReservation(body[start : start+fenceReservationSize])
		if e != nil || !VerifyFenceReservation(r, f.ctx, f.authority) || r.Before != current || seenHead[r.After] || seenToken[r.Token] {
			return nil, nil, ErrStore
		}
		pending = &r
	}
	return commits, pending, nil
}
func (f *AdmissionFence) persist(commits []FenceReservation, pending *FenceReservation) error {
	file, e := os.CreateTemp(f.dir, ".fence-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := f.encode(commits, pending)
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
	if f.fault != nil {
		if e = f.fault("before-rename"); e != nil {
			return e
		}
	}
	if e = os.Rename(file.Name(), filepath.Join(f.dir, "fence.bin")); e != nil {
		return e
	}
	if f.fault != nil {
		if e = f.fault("after-rename"); e != nil {
			return e
		}
	}
	return syncDirectory(f.dir)
}
func (f *AdmissionFence) headLocked() Digest {
	if len(f.commits) == 0 {
		return f.genesis
	}
	return f.commits[len(f.commits)-1].After
}
func (f *AdmissionFence) seenHeadLocked(head Digest) bool {
	if head == f.genesis {
		return true
	}
	for _, r := range f.commits {
		if r.After == head {
			return true
		}
	}
	return false
}
func (f *AdmissionFence) viewLocked() (FenceView, error) {
	if f.lock == nil || f.poisoned {
		return FenceView{}, ErrStore
	}
	v := FenceView{Sequence: uint32(len(f.commits)), Genesis: f.genesis, Head: f.headLocked()}
	if len(f.commits) > 0 {
		v.LastReservation = f.commits[len(f.commits)-1].Hash()
	}
	if f.pending != nil {
		v.Pending = f.pending.Hash()
	}
	copy(v.Signature[:], ed25519.Sign(f.signer, v.message(f.ctx, f.authority)))
	return v, nil
}
func (f *AdmissionFence) View() (FenceView, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.viewLocked()
}
func (f *AdmissionFence) Attest(challenge Digest) (FenceAttestation, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if challenge == (Digest{}) {
		return FenceAttestation{}, ErrPolicy
	}
	view, e := f.viewLocked()
	if e != nil {
		return FenceAttestation{}, e
	}
	a := FenceAttestation{Challenge: challenge, View: view}
	copy(a.Signature[:], ed25519.Sign(f.signer, a.message(f.ctx, f.authority)))
	return a, nil
}
func sameReservation(a, b FenceReservation) bool { return bytes.Equal(a.Bytes(), b.Bytes()) }
func (f *AdmissionFence) Reserve(r FenceReservation) (FenceView, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.lock == nil || f.poisoned {
		return FenceView{}, ErrStore
	}
	if !VerifyFenceReservation(r, f.ctx, f.authority) {
		return FenceView{}, ErrPolicy
	}
	if f.pending != nil {
		if sameReservation(*f.pending, r) {
			return f.viewLocked()
		}
		return FenceView{}, ErrFenceConflict
	}
	if r.Before != f.headLocked() {
		return FenceView{}, ErrFenceConflict
	}
	if len(f.commits) >= fenceMaxTransitions {
		return FenceView{}, ErrFenceExhausted
	}
	if f.seenHeadLocked(r.After) {
		return FenceView{}, ErrPolicy
	}
	for _, prior := range f.commits {
		if prior.Token == r.Token {
			return FenceView{}, ErrPolicy
		}
	}
	next := r
	if e := f.persist(f.commits, &next); e != nil {
		f.poisoned = true
		return FenceView{}, ErrUnknown
	}
	f.pending = &next
	return f.viewLocked()
}
func (f *AdmissionFence) Finalize(r FenceReservation) (FenceView, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.lock == nil || f.poisoned {
		return FenceView{}, ErrStore
	}
	if !VerifyFenceReservation(r, f.ctx, f.authority) {
		return FenceView{}, ErrPolicy
	}
	if f.pending == nil {
		if len(f.commits) > 0 && sameReservation(f.commits[len(f.commits)-1], r) {
			return f.viewLocked()
		}
		return FenceView{}, ErrFenceConflict
	}
	if !sameReservation(*f.pending, r) || r.Before != f.headLocked() {
		return FenceView{}, ErrFenceConflict
	}
	next := append(append([]FenceReservation(nil), f.commits...), r)
	if e := f.persist(next, nil); e != nil {
		f.poisoned = true
		return FenceView{}, ErrUnknown
	}
	f.commits, f.pending = next, nil
	return f.viewLocked()
}
func (f *AdmissionFence) Abort(r FenceReservation) (FenceView, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.lock == nil || f.poisoned {
		return FenceView{}, ErrStore
	}
	if !VerifyFenceReservation(r, f.ctx, f.authority) {
		return FenceView{}, ErrPolicy
	}
	if f.pending == nil {
		if f.headLocked() == r.Before {
			return f.viewLocked()
		}
		return FenceView{}, ErrFenceConflict
	}
	if !sameReservation(*f.pending, r) || f.headLocked() != r.Before {
		return FenceView{}, ErrFenceConflict
	}
	if e := f.persist(f.commits, nil); e != nil {
		f.poisoned = true
		return FenceView{}, ErrUnknown
	}
	f.pending = nil
	return f.viewLocked()
}
func (f *AdmissionFence) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.lock == nil {
		return nil
	}
	e := f.lock.Close()
	f.lock = nil
	return e
}

func (f *AdmissionFence) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.RawQuery != "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if r.URL.Path == "/fence/view" {
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != media {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		defer r.Body.Close()
		raw, e := io.ReadAll(io.LimitReader(r.Body, 33))
		if e != nil || len(raw) != 32 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		var challenge Digest
		copy(challenge[:], raw)
		a, e := f.Attest(challenge)
		if e != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", media)
		_, _ = w.Write(a.Bytes())
		return
	}
	if r.URL.Path == "/fence" && r.Method == http.MethodGet {
		v, e := f.View()
		if e != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", media)
		_, _ = w.Write(v.Bytes())
		return
	}
	if r.Method != http.MethodPost || r.Header.Get("Content-Type") != media || (r.URL.Path != "/fence/reserve" && r.URL.Path != "/fence/finalize" && r.URL.Path != "/fence/abort") {
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
	var view FenceView
	switch r.URL.Path {
	case "/fence/reserve":
		view, e = f.Reserve(reservation)
	case "/fence/finalize":
		view, e = f.Finalize(reservation)
	case "/fence/abort":
		view, e = f.Abort(reservation)
	}
	if e != nil {
		switch {
		case errors.Is(e, ErrFenceConflict):
			w.WriteHeader(http.StatusConflict)
		case errors.Is(e, ErrFenceExhausted):
			w.WriteHeader(http.StatusTooManyRequests)
		case errors.Is(e, ErrPolicy):
			w.WriteHeader(http.StatusForbidden)
		default:
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		return
	}
	w.Header().Set("Content-Type", media)
	_, _ = w.Write(view.Bytes())
}

type FenceClient struct {
	origin    string
	ctx       Digest
	authority ed25519.PublicKey
	fence     ed25519.PublicKey
	genesis   Digest
	http      *http.Client
}

func NewFenceClient(origin string, ctx Digest, authority, fence ed25519.PublicKey, genesis Digest) (*FenceClient, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" || u.Port() == "" || u.Host == "" {
		return nil, ErrPolicy
	}
	ip := net.ParseIP(u.Hostname())
	if ip == nil || !ip.IsLoopback() || origin != "http://"+u.Host || ctx == (Digest{}) || genesis == (Digest{}) || len(authority) != ed25519.PublicKeySize || len(fence) != ed25519.PublicKeySize {
		return nil, ErrPolicy
	}
	tr := &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: time.Second}).DialContext, DisableKeepAlives: true}
	h := &http.Client{Transport: tr, Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &FenceClient{origin: origin, ctx: ctx, authority: append(ed25519.PublicKey(nil), authority...), fence: append(ed25519.PublicKey(nil), fence...), genesis: genesis, http: h}, nil
}
func (c *FenceClient) parseView(res *http.Response, path string) (FenceView, error) {
	if res == nil {
		return FenceView{}, ErrFenceUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusConflict {
		return FenceView{}, ErrFenceConflict
	}
	if res.StatusCode == http.StatusTooManyRequests {
		return FenceView{}, ErrFenceExhausted
	}
	if res.StatusCode == http.StatusForbidden {
		return FenceView{}, ErrPolicy
	}
	if res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media || res.Request == nil || res.Request.URL.String() != c.origin+path {
		return FenceView{}, ErrFenceUnavailable
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, fenceViewSize+1))
	if e != nil || len(raw) != fenceViewSize {
		return FenceView{}, ErrFenceUnavailable
	}
	v, e := ParseFenceView(raw)
	if e != nil || !VerifyFenceViewPinned(v, c.ctx, c.authority, c.fence, c.genesis) {
		return FenceView{}, ErrFenceUnavailable
	}
	return v, nil
}
func (c *FenceClient) post(path string, reservation FenceReservation) (FenceView, error) {
	req, e := http.NewRequest(http.MethodPost, c.origin+path, bytes.NewReader(reservation.Bytes()))
	if e != nil {
		return FenceView{}, ErrFenceUnavailable
	}
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil {
		return FenceView{}, ErrFenceUnavailable
	}
	return c.parseView(res, path)
}
func (c *FenceClient) Reserve(r FenceReservation) (FenceView, error)  { return c.post("/fence/reserve", r) }
func (c *FenceClient) Finalize(r FenceReservation) (FenceView, error) { return c.post("/fence/finalize", r) }
func (c *FenceClient) Abort(r FenceReservation) (FenceView, error)    { return c.post("/fence/abort", r) }
func (c *FenceClient) View() (FenceView, error) {
	req, e := http.NewRequest(http.MethodGet, c.origin+"/fence", nil)
	if e != nil {
		return FenceView{}, ErrFenceUnavailable
	}
	res, e := c.http.Do(req)
	if e != nil {
		return FenceView{}, ErrFenceUnavailable
	}
	return c.parseView(res, "/fence")
}
func (c *FenceClient) AttestChallenge(challenge Digest) (FenceAttestation, error) {
	if challenge == (Digest{}) {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	req, e := http.NewRequest(http.MethodPost, c.origin+"/fence/view", bytes.NewReader(challenge[:]))
	if e != nil {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil || res == nil {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media || res.Request == nil || res.Request.URL.String() != c.origin+"/fence/view" {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, fenceAttestationSize+1))
	if e != nil || len(raw) != fenceAttestationSize {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	a, e := ParseFenceAttestation(raw)
	if e != nil || !VerifyFenceAttestation(a, challenge, c.ctx, c.authority, c.fence, c.genesis) {
		return FenceAttestation{}, ErrFenceUnavailable
	}
	return a, nil
}

type FencedResponse struct {
	Authority   AuthorityResponse
	Fence       FenceView
	Reservation FenceReservation
}
func (r FencedResponse) Bytes() []byte {
	b := append([]byte(nil), r.Authority.Bytes()...)
	b = append(b, r.Fence.Bytes()...)
	return append(b, r.Reservation.Bytes()...)
}
func ParseFencedResponse(raw []byte) (FencedResponse, error) {
	if len(raw) != fencedResponseSize {
		return FencedResponse{}, ErrPolicy
	}
	a, e := ParseAuthorityResponse(raw[:authorityResponseSize])
	if e != nil {
		return FencedResponse{}, e
	}
	f, e := ParseFenceView(raw[authorityResponseSize : authorityResponseSize+fenceViewSize])
	if e != nil {
		return FencedResponse{}, e
	}
	reservationRaw := raw[authorityResponseSize+fenceViewSize:]
	var reservation FenceReservation
	if !bytes.Equal(reservationRaw, make([]byte, fenceReservationSize)) {
		reservation, e = ParseFenceReservation(reservationRaw)
		if e != nil {
			return FencedResponse{}, e
		}
	}
	return FencedResponse{Authority: a, Fence: f, Reservation: reservation}, nil
}

type FencedEnvelope struct {
	Authority   AuthorityResponse
	Attestation FenceAttestation
	Reservation FenceReservation
}
func (e FencedEnvelope) Bytes() []byte {
	b := append([]byte(nil), e.Authority.Bytes()...)
	b = append(b, e.Attestation.Bytes()...)
	return append(b, e.Reservation.Bytes()...)
}
func ParseFencedEnvelope(raw []byte) (FencedEnvelope, error) {
	if len(raw) != fencedEnvelopeSize {
		return FencedEnvelope{}, ErrPolicy
	}
	a, er := ParseAuthorityResponse(raw[:authorityResponseSize])
	if er != nil {
		return FencedEnvelope{}, er
	}
	att, er := ParseFenceAttestation(raw[authorityResponseSize : authorityResponseSize+fenceAttestationSize])
	if er != nil {
		return FencedEnvelope{}, er
	}
	reservationRaw := raw[authorityResponseSize+fenceAttestationSize:]
	var reservation FenceReservation
	if !bytes.Equal(reservationRaw, make([]byte, fenceReservationSize)) {
		reservation, er = ParseFenceReservation(reservationRaw)
		if er != nil {
			return FencedEnvelope{}, er
		}
	}
	return FencedEnvelope{Authority: a, Attestation: att, Reservation: reservation}, nil
}
func validFencedContact(r AuthorityResponse, req AuthorityRequest, view FenceView) bool {
	if view.Pending != (Digest{}) || r.Before == (Digest{}) || r.After == (Digest{}) || r.After != view.Head || r.CallerSpent > r.TotalSpent || view.Sequence != uint32(r.TotalSpent) {
		return false
	}
	if (r.Stale == 1) != (req.Expected != r.Before) {
		return false
	}
	if r.Outcome == AuthorityBudget {
		return r.Before == r.After
	}
	if r.Before == r.After || r.CallerSpent == 0 || r.TotalSpent == 0 {
		return false
	}
	if req.Op == AuthorityCommit && r.Stale == 1 {
		return r.Outcome == AuthorityConflict
	}
	if req.Op == AuthorityStatus {
		return r.Outcome == AuthorityCommitted || r.Outcome == AuthorityAbsent
	}
	return req.Op == AuthorityCommit && (r.Outcome == AuthorityCommitted || r.Outcome == AuthorityConflict)
}
func validFenceReservationProof(reservation FenceReservation, response AuthorityResponse, req AuthorityRequest, ctx Digest, authority ed25519.PublicKey, view FenceView) bool {
	if response.Outcome == AuthorityBudget {
		return reservation == (FenceReservation{}) && response.Before == response.After
	}
	if !VerifyFenceReservation(reservation, ctx, authority) ||
		reservation.Before != response.Before || reservation.After != response.After ||
		reservation.RequestHash != req.Hash() || view.LastReservation != reservation.Hash() {
		return false
	}
	return true
}
func VerifyFencedResponse(r FencedResponse, req AuthorityRequest, ctx Digest, authority, fence ed25519.PublicKey, genesis Digest) bool {
	return VerifyAuthorityResponse(r.Authority, req, authority) &&
		VerifyFenceViewPinned(r.Fence, ctx, authority, fence, genesis) &&
		validFencedContact(r.Authority, req, r.Fence) &&
		validFenceReservationProof(r.Reservation, r.Authority, req, ctx, authority, r.Fence)
}
func VerifyFencedEnvelope(e FencedEnvelope, req AuthorityRequest, challenge, ctx Digest, authority, fence ed25519.PublicKey, genesis Digest) bool {
	return VerifyAuthorityResponse(e.Authority, req, authority) &&
		VerifyFenceAttestation(e.Attestation, challenge, ctx, authority, fence, genesis) &&
		validFencedContact(e.Authority, req, e.Attestation.View) &&
		validFenceReservationProof(e.Reservation, e.Authority, req, ctx, authority, e.Attestation.View)
}

type FencedCoordinator struct {
	authority *SharedAuthority
	fence     *FenceClient
	fault     func(string) error
}

func NewFencedCoordinator(authority *SharedAuthority, fence *FenceClient) (*FencedCoordinator, error) {
	if authority == nil || fence == nil || authority.ctx != fence.ctx || !bytes.Equal(authority.signer.Public().(ed25519.PublicKey), fence.authority) {
		return nil, ErrPolicy
	}
	return &FencedCoordinator{authority: authority, fence: fence}, nil
}
func (c *FencedCoordinator) intentPath() string { return filepath.Join(c.authority.dir, fenceIntentName) }
func (c *FencedCoordinator) loadIntentLocked() (FenceReservation, bool, error) {
	path := c.intentPath()
	info, e := os.Lstat(path)
	if errors.Is(e, os.ErrNotExist) {
		return FenceReservation{}, false, nil
	}
	if e != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 || info.Size() != fenceReservationSize {
		return FenceReservation{}, false, ErrStore
	}
	file, e := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if e != nil {
		return FenceReservation{}, false, ErrStore
	}
	opened, e := file.Stat()
	if e != nil || !opened.Mode().IsRegular() || opened.Mode().Perm()&0077 != 0 || opened.Size() != fenceReservationSize || !os.SameFile(info, opened) {
		file.Close()
		return FenceReservation{}, false, ErrStore
	}
	raw, e := io.ReadAll(io.LimitReader(file, fenceReservationSize+1))
	ce := file.Close()
	if e != nil || ce != nil {
		return FenceReservation{}, false, ErrStore
	}
	reservation, e := ParseFenceReservation(raw)
	if e != nil || !VerifyFenceReservation(reservation, c.authority.ctx, c.authority.signer.Public().(ed25519.PublicKey)) {
		return FenceReservation{}, false, ErrStore
	}
	return reservation, true, nil
}
func (c *FencedCoordinator) persistIntentLocked(reservation FenceReservation) error {
	if _, exists, e := c.loadIntentLocked(); e != nil {
		return e
	} else if exists {
		return ErrStore
	}
	file, e := os.CreateTemp(c.authority.dir, ".fence-intent-")
	if e != nil {
		return e
	}
	defer os.Remove(file.Name())
	defer file.Close()
	raw := reservation.Bytes()
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
func (c *FencedCoordinator) clearIntentLocked() error {
	e := os.Remove(c.intentPath())
	if errors.Is(e, os.ErrNotExist) {
		return nil
	}
	if e != nil {
		return e
	}
	return syncDirectory(c.authority.dir)
}
func randomFenceToken() (Digest, error) {
	for i := 0; i < 2; i++ {
		var token Digest
		if _, e := rand.Read(token[:]); e != nil {
			return Digest{}, e
		}
		if token != (Digest{}) {
			return token, nil
		}
	}
	return Digest{}, ErrUnknown
}
func (c *FencedCoordinator) recoverLocked() error {
	a := c.authority
	if a.lock == nil || a.poisoned {
		return ErrStore
	}
	reservation, exists, e := c.loadIntentLocked()
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
			// A pending reservation without the authority-side durable intent
			// cannot be safely auto-aborted. A cloned authority could otherwise
			// clear another writer's admission while a delayed external effect
			// is still possible. Preserve the orphan as fail-closed evidence.
			return ErrFenceOrphaned
		}
		return nil
	}
	hash := reservation.Hash()
	switch {
	case current == reservation.Before && view.Head == reservation.Before && view.Pending == (Digest{}):
		return c.clearIntentLocked()
	case current == reservation.Before && view.Head == reservation.Before && view.Pending == hash:
		next, e := c.fence.Abort(reservation)
		if e != nil {
			return ErrFenceUnavailable
		}
		if next.Head != reservation.Before || next.Pending != (Digest{}) {
			return ErrWitnessRollback
		}
		if c.fault != nil {
			if e = c.fault("after-recover-abort"); e != nil {
				return ErrUnknown
			}
		}
		return c.clearIntentLocked()
	case current == reservation.After && view.Head == reservation.Before && view.Pending == hash:
		next, e := c.fence.Finalize(reservation)
		if e != nil {
			return ErrFenceUnavailable
		}
		if next.Head != reservation.After || next.Pending != (Digest{}) {
			return ErrWitnessRollback
		}
		if c.fault != nil {
			if e = c.fault("after-recover-finalize"); e != nil {
				return ErrUnknown
			}
		}
		return c.clearIntentLocked()
	case current == reservation.After && view.Head == reservation.After && view.Pending == (Digest{}):
		return c.clearIntentLocked()
	default:
		return ErrWitnessRollback
	}
}
func (c *FencedCoordinator) Recover() error {
	a := c.authority
	a.mu.Lock()
	defer a.mu.Unlock()
	return c.recoverLocked()
}
func (c *FencedCoordinator) processLocked(req AuthorityRequest) (FencedResponse, error) {
	a := c.authority
	if a.lock == nil || a.poisoned {
		return FencedResponse{}, ErrStore
	}
	if e := a.preflight(req); e != nil {
		return FencedResponse{}, e
	}
	if e := c.recoverLocked(); e != nil {
		return FencedResponse{}, e
	}
	plan, e := a.planLocked(req)
	if e != nil {
		return FencedResponse{}, e
	}
	if !plan.persist {
		response, e := a.applyPlanLocked(req, plan)
		if e != nil {
			return FencedResponse{}, e
		}
		view, e := c.fence.View()
		if e != nil {
			return FencedResponse{}, ErrFenceUnavailable
		}
		out := FencedResponse{Authority: response, Fence: view}
		if !VerifyFencedResponse(out, req, a.ctx, a.signer.Public().(ed25519.PublicKey), c.fence.fence, c.fence.genesis) {
			return FencedResponse{}, ErrWitnessRollback
		}
		return out, nil
	}
	token, e := randomFenceToken()
	if e != nil {
		return FencedResponse{}, e
	}
	reservation, e := SignFenceReservation(a.ctx, plan.before, plan.after, req.Hash(), token, a.signer)
	if e != nil {
		return FencedResponse{}, e
	}
	if e = c.persistIntentLocked(reservation); e != nil {
		return FencedResponse{}, e
	}
	if c.fault != nil {
		if e = c.fault("after-intent"); e != nil {
			return FencedResponse{}, ErrUnknown
		}
	}
	reserved, e := c.fence.Reserve(reservation)
	if e != nil {
		if errors.Is(e, ErrFenceConflict) || errors.Is(e, ErrFenceExhausted) {
			return FencedResponse{}, e
		}
		return FencedResponse{}, ErrFenceUnavailable
	}
	if reserved.Head != plan.before || reserved.Pending != reservation.Hash() {
		return FencedResponse{}, ErrWitnessRollback
	}
	if c.fault != nil {
		if e = c.fault("after-reserve"); e != nil {
			return FencedResponse{}, ErrUnknown
		}
	}
	response, e := a.applyPlanLocked(req, plan)
	if e != nil {
		return FencedResponse{}, e
	}
	if c.fault != nil {
		if e = c.fault("after-authority"); e != nil {
			return FencedResponse{}, ErrUnknown
		}
	}
	finalized, e := c.fence.Finalize(reservation)
	if e != nil {
		return FencedResponse{}, ErrUnknown
	}
	if finalized.Head != plan.after || finalized.Pending != (Digest{}) {
		return FencedResponse{}, ErrWitnessRollback
	}
	if c.fault != nil {
		if e = c.fault("after-finalize"); e != nil {
			return FencedResponse{}, ErrUnknown
		}
	}
	if e = c.clearIntentLocked(); e != nil {
		return FencedResponse{}, ErrUnknown
	}
	if c.fault != nil {
		if e = c.fault("after-clear"); e != nil {
			return FencedResponse{}, ErrUnknown
		}
	}
	out := FencedResponse{Authority: response, Fence: finalized, Reservation: reservation}
	if !VerifyFencedResponse(out, req, a.ctx, a.signer.Public().(ed25519.PublicKey), c.fence.fence, c.fence.genesis) {
		return FencedResponse{}, ErrWitnessRollback
	}
	return out, nil
}
func (c *FencedCoordinator) Process(req AuthorityRequest) (FencedResponse, error) {
	a := c.authority
	a.mu.Lock()
	defer a.mu.Unlock()
	return c.processLocked(req)
}
func (c *FencedCoordinator) ProcessAttested(req AuthorityRequest, challenge Digest) (FencedEnvelope, error) {
	if challenge == (Digest{}) {
		return FencedEnvelope{}, ErrPolicy
	}
	a := c.authority
	a.mu.Lock()
	defer a.mu.Unlock()
	response, e := c.processLocked(req)
	if e != nil {
		return FencedEnvelope{}, e
	}
	attestation, e := c.fence.AttestChallenge(challenge)
	if e != nil {
		return FencedEnvelope{}, ErrFenceUnavailable
	}
	if attestation.View != response.Fence {
		return FencedEnvelope{}, ErrWitnessRollback
	}
	envelope := FencedEnvelope{Authority: response.Authority, Attestation: attestation, Reservation: response.Reservation}
	if !VerifyFencedEnvelope(envelope, req, challenge, a.ctx, a.signer.Public().(ed25519.PublicKey), c.fence.fence, c.fence.genesis) {
		return FencedEnvelope{}, ErrWitnessRollback
	}
	return envelope, nil
}
