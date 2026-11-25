//go:build linux

package actionprotocol

// Strongest current synthetic external boundary:
// exact grant + fresh independently witnessed policy decision + pre-effect
// admission reservation + authority result + fresh fence attestation.
// Both independent attestations bind the same caller challenge. The client also
// retains policy/fence sequence high-water marks. This is not trusted time,
// distributed consensus, or a generic arbitrary-effect transaction protocol.
import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const grantPolicyDecisionDomain = "SUTRA/grant-policy-decision/v1\x00"
const grantPolicyDecisionBodySize = grantIDSize + 32 + 32 + 1 + 1 + 8
const grantPolicyDecisionSize = grantPolicyDecisionBodySize + ed25519.SignatureSize
const anchoredFencedEnvelopeSize = fencedEnvelopeSize + grantPolicyDecisionSize + grantPolicyMembershipSize
const clientPolicyPinDomain = "SUTRA/client-policy-pin/v1\x00"
const clientPolicyPinSize = 4 + 32 + ed25519.SignatureSize
const pinnedGrantedAuthorityRequestSize = grantedAuthorityRequestSize + clientPolicyPinSize
const fenceChallengeHeader = "X-Sutra-Fence-Challenge"

type ClientPolicyPin struct {
	Sequence  uint32
	Head      Digest
	Signature [ed25519.SignatureSize]byte
}
func (p ClientPolicyPin) body() []byte {
	b := binary.BigEndian.AppendUint32(nil, p.Sequence)
	return append(b, p.Head[:]...)
}
func (p ClientPolicyPin) message(ctx Digest, grant GrantID, requestHash Digest) []byte {
	b := append([]byte(clientPolicyPinDomain), ctx[:]...)
	b = append(b, grant[:]...)
	b = append(b, requestHash[:]...)
	return append(b, p.body()...)
}
func (p ClientPolicyPin) Bytes() []byte { return append(p.body(), p.Signature[:]...) }
func SignClientPolicyPin(ctx Digest, grant GrantID, requestHash Digest, sequence uint32, head Digest, caller ed25519.PrivateKey) (ClientPolicyPin, error) {
	if ctx == (Digest{}) || grant == (GrantID{}) || requestHash == (Digest{}) || head == (Digest{}) ||
		sequence > grantPolicyMaxTransitions || len(caller) != ed25519.PrivateKeySize {
		return ClientPolicyPin{}, ErrPolicy
	}
	p := ClientPolicyPin{Sequence: sequence, Head: head}
	copy(p.Signature[:], ed25519.Sign(caller, p.message(ctx, grant, requestHash)))
	return p, nil
}
func ParseClientPolicyPin(raw []byte) (ClientPolicyPin, error) {
	var p ClientPolicyPin
	if len(raw) != clientPolicyPinSize {
		return p, ErrPolicy
	}
	p.Sequence = binary.BigEndian.Uint32(raw[:4])
	copy(p.Head[:], raw[4:36])
	copy(p.Signature[:], raw[36:])
	if p.Sequence > grantPolicyMaxTransitions || p.Head == (Digest{}) {
		return ClientPolicyPin{}, ErrPolicy
	}
	return p, nil
}
func VerifyClientPolicyPin(p ClientPolicyPin, ctx Digest, grant GrantID, requestHash Digest, caller ed25519.PublicKey) bool {
	return ctx != (Digest{}) && grant != (GrantID{}) && requestHash != (Digest{}) && p.Head != (Digest{}) &&
		p.Sequence <= grantPolicyMaxTransitions && len(caller) == ed25519.PublicKeySize &&
		ed25519.Verify(caller, p.message(ctx, grant, requestHash), p.Signature[:])
}

