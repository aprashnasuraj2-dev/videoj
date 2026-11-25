//go:build linux

package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "io"
 "net"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "testing"
)

func witnessKeys()(ed25519.PublicKey,ed25519.PrivateKey){
 pub,key:=keys(9);return pub,key
}

func TestAuthorityWitnessRejectsAuthorityRollbackAndForgedAdvance(t *testing.T){
 origin:="http://127.0.0.1:19101"
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 genesis,e:=a.Head();if e!=nil{t.Fatal(e)}
 oldState,e:=os.ReadFile(filepath.Join(authorityDir,"authority.bin"));if e!=nil{t.Fatal(e)}
 w,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};defer w.Close()
 rootView,e:=w.View();if e!=nil||!VerifyWitnessViewPinned(rootView,ctx,authorityPub,witnessPub,genesis){t.Fatal("genesis witness",e)}
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 committed,e:=a.Process(wire);if e!=nil||committed.Outcome!=AuthorityCommitted{t.Fatal(e)}
 advanced:=committed.After
 newState,e:=os.ReadFile(filepath.Join(authorityDir,"authority.bin"));if e!=nil{t.Fatal(e)}
 transition,e:=SignWitnessTransition(ctx,genesis,advanced,authorityKey);if e!=nil{t.Fatal(e)}
 view,e:=w.Advance(transition);if e!=nil||view.Head!=advanced||view.Sequence!=1||!VerifyWitnessViewPinned(view,ctx,authorityPub,witnessPub,genesis){t.Fatal("witness advance",e)}
 // Even a valid authority signature may not return the monotonic witness to a
 // previously observed head.
 backwards,e:=SignWitnessTransition(ctx,advanced,genesis,authorityKey);if e!=nil{t.Fatal(e)}
 if _,e=w.Advance(backwards);!errors.Is(e,ErrPolicy){t.Fatal("authority-signed witness rollback accepted",e)}
 // Reusing the same witness key with a different genesis is a distinct trust
 // root and is refused by consumers that pin the original genesis.
 resetView:=view;resetView.Genesis=Digest{42}
 copy(resetView.Signature[:],ed25519.Sign(witnessKey,resetView.message(ctx,authorityPub)))
 if !VerifyWitnessView(resetView,ctx,authorityPub,witnessPub){t.Fatal("signed reset control invalid")}
 if VerifyWitnessViewPinned(resetView,ctx,authorityPub,witnessPub,genesis){t.Fatal("re-genesis witness accepted by pinned verifier")}
 _,attacker:=keys(10);forged,e:=SignWitnessTransition(ctx,advanced,Digest{1},attacker);if e!=nil{t.Fatal(e)}
 if _,e=w.Advance(forged);!errors.Is(e,ErrPolicy){t.Fatal("forged authority advance accepted",e)}
 a.Close()
 if e=os.WriteFile(filepath.Join(authorityDir,"authority.bin"),oldState,0600);e!=nil{t.Fatal(e)}
 if rolled,e:=OpenSharedAuthorityWitnessed(authorityDir,ctx,approver,authorityKey,callerPub,2,genesis,view,witnessPub);!errors.Is(e,ErrWitnessRollback){if rolled!=nil{rolled.Close()};t.Fatal("authority rollback not detected",e)}
 if e=os.WriteFile(filepath.Join(authorityDir,"authority.bin"),newState,0600);e!=nil{t.Fatal(e)}
 a,e=OpenSharedAuthorityWitnessed(authorityDir,ctx,approver,authorityKey,callerPub,2,genesis,view,witnessPub);if e!=nil{t.Fatal("matching authority refused",e)};a.Close()
 if stale,e:=OpenSharedAuthorityWitnessed(authorityDir,ctx,approver,authorityKey,callerPub,2,genesis,rootView,witnessPub);!errors.Is(e,ErrWitnessRollback){if stale!=nil{stale.Close()};t.Fatal("stale witness admitted newer authority",e)}
 t.Log("independent witness detects authority-only rollback and stale witness; forged authority transition refused")
}

