//go:build linux

package actionprotocol

// DurableReceiver is an isolated, single-owner synthetic receiver. The slot
// effect IS the signed snapshot, not an external operation. A trusted local
// directory and a filesystem honoring flock, atomic rename and fsync are required.
import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "sync"
 "syscall"
)

var ErrStore = errors.New("durable store unavailable or invalid")
var ErrStoreBusy = errors.New("durable store already owned")

const snapshotDomain = "SUTRA/fixture-snapshot/v1\x00"
const snapshotHeader = len(snapshotDomain)+32+32+32+1+1
const maxSnapshot = snapshotHeader+maxSlots*requestSize+ed25519.SignatureSize

type DurableReceiver struct {
 mu sync.Mutex
 dir string
 lock *os.File
 receiver *Receiver
 requests []Request
 poisoned bool
 // Test-only crash seam: no external callbacks or network operations.
 fault func(string) error
}

// Create explicitly initializes a new store; Open never creates a missing
// snapshot. Both reject concurrent owners. Do not delete or replace lock files.
func CreateDurable(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32)(*DurableReceiver,error){
 return openDurable(dir,ctx,approver,signer,limit,true)
}
func OpenDurable(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32)(*DurableReceiver,error){
 return openDurable(dir,ctx,approver,signer,limit,false)
}
func openDurable(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32,create bool)(*DurableReceiver,error){
 r,e:=NewReceiver(ctx,approver,signer,limit);if e!=nil{return nil,e}
 // Reject inconsistent Ed25519 private key material before persisting.
 if !bytes.Equal(ed25519.NewKeyFromSeed(signer[:ed25519.SeedSize]),signer){return nil,ErrPolicy}
 dir,e=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 l,e:=os.OpenFile(filepath.Join(dir,"owner.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(l.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  l.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 s:=&DurableReceiver{dir:dir,lock:l,receiver:r}
 ok:=false;defer func(){if !ok{s.Close()}}()
 path:=filepath.Join(dir,"state.bin")
 if create {
  if _,e=os.Lstat(path);!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=s.persist(nil);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(path);if e!=nil{return nil,e}
  b,e:=io.ReadAll(io.LimitReader(f,int64(maxSnapshot+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  requests,e:=s.decode(b);if e!=nil{return nil,e}
  for _,req:=range requests{
   if _,e=r.Commit(req);e!=nil{return nil,ErrStore}
  }
  if int(r.Count())!=len(requests){return nil,ErrStore}
  s.requests=requests
  // A prior process may have died after rename but before directory sync.
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return s,nil
}
func(s *DurableReceiver) header(n int)[]byte{
 r:=s.receiver
 b:=append([]byte(snapshotDomain),r.ctx[:]...)
 b=append(b,r.approver...);b=append(b,r.signer.Public().(ed25519.PublicKey)...)
 return append(b,byte(r.limit),byte(n))
}
func(s *DurableReceiver) encode(requests []Request)[]byte{
 b:=s.header(len(requests))
 for _,r:=range requests{b=append(b,r.Bytes()...)}
 return append(b,ed25519.Sign(s.receiver.signer,b)...)
}
func(s *DurableReceiver) decode(b []byte)([]Request,error){
 if len(b)<snapshotHeader+ed25519.SignatureSize||len(b)>maxSnapshot{return nil,ErrStore}
 n:=int(b[snapshotHeader-1])
 if n>int(s.receiver.limit)||len(b)!=snapshotHeader+n*requestSize+ed25519.SignatureSize||!bytes.Equal(b[:snapshotHeader],s.header(n)){return nil,ErrStore}
 body:=b[:len(b)-ed25519.SignatureSize]
 if !ed25519.Verify(s.receiver.signer.Public().(ed25519.PublicKey),body,b[len(body):]){return nil,ErrStore}
 out:=make([]Request,0,n)
 for i:=0;i<n;i++{r,e:=ParseRequest(b[snapshotHeader+i*requestSize:snapshotHeader+(i+1)*requestSize]);if e!=nil{return nil,e};out=append(out,r)}
 return out,nil
}
func syncDirectory(dir string)error{
 d,e:=os.Open(dir);if e!=nil{return e};defer d.Close();return d.Sync()
}
func(s *DurableReceiver) persist(requests []Request)error{
 f,e:=os.CreateTemp(s.dir,".state-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 b:=s.encode(requests)
 n,e:=f.Write(b);if e!=nil{return e};if n!=len(b){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if s.fault!=nil{if e=s.fault("before-rename");e!=nil{return e}}
 if e=os.Rename(f.Name(),filepath.Join(s.dir,"state.bin"));e!=nil{return e}
 if s.fault!=nil{if e=s.fault("after-rename");e!=nil{return e}}
 return syncDirectory(s.dir)
}
func(s *DurableReceiver) Commit(r Request)(Receipt,error){
 s.mu.Lock();defer s.mu.Unlock()
 if s.lock==nil||s.poisoned{return Receipt{},ErrStore}
 // Existing receipts remain available even if the effect budget is exhausted.
 if receipt,e:=s.receiver.Status(r);!errors.Is(e,ErrAbsent){return receipt,e}
 // Replay into a private candidate; no observable mutation before fsync.
 old:=s.receiver
 candidate,e:=NewReceiver(old.ctx,old.approver,old.signer,old.limit);if e!=nil{return Receipt{},e}
 for _,req:=range s.requests{if _,e=candidate.Commit(req);e!=nil{s.poisoned=true;return Receipt{},ErrStore}}
 receipt,e:=candidate.Commit(r);if e!=nil{return Receipt{},e}
 next:=append(append([]Request(nil),s.requests...),r)
 if e=s.persist(next);e!=nil{
  // Failure after rename may have committed; refuse all further reads/writes
  // until reopening and validating the authoritative snapshot.
  s.poisoned=true;return Receipt{},ErrUnknown
 }
 s.receiver=candidate;s.requests=next;return receipt,nil
}
func(s *DurableReceiver) Status(r Request)(Receipt,error){
 s.mu.Lock();defer s.mu.Unlock()
 if s.lock==nil||s.poisoned{return Receipt{},ErrStore}
 return s.receiver.Status(r)
}
func(s *DurableReceiver) Close()error{
 s.mu.Lock();defer s.mu.Unlock()
 if s.lock==nil{return nil}
 e:=s.lock.Close();s.lock=nil;return e
}

// OpenDurableAnchored refuses rollback relative to a receipt and exact approval
// independently retained by the caller. This is a prefix pin, NOT a global
// consensus/anti-equivocation service. Never trust a pin read from this store.
func OpenDurableAnchored(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,limit uint32,approved Request,expected Receipt)(*DurableReceiver,error){
 if len(signer)!=ed25519.PrivateKeySize||!Verify(expected,approved,signer.Public().(ed25519.PublicKey)){return nil,ErrPolicy}
 s,e:=OpenDurable(dir,ctx,approver,signer,limit);if e!=nil{return nil,e}
 actual,e:=s.Status(approved)
 if e!=nil||actual!=expected{s.Close();return nil,ErrStore}
 return s,nil
}
func(s *DurableReceiver) ServeHTTP(w http.ResponseWriter,r *http.Request){
 serveActionHTTP(s,w,r)
}
