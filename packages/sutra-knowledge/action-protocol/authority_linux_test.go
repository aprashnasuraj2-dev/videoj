//go:build linux

package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "encoding/hex"
 "encoding/json"
 "errors"
 "net/http"
 "net/http/httptest"
 "os"
 "path/filepath"
 "sync"
 "sync/atomic"
 "testing"
)

type refinementEvent struct {
 Op string `json:"op"`
 Caller int `json:"caller"`
 Key string `json:"key"`
 Expected string `json:"expected"`
 Before string `json:"before"`
 After string `json:"after"`
 Outcome string `json:"outcome"`
 Stale bool `json:"stale"`
 CallerSpent int `json:"callerSpent"`
 TotalSpent int `json:"totalSpent"`
 ReceiptVersion uint32 `json:"receiptVersion"`
 Ack bool `json:"ack"`
}
type refinementTrace struct {
 Profile string `json:"profile"`
 PerCallerLimit int `json:"perCallerLimit"`
 TotalLimit int `json:"totalLimit"`
 Events []refinementEvent `json:"events"`
}
func hexDigest(v Digest)string{return hex.EncodeToString(v[:])}
func hexKey(v Key)string{return hex.EncodeToString(v[:])}
func outcomeName(v byte)string{
 switch v{case AuthorityCommitted:return "committed";case AuthorityAbsent:return "absent";case AuthorityConflict:return "conflict";case AuthorityBudget:return "budget"};return "unknown"
}
func traceEvent(op string,req Request,expected Digest,r AuthorityResponse,ack bool)refinementEvent{
 return refinementEvent{Op:op,Caller:int(r.Caller)+1,Key:hexKey(req.Key),Expected:hexDigest(expected),Before:hexDigest(r.Before),After:hexDigest(r.After),Outcome:outcomeName(r.Outcome),Stale:r.Stale==1,CallerSpent:int(r.CallerSpent),TotalSpent:int(r.TotalSpent),ReceiptVersion:r.Receipt.Version,Ack:ack}
}
func authorityFixture(t *testing.T,origin string)(Digest,ed25519.PublicKey,ed25519.PrivateKey,ed25519.PublicKey,ed25519.PrivateKey,[authorityCallers]ed25519.PublicKey,[authorityCallers]ed25519.PrivateKey){
 t.Helper()
 approver,ak:=keys(1);authorityPub,authorityKey:=keys(2)
 c0,c0k:=keys(7);c1,c1k:=keys(8)
 ctx,e:=Context(origin,"manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 return ctx,approver,ak,authorityPub,authorityKey,[authorityCallers]ed25519.PublicKey{c0,c1},[authorityCallers]ed25519.PrivateKey{c0k,c1k}
}

func TestSharedAuthorityAuthenticatedRecoverySharedBudgetAndTrace(t *testing.T){
 var current atomic.Pointer[SharedAuthority]
 var drop atomic.Bool
 dropped:=make(chan AuthorityResponse,1)
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  a:=current.Load();if a==nil{w.WriteHeader(503);return}
  if drop.CompareAndSwap(true,false){
   recorder:=httptest.NewRecorder();a.ServeHTTP(recorder,r)
   if recorder.Code!=200{t.Errorf("authority commit failed %d",recorder.Code);return}
   parsed,e:=ParseAuthorityResponse(recorder.Body.Bytes());if e!=nil{t.Error(e);return};dropped<-parsed
   conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return
  }
  a.ServeHTTP(w,r)
 }));defer srv.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 dir:=privateTemp(t)
 a,e:=CreateSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};current.Store(a)
 root,e:=a.Head();if e!=nil{t.Fatal(e)}
 req0:=approve(t,0,ctx,ak);req1:=approve(t,1,ctx,ak)
 c0,e:=NewAuthorityClient(srv.URL,0,callerKey[0],authorityPub,req0,root);if e!=nil{t.Fatal(e)}
 trace:=refinementTrace{Profile:"SUTRA/shared-authority-refinement/v1",PerCallerLimit:authorityPerCallerContacts,TotalLimit:authorityTotalContacts}
 drop.Store(true)
 expected:=c0.Head()
 if _,_,e=c0.Commit();!errors.Is(e,ErrUnknown){t.Fatal("lost reply not unknown",e)}
 first:=<-dropped
 if first.Outcome!=AuthorityCommitted||first.Stale!=0||first.Receipt.Version!=1{t.Fatal("dropped commit response",first)}
 trace.Events=append(trace.Events,traceEvent("commit",req0,expected,first,false))
 a.Close();a,e=OpenSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};current.Store(a);defer a.Close()
 expected=c0.Head()
 receipt,recovered,e:=c0.Status();if e!=nil||receipt!=first.Receipt||recovered.Stale!=1||recovered.CallerSpent!=2||recovered.TotalSpent!=2{t.Fatal("stale status recovery",e,recovered)}
 trace.Events=append(trace.Events,traceEvent("status",req0,expected,recovered,true))
 c1,e:=NewAuthorityClient(srv.URL,1,callerKey[1],authorityPub,req1,recovered.After);if e!=nil{t.Fatal(e)}
 expected=c1.Head()
 receipt1,second,e:=c1.Commit();if e!=nil||receipt1.Version!=2||second.CallerSpent!=1||second.TotalSpent!=3{t.Fatal("second caller",e,second)}
 trace.Events=append(trace.Events,traceEvent("commit",req1,expected,second,true))
 rolled,e:=NewAuthorityClient(srv.URL,0,callerKey[0],authorityPub,req0,root);if e!=nil{t.Fatal(e)}
 expected=rolled.Head()
 if _,denied,e:=rolled.Commit();!errors.Is(e,ErrContacts)||denied.Outcome!=AuthorityBudget||denied.TotalSpent!=3||denied.After!=second.After{t.Fatal("rollback reset shared budget",e,denied)}else{
  trace.Events=append(trace.Events,traceEvent("commit",req0,expected,denied,true))
 }
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{2,1}||total!=3||effects!=2{t.Fatal("authority counts",spent,total,effects,e)}
 if path:=os.Getenv("SUTRA_AUTHORITY_TRACE");path!=""{
  raw,e:=json.MarshalIndent(trace,"","  ");if e!=nil{t.Fatal(e)}
  if e=os.WriteFile(path,append(raw,'\n'),0600);e!=nil{t.Fatal(e)}
 }
 t.Log("lost reply + restart recovered by stale signed status; 2+1 contacts globally durable; rolled-back caller pin cannot reset authority budget")
}