type PinnedGrantedAuthorityRequest struct {
	Granted GrantedAuthorityRequest
	Pin     ClientPolicyPin
}
func (r PinnedGrantedAuthorityRequest) Bytes() []byte {
	b := append([]byte(nil), r.Granted.Bytes()...)
	return append(b, r.Pin.Bytes()...)
}
func ParsePinnedGrantedAuthorityRequest(raw []byte) (PinnedGrantedAuthorityRequest, error) {
	if len(raw) != pinnedGrantedAuthorityRequestSize {
		return PinnedGrantedAuthorityRequest{}, ErrPolicy
	}
	granted, e := ParseGrantedAuthorityRequest(raw[:grantedAuthorityRequestSize])
	if e != nil {
		return PinnedGrantedAuthorityRequest{}, e
	}
	pin, e := ParseClientPolicyPin(raw[grantedAuthorityRequestSize:])
	if e != nil {
		return PinnedGrantedAuthorityRequest{}, e
	}
	return PinnedGrantedAuthorityRequest{Granted: granted, Pin: pin}, nil
}

type GrantPolicyDecision struct {
	GrantID    GrantID
	ActionHash Digest
	PolicyHead Digest
	Class      GrantClass
	Operation  byte
	Epoch      uint64
	Signature  [ed25519.SignatureSize]byte
}
func (d GrantPolicyDecision) body() []byte {
	b := append([]byte(nil), d.GrantID[:]...)
	b = append(b, d.ActionHash[:]...)
	b = append(b, d.PolicyHead[:]...)
	b = append(b, byte(d.Class), d.Operation)
	return binary.BigEndian.AppendUint64(b, d.Epoch)
}
func (d GrantPolicyDecision) message(ctx Digest) []byte {
	b := append([]byte(grantPolicyDecisionDomain), ctx[:]...)
	return append(b, d.body()...)
}
func (d GrantPolicyDecision) Bytes() []byte { return append(d.body(), d.Signature[:]...) }
func ParseGrantPolicyDecision(raw []byte) (GrantPolicyDecision, error) {
	var d GrantPolicyDecision
	if len(raw) != grantPolicyDecisionSize {
		return d, ErrPolicy
	}
	copy(d.GrantID[:], raw[:grantIDSize])
	copy(d.ActionHash[:], raw[grantIDSize:grantIDSize+32])
	copy(d.PolicyHead[:], raw[grantIDSize+32:grantIDSize+64])
	d.Class = GrantClass(raw[grantIDSize+64])
	d.Operation = raw[grantIDSize+65]
	d.Epoch = binary.BigEndian.Uint64(raw[grantIDSize+66 : grantIDSize+74])
	copy(d.Signature[:], raw[grantPolicyDecisionBodySize:])
	if d.GrantID == (GrantID{}) || d.ActionHash == (Digest{}) || d.PolicyHead == (Digest{}) ||
		(d.Class != GrantPrimary && d.Class != GrantCompensation) ||
		(d.Operation != AuthorityCommit && d.Operation != AuthorityStatus) || d.Epoch > maxGrantEpoch {
		return GrantPolicyDecision{}, ErrPolicy
	}
	return d, nil
}
func signGrantPolicyDecision(ctx Digest, grant ActionGrant, req AuthorityRequest, policyHead Digest, epoch uint64, bookKey ed25519.PrivateKey) (GrantPolicyDecision, error) {
	if ctx == (Digest{}) || policyHead == (Digest{}) || len(bookKey) != ed25519.PrivateKeySize || epoch > maxGrantEpoch ||
		grant.ID == (GrantID{}) || req.Action.Hash() != grant.RequestHash || req.Action.Context != ctx ||
		(req.Op != AuthorityCommit && req.Op != AuthorityStatus) {
		return GrantPolicyDecision{}, ErrPolicy
	}
	d := GrantPolicyDecision{
		GrantID: grant.ID, ActionHash: req.Action.Hash(), PolicyHead: policyHead,
		Class: grant.Class, Operation: req.Op, Epoch: epoch,
	}
	copy(d.Signature[:], ed25519.Sign(bookKey, d.message(ctx)))
	return d, nil
}
func VerifyGrantPolicyDecision(d GrantPolicyDecision, grant ActionGrant, req AuthorityRequest, ctx Digest, bookSigner ed25519.PublicKey) bool {
	if ctx == (Digest{}) || len(bookSigner) != ed25519.PublicKeySize ||
		d.GrantID != grant.ID || d.ActionHash != req.Action.Hash() || d.ActionHash != grant.RequestHash ||
		d.PolicyHead == (Digest{}) || d.Class != grant.Class || d.Operation != req.Op || d.Epoch > maxGrantEpoch ||
		!ed25519.Verify(bookSigner, d.message(ctx), d.Signature[:]) {
		return false
	}
	if req.Op == AuthorityCommit && (d.Epoch < grant.NotBefore || d.Epoch > grant.ExpiresAfter) {
		return false
	}
	return true
}

