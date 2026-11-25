//go:build linux

package actionprotocol

import (
 "crypto/ed25519"
 "errors"
 "os"
 "os/exec"
 "path/filepath"
 "sync"
 "testing"
)

func durableKeys(t *testing.T)(Digest,ed25519.PublicKey,ed25519.PrivateKey,ed25519.PrivateKey){
 t.Helper();a,ak:=keys(1);_,pk:=keys(2)
 ctx,e:=Context("fixture","manifest-v1","session-1");if e!=nil{t.Fatal(e)}
 return ctx,a,ak,pk
}
func TestDurableRestartConcurrentAndIdentity(t *testing.T){
 dir:=t.TempDir();ctx,a,ak,pk:=durableKeys(t)
 s,e:=CreateDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)};defer s.Close()
 if other,e:=OpenDurable(dir,ctx,a,pk,2);!errors.Is(e,ErrStoreBusy){if other!=nil{other.Close()};t.Fatal("second owner",e)}
 r:=approve(t,0,ctx,ak)
 var wg sync.WaitGroup
 results:=make(chan Receipt,64)
 for i:=0;i<64;i++{wg.Add(1);go func(){defer wg.Done();v,e:=s.Commit(r);if e!=nil{t.Error(e);return};results<-v}()}
 wg.Wait();close(results);first:=<-results
 for v:=range results{if v!=first{t.Fatal("receipt changed")}}
 if !Verify(first,r,pk.Public().(ed25519.PublicKey))||first.Version!=1{t.Fatal("receipt invalid")}
 if e=s.Close();e!=nil{t.Fatal(e)}
 if _,e=OpenDurable(dir,ctx,a,pk,1);e==nil{t.Fatal("changed limit accepted")}
 s,e=OpenDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)};defer s.Close()
 if v,e:=s.Commit(r);e!=nil||v!=first{t.Fatal("restart changed receipt",e)}
 modified:=r;modified.Slot=1;copy(modified.Approval[:],ed25519.Sign(ak,modified.message()))
 if _,e=s.Commit(modified);!errors.Is(e,ErrConflict){t.Fatal("key substitution",e)}
 r2:=approve(t,1,ctx,ak);if v,e:=s.Commit(r2);e!=nil||v.Version!=2{t.Fatal("second action",e)}
 if _,e=s.Commit(approve(t,2,ctx,ak));!errors.Is(e,ErrBudget){t.Fatal("durable budget",e)}
 if e=s.Close();e!=nil{t.Fatal(e)}
 s,e=OpenDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)};defer s.Close()
 if _,e=s.Commit(approve(t,2,ctx,ak));!errors.Is(e,ErrBudget){t.Fatal("budget reset",e)}
 if v,e:=s.Status(r);e!=nil||v!=first{t.Fatal("status recovery",e)}
}
func TestDurableCorruptionAndMissing(t *testing.T){
 dir:=t.TempDir();ctx,a,ak,pk:=durableKeys(t)
 if _,e:=OpenDurable(dir,ctx,a,pk,2);e==nil{t.Fatal("missing silently initialized")}
 s,e:=CreateDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)}
 if _,e=s.Commit(approve(t,0,ctx,ak));e!=nil{t.Fatal(e)};s.Close()
 if _,e=CreateDurable(dir,ctx,a,pk,2);e==nil{t.Fatal("existing silently replaced")}
 p:=filepath.Join(dir,"state.bin");b,e:=os.ReadFile(p);if e!=nil{t.Fatal(e)}
 bad:=append([]byte(nil),b...);bad[len(bad)-1]^=1
 for _,v:=range [][]byte{bad,b[:len(b)-1],append(append([]byte(nil),b...),0)}{
  if e=os.WriteFile(p,v,0600);e!=nil{t.Fatal(e)}
  if _,e=OpenDurable(dir,ctx,a,pk,2);e==nil{t.Fatal("corruption accepted")}
 }
}
func TestDurableCrashHelper(t *testing.T){
 dir:=os.Getenv("SUTRA_CRASH_DIR");if dir==""{return}
 ctx,a,_,pk:=durableKeys(t)
 s,e:=OpenDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)}
 b,e:=os.ReadFile(filepath.Join(dir,"request.fixture"));if e!=nil{t.Fatal(e)}
 r,e:=ParseRequest(b);if e!=nil{t.Fatal(e)}
 s.fault=func(stage string){if stage==os.Getenv("SUTRA_CRASH_STAGE"){os.Exit(73)}}
 if _,e=s.Commit(r);e!=nil{t.Fatal(e)}
 if os.Getenv("SUTRA_CRASH_STAGE")=="after-commit"{os.Exit(73)}
 t.Fatal("crash seam not reached")
}
func TestDurableProcessCrashBoundaries(t *testing.T){
 for _,stage:=range []string{"before-rename","after-rename","after-commit"}{t.Run(stage,func(t *testing.T){
  dir:=t.TempDir();ctx,a,ak,pk:=durableKeys(t)
  s,e:=CreateDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)};s.Close()
  r:=approve(t,0,ctx,ak)
  if e=os.WriteFile(filepath.Join(dir,"request.fixture"),r.Bytes(),0600);e!=nil{t.Fatal(e)}
  cmd:=exec.Command(os.Args[0],"-test.run=^TestDurableCrashHelper$")
  cmd.Env=append(os.Environ(),"SUTRA_CRASH_DIR="+dir,"SUTRA_CRASH_STAGE="+stage)
  out,e:=cmd.CombinedOutput();var exit *exec.ExitError
  if !errors.As(e,&exit)||exit.ExitCode()!=73{t.Fatalf("unexpected child result %v %s",e,out)}
  s,e=OpenDurable(dir,ctx,a,pk,2);if e!=nil{t.Fatal(e)};defer s.Close()
  before,e:=s.Status(r)
  if stage=="before-rename"{if !errors.Is(e,ErrAbsent){t.Fatal("precommit effect",e)}}else if e!=nil||before.Version!=1{t.Fatal("lost committed state",e)}
  receipt,e:=s.Commit(r);if e!=nil||receipt.Version!=1||!Verify(receipt,r,pk.Public().(ed25519.PublicKey)){t.Fatal("recovery",e)}
  if stage!="before-rename"&&receipt!=before{t.Fatal("receipt changed")}
  if v,e:=s.Commit(approve(t,1,ctx,ak));e!=nil||v.Version!=2{t.Fatal("duplicate effect",e)}
  t.Log("actual process exit at",stage,"and same-key recovery")
 })}
}
