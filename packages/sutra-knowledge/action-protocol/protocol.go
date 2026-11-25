// Synthetic action protocol laboratory, not an enabled external write tool.
// The receiver's effect and idempotency ledger share one in-memory transaction.
// A production receiver must persist them atomically and authenticate the caller.
// No remote arbitrary code, model output, provider credentials or real reservations.
package actionprotocol

import (
 "crypto/ed25519"
 "crypto/rand"
 "crypto/sha256"
 "encoding/binary"
 "errors"
 "sync"
)

type Digest [32]byte
type Key [16]byte

const requestSize=16+1+32+ed25519.SignatureSize
const receiptSize=16+32+1+4+ed25519.SignatureSize
const maxSlots=4
var ErrPolicy=errors.New("policy refused")
var ErrConflict=errors.New("idempotency key reused with different input")
var ErrAbsent=errors.New("no committed receipt observed")
var ErrBudget=errors.New("effect budget exhausted")
var ErrOccupied=errors.New("fixture slot already occupied")

// Context is provisioned by the trusted host, not discovered from peer text.
// The exact policy binds audience, fixed capability, manifest version and session.
// Domain separation and explicit length avoid ambiguous string concatenation.
func Context(audience,manifest,session string) (Digest,error) {
 if audience==""||manifest==""||session==""||len(audience)>256||len(manifest)>256||len(session)>128{return Digest{},ErrPolicy}
 b:=[]byte("SUTRA/fixture-reserve-policy/v1\x00")
 for _,s:=range []string{audience,manifest,session}{
  b=binary.BigEndian.AppendUint16(b,uint16(len(s)));b=append(b,s...)
 }
 return sha256.Sum256(b),nil
}
type Request struct {
 Key Key
 Slot byte
 Context Digest
 Approval [ed25519.SignatureSize]byte
}
func (r Request) body() []byte {
 b:=append([]byte{},r.Key[:]...);b=append(b,r.Slot);return append(b,r.Context[:]...)
}
func (r Request) message() []byte {return append([]byte("SUTRA/fixture-reserve-approval/v1\x00"),r.body()...)}
func (r Request) Bytes() []byte {return append(r.body(),r.Approval[:]...)}
func (r Request) Hash() Digest {return sha256.Sum256(r.Bytes())}
func ParseRequest(b []byte)(Request,error){
 var r Request
 if len(b)!=requestSize{return r,ErrPolicy}
 copy(r.Key[:],b[:16]);r.Slot=b[16];copy(r.Context[:],b[17:49]);copy(r.Approval[:],b[49:])
 return r,nil
}
// Approve is a trusted UI/host operation, never a model-callable tool.
// A fresh key is allocated only for a new approved logical action.
func Approve(slot byte,ctx Digest,host ed25519.PrivateKey)(Request,error){
 if slot>=maxSlots||ctx==(Digest{})||len(host)!=ed25519.PrivateKeySize{return Request{},ErrPolicy}
 r:=Request{Slot:slot,Context:ctx}
 if _,e:=rand.Read(r.Key[:]);e!=nil{return Request{},e}
 copy(r.Approval[:],ed25519.Sign(host,r.message()));return r,nil
}
type Receipt struct{
 Key Key
 Input Digest
 Slot byte
 Version uint32
 Signature [ed25519.SignatureSize]byte
}
func (r Receipt) body() []byte {
 b:=append([]byte{},r.Key[:]...);b=append(b,r.Input[:]...);b=append(b,r.Slot)
 return binary.BigEndian.AppendUint32(b,r.Version)
}
func (r Receipt) message() []byte{return append([]byte("SUTRA/fixture-reserve-commit/v1\x00"),r.body()...)}
func (r Receipt) Bytes() []byte{return append(r.body(),r.Signature[:]...)}
func ParseReceipt(b []byte)(Receipt,error){
 var r Receipt
 if len(b)!=receiptSize{return r,ErrPolicy}
 copy(r.Key[:],b[:16]);copy(r.Input[:],b[16:48]);r.Slot=b[48];r.Version=binary.BigEndian.Uint32(b[49:53]);copy(r.Signature[:],b[53:])
 return r,nil
}
func Verify(r Receipt,approved Request,receiver ed25519.PublicKey)bool{
 return len(receiver)==ed25519.PublicKeySize&&r.Key==approved.Key&&r.Input==approved.Hash()&&r.Slot==approved.Slot&&r.Version>0&&r.Version<=maxSlots&&ed25519.Verify(receiver,r.message(),r.Signature[:])
}
type Receiver struct{
 mu sync.Mutex
 ctx Digest
 approver ed25519.PublicKey
 signer ed25519.PrivateKey
 limit uint32
 slots [maxSlots]bool
 ledger map[Key]Receipt
 version uint32
}
func NewReceiver(ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32)(*Receiver,error){
 if ctx==(Digest{})||len(approver)!=ed25519.PublicKeySize||len(signer)!=ed25519.PrivateKeySize||limit==0||limit>maxSlots{return nil,ErrPolicy}
 return &Receiver{ctx:ctx,approver:append(ed25519.PublicKey(nil),approver...),signer:append(ed25519.PrivateKey(nil),signer...),limit:limit,ledger:map[Key]Receipt{}},nil
}
func (s *Receiver) admit(r Request)bool{
 return r.Context==s.ctx&&r.Key!=(Key{})&&r.Slot<maxSlots&&ed25519.Verify(s.approver,r.message(),r.Approval[:])
}
func (s *Receiver) Commit(r Request)(Receipt,error){
 if !s.admit(r){return Receipt{},ErrPolicy}
 s.mu.Lock();defer s.mu.Unlock()
 if previous,ok:=s.ledger[r.Key];ok{
  if previous.Input!=r.Hash(){return Receipt{},ErrConflict};return previous,nil
 }
 if s.version>=s.limit{return Receipt{},ErrBudget}
 if s.slots[r.Slot]{return Receipt{},ErrOccupied}
 receipt:=Receipt{Key:r.Key,Input:r.Hash(),Slot:r.Slot,Version:s.version+1}
 copy(receipt.Signature[:],ed25519.Sign(s.signer,receipt.message()))
 // Atomic only within this process and this owned synthetic effect.
 s.slots[r.Slot]=true;s.version++;s.ledger[r.Key]=receipt
 return receipt,nil
}
func (s *Receiver) Status(r Request)(Receipt,error){
 if !s.admit(r){return Receipt{},ErrPolicy}
 s.mu.Lock();defer s.mu.Unlock()
 previous,ok:=s.ledger[r.Key]
 if !ok{return Receipt{},ErrAbsent}
 if previous.Input!=r.Hash(){return Receipt{},ErrConflict}
 return previous,nil
}
func (s *Receiver) Count()uint32{s.mu.Lock();defer s.mu.Unlock();return s.version}