func (c *GrantPolicyClient) AttestChallenge(challenge Digest) (GrantPolicyAttestation, error) {
	if challenge == (Digest{}) {
		return GrantPolicyAttestation{}, ErrGrantPolicyUnavailable
	}
	req, e := http.NewRequest(http.MethodPost, c.origin+"/grant-policy/view", bytes.NewReader(challenge[:]))
	if e != nil {
		return GrantPolicyAttestation{}, ErrGrantPolicyUnavailable
	}
	req.Header.Set("Content-Type", media)
	req.Header.Set("Accept", media)
	res, e := c.http.Do(req)
	if e != nil || res == nil {
		return GrantPolicyAttestation{}, ErrGrantPolicyUnavailable
	}
	raw, readErr := io.ReadAll(io.LimitReader(res.Body, grantPolicyAttestationSize+1))
	closeErr := res.Body.Close()
	if readErr != nil || closeErr != nil || len(raw) != grantPolicyAttestationSize ||
		res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != media ||
		res.Request == nil || res.Request.URL.String() != c.origin+"/grant-policy/view" {
		return GrantPolicyAttestation{}, ErrGrantPolicyUnavailable
	}
	a, e := ParseGrantPolicyAttestation(raw)
	if e != nil || !VerifyGrantPolicyAttestation(a, challenge, c.ctx, c.bookSigner, c.witness, c.genesis) {
		return GrantPolicyAttestation{}, ErrGrantPolicyUnavailable
	}
	return a, nil
}

type AnchoredFencedEnvelope struct {
	Fenced     FencedEnvelope
	Decision   GrantPolicyDecision
	Membership GrantPolicyMembershipAttestation
}
func (e AnchoredFencedEnvelope) Bytes() []byte {
	b := append([]byte(nil), e.Fenced.Bytes()...)
	b = append(b, e.Decision.Bytes()...)
	return append(b, e.Membership.Bytes()...)
}
func ParseAnchoredFencedEnvelope(raw []byte) (AnchoredFencedEnvelope, error) {
	if len(raw) != anchoredFencedEnvelopeSize {
		return AnchoredFencedEnvelope{}, ErrPolicy
	}
	fenced, e := ParseFencedEnvelope(raw[:fencedEnvelopeSize])
	if e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	offset := fencedEnvelopeSize
	decision, e := ParseGrantPolicyDecision(raw[offset : offset+grantPolicyDecisionSize])
	if e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	offset += grantPolicyDecisionSize
	membership, e := ParseGrantPolicyMembershipAttestation(raw[offset:])
	if e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	return AnchoredFencedEnvelope{Fenced: fenced, Decision: decision, Membership: membership}, nil
}
func VerifyAnchoredFencedEnvelope(e AnchoredFencedEnvelope, grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge, ctx Digest,
	caller, authority, fence, consent, bookSigner, policyWitness ed25519.PublicKey, fenceGenesis, policyGenesis Digest) bool {
	return VerifyClientPolicyPin(pin, ctx, grant.ID, req.Hash(), caller) &&
		VerifyActionGrant(grant, req.Action, consent) &&
		VerifyGrantPolicyDecision(e.Decision, grant, req, ctx, bookSigner) &&
		VerifyGrantPolicyMembershipAttestation(e.Membership, challenge, pin.Sequence, pin.Head, ctx, bookSigner, policyWitness, policyGenesis) &&
		e.Decision.PolicyHead == e.Membership.View.Head &&
		VerifyFencedEnvelope(e.Fenced, req, challenge, ctx, authority, fence, fenceGenesis)
}