func TestSharedAuthorityAuthenticationCASAndTampering(t *testing.T){
 var current atomic.Pointer[SharedAuthority]
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){current.Load().ServeHTTP(w,r)}));defer srv.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 a,e:=CreateSharedAuthority(privateTemp(t),ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close();current.Store(a)
 root,_:=a.Head();r0:=approve(t,0,ctx,ak);r1:=approve(t,1,ctx,ak)
 forged,e:=SignAuthorityRequest(0,AuthorityCommit,root,r0,callerKey[1]);if e!=nil{t.Fatal(e)}
 if _,e=a.Process(forged);!errors.Is(e,ErrAuthorityAuth){t.Fatal("wrong caller accepted",e)}
 if spent,total,effects,e:=a.Counts();e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("auth charged budget",spent,total,effects,e)}
 q0,_:=SignAuthorityRequest(0,AuthorityCommit,root,r0,callerKey[0]);q1,_:=SignAuthorityRequest(1,AuthorityCommit,root,r1,callerKey[1])
 type answer struct{q AuthorityRequest;r AuthorityResponse;e error};ch:=make(chan answer,2);var wg sync.WaitGroup
 for _,q:=range []AuthorityRequest{q0,q1}{wg.Add(1);go func(q AuthorityRequest){defer wg.Done();r,e:=a.Process(q);ch<-answer{q,r,e}}(q)}
 wg.Wait();close(ch)
 committed,conflict:=0,0
 for x:=range ch{
  if x.e!=nil||!VerifyAuthorityResponse(x.r,x.q,authorityPub){t.Fatal("bad signed response",x.e)}
  if x.r.Outcome==AuthorityCommitted{committed++};if x.r.Outcome==AuthorityConflict{conflict++}
 }
 if committed!=1||conflict!=1{t.Fatal("CAS did not serialize",committed,conflict)}
 if _,total,effects,e:=a.Counts();e!=nil||total!=2||effects!=1{t.Fatal("wrong counts",total,effects,e)}
 head,_:=a.Head();goodReq,_:=SignAuthorityRequest(0,AuthorityStatus,head,r0,callerKey[0])
 good,e:=a.Process(goodReq);if e!=nil{t.Fatal(e)}
 bad:=good;bad.TotalSpent=0
 if VerifyAuthorityResponse(bad,goodReq,authorityPub){t.Fatal("tampered response verified")}
 t.Log("caller key authenticated before charging; concurrent CAS linearized; stale writer spent contact but no second effect; response tamper refused")
}

