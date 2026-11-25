package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "fmt"
 "net/http"
 "net/http/httptest"
 "sync"
 "sync/atomic"
 "testing"
)
func keys(n byte)(ed25519.PublicKey,ed25519.PrivateKey){
 k:=ed25519.NewKeyFromSeed(bytes.Repeat([]byte{n},32))
 return k.Public().(ed25519.PublicKey),k
}
func fixture(t *testing.T,origin string,limit uint32)(*Receiver,ed25519.PrivateKey,ed25519.PublicKey,Digest){
 t.Helper();a,ak:=keys(1);p,pk:=keys(2)
 ctx,e:=Context(origin,"manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 s,e:=NewReceiver(ctx,a,pk,limit);if e!=nil{t.Fatal(e)}
 return s,ak,p,ctx
}
func approve(t *testing.T,slot byte,ctx Digest,ak ed25519.PrivateKey)Request{
 t.Helper();r,e:=Approve(slot,ctx,ak);if e!=nil{t.Fatal(e)};return r
}
func TestConcurrentDeduplication(t *testing.T){
 s,ak,p,ctx:=fixture(t,"http://127.0.0.1:10000",1)
 r:=approve(t,0,ctx,ak)
 var wg sync.WaitGroup;results:=make(chan Receipt,64);errs:=make(chan error,64)
 for i:=0;i<64;i++{wg.Add(1);go func(){defer wg.Done();a,e:=s.Commit(r);results<-a;errs<-e}()}
 wg.Wait();close(results);close(errs)
 for e:=range errs{if e!=nil{t.Fatal(e)}}
 first:=<-results
 for a:=range results{if a!=first{t.Fatal("different receipts")}}
 if s.Count()!=1||!Verify(first,r,p){t.Fatal("not one valid effect")}
 other:=r;other.Slot=1;copy(other.Approval[:],ed25519.Sign(ak,other.message()))
 if _,e:=s.Commit(other);!errors.Is(e,ErrConflict){t.Fatal("key substitution",e)}
 if _,e:=s.Commit(approve(t,1,ctx,ak));!errors.Is(e,ErrBudget){t.Fatal("budget",e)}
 if a,e:=s.Status(r);e!=nil||a!=first{t.Fatal("status",e)}
 // Tampering with a receipt, request, context, or approving principal fails.
 bad:=first;bad.Version=2;if Verify(bad,r,p){t.Fatal("forged receipt")}
 badReq:=r;badReq.Slot=1;if _,e:=s.Commit(badReq);!errors.Is(e,ErrPolicy){t.Fatal("forged approval")}
 otherCtx,_:=Context("http://127.0.0.1:10001","manifest-v1","session-1")
 if _,e:=s.Commit(approve(t,1,otherCtx,ak));!errors.Is(e,ErrPolicy){t.Fatal("wrong audience")}
 _,otherKey:=keys(3);if _,e:=s.Commit(approve(t,1,ctx,otherKey));!errors.Is(e,ErrPolicy){t.Fatal("wrong signer")}
}
func TestLostResponseAfterCommit(t *testing.T){
 var receiver atomic.Pointer[Receiver];var commits,status atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path=="/commit"&&commits.Add(1)==1{
   // Commit through the actual receiver HTTP handler, then discard its
   // response and close the TCP connection before the caller sees a receipt.
   sink:=httptest.NewRecorder();receiver.Load().serveHTTP(sink,r)
   if sink.Code!=200{t.Errorf("fixture commit failed: %d",sink.Code)}
   conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return
  }
  if r.URL.Path=="/status"{status.Add(1)}
  receiver.Load().serveHTTP(w,r)
 }));defer srv.Close()
 s,ak,p,ctx:=fixture(t,srv.URL,2);receiver.Store(s)
 r:=approve(t,0,ctx,ak);c,e:=NewClient(srv.URL,"manifest-v1","session-1",r,p);if e!=nil{t.Fatal(e)}
 if _,e=c.Dispatch();!errors.Is(e,ErrUnknown)||c.State()!=Unknown||s.Count()!=1{t.Fatal("lost result incorrectly classified",e)}
 if _,e=c.Dispatch();!errors.Is(e,ErrUnknown)||commits.Load()!=1{t.Fatal("blind replay",e)}
 receipt,e:=c.Reconcile();if e!=nil||!Verify(receipt,r,p)||c.State()!=Committed{t.Fatal("reconciliation",e)}
 if next,e:=c.RetrySameApproval();e!=nil||next!=receipt{t.Fatal("committed replay",e)}
 if commits.Load()!=1||status.Load()!=1||c.Contacts()!=2||s.Count()!=1{t.Fatal("incorrect contact/effect counts")}
 t.Log("actual TCP drop after commit; one dispatch, one status, one effect")
}
func TestAbsentDoesNotAuthorizeNewAction(t *testing.T){
 var receiver atomic.Pointer[Receiver];var requests atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if requests.Add(1)==1{conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return}
  receiver.Load().serveHTTP(w,r)
 }));defer srv.Close()
 s,ak,p,ctx:=fixture(t,srv.URL,2);receiver.Store(s);r:=approve(t,0,ctx,ak)
 c,e:=NewClient(srv.URL,"manifest-v1","session-1",r,p);if e!=nil{t.Fatal(e)}
 if _,e=c.Dispatch();!errors.Is(e,ErrUnknown){t.Fatal(e)}
 if _,e=c.Reconcile();!errors.Is(e,ErrAbsent)||c.State()!=Unknown{t.Fatal("absence treated as terminal",e)}
 if a,e:=c.RetrySameApproval();e!=nil||!Verify(a,r,p)||s.Count()!=1{t.Fatal("same approval retry",e)}
 if c.Contacts()!=3{t.Fatal("wrong count")}
}
func TestTransportRefusesRedirectForgeryAndBudget(t *testing.T){
 var redirected atomic.Int32
 target:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){redirected.Add(1)}));defer target.Close()
 var n atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if n.Add(1)==1{http.Redirect(w,r,target.URL,http.StatusTemporaryRedirect);return}
  w.Header().Set("Content-Type",media);w.Write(make([]byte,receiptSize))
 }));defer srv.Close()
 _,ak,p,ctx:=fixture(t,srv.URL,1);r:=approve(t,0,ctx,ak)
 c,e:=NewClient(srv.URL,"manifest-v1","session-1",r,p);if e!=nil{t.Fatal(e)}
 if _,e=c.Dispatch();!errors.Is(e,ErrUnknown)||redirected.Load()!=0{t.Fatal("redirect followed",e)}
 for i:=0;i<3;i++{if _,e=c.Reconcile();!errors.Is(e,ErrUnknown){t.Fatal("forgery accepted",e)}}
 if _,e=c.Reconcile();!errors.Is(e,ErrContacts)||n.Load()!=4{t.Fatal("budget bypass",e)}
 for _,origin:=range []string{"https://example.org","http://localhost:1234",srv.URL+"/","http://user@127.0.0.1:1"}{
  if _,e:=NewClient(origin,"manifest-v1","session-1",r,p);e==nil{t.Fatal("invalid origin",origin)}
 }
 if _,e:=NewClient(srv.URL,"manifest-v2","session-1",r,p);e==nil{t.Fatal("manifest substitution")}
}
func TestWireBoundAndOccupiedSlot(t *testing.T){
 s,ak,_,ctx:=fixture(t,"http://127.0.0.1:10000",2);r:=approve(t,0,ctx,ak)
 for _,b:=range [][]byte{nil,r.Bytes()[:requestSize-1],append(r.Bytes(),0)}{
  q:=httptest.NewRequest(http.MethodPost,"/commit",bytes.NewReader(b));q.Header.Set("Content-Type",media)
  w:=httptest.NewRecorder();s.serveHTTP(w,q);if w.Code!=400{t.Fatal(fmt.Sprint(w.Code))}
 }
 if s.Count()!=0{t.Fatal("invalid effect")}
 if _,e:=s.Commit(r);e!=nil{t.Fatal(e)}
 if _,e:=s.Commit(approve(t,0,ctx,ak));!errors.Is(e,ErrOccupied){t.Fatal("occupied",e)}
 if s.Count()!=1{t.Fatal("duplicate slot")}
}