func TestAuthorityWitnessSeparateProcessAndCAS(t *testing.T){
 if os.Getenv("SUTRA_WITNESS_CHILD")=="1"{
  origin:=os.Getenv("SUTRA_WITNESS_ORIGIN")
  ctx,_,_,authorityPub,_,_,_:=authorityFixture(t,origin)
  _,witnessKey:=witnessKeys()
  var genesis Digest
  raw,e:=os.ReadFile(os.Getenv("SUTRA_WITNESS_GENESIS"));if e!=nil||len(raw)!=len(genesis){t.Fatal("genesis",e)}
  copy(genesis[:],raw)
  w,e:=OpenAuthorityWitness(os.Getenv("SUTRA_WITNESS_DIR"),ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};defer w.Close()
  file:=os.NewFile(3,"sutra-witness-listener");if file==nil{t.Fatal("listener")};defer file.Close()
  listener,e:=net.FileListener(file);if e!=nil{t.Fatal(e)};defer listener.Close()
  _=http.Serve(listener,w);return
 }
 listener,e:=net.Listen("tcp","127.0.0.1:0");if e!=nil{t.Fatal(e)};defer listener.Close()
 origin:="http://"+listener.Addr().String()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 genesis,_:=a.Head()
 w,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};w.Close()
 genesisFile:=filepath.Join(privateTemp(t),"genesis.bin");if e=os.WriteFile(genesisFile,genesis[:],0600);e!=nil{t.Fatal(e)}
 file,e:=listener.(*net.TCPListener).File();if e!=nil{t.Fatal(e)}
 cmd:=exec.Command(os.Args[0],"-test.run=^TestAuthorityWitnessSeparateProcessAndCAS$")
 cmd.Env=append(os.Environ(),"SUTRA_WITNESS_CHILD=1","SUTRA_WITNESS_ORIGIN="+origin,"SUTRA_WITNESS_DIR="+witnessDir,"SUTRA_WITNESS_GENESIS="+genesisFile)
 cmd.ExtraFiles=[]*os.File{file};if e=cmd.Start();e!=nil{file.Close();t.Fatal(e)};file.Close()
 defer func(){_ = cmd.Process.Kill();_ = cmd.Wait()}()
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 committed,e:=a.Process(wire);if e!=nil{t.Fatal(e)};a.Close()
 transition,e:=SignWitnessTransition(ctx,genesis,committed.After,authorityKey);if e!=nil{t.Fatal(e)}
 response,e:=http.Post(origin+"/witness",media,bytes.NewReader(transition.Bytes()));if e!=nil{t.Fatal(e)}
 body,e:=io.ReadAll(response.Body);response.Body.Close();if e!=nil||response.StatusCode!=200{t.Fatal("witness post",e,response.StatusCode)}
 view,e:=ParseWitnessView(body);if e!=nil||!VerifyWitnessViewPinned(view,ctx,authorityPub,witnessPub,genesis)||view.Head!=committed.After{t.Fatal("external witness view",e)}
 response,e=http.Post(origin+"/witness",media,bytes.NewReader(transition.Bytes()));if e!=nil{t.Fatal(e)}
 response.Body.Close();if response.StatusCode!=http.StatusConflict{t.Fatal("stale witness CAS",response.StatusCode)}
 t.Log("separate witness process advanced exactly once under authority signature and rejected stale CAS")
}

func TestAuthorityAndWitnessCoordinatedRollbackCounterexample(t *testing.T){
 origin:="http://127.0.0.1:19102"
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 genesis,_:=a.Head()
 w,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)}
 oldAuthority,e:=os.ReadFile(filepath.Join(authorityDir,"authority.bin"));if e!=nil{t.Fatal(e)}
 oldWitness,e:=os.ReadFile(filepath.Join(witnessDir,"witness.bin"));if e!=nil{t.Fatal(e)}
 rootView,_:=w.View()
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 committed,e:=a.Process(wire);if e!=nil{t.Fatal(e)}
 transition,_:=SignWitnessTransition(ctx,genesis,committed.After,authorityKey);advancedView,e:=w.Advance(transition);if e!=nil{t.Fatal(e)}
 if advancedView.Head==rootView.Head{t.Fatal("witness did not advance")}
 a.Close();w.Close()
 if e=os.WriteFile(filepath.Join(authorityDir,"authority.bin"),oldAuthority,0600);e!=nil{t.Fatal(e)}
 if e=os.WriteFile(filepath.Join(witnessDir,"witness.bin"),oldWitness,0600);e!=nil{t.Fatal(e)}
 w,e=OpenAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};defer w.Close()
 rolledView,e:=w.View();if e!=nil||rolledView.Head!=genesis||!VerifyWitnessViewPinned(rolledView,ctx,authorityPub,witnessPub,genesis){t.Fatal("coordinated witness rollback",e)}
 a,e=OpenSharedAuthorityWitnessed(authorityDir,ctx,approver,authorityKey,callerPub,2,genesis,rolledView,witnessPub);if e!=nil{t.Fatal("coordinated rollback counterexample unexpectedly refused",e)};defer a.Close()
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("coordinated rollback state",spent,total,effects,e)}
 t.Log("coordinated rollback of authority+witness remains possible to a privileged dual-domain attacker; no consensus claim")
}
