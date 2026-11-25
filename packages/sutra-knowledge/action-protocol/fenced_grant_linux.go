//go:build linux

package actionprotocol

// FencedGrantGuard composes the exact durable grant policy with pre-effect
// independent admission. It closes the old bridge's simultaneous-authority
// local-effect race for this path, but it does not make GrantBook rollback
// resistant: restoring an older valid signed GrantBook remains a policy
// rollback counterexample until grant state has an independent monotonic root.
type FencedGrantGuard struct {
	book        *GrantBook
	coordinator *FencedCoordinator
}

func NewFencedGrantGuard(book *GrantBook, coordinator *FencedCoordinator) (*FencedGrantGuard, error) {
	if book == nil || coordinator == nil || book.ctx != coordinator.authority.ctx ||
		!bytesEqualPublic(book.approver, coordinator.authority.approver) {
		return nil, ErrPolicy
	}
	return &FencedGrantGuard{book: book, coordinator: coordinator}, nil
}

// bytesEqualPublic avoids exporting mutable key slices from either component.
func bytesEqualPublic(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	var diff byte
	for i := range a {
		diff |= a[i] ^ b[i]
	}
	return diff == 0
}

func (g *FencedGrantGuard) Commit(grant ActionGrant, req AuthorityRequest, class GrantClass) (FencedResponse, error) {
	if req.Op != AuthorityCommit {
		return FencedResponse{}, ErrPolicy
	}
	if e := g.coordinator.authority.preflight(req); e != nil {
		return FencedResponse{}, e
	}
	// Keep revocation/epoch changes outside the interval between final policy
	// admission and independent fence reservation.
	g.book.mu.Lock()
	defer g.book.mu.Unlock()
	if e := g.book.reserveDispatchLocked(grant, req.Action, class); e != nil {
		return FencedResponse{}, e
	}
	return g.coordinator.Process(req)
}

func (g *FencedGrantGuard) Status(grant ActionGrant, req AuthorityRequest) (FencedResponse, error) {
	if req.Op != AuthorityStatus {
		return FencedResponse{}, ErrPolicy
	}
	if e := g.coordinator.authority.preflight(req); e != nil {
		return FencedResponse{}, e
	}
	if e := g.book.CheckReconcile(grant, req.Action); e != nil {
		return FencedResponse{}, e
	}
	return g.coordinator.Process(req)
}

func (g *FencedGrantGuard) ProcessAttested(grant ActionGrant, req AuthorityRequest, challenge Digest) (FencedEnvelope, error) {
	if challenge == (Digest{}) {
		return FencedEnvelope{}, ErrPolicy
	}
	switch req.Op {
	case AuthorityCommit:
		if e := g.coordinator.authority.preflight(req); e != nil {
			return FencedEnvelope{}, e
		}
		g.book.mu.Lock()
		defer g.book.mu.Unlock()
		if e := g.book.reserveDispatchLocked(grant, req.Action, grant.Class); e != nil {
			return FencedEnvelope{}, e
		}
		return g.coordinator.ProcessAttested(req, challenge)
	case AuthorityStatus:
		if e := g.coordinator.authority.preflight(req); e != nil {
			return FencedEnvelope{}, e
		}
		if e := g.book.CheckReconcile(grant, req.Action); e != nil {
			return FencedEnvelope{}, e
		}
		return g.coordinator.ProcessAttested(req, challenge)
	default:
		return FencedEnvelope{}, ErrPolicy
	}
}
