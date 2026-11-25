//go:build linux

package actionprotocol

import (
 "crypto/ed25519"
 "errors"
 "net/http"
 "net/http/httptest"
 "os"
 "os/exec"
 "path/filepath"
 "sync"
 "sync/atomic"
 "testing"
 "time"
)

func bookApprovals(t *testing.T,origin string)(Digest,ed25519.PublicKey,ed25519.PrivateKey,ed25519.PublicKey,ed25519.PrivateKey,ed25519.PrivateKey,[]Request){
 t.Helper()
 p,ak:=keys(1);pub,sk:=keys(2);_,journal:=keys(3)
 ctx,e:=Context(origin,"manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 // Fixed test-only identities so subprocesses reconstruct the exact pins.
 approvals:=[]Request{{Key:Key{1},Slot:0,Context:ctx},{Key:Key{2},Slot:1,Context:ctx}}
 for i:=range approvals{copy(approvals[i].Approval[:],ed25519.Sign(ak,approvals[i].message()))}
 return ctx,p,ak,pub,sk,journal,approvals
}

func TestContactBookPersistentLimitsAndFrozenApprovals(t *testing.T){
 var receiver atomic.Pointer[DurableReceiver];var requests atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  requests.Add(1)
  if r.URL.Path=="/commit"{
   conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return
  }
  receiver.Load().ServeHTTP(w,r)
 }));defer srv.Close()
 ctx,p,ak,pub,sk,journal,approvals:=bookApprovals(t,srv.URL)
 store,e:=CreateDurable(privateTemp(t),ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer store.Close();receiver.Store(store)
 dir:=privateTemp(t)
 open:=func(create bool,rs []Request)(*ContactBook,error){
  if create{return CreateContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,rs)}
  return OpenContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,rs)
 }
 b,e:=open(true,approvals);if e!=nil{t.Fatal(e)};defer b.Close()
 if other,e:=open(false,approvals);!errors.Is(e,ErrStoreBusy){if other!=nil{other.Close()};t.Fatal("second book owner",e)}
 if _,e=b.Call(approvals[0].Key,FirstDispatch);!errors.Is(e,ErrUnknown){t.Fatal(e)}
 if _,e=b.Call(approvals[0].Key,LookupStatus);!errors.Is(e,ErrAbsent){t.Fatal(e)}
 b.Close();b,e=open(false,approvals);if e!=nil{t.Fatal(e)};defer b.Close()
 if state,n,total,e:=b.Observe(approvals[0].Key);e!=nil||state!=Unknown||n!=2||total!=2{t.Fatal("lost journal",state,n,total,e)}
 if _,e=b.Call(approvals[0].Key,RetryApproval);!errors.Is(e,ErrContacts){t.Fatal("per-approval budget reset",e)}
 alternate:=approve(t,0,ctx,ak)
 if _,e=b.Call(alternate.Key,FirstDispatch);!errors.Is(e,ErrPolicy){t.Fatal("new key admitted",e)}
 if _,e=b.Call(approvals[1].Key,FirstDispatch);!errors.Is(e,ErrUnknown){t.Fatal(e)}
 b.Close();b,e=open(false,approvals);if e!=nil{t.Fatal(e)};defer b.Close()
 if _,e=b.Call(approvals[1].Key,RetryApproval);!errors.Is(e,ErrContacts){t.Fatal("aggregate budget reset",e)}
 if state,n,total,e:=b.Observe(approvals[1].Key);e!=nil||state!=Unknown||n!=1||total!=3||requests.Load()!=3{t.Fatal("incorrect contact accounting",state,n,total,e)}
 b.Close()
 if other,e:=open(false,[]Request{alternate,approvals[1]});!errors.Is(e,ErrStore){if other!=nil{other.Close()};t.Fatal("re-pinned book accepted",e)}
 if other,e:=CreateContactBook(privateTemp(t),srv.URL,"manifest-v1","session-1",p,pub,journal,[]Request{alternate,approvals[0]});!errors.Is(e,ErrPolicy){if other!=nil{other.Close()};t.Fatal("duplicate slot enrollment",e)}
 t.Log("two per-approval contacts, three global contacts across restarts; unknown persists, fresh key and replacement enrollment refused")
}

func TestContactBookReceiptAndCorruption(t *testing.T){
 var receiver atomic.Pointer[DurableReceiver];var requests atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){requests.Add(1);receiver.Load().ServeHTTP(w,r)}));defer srv.Close()
 ctx,p,_,pub,sk,journal,approvals:=bookApprovals(t,srv.URL)
 store,e:=CreateDurable(privateTemp(t),ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer store.Close();receiver.Store(store)
 dir:=privateTemp(t)
 b,e:=CreateContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,approvals);if e!=nil{t.Fatal(e)}
 receipt,e:=b.Call(approvals[0].Key,FirstDispatch);if e!=nil||!Verify(receipt,approvals[0],pub){t.Fatal(e)}
 b.Close()
 b,e=OpenContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,approvals);if e!=nil{t.Fatal(e)};defer b.Close()
 if again,e:=b.Call(approvals[0].Key,LookupStatus);e!=nil||again!=receipt||requests.Load()!=1{t.Fatal("receipt not cached",e)}
 b.Close()
 path:=filepath.Join(dir,"contacts.bin");raw,e:=os.ReadFile(path);if e!=nil{t.Fatal(e)};raw[len(raw)-1]^=1
 if e=os.WriteFile(path,raw,0600);e!=nil{t.Fatal(e)}
 if other,e:=OpenContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,approvals);!errors.Is(e,ErrStore){if other!=nil{other.Close()};t.Fatal("corruption accepted",e)}
}

