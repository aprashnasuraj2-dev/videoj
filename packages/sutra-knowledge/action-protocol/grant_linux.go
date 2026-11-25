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
 "net/http"
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
const grantedAuthorityRequestSize = actionGrantSize+authorityRequestSize

type GrantID [grantIDSize]byte
type GrantClass byte

const (
 GrantPrimary GrantClass = 1
 GrantCompensation GrantClass = 2
)

var ErrGrantInactive = errors.New("action grant is not active at current policy epoch")
var ErrGrantRevoked = errors.New("action grant is revoked")
var ErrGrantClass = errors.New("action grant intent class mismatch")
var ErrGrantNotDispatched = errors.New("action grant has no admitted dispatch to reconcile")

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


type GrantedAuthorityRequest struct{
 Grant ActionGrant
 Authority AuthorityRequest
}
func (r GrantedAuthorityRequest) Bytes()[]byte{
 b:=append([]byte(nil),r.Grant.Bytes()...)
 return append(b,r.Authority.Bytes()...)
}
func ParseGrantedAuthorityRequest(raw []byte)(GrantedAuthorityRequest,error){
 if len(raw)!=grantedAuthorityRequestSize{return GrantedAuthorityRequest{},ErrPolicy}
 grant,e:=ParseActionGrant(raw[:actionGrantSize]);if e!=nil{return GrantedAuthorityRequest{},e}
 authority,e:=ParseAuthorityRequest(raw[actionGrantSize:]);if e!=nil{return GrantedAuthorityRequest{},e}
 return GrantedAuthorityRequest{Grant:grant,Authority:authority},nil
}

