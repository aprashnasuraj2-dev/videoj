//go:build linux

package actionprotocol

// A finite, host-owned caller journal. Exact approvals and budgets are frozen
// at creation. Reserve before I/O, never refund an ambiguous contact. This
// does not prevent a privileged owner from cloning/rolling back the journal.
import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "io"
 "os"
 "path/filepath"
 "sync"
 "syscall"
)

const perApprovalContacts = 2
const bookContacts = 3
const bookDomain = "SUTRA/fixture-caller-book/v1\x00"
const bookRecordSize = 2+receiptSize

type ContactOp string
const (
 FirstDispatch ContactOp = "dispatch"
 LookupStatus ContactOp = "status"
 RetryApproval ContactOp = "retry"
)
type bookRecord struct {
 count byte
 receipt Receipt
}
type ContactBook struct {
 mu sync.Mutex
 dir string
 lock *os.File
 signer ed25519.PrivateKey
 header []byte
 approvals []Request
 clients []*Client
 records []bookRecord
 poisoned bool
 // Test-only crash seam after durable reservation but before transport.
 reserved func()
}

func CreateContactBook(dir,origin,manifest,session string,approver,receiver ed25519.PublicKey,journal ed25519.PrivateKey,approvals []Request)(*ContactBook,error){
 return openContactBook(dir,origin,manifest,session,approver,receiver,journal,approvals,true)
}
func OpenContactBook(dir,origin,manifest,session string,approver,receiver ed25519.PublicKey,journal ed25519.PrivateKey,approvals []Request)(*ContactBook,error){
 return openContactBook(dir,origin,manifest,session,approver,receiver,journal,approvals,false)
}
func openContactBook(dir,origin,manifest,session string,approver,receiver ed25519.PublicKey,journal ed25519.PrivateKey,approvals []Request,create bool)(*ContactBook,error){
 ctx,e:=Context(origin,manifest,session)
 if e!=nil||len(approver)!=ed25519.PublicKeySize||len(receiver)!=ed25519.PublicKeySize||len(journal)!=ed25519.PrivateKeySize||len(approvals)==0||len(approvals)>maxSlots{return nil,ErrPolicy}
 if !bytes.Equal(ed25519.NewKeyFromSeed(journal[:ed25519.SeedSize]),journal){return nil,ErrPolicy}
 b:=&ContactBook{signer:append(ed25519.PrivateKey(nil),journal...),approvals:append([]Request(nil),approvals...),records:make([]bookRecord,len(approvals))}
 b.header=append([]byte(bookDomain),ctx[:]...)
 b.header=append(b.header,approver...)
 b.header=append(b.header,receiver...)
 b.header=append(b.header,journal.Public().(ed25519.PublicKey)...)
 b.header=append(b.header,byte(perApprovalContacts),byte(bookContacts),byte(len(approvals)))
 keys:=map[Key]bool{};slots:=[maxSlots]bool{}
 for _,r:=range b.approvals{
  if r.Context!=ctx||r.Key==(Key{})||r.Slot>=maxSlots||keys[r.Key]||slots[r.Slot]||!ed25519.Verify(approver,r.message(),r.Approval[:]){return nil,ErrPolicy}
  keys[r.Key]=true;slots[r.Slot]=true
  c,e:=NewClient(origin,manifest,session,r,receiver);if e!=nil{return nil,e}
  b.clients=append(b.clients,c)
  b.header=append(b.header,r.Bytes()...)
 }
 dir,e=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 b.dir=dir
 lock,e:=os.OpenFile(filepath.Join(dir,"contacts.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(lock.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  lock.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 b.lock=lock
 ok:=false;defer func(){if !ok{b.Close()}}()
 path:=filepath.Join(dir,"contacts.bin")
 if create{
  if _,e=os.Lstat(path);!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=b.persist(b.records);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(path);if e!=nil{return nil,e}
  raw,e:=io.ReadAll(io.LimitReader(f,int64(b.size()+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  if e=b.decode(raw);e!=nil{return nil,e}
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return b,nil
}
func (b *ContactBook) size()int{return len(b.header)+len(b.approvals)*bookRecordSize+ed25519.SignatureSize}
func (b *ContactBook) encode(records []bookRecord)[]byte{
 raw:=append([]byte(nil),b.header...)
 for _,r:=range records{
  raw=append(raw,r.count)
  if r.receipt==(Receipt{}){raw=append(raw,0);raw=append(raw,make([]byte,receiptSize)...)}else{raw=append(raw,1);raw=append(raw,r.receipt.Bytes()...)}
 }
 return append(raw,ed25519.Sign(b.signer,raw)...)
}
func (b *ContactBook) decode(raw []byte)error{
 if len(raw)!=b.size()||!bytes.Equal(raw[:len(b.header)],b.header){return ErrStore}
 body:=raw[:len(raw)-ed25519.SignatureSize]
 if !ed25519.Verify(b.signer.Public().(ed25519.PublicKey),body,raw[len(body):]){return ErrStore}
 records:=make([]bookRecord,len(b.approvals));total:=0
 for i:=range records{
  offset:=len(b.header)+i*bookRecordSize
  n,flag:=raw[offset],raw[offset+1];payload:=raw[offset+2:offset+bookRecordSize]
  if n>perApprovalContacts{return ErrStore};total+=int(n)
  records[i].count=n
  switch flag{
  case 0:if !bytes.Equal(payload,make([]byte,receiptSize)){return ErrStore}
  case 1:
   r,e:=ParseReceipt(payload)
   if e!=nil||n==0||!Verify(r,b.approvals[i],b.clients[i].receiver){return ErrStore}
   records[i].receipt=r
  default:return ErrStore
  }
 }
 if total>bookContacts{return ErrStore}
 b.records=records;return nil
}
func (b *ContactBook) persist(records []bookRecord)error{
 f,e:=os.CreateTemp(b.dir,".contacts-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=b.encode(records);n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if e=os.Rename(f.Name(),filepath.Join(b.dir,"contacts.bin"));e!=nil{return e}
 return syncDirectory(b.dir)
}
func (b *ContactBook) total()int{n:=0;for _,r:=range b.records{n+=int(r.count)};return n}
func (b *ContactBook) index(key Key)int{for i,r:=range b.approvals{if r.Key==key{return i}};return -1}
// The caller mutex deliberately serializes this small fixture's network calls.
// It is not a production scheduler. Reservation consumes a contact even if
// the process dies before sending any bytes. No unapproved key can enroll.
func (b *ContactBook) Call(key Key,op ContactOp)(Receipt,error){
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return Receipt{},ErrStore}
 if op!=FirstDispatch&&op!=LookupStatus&&op!=RetryApproval{return Receipt{},ErrPolicy}
 i:=b.index(key);if i<0{return Receipt{},ErrPolicy}
 record:=b.records[i]
 if record.receipt!=(Receipt{}){return record.receipt,nil}
 if op==FirstDispatch&&record.count!=0{return Receipt{},ErrUnknown}
 if op!=FirstDispatch&&record.count==0{return Receipt{},ErrPolicy}
 if record.count>=perApprovalContacts||b.total()>=bookContacts{return Receipt{},ErrContacts}
 next:=append([]bookRecord(nil),b.records...);next[i].count++
 if e:=b.persist(next);e!=nil{b.poisoned=true;return Receipt{},ErrUnknown}
 b.records=next
 if b.reserved!=nil{b.reserved()}
 path:="/commit";if op==LookupStatus{path="/status"}
 r,e:=b.clients[i].exchange(path);if e!=nil{return Receipt{},e}
 next=append([]bookRecord(nil),b.records...);next[i].receipt=r
 if e=b.persist(next);e!=nil{b.poisoned=true;return Receipt{},ErrUnknown}
 b.records=next;return r,nil
}
func (b *ContactBook) Observe(key Key)(State,int,int,error){
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil||b.poisoned{return "",0,0,ErrStore}
 i:=b.index(key);if i<0{return "",0,0,ErrPolicy}
 r:=b.records[i];state:=Proposed
 if r.count>0{state=Unknown};if r.receipt!=(Receipt{}){state=Committed}
 return state,int(r.count),b.total(),nil
}
func (b *ContactBook) Close()error{
 b.mu.Lock();defer b.mu.Unlock()
 if b.lock==nil{return nil}
 e:=b.lock.Close();b.lock=nil;return e
}