func (g *AnchoredFencedGrantGuard) ProcessCompositePinned(grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, challenge Digest) (AnchoredFencedEnvelope, error) {
	if challenge == (Digest{}) {
		return AnchoredFencedEnvelope{}, ErrPolicy
	}
	a := g.coordinator.authority
	if e := a.preflight(req); e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	if req.Caller >= authorityCallers || !VerifyClientPolicyPin(pin, a.ctx, grant.ID, req.Hash(), a.callers[req.Caller]) {
		return AnchoredFencedEnvelope{}, ErrAuthorityAuth
	}
	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()
	// Reject malformed grant identity/class locally before a policy witness
	// request. Then reconcile the exact current book to a fresh witness view.
	if req.Op == AuthorityCommit {
		class := grant.Class
		if e := g.policy.validateGrantIdentityLocked(grant, req.Action, &class); e != nil {
			return AnchoredFencedEnvelope{}, e
		}
	} else if req.Op == AuthorityStatus {
		if e := g.policy.validateGrantIdentityLocked(grant, req.Action, nil); e != nil {
			return AnchoredFencedEnvelope{}, e
		}
	} else {
		return AnchoredFencedEnvelope{}, ErrPolicy
	}
	// The policy mutation/reconcile path itself refreshes the independent
	// witness. After that exact decision, require the caller's signed prior pin
	// to be an actual member of the witness's CURRENT retained history. This is
	// stronger than sequence >= pin.Sequence: an alternate 2-prime/3-prime
	// branch cannot satisfy membership for the caller's exact old head.
	switch req.Op {
	case AuthorityCommit:
		if e := g.policy.reserveDispatchLocked(grant, req.Action, grant.Class); e != nil {
			return AnchoredFencedEnvelope{}, e
		}
	case AuthorityStatus:
		if e := g.policy.checkReconcileLocked(grant, req.Action); e != nil {
			return AnchoredFencedEnvelope{}, e
		}
	}
	policyHead := b.policyHeadLocked()
	decision, e := signGrantPolicyDecision(b.ctx, grant, req, policyHead, b.epoch, b.signer)
	if e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	membership, e := g.policy.witness.AttestMembershipChallenge(challenge, pin.Sequence, pin.Head)
	if e != nil {
		if errors.Is(e, ErrGrantPolicyRollback) {
			return AnchoredFencedEnvelope{}, ErrGrantPolicyRollback
		}
		return AnchoredFencedEnvelope{}, ErrGrantPolicyUnavailable
	}
	if membership.View.Head != policyHead {
		return AnchoredFencedEnvelope{}, ErrGrantPolicyRollback
	}
	fenced, e := g.coordinator.ProcessAttested(req, challenge)
	if e != nil {
		return AnchoredFencedEnvelope{}, e
	}
	out := AnchoredFencedEnvelope{Fenced: fenced, Decision: decision, Membership: membership}
	if !VerifyAnchoredFencedEnvelope(out, grant, req, pin, challenge, b.ctx,
		a.callers[req.Caller], a.signer.Public().(ed25519.PublicKey), g.coordinator.fence.fence,
		b.consent, b.signer.Public().(ed25519.PublicKey), g.policy.witness.witness,
		g.coordinator.fence.genesis, g.policy.witness.genesis) {
		return AnchoredFencedEnvelope{}, ErrWitnessRollback
	}
	return out, nil
}

