//go:build linux

package actionprotocol

// Durable consent-grant laboratory for exact synthetic actions. It binds a
// host-signed grant to one approved Request, one intent class, and a bounded
// monotonic policy epoch. Revocation/epoch state is local durable state and can
// itself be rolled back unless anchored independently; this file does not claim
// trusted wall-clock time, distributed revocation, or production authorization.
import (
 "bytes"
 "crypto/ed25519"
 "crypto/rand"
 "encoding/binary"
 "errors"
 "io"
 "os"
 "path/filepath"
 "sync"
 "syscall"
)

const grantDomain = "SUTRA/action-grant/v1\x00"
const grantBookDomain = "SUTRA/action-grant-book/v1\x00"
const grantIDSize = 16
const maxGrantRevocations = 8
const maxGrantEpoch uint64 = 1_000_000_000
const actionGrantBodySize = grantIDSize+32+32+1+8+8
const actionGrantSize = actionGrantBodySize+ed25519.SignatureSize

type GrantID [grantIDSize]byte
type GrantClass byte

const (
 GrantPrimary GrantClass = 1
 GrantCompensation GrantClass = 2
)

var ErrGrantInactive = errors.New("action grant is not active at current policy epoch")
var ErrGrantRevoked = errors.New("action grant is revoked")
var ErrGrantClass = errors.New("action grant intent class mismatch")

type ActionGrant struct {
 ID GrantID
 RequestHash Digest
 Context Digest
 Class GrantClass
 NotBefore uint64
 ExpiresAfter uint64
 Signature [ed25519.SignatureSize]byte
}
func (g ActionGrant) body()[]byte{
 b:=append([]byte(nil),g.ID[:]...)
 b=append(b,g.RequestHash[:]...)
 b=append(b,g.Context[:]...)
 b=append(b,byte(g.Class))
 b=binary.BigEndian.AppendUint64(b,g.NotBefore)
 return binary.BigEndian.AppendUint64(b,g.ExpiresAfter)
}
func (g ActionGrant) message()[]byte{return append([]byte(grantDomain),g.body()...)}
func (g ActionGrant) Bytes()[]byte{return append(g.body(),g.Signature[:]...)}
func ParseActionGrant(raw []byte)(ActionGrant,error){
 var g ActionGrant
 if len(raw)!=actionGrantSize{return g,ErrPolicy}
 copy(g.ID[:],raw[:grantIDSize])
 copy(g.RequestHash[:],raw[grantIDSize:grantIDSize+32])
 copy(g.Context[:],raw[grantIDSize+32:grantIDSize+64])
 g.Class=GrantClass(raw[grantIDSize+64])
 g.NotBefore=binary.BigEndian.Uint64(raw[grantIDSize+65:grantIDSize+73])
 g.ExpiresAfter=binary.BigEndian.Uint64(raw[grantIDSize+73:grantIDSize+81])
 copy(g.Signature[:],raw[actionGrantBodySize:])
 if g.ID==(GrantID{})||g.RequestHash==(Digest{})||g.Context==(Digest{})||
  (g.Class!=GrantPrimary&&g.Class!=GrantCompensation)||g.NotBefore>g.ExpiresAfter||g.ExpiresAfter>maxGrantEpoch{
  return ActionGrant{},ErrPolicy
 }
 return g,nil
}
func IssueActionGrant(req Request,class GrantClass,notBefore,expiresAfter uint64,consent ed25519.PrivateKey)(ActionGrant,error){
 if req.Key==(Key{})||req.Context==(Digest{})||(class!=GrantPrimary&&class!=GrantCompensation)||
  notBefore>expiresAfter||expiresAfter>maxGrantEpoch||len(consent)!=ed25519.PrivateKeySize{return ActionGrant{},ErrPolicy}
 g:=ActionGrant{RequestHash:req.Hash(),Context:req.Context,Class:class,NotBefore:notBefore,ExpiresAfter:expiresAfter}
 if _,e:=rand.Read(g.ID[:]);e!=nil{return ActionGrant{},e}
 if g.ID==(GrantID{}){return ActionGrant{},ErrPolicy}
 copy(g.Signature[:],ed25519.Sign(consent,g.message()))
 return g,nil
}
func VerifyActionGrant(g ActionGrant,req Request,consent ed25519.PublicKey)bool{
 return len(consent)==ed25519.PublicKeySize&&g.ID!=(GrantID{})&&g.RequestHash==req.Hash()&&g.Context==req.Context&&
  (g.Class==GrantPrimary||g.Class==GrantCompensation)&&g.NotBefore<=g.ExpiresAfter&&g.ExpiresAfter<=maxGrantEpoch&&
  ed25519.Verify(consent,g.message(),g.Signature[:])
}