func TestSharedAuthorityCloneCounterexampleAndCorruption(t *testing.T){
 origin:="http://127.0.0.1:19091"
 ctx,approver,ak,_,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 dir:=privateTemp(t);clone:=privateTemp(t)
 a,e:=CreateSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 root,_:=a.Head();state,e:=os.ReadFile(filepath.Join(dir,"authority.bin"));if e!=nil{t.Fatal(e)}
 if e=os.WriteFile(filepath.Join(clone,"authority.bin"),state,0600);e!=nil{t.Fatal(e)}
 other,e:=OpenSharedAuthority(clone,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 r0:=approve(t,0,ctx,ak);r1:=approve(t,1,ctx,ak)
 q0,_:=SignAuthorityRequest(0,AuthorityCommit,root,r0,callerKey[0]);q1,_:=SignAuthorityRequest(1,AuthorityCommit,root,r1,callerKey[1])
 left,e:=a.Process(q0);if e!=nil{t.Fatal(e)};right,e:=other.Process(q1);if e!=nil{t.Fatal(e)}
 if left.After==right.After||left.Outcome!=AuthorityCommitted||right.Outcome!=AuthorityCommitted{t.Fatal("clone fork counterexample missing")}
 a.Close();other.Close()
 raw,e:=os.ReadFile(filepath.Join(dir,"authority.bin"));if e!=nil{t.Fatal(e)};raw[len(raw)-1]^=1
 if e=os.WriteFile(filepath.Join(dir,"authority.bin"),raw,0600);e!=nil{t.Fatal(e)}
 if s,e:=OpenSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);!errors.Is(e,ErrStore){if s!=nil{s.Close()};t.Fatal("corruption accepted",e)}
 t.Log("cloning the trusted authority key+snapshot still forks: this primitive is a single authority, not consensus")
}

func TestSharedAuthorityAmbiguousPersistencePoisonsOwner(t *testing.T){
 origin:="http://127.0.0.1:19092"
 ctx,approver,ak,_,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 for _,stage:=range []string{"before-rename","after-rename"}{t.Run(stage,func(t *testing.T){
  dir:=privateTemp(t);a,e:=CreateSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
  root,_:=a.Head();req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,root,req,callerKey[0])
  a.fault=func(at string)error{if at==stage{return errors.New("injected")};return nil}
  if _,e=a.Process(wire);!errors.Is(e,ErrUnknown){t.Fatal("ambiguous persistence not unknown",e)}
  if _,e=a.Head();!errors.Is(e,ErrStore){t.Fatal("poisoned owner readable",e)}
  a.Close();a,e=OpenSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
  spent,total,effects,e:=a.Counts();if e!=nil{t.Fatal(e)}
  if stage=="before-rename"{
   if spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("before-rename committed",spent,total,effects)}
  }else{
   if spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("after-rename lost commit",spent,total,effects)}
  }
 })}
}


func TestSharedAuthorityCopiesProvisionedCallerKeys(t *testing.T){
 origin:="http://127.0.0.1:19093"
 ctx,approver,ak,_,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 original0:=append(ed25519.PublicKey(nil),callerPub[0]...)
 a,e:=CreateSharedAuthority(privateTemp(t),ctx,approver,authorityKey,callerPub,1);if e!=nil{t.Fatal(e)};defer a.Close()
 root,_:=a.Head();req:=approve(t,0,ctx,ak)
 // Mutating the caller-owned slice after provisioning must not replace the
 // authority's authentication principal.
 callerPub[0][0]^=0xff
 wire,e:=SignAuthorityRequest(0,AuthorityCommit,root,req,callerKey[0]);if e!=nil{t.Fatal(e)}
 response,e:=a.Process(wire);if e!=nil||response.Outcome!=AuthorityCommitted{t.Fatal("provisioned key aliased caller memory",e)}
 if bytes.Equal(callerPub[0],original0){t.Fatal("test mutation did not occur")}
 t.Log("authority owns immutable copies of provisioned caller keys")
}