// ResolveCompositeOrphanPinned clears only a pre-effect orphan and keeps the
// strongest caller/policy boundary intact. It is intentionally an in-process
// operator API, not a second HTTP write route. The original commit request and
// caller policy pin must still be valid members of the current retained policy
// history before the separately keyed permanent-closure proof is consumed.
func (g *AnchoredFencedGrantGuard) ResolveCompositeOrphanPinned(grant ActionGrant, req AuthorityRequest, pin ClientPolicyPin, proof EffectClosureProof) error {
	if req.Op != AuthorityCommit {
		return ErrPolicy
	}
	a := g.coordinator.authority
	if e := a.preflight(req); e != nil {
		return e
	}
	if req.Caller >= authorityCallers || !VerifyClientPolicyPin(pin, a.ctx, grant.ID, req.Hash(), a.callers[req.Caller]) {
		return ErrAuthorityAuth
	}
	b := g.policy.book
	b.mu.Lock()
	defer b.mu.Unlock()
	if e := g.policy.checkReconcileLocked(grant, req.Action); e != nil {
		return e
	}
	policyHead := b.policyHeadLocked()
	challenge, e := randomCompositeChallenge()
	if e != nil {
		return ErrUnknown
	}
	membership, e := g.policy.witness.AttestMembershipChallenge(challenge, pin.Sequence, pin.Head)
	if e != nil {
		if errors.Is(e, ErrGrantPolicyRollback) {
			return ErrGrantPolicyRollback
		}
		return ErrGrantPolicyUnavailable
	}
	if membership.View.Head != policyHead ||
		!VerifyGrantPolicyMembershipAttestation(membership, challenge, pin.Sequence, pin.Head, b.ctx,
			b.signer.Public().(ed25519.PublicKey), g.policy.witness.witness, g.policy.witness.genesis) {
		return ErrGrantPolicyRollback
	}
	return g.coordinator.ResolveOrphanWithClosureProof(proof)
}