type GrantBook struct{
 mu sync.Mutex
 dir string
 lock *os.File
 ctx Digest
 consent ed25519.PublicKey
 signer ed25519.PrivateKey
 epoch uint64
 revoked []GrantID
 poisoned bool
 fault func(string)error
}
func CreateGrantBook(dir string,ctx Digest,consent ed25519.PublicKey,signer ed25519.PrivateKey,epoch uint64)(*GrantBook,error){
 return openGrantBook(dir,ctx,consent,signer,epoch,true)
}
func OpenGrantBook(dir string,ctx Digest,consent ed25519.PublicKey,signer ed25519.PrivateKey)(*GrantBook,error){
 return openGrantBook(dir,ctx,consent,signer,0,false)
}
func openGrantBook(dir string,ctx Digest,consent ed25519.PublicKey,signer ed25519.PrivateKey,epoch uint64,create bool)(*GrantBook,error){
 if ctx==(Digest{})||len(consent)!=ed25519.PublicKeySize||len(signer)!=ed25519.PrivateKeySize||epoch>maxGrantEpoch||
  !bytes.Equal(ed25519.NewKeyFromSeed(signer[:ed25519.SeedSize]),signer){return nil,ErrPolicy}
 dir,e:=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 lock,e:=os.OpenFile(filepath.Join(dir,"grantbook.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(lock.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  lock.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 b:=&GrantBook{dir:dir,lock:lock,ctx:ctx,consent:append(ed25519.PublicKey(nil),consent...),signer:append(ed25519.PrivateKey(nil),signer...),epoch:epoch}
 ok:=false;defer func(){if !ok{b.Close()}}()
 if create{
  if _,e=os.Lstat(filepath.Join(dir,"grantbook.bin"));!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=b.persist(epoch,nil);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(filepath.Join(dir,"grantbook.bin"));if e!=nil{return nil,e}
  raw,e:=io.ReadAll(io.LimitReader(f,int64(b.maxSize()+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  loadedEpoch,revoked,e:=b.decode(raw);if e!=nil{return nil,e}
  b.epoch=loadedEpoch;b.revoked=revoked
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return b,nil
}
func (b *GrantBook) header(epoch uint64,n int)[]byte{
 out:=append([]byte(grantBookDomain),b.ctx[:]...)
 out=append(out,b.consent...)
 out=append(out,b.signer.Public().(ed25519.PublicKey)...)
 out=binary.BigEndian.AppendUint64(out,epoch)
 return append(out,byte(n))
}
func (b *GrantBook) maxSize()int{return len(b.header(maxGrantEpoch,maxGrantRevocations))+maxGrantRevocations*grantIDSize+ed25519.SignatureSize}
func (b *GrantBook) encode(epoch uint64,revoked []GrantID)[]byte{
 body:=b.header(epoch,len(revoked))
 for _,id:=range revoked{body=append(body,id[:]...)}
 return append(body,ed25519.Sign(b.signer,body)...)
}
func (b *GrantBook) decode(raw []byte)(uint64,[]GrantID,error){
 headerLen:=len(b.header(0,0))
 if len(raw)<headerLen+ed25519.SignatureSize||len(raw)>b.maxSize(){return 0,nil,ErrStore}
 body:=raw[:len(raw)-ed25519.SignatureSize]
 if !ed25519.Verify(b.signer.Public().(ed25519.PublicKey),body,raw[len(body):]){return 0,nil,ErrStore}
 epochOffset:=headerLen-9
 epoch:=binary.BigEndian.Uint64(body[epochOffset:epochOffset+8]);n:=int(body[headerLen-1])
 if epoch>maxGrantEpoch||n>maxGrantRevocations||len(body)!=headerLen+n*grantIDSize||!bytes.Equal(body[:headerLen],b.header(epoch,n)){return 0,nil,ErrStore}
 out:=make([]GrantID,0,n);seen:=map[GrantID]bool{}
 for i:=0;i<n;i++{
  var id GrantID;start:=headerLen+i*grantIDSize;copy(id[:],body[start:start+grantIDSize])
  if id==(GrantID{})||seen[id]{return 0,nil,ErrStore};seen[id]=true;out=append(out,id)
 }
 return epoch,out,nil
}
func (b *GrantBook) persist(epoch uint64,revoked []GrantID)error{
 f,e:=os.CreateTemp(b.dir,".grantbook-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=b.encode(epoch,revoked);n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if b.fault!=nil{if e=b.fault("before-rename");e!=nil{return e}}
 if e=os.Rename(f.Name(),filepath.Join(b.dir,"grantbook.bin"));e!=nil{return e}
 if b.fault!=nil{if e=b.fault("after-rename");e!=nil{return e}}
 return syncDirectory(b.dir)
}
func (b *GrantBook) Close()error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil{return nil}
 e:=b.lock.Close();b.lock=nil;return e
}
func (b *GrantBook) Epoch()(uint64,error){
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return 0,ErrStore}
 return b.epoch,nil
}
func (b *GrantBook) AdvanceEpoch(expected,next uint64)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if expected!=b.epoch{return ErrHeadConflict}
 if next<=b.epoch||next>maxGrantEpoch{return ErrPolicy}
 if e:=b.persist(next,b.revoked);e!=nil{b.poisoned=true;return ErrUnknown}
 b.epoch=next;return nil
}
func (b *GrantBook) isRevokedLocked(id GrantID)bool{
 for _,x:=range b.revoked{if x==id{return true}}
 return false
}
func (b *GrantBook) Revoke(g ActionGrant,req Request)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if !VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 if b.isRevokedLocked(g.ID){return nil}
 if len(b.revoked)>=maxGrantRevocations{return ErrBudget}
 next:=append(append([]GrantID(nil),b.revoked...),g.ID)
 if e:=b.persist(b.epoch,next);e!=nil{b.poisoned=true;return ErrUnknown}
 b.revoked=next;return nil
}
func (b *GrantBook) CheckDispatch(g ActionGrant,req Request,class GrantClass)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if !VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 if g.Class!=class{return ErrGrantClass}
 if b.isRevokedLocked(g.ID){return ErrGrantRevoked}
 if b.epoch<g.NotBefore||b.epoch>g.ExpiresAfter{return ErrGrantInactive}
 return nil
}
// Reconciliation never creates a new effect. An exact historically signed grant
// may therefore query status after expiry/revocation; this does not reactivate it.
func (b *GrantBook) CheckReconcile(g ActionGrant,req Request)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if !VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 return nil
}

type GrantGuard struct{
 book *GrantBook
 coordinator *WitnessCoordinator
}
func NewGrantGuard(book *GrantBook,coordinator *WitnessCoordinator)(*GrantGuard,error){
 if book==nil||coordinator==nil||book.ctx!=coordinator.authority.ctx{return nil,ErrPolicy}
 return &GrantGuard{book:book,coordinator:coordinator},nil
}
func (g *GrantGuard) Commit(grant ActionGrant,req AuthorityRequest,class GrantClass)(WitnessedResponse,error){
 if e:=g.book.CheckDispatch(grant,req.Action,class);e!=nil{return WitnessedResponse{},e}
 return g.coordinator.Process(req)
}
func (g *GrantGuard) Status(grant ActionGrant,req AuthorityRequest)(WitnessedResponse,error){
 if e:=g.book.CheckReconcile(grant,req.Action);e!=nil{return WitnessedResponse{},e}
 if req.Op!=AuthorityStatus{return WitnessedResponse{},ErrPolicy}
 return g.coordinator.Process(req)
}
