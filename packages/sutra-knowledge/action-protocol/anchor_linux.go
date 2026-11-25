//go:build linux

package actionprotocol

// The independent anchor owns the synthetic effect. Replica snapshots are not
// authorities. All cooperating writers must use this one durable anchor.
import (
 "crypto/ed25519"
 "crypto/sha256"
 "errors"
 "sync"
)

var ErrHeadConflict = errors.New("anchor head changed")

type AnchorEntry struct {
 Request Request
 Receipt Receipt
}
type AnchorView struct {
 Head Digest
 Entries []AnchorEntry
}

// Hash the complete ordered history and policy. No caller-supplied digest can
// substitute for replay. Fixed-width records make the encoding unambiguous.
func anchorDigest(ctx Digest, approver, receiver ed25519.PublicKey, limit uint32, entries []AnchorEntry) Digest {
 b:=append([]byte("SUTRA/fixture-anchor/v1\x00"),ctx[:]...)
 b=append(b,approver...)
 b=append(b,receiver...)
 b=append(b,byte(limit),byte(len(entries)))
 for _,e:=range entries { b=append(b,e.Request.Bytes()...); b=append(b,e.Receipt.Bytes()...) }
 return sha256.Sum256(b)
}

// Consumer uses provisioned policy, keys and independently obtained head,
// never a head learned solely from the untrusted view. Not a freshness oracle.
func VerifyAnchorView(v AnchorView, pinned Digest, ctx Digest, approver, receiver ed25519.PublicKey, limit uint32) bool {
 if len(approver)!=ed25519.PublicKeySize||len(receiver)!=ed25519.PublicKeySize||ctx==(Digest{})||limit==0||limit>maxSlots||len(v.Entries)>int(limit)||pinned==(Digest{})||v.Head!=pinned{return false}
 keys:=map[Key]bool{};slots:=[maxSlots]bool{}
 for i,e:=range v.Entries {
  r:=e.Request
  if r.Key==(Key{})||r.Context!=ctx||r.Slot>=maxSlots||keys[r.Key]||slots[r.Slot]||!ed25519.Verify(approver,r.message(),r.Approval[:])||!Verify(e.Receipt,r,receiver)||e.Receipt.Version!=uint32(i+1){return false}
  keys[r.Key]=true;slots[r.Slot]=true
 }
 return anchorDigest(ctx,approver,receiver,limit,v.Entries)==pinned
}

type Anchor struct {
 mu sync.Mutex
 store *DurableReceiver
}
func CreateAnchor(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32)(*Anchor,error){
 s,e:=CreateDurable(dir,ctx,approver,signer,limit);if e!=nil{return nil,e};return &Anchor{store:s},nil
}
func OpenAnchor(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32)(*Anchor,error){
 s,e:=OpenDurable(dir,ctx,approver,signer,limit);if e!=nil{return nil,e};return &Anchor{store:s},nil
}
func (a *Anchor) viewLocked()(AnchorView,error){
 s:=a.store
 s.mu.Lock();defer s.mu.Unlock()
 if s.lock==nil||s.poisoned{return AnchorView{},ErrStore}
 entries:=make([]AnchorEntry,0,len(s.requests))
 for _,r:=range s.requests{
  receipt,e:=s.receiver.Status(r);if e!=nil{return AnchorView{},ErrStore}
  entries=append(entries,AnchorEntry{r,receipt})
 }
 r:=s.receiver
 return AnchorView{anchorDigest(r.ctx,r.approver,r.signer.Public().(ed25519.PublicKey),r.limit,entries),entries},nil
}
func (a *Anchor) View()(AnchorView,error){
 a.mu.Lock();defer a.mu.Unlock();return a.viewLocked()
}
// Compare and commit are serialized under the anchor owner lock. The owned
// effect is the anchor snapshot itself, never a replica's local mutation.
func (a *Anchor) Advance(expected Digest,r Request)(Receipt,AnchorView,error){
 a.mu.Lock();defer a.mu.Unlock()
 old,e:=a.viewLocked();if e!=nil{return Receipt{},AnchorView{},e}
 if !a.store.receiver.admit(r){return Receipt{},AnchorView{},ErrPolicy}
 if old.Head!=expected{return Receipt{},AnchorView{},ErrHeadConflict}
 receipt,e:=a.store.Commit(r);if e!=nil{return Receipt{},AnchorView{},e}
 next,e:=a.viewLocked();if e!=nil{return Receipt{},AnchorView{},ErrUnknown}
 return receipt,next,nil
}
func (a *Anchor) Status(r Request)(Receipt,error){
 a.mu.Lock();defer a.mu.Unlock();return a.store.Status(r)
}
func (a *Anchor) Close()error{
 a.mu.Lock();defer a.mu.Unlock();return a.store.Close()
}