func parseFenceChallengeHeader(r *http.Request) (Digest, error) {
	var challenge Digest
	if r == nil {
		return challenge, ErrPolicy
	}
	values := r.Header.Values(fenceChallengeHeader)
	if len(values) != 1 || len(values[0]) != 64 {
		return challenge, ErrPolicy
	}
	raw, e := hex.DecodeString(values[0])
	if e != nil || len(raw) != 32 || hex.EncodeToString(raw) != values[0] {
		return challenge, ErrPolicy
	}
	copy(challenge[:], raw)
	if challenge == (Digest{}) {
		return Digest{}, ErrPolicy
	}
	return challenge, nil
}
func (g *AnchoredFencedGrantGuard) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodPost || r.URL.Path != "/authority-granted-fenced" || r.URL.RawQuery != "" ||
		r.Header.Get("Content-Type") != media || r.Header.Get("Accept") != media {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	challenge, e := parseFenceChallengeHeader(r)
	if e != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(r.Body, pinnedGrantedAuthorityRequestSize+1))
	if e != nil || len(raw) != pinnedGrantedAuthorityRequestSize {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	request, e := ParsePinnedGrantedAuthorityRequest(raw)
	if e != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	response, e := g.ProcessCompositePinned(request.Granted.Grant, request.Granted.Authority, request.Pin, challenge)
	if e != nil {
		switch {
		case errors.Is(e, ErrGrantInactive), errors.Is(e, ErrGrantRevoked), errors.Is(e, ErrGrantClass),
			errors.Is(e, ErrGrantNotDispatched), errors.Is(e, ErrAuthorityAuth), errors.Is(e, ErrPolicy):
			w.WriteHeader(http.StatusForbidden)
		case errors.Is(e, ErrGrantPolicyRollback), errors.Is(e, ErrFenceConflict), errors.Is(e, ErrWitnessRollback), errors.Is(e, ErrHeadConflict):
			w.WriteHeader(http.StatusConflict)
		case errors.Is(e, ErrGrantPolicyUnavailable), errors.Is(e, ErrFenceUnavailable), errors.Is(e, ErrUnknown):
			w.WriteHeader(http.StatusServiceUnavailable)
		default:
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	w.Header().Set("Content-Type", media)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(response.Bytes())
}

func randomCompositeChallenge() (Digest, error) {
	for i := 0; i < 2; i++ {
		var challenge Digest
		if _, e := rand.Read(challenge[:]); e != nil {
			return Digest{}, e
		}
		if challenge != (Digest{}) {
			return challenge, nil
		}
	}
	return Digest{}, ErrUnknown
}

type AnchoredFencedGrantClient struct {
	mu             sync.Mutex
	origin         string
	caller         byte
	key            ed25519.PrivateKey
	authority      ed25519.PublicKey
	fence          ed25519.PublicKey
	consent        ed25519.PublicKey
	bookSigner     ed25519.PublicKey
	policyWitness  ed25519.PublicKey
	ctx            Digest
	fenceGenesis   Digest
	policyGenesis  Digest
	action         Request
	grant          ActionGrant
	head           Digest
	fenceSequence  uint32
	policyHead     Digest
	policySequence uint32
	http           *http.Client
	challenge      func() (Digest, error)
	lastChallenge  Digest
	contacts       int
}
func NewAnchoredFencedGrantClient(origin string, caller byte, key ed25519.PrivateKey,
	authority, fence, consent, bookSigner, policyWitness ed25519.PublicKey, ctx, fenceGenesis, policyGenesis Digest,
	fencePin FenceView, policyPin GrantPolicyView, action Request, grant ActionGrant) (*AnchoredFencedGrantClient, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" || u.Port() == "" || u.Host == "" {
		return nil, ErrPolicy
	}
	ip := net.ParseIP(u.Hostname())
	if ip == nil || !ip.IsLoopback() || origin != "http://"+u.Host || caller >= authorityCallers || len(key) != ed25519.PrivateKeySize ||
		len(authority) != ed25519.PublicKeySize || len(fence) != ed25519.PublicKeySize || len(consent) != ed25519.PublicKeySize ||
		len(bookSigner) != ed25519.PublicKeySize || len(policyWitness) != ed25519.PublicKeySize ||
		ctx == (Digest{}) || fenceGenesis == (Digest{}) || policyGenesis == (Digest{}) || action.Key == (Key{}) || action.Context != ctx ||
		fencePin.Pending != (Digest{}) || fencePin.Sequence > authorityTotalContacts ||
		!VerifyFenceViewPinned(fencePin, ctx, authority, fence, fenceGenesis) ||
		!VerifyGrantPolicyViewPinned(policyPin, ctx, bookSigner, policyWitness, policyGenesis) ||
		!VerifyActionGrant(grant, action, consent) {
		return nil, ErrPolicy
	}
	tr := &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: time.Second}).DialContext, DisableKeepAlives: true}
	h := &http.Client{Transport: tr, Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &AnchoredFencedGrantClient{
		origin: origin, caller: caller, key: append(ed25519.PrivateKey(nil), key...),
		authority: append(ed25519.PublicKey(nil), authority...), fence: append(ed25519.PublicKey(nil), fence...),
		consent: append(ed25519.PublicKey(nil), consent...), bookSigner: append(ed25519.PublicKey(nil), bookSigner...),
		policyWitness: append(ed25519.PublicKey(nil), policyWitness...), ctx: ctx,
		fenceGenesis: fenceGenesis, policyGenesis: policyGenesis, action: action, grant: grant,
		head: fencePin.Head, fenceSequence: fencePin.Sequence, policyHead: policyPin.Head, policySequence: policyPin.Sequence,
		http: h, challenge: randomCompositeChallenge,
	}, nil
}
func (c *AnchoredFencedGrantClient) Head() Digest { c.mu.Lock(); defer c.mu.Unlock(); return c.head }
func (c *AnchoredFencedGrantClient) FenceSequence() uint32 { c.mu.Lock(); defer c.mu.Unlock(); return c.fenceSequence }
func (c *AnchoredFencedGrantClient) PolicySequence() uint32 { c.mu.Lock(); defer c.mu.Unlock(); return c.policySequence }
func (c *AnchoredFencedGrantClient) Contacts() int { c.mu.Lock(); defer c.mu.Unlock(); return c.contacts }

