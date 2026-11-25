//go:build linux

package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "io"
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

func TestAnchorCASAndIndependentPin(t *testing.T){
 dir:=privateTemp(t);ctx,p,ak,sk:=durableKeys(t)
 a,e:=CreateAnchor(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer a.Close()
 pub:=sk.Public().(ed25519.PublicKey)
 root,e:=a.View();if e!=nil||!VerifyAnchorView(root,root.Head,ctx,p,pub,2){t.Fatal("genesis",e)}
 reqs:=[]Request{approve(t,0,ctx,ak),approve(t,1,ctx,ak)}
 type result struct{idx int;r Receipt;v AnchorView;e error}
 results:=make(chan result,2);var wg sync.WaitGroup
 for i,r:=range reqs{wg.Add(1);go func(i int,r Request){defer wg.Done();receipt,v,e:=a.Advance(root.Head,r);results<-result{i,receipt,v,e}}(i,r)}
 wg.Wait();close(results)
 winner:=-1;var first AnchorView
 for x:=range results{if x.e==nil{if winner!=-1{t.Fatal("two children acknowledged")};winner=x.idx;first=x.v;if !Verify(x.r,reqs[x.idx],pub){t.Fatal("bad receipt")}}else if !errors.Is(x.e,ErrHeadConflict){t.Fatal(x.e)}}
 if winner<0||len(first.Entries)!=1||!VerifyAnchorView(first,first.Head,ctx,p,pub,2){t.Fatal("first head")}
 if _,e=a.Status(reqs[1-winner]);!errors.Is(e,ErrAbsent){t.Fatal("loser committed",e)}
 // Verify that an independently valid old prefix does not match the new pin.
 if VerifyAnchorView(root,first.Head,ctx,p,pub,2){t.Fatal("stale root accepted")}
 a.Close();a,e=OpenAnchor(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer a.Close()
 if _,_,e=a.Advance(root.Head,reqs[1-winner]);!errors.Is(e,ErrHeadConflict){t.Fatal("stale CAS after restart",e)}
 r,final,e:=a.Advance(first.Head,reqs[1-winner]);if e!=nil||r.Version!=2||!VerifyAnchorView(final,final.Head,ctx,p,pub,2){t.Fatal("fresh CAS",e)}
 replay,v,e:=a.Advance(final.Head,reqs[1-winner]);if e!=nil||replay!=r||v.Head!=final.Head{t.Fatal("idempotent CAS",e)}
 bad:=final;bad.Entries=append([]AnchorEntry(nil),final.Entries...);bad.Entries[0],bad.Entries[1]=bad.Entries[1],bad.Entries[0]
 if VerifyAnchorView(bad,final.Head,ctx,p,pub,2){t.Fatal("reordered history accepted")}
 bad=final;bad.Entries=append([]AnchorEntry(nil),final.Entries...);bad.Entries[0].Receipt.Signature[0]^=1
 if VerifyAnchorView(bad,final.Head,ctx,p,pub,2){t.Fatal("forged receipt accepted")}
 bad=final;bad.Entries=final.Entries[:1]
 if VerifyAnchorView(bad,final.Head,ctx,p,pub,2){t.Fatal("truncated history accepted")}
 forged:=approve(t,2,ctx,ak);forged.Slot=3
 if _,_,e=a.Advance(final.Head,forged);!errors.Is(e,ErrPolicy){t.Fatal("unapproved key",e)}
 t.Log("two CAS writers, one winner; restart stale CAS refused; independent pin rejects stale/reordered/forged/truncated history")
}

func TestAnchorProcessContentionAndCloneCounterexample(t *testing.T){
 ctx,p,ak,sk:=durableKeys(t)
 if os.Getenv("SUTRA_ANCHOR_CHILD")=="1"{
  a,e:=OpenAnchor(os.Getenv("SUTRA_ANCHOR_DIR"),ctx,p,sk,2)
  if a!=nil{a.Close()}
  if !errors.Is(e,ErrStoreBusy){t.Fatal("second process",e)}
  return
 }
 dir:=privateTemp(t);clone:=privateTemp(t)
 a,e:=CreateAnchor(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer a.Close()
 root,e:=a.View();if e!=nil{t.Fatal(e)}
 state,e:=os.ReadFile(filepath.Join(dir,"state.bin"));if e!=nil{t.Fatal(e)}
 if e=os.WriteFile(filepath.Join(clone,"state.bin"),state,0600);e!=nil{t.Fatal(e)}
 cmd:=exec.Command(os.Args[0],"-test.run=^TestAnchorProcessContentionAndCloneCounterexample$")
 cmd.Env=append(os.Environ(),"SUTRA_ANCHOR_CHILD=1","SUTRA_ANCHOR_DIR="+dir)
 if out,e:=cmd.CombinedOutput();e!=nil{t.Fatalf("child %v: %s",e,out)}
 other,e:=OpenAnchor(clone,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer other.Close()
 _,left,e:=a.Advance(root.Head,approve(t,0,ctx,ak));if e!=nil{t.Fatal(e)}
 _,right,e:=other.Advance(root.Head,approve(t,1,ctx,ak));if e!=nil{t.Fatal(e)}
 pub:=sk.Public().(ed25519.PublicKey)
 if left.Head==right.Head||!VerifyAnchorView(left,left.Head,ctx,p,pub,2)||!VerifyAnchorView(right,right.Head,ctx,p,pub,2)||VerifyAnchorView(right,left.Head,ctx,p,pub,2){t.Fatal("clone counterexample or pin refusal missing")}
 t.Log("actual second process refused; cloning the trusted anchor itself still forks, independent pin rejects wrong branch")
}

func TestAnchorAmbiguousAdvance(t *testing.T){
 for _,stage:=range []string{"before-rename","after-rename"}{t.Run(stage,func(t *testing.T){
  dir:=privateTemp(t);ctx,p,ak,sk:=durableKeys(t)
  a,e:=CreateAnchor(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer a.Close()
  root,e:=a.View();if e!=nil{t.Fatal(e)};r:=approve(t,0,ctx,ak)
  a.store.fault=func(at string)error{if at==stage{return errors.New("injected")};return nil}
  if _,_,e=a.Advance(root.Head,r);!errors.Is(e,ErrUnknown){t.Fatal(e)}
  if _,e=a.View();!errors.Is(e,ErrStore){t.Fatal("poisoned head",e)}
  a.Close();a,e=OpenAnchor(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer a.Close()
  v,e:=a.View();if e!=nil{t.Fatal(e)}
  if stage=="after-rename"{
   if _,_,e=a.Advance(root.Head,r);!errors.Is(e,ErrHeadConflict){t.Fatal("old head",e)}
   if receipt,e:=a.Status(r);e!=nil||receipt.Version!=1{t.Fatal("status",e)}
  }else if v.Head!=root.Head{t.Fatal("unexpected commit")}
  receipt,end,e:=a.Advance(v.Head,r);if e!=nil||receipt.Version!=1||len(end.Entries)!=1{t.Fatal("recovery",e)}
 })}
}

func TestDurableDelayedDeliveryAfterAbsent(t *testing.T){
 var receiver atomic.Pointer[DurableReceiver];var n atomic.Int32
 held:=make(chan []byte,1)
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path=="/commit"&&n.Add(1)==1{
   b,e:=io.ReadAll(io.LimitReader(r.Body,requestSize+1));if e!=nil{t.Error(e);return};held<-b
   conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return
  }
  receiver.Load().ServeHTTP(w,r)
 }));defer srv.Close()
 p,ak:=keys(1);pub,sk:=keys(2);ctx,e:=Context(srv.URL,"manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 dir:=privateTemp(t);s,e:=CreateDurable(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer s.Close();receiver.Store(s)
 req:=approve(t,0,ctx,ak);c,e:=NewClient(srv.URL,"manifest-v1","session-1",req,pub);if e!=nil{t.Fatal(e)}
 if _,e=c.Dispatch();!errors.Is(e,ErrUnknown){t.Fatal(e)}
 if _,e=c.Reconcile();!errors.Is(e,ErrAbsent)||c.State()!=Unknown{t.Fatal("absence terminal",e)}
 s.Close();s,e=OpenDurable(dir,ctx,p,sk,2);if e!=nil{t.Fatal(e)};defer s.Close();receiver.Store(s)
 // Deliver the originally captured wire bytes after the status miss and restart.
 var payload []byte
 select{case payload=<-held:case <-time.After(time.Second):t.Fatal("missing held request")}
 raw,e:=http.Post(srv.URL+"/commit",media,bytes.NewReader(payload));if e!=nil{t.Fatal(e)}
 b,e:=io.ReadAll(raw.Body);raw.Body.Close();if e!=nil||raw.StatusCode!=200{t.Fatal("late delivery",e)}
 late,e:=ParseReceipt(b);if e!=nil{t.Fatal(e)}
 got,e:=c.RetrySameApproval();if e!=nil||got!=late||c.Contacts()!=3||!Verify(got,req,pub){t.Fatal("late same approval",e)}
 next,e:=s.Commit(approve(t,1,ctx,ak));if e!=nil||next.Version!=2{t.Fatal("duplicate effect",e)}
 t.Log("actual loopback captured request delivered after absent status and store restart; identical receipt on same-approval retry")
}
