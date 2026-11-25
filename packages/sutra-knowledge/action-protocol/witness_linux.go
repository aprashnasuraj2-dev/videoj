//go:build linux

package actionprotocol

// AuthorityWitness is a separate monotonic trust domain for one SharedAuthority.
// It prevents rollback of the authority store only when the witness key/store and
// latest signed view are independently protected. It is not consensus or a clock.
import (
 "bytes"
 "crypto/ed25519"
 "encoding/binary"
 "errors"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "sync"
 "syscall"
)

const witnessDomain = "SUTRA/shared-authority-witness/v1\x00"
const witnessTransitionDomain = "SUTRA/shared-authority-witness-transition/v1\x00"
const witnessViewDomain = "SUTRA/shared-authority-witness-view/v1\x00"
const witnessMaxTransitions = 8
const witnessTransitionSize = 32+32+ed25519.SignatureSize
const witnessViewSize = 4+32+32+ed25519.SignatureSize

var ErrWitnessConflict = errors.New("witness head changed")
var ErrWitnessRollback = errors.New("authority head does not match independent witness")

type WitnessTransition struct {
 Before Digest
 After Digest
 AuthoritySignature [ed25519.SignatureSize]byte
}
func witnessTransitionMessage(ctx Digest,before,after Digest)[]byte{
 b:=append([]byte(witnessTransitionDomain),ctx[:]...)
 b=append(b,before[:]...)
 return append(b,after[:]...)
}
func SignWitnessTransition(ctx Digest,before,after Digest,authority ed25519.PrivateKey)(WitnessTransition,error){
 if ctx==(Digest{})||before==(Digest{})||after==(Digest{})||before==after||len(authority)!=ed25519.PrivateKeySize{return WitnessTransition{},ErrPolicy}
 t:=WitnessTransition{Before:before,After:after}
 copy(t.AuthoritySignature[:],ed25519.Sign(authority,witnessTransitionMessage(ctx,before,after)))
 return t,nil
}
func (t WitnessTransition) Bytes()[]byte{
 b:=append([]byte(nil),t.Before[:]...)
 b=append(b,t.After[:]...)
 return append(b,t.AuthoritySignature[:]...)
}
func parseWitnessTransition(b []byte)(WitnessTransition,error){
 var t WitnessTransition
 if len(b)!=witnessTransitionSize{return t,ErrStore}
 copy(t.Before[:],b[:32]);copy(t.After[:],b[32:64]);copy(t.AuthoritySignature[:],b[64:])
 return t,nil
}

type WitnessView struct {
 Sequence uint32
 Genesis Digest
 Head Digest
 Signature [ed25519.SignatureSize]byte
}
func (v WitnessView) body()[]byte{
 b:=binary.BigEndian.AppendUint32(nil,v.Sequence)
 b=append(b,v.Genesis[:]...)
 return append(b,v.Head[:]...)
}
func (v WitnessView) message(ctx Digest,authority ed25519.PublicKey)[]byte{
 b:=append([]byte(witnessViewDomain),ctx[:]...)
 b=append(b,authority...)
 return append(b,v.body()...)
}
func (v WitnessView) Bytes()[]byte{return append(v.body(),v.Signature[:]...)}
func ParseWitnessView(b []byte)(WitnessView,error){
 var v WitnessView
 if len(b)!=witnessViewSize{return v,ErrPolicy}
 v.Sequence=binary.BigEndian.Uint32(b[:4]);copy(v.Genesis[:],b[4:36]);copy(v.Head[:],b[36:68]);copy(v.Signature[:],b[68:])
 return v,nil
}
func VerifyWitnessView(v WitnessView,ctx Digest,authority,witness ed25519.PublicKey)bool{
 return ctx!=(Digest{})&&len(authority)==ed25519.PublicKeySize&&len(witness)==ed25519.PublicKeySize&&
  v.Genesis!=(Digest{})&&v.Head!=(Digest{})&&v.Sequence<=witnessMaxTransitions&&
  ((v.Sequence==0)==(v.Head==v.Genesis))&&
  ed25519.Verify(witness,v.message(ctx,authority),v.Signature[:])
}
func VerifyWitnessViewPinned(v WitnessView,ctx Digest,authority,witness ed25519.PublicKey,genesis Digest)bool{
 return genesis!=(Digest{})&&v.Genesis==genesis&&VerifyWitnessView(v,ctx,authority,witness)
}