func (c *AnchoredFencedGrantClient) exchange(op byte) (Receipt, AnchoredFencedEnvelope, error) {
	req, e := SignAuthorityRequest(c.caller, op, c.head, c.action, c.key)
	if e != nil {
		return Receipt{}, AnchoredFencedEnvelope{}, e
	}
	challenge, e := c.challenge()
	if e != nil || challenge == (Digest{}) || challenge == c.lastChallenge {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	c.lastChallenge = challenge
	c.contacts++
	pin, e := SignClientPolicyPin(c.ctx, c.grant.ID, req.Hash(), c.policySequence, c.policyHead, c.key)
	if e != nil {
		return Receipt{}, AnchoredFencedEnvelope{}, e
	}
	wire := PinnedGrantedAuthorityRequest{Granted: GrantedAuthorityRequest{Grant: c.grant, Authority: req}, Pin: pin}
	h, e := http.NewRequest(http.MethodPost, c.origin+"/authority-granted-fenced", bytes.NewReader(wire.Bytes()))
	if e != nil {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	h.GetBody = nil
	h.Header.Set("Content-Type", media)
	h.Header.Set("Accept", media)
	h.Header.Set(fenceChallengeHeader, hex.EncodeToString(challenge[:]))
	res, e := c.http.Do(h)
	if e != nil {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	defer res.Body.Close()
	switch res.StatusCode {
	case http.StatusForbidden:
		return Receipt{}, AnchoredFencedEnvelope{}, ErrPolicy
	case http.StatusConflict:
		return Receipt{}, AnchoredFencedEnvelope{}, ErrWitnessRollback
	case http.StatusServiceUnavailable:
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	case http.StatusOK:
	default:
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	if res.Header.Get("Content-Type") != media || res.Request == nil || res.Request.URL.String() != c.origin+"/authority-granted-fenced" {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	raw, e := io.ReadAll(io.LimitReader(res.Body, anchoredFencedEnvelopeSize+1))
	if e != nil || len(raw) != anchoredFencedEnvelopeSize {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	response, e := ParseAnchoredFencedEnvelope(raw)
	if e != nil || !VerifyAnchoredFencedEnvelope(response, c.grant, req, pin, challenge, c.ctx,
		c.key.Public().(ed25519.PublicKey), c.authority, c.fence, c.consent, c.bookSigner, c.policyWitness, c.fenceGenesis, c.policyGenesis) {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	policy := response.Membership.View
	if policy.Sequence < c.policySequence ||
		(policy.Sequence == c.policySequence && policy.Head != c.policyHead) ||
		(policy.Sequence > c.policySequence && policy.Head == c.policyHead) {
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
	view := response.Fenced.Attestation.View
	if response.Fenced.Authority.After == c.head {
		if view.Sequence != c.fenceSequence || response.Fenced.Authority.Before != c.head || response.Fenced.Authority.Outcome != AuthorityBudget {
			return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
		}
	} else {
		if view.Sequence <= c.fenceSequence {
			return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
		}
		if response.Fenced.Authority.Before == c.head {
			if view.Sequence != c.fenceSequence+1 {
				return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
			}
		} else if response.Fenced.Authority.Outcome != AuthorityBudget && view.Sequence <= c.fenceSequence+1 {
			return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
		}
	}
	c.head, c.fenceSequence = response.Fenced.Authority.After, view.Sequence
	c.policyHead, c.policySequence = policy.Head, policy.Sequence
	switch response.Fenced.Authority.Outcome {
	case AuthorityCommitted:
		return response.Fenced.Authority.Receipt, response, nil
	case AuthorityAbsent:
		return Receipt{}, response, ErrAbsent
	case AuthorityConflict:
		return Receipt{}, response, ErrHeadConflict
	case AuthorityBudget:
		return Receipt{}, response, ErrContacts
	default:
		return Receipt{}, AnchoredFencedEnvelope{}, ErrUnknown
	}
}
func (c *AnchoredFencedGrantClient) Commit() (Receipt, AnchoredFencedEnvelope, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.exchange(AuthorityCommit)
}
func (c *AnchoredFencedGrantClient) Status() (Receipt, AnchoredFencedEnvelope, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.exchange(AuthorityStatus)
}