type GrantBook struct{
 mu sync.Mutex
 dir string
 lock *os.File
 ctx Digest
 consent ed25519.PublicKey
 approver ed25519.PublicKey
 signer ed25519.PrivateKey
 epoch uint64
 revoked []GrantID
 admitted []GrantID
 poisoned bool
 fault func(string)error
}
func CreateGrantBook(dir string,ctx Digest,consent,approver ed25519.PublicKey,signer ed25519.PrivateKey,epoch uint64)(*GrantBook,error){
 return openGrantBook(dir,ctx,consent,approver,signer,epoch,true)
}
func OpenGrantBook(dir string,ctx Digest,consent,approver ed25519.PublicKey,signer ed25519.PrivateKey)(*GrantBook,error){
 return openGrantBook(dir,ctx,consent,approver,signer,0,false)
}
func openGrantBook(dir string,ctx Digest,consent,approver ed25519.PublicKey,signer ed25519.PrivateKey,epoch uint64,create bool)(*GrantBook,error){
 if ctx==(Digest{})||len(consent)!=ed25519.PublicKeySize||len(approver)!=ed25519.PublicKeySize||len(signer)!=ed25519.PrivateKeySize||epoch>maxGrantEpoch||
  !bytes.Equal(ed25519.NewKeyFromSeed(signer[:ed25519.SeedSize]),signer){return nil,ErrPolicy}
 dir,e:=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 lock,e:=os.OpenFile(filepath.Join(dir,"grantbook.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(lock.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  lock.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 b:=&GrantBook{dir:dir,lock:lock,ctx:ctx,consent:append(ed25519.PublicKey(nil),consent...),approver:append(ed25519.PublicKey(nil),approver...),signer:append(ed25519.PrivateKey(nil),signer...),epoch:epoch}
 ok:=false;defer func(){if !ok{b.Close()}}()
 if create{
  if _,e=os.Lstat(filepath.Join(dir,"grantbook.bin"));!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=b.persist(epoch,nil,nil);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(filepath.Join(dir,"grantbook.bin"));if e!=nil{return nil,e}
  raw,e:=io.ReadAll(io.LimitReader(f,int64(b.maxSize()+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  loadedEpoch,revoked,admitted,e:=b.decode(raw);if e!=nil{return nil,e}
  b.epoch=loadedEpoch;b.revoked=revoked;b.admitted=admitted
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return b,nil
}
func (b *GrantBook) header(epoch uint64,revokedN,admittedN int)[]byte{
 out:=append([]byte(grantBookDomain),b.ctx[:]...)
 out=append(out,b.consent...)
 out=append(out,b.approver...)
 out=append(out,b.signer.Public().(ed25519.PublicKey)...)
 out=binary.BigEndian.AppendUint64(out,epoch)
 out=append(out,byte(revokedN))
 return append(out,byte(admittedN))
}
func (b *GrantBook) maxSize()int{return len(b.header(maxGrantEpoch,maxGrantRevocations,maxGrantRevocations))+2*maxGrantRevocations*grantIDSize+ed25519.SignatureSize}
func (b *GrantBook) encode(epoch uint64,revoked,admitted []GrantID)[]byte{
 body:=b.header(epoch,len(revoked),len(admitted))
 for _,id:=range revoked{body=append(body,id[:]...)}
 for _,id:=range admitted{body=append(body,id[:]...)}
 return append(body,ed25519.Sign(b.signer,body)...)
}
func (b *GrantBook) decode(raw []byte)(uint64,[]GrantID,[]GrantID,error){
 headerLen:=len(b.header(0,0,0))
 if len(raw)<headerLen+ed25519.SignatureSize||len(raw)>b.maxSize(){return 0,nil,nil,ErrStore}
 body:=raw[:len(raw)-ed25519.SignatureSize]
 if !ed25519.Verify(b.signer.Public().(ed25519.PublicKey),body,raw[len(body):]){return 0,nil,nil,ErrStore}
 epochOffset:=headerLen-10
 epoch:=binary.BigEndian.Uint64(body[epochOffset:epochOffset+8])
 revokedN:=int(body[headerLen-2]);admittedN:=int(body[headerLen-1])
 if epoch>maxGrantEpoch||revokedN>maxGrantRevocations||admittedN>maxGrantRevocations||
  len(body)!=headerLen+(revokedN+admittedN)*grantIDSize||!bytes.Equal(body[:headerLen],b.header(epoch,revokedN,admittedN)){
  return 0,nil,nil,ErrStore
 }
 readIDs:=func(offset,n int)([]GrantID,error){
  out:=make([]GrantID,0,n);seen:=map[GrantID]bool{}
  for i:=0;i<n;i++{
   var id GrantID;start:=offset+i*grantIDSize;copy(id[:],body[start:start+grantIDSize])
   if id==(GrantID{})||seen[id]{return nil,ErrStore};seen[id]=true;out=append(out,id)
  }
  return out,nil
 }
 revoked,e:=readIDs(headerLen,revokedN);if e!=nil{return 0,nil,nil,e}
 admitted,e:=readIDs(headerLen+revokedN*grantIDSize,admittedN);if e!=nil{return 0,nil,nil,e}
 return epoch,revoked,admitted,nil
}
func (b *GrantBook) persist(epoch uint64,revoked,admitted []GrantID)error{
 f,e:=os.CreateTemp(b.dir,".grantbook-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=b.encode(epoch,revoked,admitted);n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
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
 if e:=b.persist(next,b.revoked,b.admitted);e!=nil{b.poisoned=true;return ErrUnknown}
 b.epoch=next;return nil
}
func (b *GrantBook) isRevokedLocked(id GrantID)bool{
 for _,x:=range b.revoked{if x==id{return true}}
 return false
}
func (b *GrantBook) isAdmittedLocked(id GrantID)bool{
 for _,x:=range b.admitted{if x==id{return true}}
 return false
}
func (b *GrantBook) validApprovedRequestLocked(req Request)bool{
 return req.Context==b.ctx&&req.Key!=(Key{})&&req.Slot<maxSlots&&ed25519.Verify(b.approver,req.message(),req.Approval[:])
}
func (b *GrantBook) Revoke(g ActionGrant,req Request)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if !b.validApprovedRequestLocked(req)||!VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 if b.isRevokedLocked(g.ID){return nil}
 if len(b.revoked)>=maxGrantRevocations{return ErrBudget}
 next:=append(append([]GrantID(nil),b.revoked...),g.ID)
 if e:=b.persist(b.epoch,next,b.admitted);e!=nil{b.poisoned=true;return ErrUnknown}
 b.revoked=next;return nil
}
func (b *GrantBook) checkDispatchLocked(g ActionGrant,req Request,class GrantClass)error{
 if b.lock==nil||b.poisoned{return ErrStore}
 if !b.validApprovedRequestLocked(req)||!VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 if g.Class!=class{return ErrGrantClass}
 if b.isRevokedLocked(g.ID){return ErrGrantRevoked}
 if b.epoch<g.NotBefore||b.epoch>g.ExpiresAfter{return ErrGrantInactive}
 return nil
}
func (b *GrantBook) CheckDispatch(g ActionGrant,req Request,class GrantClass)error{
 b.mu.Lock();defer b.mu.Unlock()
 return b.checkDispatchLocked(g,req,class)
}
func (b *GrantBook) reserveDispatchLocked(g ActionGrant,req Request,class GrantClass)error{
 if e:=b.checkDispatchLocked(g,req,class);e!=nil{return e}
 if b.isAdmittedLocked(g.ID){return nil}
 if len(b.admitted)>=maxGrantRevocations{return ErrBudget}
 next:=append(append([]GrantID(nil),b.admitted...),g.ID)
 if e:=b.persist(b.epoch,b.revoked,next);e!=nil{b.poisoned=true;return ErrUnknown}
 b.admitted=next
 return nil
}
// Reconciliation never creates a new effect. It is allowed after expiry or
// revocation only for a grant that was durably admitted for dispatch first.
func (b *GrantBook) CheckReconcile(g ActionGrant,req Request)error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return ErrStore}
 if !b.validApprovedRequestLocked(req)||!VerifyActionGrant(g,req,b.consent)||g.Context!=b.ctx{return ErrPolicy}
 if !b.isAdmittedLocked(g.ID){return ErrGrantNotDispatched}
 return nil
}

type GrantGuard struct{
 book *GrantBook
 coordinator *WitnessCoordinator
}
func NewGrantGuard(book *GrantBook,coordinator *WitnessCoordinator)(*GrantGuard,error){
 if book==nil||coordinator==nil||book.ctx!=coordinator.authority.ctx||
  !bytes.Equal(book.approver,coordinator.authority.approver){return nil,ErrPolicy}
 return &GrantGuard{book:book,coordinator:coordinator},nil
}
func (g *GrantGuard) Commit(grant ActionGrant,req AuthorityRequest,class GrantClass)(WitnessedResponse,error){
 if req.Op!=AuthorityCommit{return WitnessedResponse{},ErrPolicy}
 // Hold the grant-book mutex across the authority/witness transaction so a
 // concurrent revocation cannot pass between the last policy check and dispatch.
 g.book.mu.Lock();defer g.book.mu.Unlock()
 if e:=g.book.reserveDispatchLocked(grant,req.Action,class);e!=nil{return WitnessedResponse{},e}
 return g.coordinator.Process(req)
}
func (g *GrantGuard) Status(grant ActionGrant,req AuthorityRequest)(WitnessedResponse,error){
 if req.Op!=AuthorityStatus{return WitnessedResponse{},ErrPolicy}
 if e:=g.book.CheckReconcile(grant,req.Action);e!=nil{return WitnessedResponse{},e}
 return g.coordinator.Process(req)
}

func (g *GrantGuard) ProcessAttested(grant ActionGrant,req AuthorityRequest,challenge Digest)(WitnessedEnvelope,error){
 if challenge==(Digest{}){return WitnessedEnvelope{},ErrPolicy}
 switch req.Op{
 case AuthorityCommit:
  // The intent class comes from the signed grant itself. No external class
  // parameter can reinterpret primary consent as compensation consent.
  g.book.mu.Lock();defer g.book.mu.Unlock()
  if e:=g.book.reserveDispatchLocked(grant,req.Action,grant.Class);e!=nil{return WitnessedEnvelope{},e}
  return g.coordinator.ProcessAttested(req,challenge)
 case AuthorityStatus:
  if e:=g.book.CheckReconcile(grant,req.Action);e!=nil{return WitnessedEnvelope{},e}
  return g.coordinator.ProcessAttested(req,challenge)
 default:
  return WitnessedEnvelope{},ErrPolicy
 }
}

func (g *GrantGuard) ServeHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 if r.Method!=http.MethodPost||r.URL.Path!="/authority-granted"||r.URL.RawQuery!=""||r.Header.Get("Content-Type")!=media{
  w.WriteHeader(http.StatusBadRequest);return
 }
 challenge,e:=parseWitnessChallengeHeader(r);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 defer r.Body.Close()
 raw,e:=io.ReadAll(io.LimitReader(r.Body,grantedAuthorityRequestSize+1));if e!=nil||len(raw)!=grantedAuthorityRequestSize{w.WriteHeader(http.StatusBadRequest);return}
 request,e:=ParseGrantedAuthorityRequest(raw);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 response,e:=g.ProcessAttested(request.Grant,request.Authority,challenge)
 if e!=nil{
  switch {
  case errors.Is(e,ErrGrantInactive),errors.Is(e,ErrGrantRevoked),errors.Is(e,ErrGrantClass),errors.Is(e,ErrGrantNotDispatched),errors.Is(e,ErrAuthorityAuth),errors.Is(e,ErrPolicy):
   w.WriteHeader(http.StatusForbidden)
  case errors.Is(e,ErrWitnessRollback),errors.Is(e,ErrHeadConflict):
   w.WriteHeader(http.StatusConflict)
  case errors.Is(e,ErrWitnessUnavailable),errors.Is(e,ErrUnknown):
   w.WriteHeader(http.StatusServiceUnavailable)
  default:
   w.WriteHeader(http.StatusInternalServerError)
  }
  return
 }
 w.Header().Set("Content-Type",media)
 _,_=w.Write(response.Bytes())
}