type AuthorityWitness struct {
 mu sync.Mutex
 dir string
 lock *os.File
 ctx Digest
 authority ed25519.PublicKey
 signer ed25519.PrivateKey
 genesis Digest
 transitions []WitnessTransition
 poisoned bool
 fault func(string)error
}
func CreateAuthorityWitness(dir string,ctx Digest,authority ed25519.PublicKey,witness ed25519.PrivateKey,genesis Digest)(*AuthorityWitness,error){
 return openAuthorityWitness(dir,ctx,authority,witness,genesis,true)
}
func OpenAuthorityWitness(dir string,ctx Digest,authority ed25519.PublicKey,witness ed25519.PrivateKey,genesis Digest)(*AuthorityWitness,error){
 return openAuthorityWitness(dir,ctx,authority,witness,genesis,false)
}
func openAuthorityWitness(dir string,ctx Digest,authority ed25519.PublicKey,witness ed25519.PrivateKey,genesis Digest,create bool)(*AuthorityWitness,error){
 if ctx==(Digest{})||genesis==(Digest{})||len(authority)!=ed25519.PublicKeySize||len(witness)!=ed25519.PrivateKeySize||
  !bytes.Equal(ed25519.NewKeyFromSeed(witness[:ed25519.SeedSize]),witness){return nil,ErrPolicy}
 dir,e:=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 lock,e:=os.OpenFile(filepath.Join(dir,"witness.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(lock.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  lock.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 w:=&AuthorityWitness{dir:dir,lock:lock,ctx:ctx,authority:append(ed25519.PublicKey(nil),authority...),signer:append(ed25519.PrivateKey(nil),witness...),genesis:genesis}
 ok:=false;defer func(){if !ok{w.Close()}}()
 path:=filepath.Join(dir,"witness.bin")
 if create{
  if _,e=os.Lstat(path);!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=w.persist(nil);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(path);if e!=nil{return nil,e}
  raw,e:=io.ReadAll(io.LimitReader(f,int64(w.maxSize()+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  transitions,e:=w.decode(raw);if e!=nil{return nil,e}
  w.transitions=transitions
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return w,nil
}
func (w *AuthorityWitness) header(n int)[]byte{
 b:=append([]byte(witnessDomain),w.ctx[:]...)
 b=append(b,w.authority...)
 b=append(b,w.signer.Public().(ed25519.PublicKey)...)
 b=append(b,w.genesis[:]...)
 return append(b,byte(n))
}
func (w *AuthorityWitness) maxSize()int{return len(w.header(witnessMaxTransitions))+witnessMaxTransitions*witnessTransitionSize+ed25519.SignatureSize}
func (w *AuthorityWitness) encode(ts []WitnessTransition)[]byte{
 body:=w.header(len(ts))
 for _,t:=range ts{body=append(body,t.Bytes()...)}
 return append(body,ed25519.Sign(w.signer,body)...)
}
func (w *AuthorityWitness) decode(raw []byte)([]WitnessTransition,error){
 header:=len(w.header(0))
 if len(raw)<header+ed25519.SignatureSize||len(raw)>w.maxSize(){return nil,ErrStore}
 body:=raw[:len(raw)-ed25519.SignatureSize]
 if !ed25519.Verify(w.signer.Public().(ed25519.PublicKey),body,raw[len(body):]){return nil,ErrStore}
 n:=int(body[header-1])
 if n>witnessMaxTransitions||len(body)!=header+n*witnessTransitionSize||!bytes.Equal(body[:header],w.header(n)){return nil,ErrStore}
 current:=w.genesis;out:=make([]WitnessTransition,0,n);seen:=map[Digest]bool{w.genesis:true}
 for i:=0;i<n;i++{
  start:=header+i*witnessTransitionSize;t,e:=parseWitnessTransition(body[start:start+witnessTransitionSize]);if e!=nil{return nil,e}
  if t.Before!=current||t.After==(Digest{})||t.After==t.Before||seen[t.After]||!ed25519.Verify(w.authority,witnessTransitionMessage(w.ctx,t.Before,t.After),t.AuthoritySignature[:]){return nil,ErrStore}
  out=append(out,t);seen[t.After]=true;current=t.After
 }
 return out,nil
}
func (w *AuthorityWitness) persist(ts []WitnessTransition)error{
 f,e:=os.CreateTemp(w.dir,".witness-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=w.encode(ts);n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if w.fault!=nil{if e=w.fault("before-rename");e!=nil{return e}}
 if e=os.Rename(f.Name(),filepath.Join(w.dir,"witness.bin"));e!=nil{return e}
 if w.fault!=nil{if e=w.fault("after-rename");e!=nil{return e}}
 return syncDirectory(w.dir)
}
func (w *AuthorityWitness) headLocked()Digest{
 if len(w.transitions)==0{return w.genesis}
 return w.transitions[len(w.transitions)-1].After
}
func (w *AuthorityWitness) View()(WitnessView,error){
 w.mu.Lock();defer w.mu.Unlock()
 if w.lock==nil||w.poisoned{return WitnessView{},ErrStore}
 v:=WitnessView{Sequence:uint32(len(w.transitions)),Genesis:w.genesis,Head:w.headLocked()}
 copy(v.Signature[:],ed25519.Sign(w.signer,v.message(w.ctx,w.authority)))
 return v,nil
}
func (w *AuthorityWitness) Advance(t WitnessTransition)(WitnessView,error){
 w.mu.Lock();defer w.mu.Unlock()
 if w.lock==nil||w.poisoned{return WitnessView{},ErrStore}
 current:=w.headLocked()
 if t.Before!=current{return WitnessView{},ErrWitnessConflict}
 seen:=t.After==w.genesis
 for _,prior:=range w.transitions{if prior.After==t.After{seen=true;break}}
 if len(w.transitions)>=witnessMaxTransitions||t.After==(Digest{})||t.After==t.Before||seen||
  !ed25519.Verify(w.authority,witnessTransitionMessage(w.ctx,t.Before,t.After),t.AuthoritySignature[:]){return WitnessView{},ErrPolicy}
 next:=append(append([]WitnessTransition(nil),w.transitions...),t)
 if e:=w.persist(next);e!=nil{w.poisoned=true;return WitnessView{},ErrUnknown}
 w.transitions=next
 v:=WitnessView{Sequence:uint32(len(next)),Genesis:w.genesis,Head:t.After}
 copy(v.Signature[:],ed25519.Sign(w.signer,v.message(w.ctx,w.authority)))
 return v,nil
}
func (w *AuthorityWitness) Close()error{
 w.mu.Lock();defer w.mu.Unlock()
 if w.lock==nil{return nil}
 e:=w.lock.Close();w.lock=nil;return e
}

// OpenSharedAuthorityWitnessed obtains no trust from the authority store itself:
// the caller supplies an independently retrieved signed witness view.
func OpenSharedAuthorityWitnessed(dir string,ctx Digest,approver ed25519.PublicKey,authorityKey ed25519.PrivateKey,callers [authorityCallers]ed25519.PublicKey,limit uint32,genesis Digest,view WitnessView,witnessPub ed25519.PublicKey)(*SharedAuthority,error){
 if len(authorityKey)!=ed25519.PrivateKeySize||!VerifyWitnessViewPinned(view,ctx,authorityKey.Public().(ed25519.PublicKey),witnessPub,genesis){return nil,ErrPolicy}
 a,e:=OpenSharedAuthority(dir,ctx,approver,authorityKey,callers,limit);if e!=nil{return nil,e}
 head,e:=a.Head()
 if e!=nil||head!=view.Head{a.Close();return nil,ErrWitnessRollback}
 return a,nil
}

func (w *AuthorityWitness) ServeHTTP(rw http.ResponseWriter,r *http.Request){
 rw.Header().Set("Cache-Control","no-store")
 if r.URL.Path!="/witness"||r.URL.RawQuery!=""{rw.WriteHeader(http.StatusBadRequest);return}
 if r.Method==http.MethodGet{
  v,e:=w.View();if e!=nil{rw.WriteHeader(http.StatusInternalServerError);return}
  rw.Header().Set("Content-Type",media);rw.Write(v.Bytes());return
 }
 if r.Method!=http.MethodPost||r.Header.Get("Content-Type")!=media{rw.WriteHeader(http.StatusBadRequest);return}
 defer r.Body.Close();raw,e:=io.ReadAll(io.LimitReader(r.Body,witnessTransitionSize+1))
 if e!=nil||len(raw)!=witnessTransitionSize{rw.WriteHeader(http.StatusBadRequest);return}
 t,e:=parseWitnessTransition(raw);if e!=nil{rw.WriteHeader(http.StatusBadRequest);return}
 v,e:=w.Advance(t)
 if e!=nil{
  if errors.Is(e,ErrWitnessConflict){rw.WriteHeader(http.StatusConflict)}else if errors.Is(e,ErrPolicy){rw.WriteHeader(http.StatusForbidden)}else{rw.WriteHeader(http.StatusInternalServerError)}
  return
 }
 rw.Header().Set("Content-Type",media);rw.Write(v.Bytes())
}