func TestContactBookActualProcessExitAfterReservation(t *testing.T){
 if os.Getenv("SUTRA_BOOK_CHILD")=="1"{
  origin:=os.Getenv("SUTRA_BOOK_ORIGIN");_,p,_,pub,_,journal,approvals:=bookApprovals(t,origin)
  b,e:=OpenContactBook(os.Getenv("SUTRA_BOOK_DIR"),origin,"manifest-v1","session-1",p,pub,journal,approvals);if e!=nil{t.Fatal(e)}
  b.reserved=func(){os.Exit(79)}
  b.Call(approvals[0].Key,FirstDispatch)
  t.Fatal("crash seam not reached")
 }
 var requests atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){requests.Add(1);w.WriteHeader(http.StatusNotFound)}));defer srv.Close()
 _,p,_,pub,_,journal,approvals:=bookApprovals(t,srv.URL)
 dir:=privateTemp(t);b,e:=CreateContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,approvals);if e!=nil{t.Fatal(e)};b.Close()
 cmd:=exec.Command(os.Args[0],"-test.run=^TestContactBookActualProcessExitAfterReservation$")
 cmd.Env=append(os.Environ(),"SUTRA_BOOK_CHILD=1","SUTRA_BOOK_ORIGIN="+srv.URL,"SUTRA_BOOK_DIR="+dir)
 out,e:=cmd.CombinedOutput();var exit *exec.ExitError
 if !errors.As(e,&exit)||exit.ExitCode()!=79{t.Fatalf("unexpected child result %v %s",e,out)}
 if requests.Load()!=0{t.Fatal("network before reservation seam")}
 b,e=OpenContactBook(dir,srv.URL,"manifest-v1","session-1",p,pub,journal,approvals);if e!=nil{t.Fatal(e)};defer b.Close()
 if state,n,total,e:=b.Observe(approvals[0].Key);e!=nil||state!=Unknown||n!=1||total!=1{t.Fatal("reservation lost",state,n,total,e)}
 if _,e=b.Call(approvals[0].Key,FirstDispatch);!errors.Is(e,ErrUnknown){t.Fatal("blind dispatch after crash",e)}
 if _,e=b.Call(approvals[0].Key,LookupStatus);!errors.Is(e,ErrAbsent){t.Fatal(e)}
 if _,e=b.Call(approvals[0].Key,RetryApproval);!errors.Is(e,ErrContacts)||requests.Load()!=1{t.Fatal("reservation refunded",e)}
 t.Log("actual process exited after fsynced reservation, before any TCP; charge survived restart")
}

func TestDurableReorderedAcknowledgements(t *testing.T){
 var receiver atomic.Pointer[DurableReceiver];var count atomic.Int32
 held:=make(chan struct{});release:=make(chan struct{});var once sync.Once
 unblock:=func(){once.Do(func(){close(release)})}
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if count.Add(1)==1{
   sink:=httptest.NewRecorder();receiver.Load().ServeHTTP(sink,r)
   close(held);<-release
   w.Header().Set("Content-Type",media);w.WriteHeader(sink.Code);w.Write(sink.Body.Bytes());return
  }
  receiver.Load().ServeHTTP(w,r)
 }));defer srv.Close();defer unblock()
 p,ak:=keys(1);pub,sk:=keys(2);ctx,e:=Context(srv.URL,"manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 store,e:=CreateDurable(privateTemp(t),ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer store.Close();receiver.Store(store)
 req:=approve(t,0,ctx,ak)
 first,e:=NewClient(srv.URL,"manifest-v1","session-1",req,pub);if e!=nil{t.Fatal(e)}
 second,e:=NewClient(srv.URL,"manifest-v1","session-1",req,pub);if e!=nil{t.Fatal(e)}
 type result struct{r Receipt;e error};done:=make(chan result,1)
 go func(){r,e:=first.Dispatch();done<-result{r,e}}()
 select{case <-held:case <-time.After(time.Second):t.Fatal("first reply not held")}
 later,e:=second.Dispatch();if e!=nil{t.Fatal(e)}
 select{case <-done:t.Fatal("first reply completed before release");default:}
 unblock()
 select{case x:=<-done:if x.e!=nil||x.r!=later||!Verify(x.r,req,pub){t.Fatal("reordered receipt",x.e)};case <-time.After(time.Second):t.Fatal("missing first reply")}
 if count.Load()!=2||first.Contacts()!=1||second.Contacts()!=1{t.Fatal("contact counts")}
 next,e:=store.Commit(approve(t,1,ctx,ak));if e!=nil||next.Version!=2{t.Fatal("duplicate effect",e)}
 t.Log("two actual TCP clients, second acknowledgement released before first; identical receipts and one effect")
}
