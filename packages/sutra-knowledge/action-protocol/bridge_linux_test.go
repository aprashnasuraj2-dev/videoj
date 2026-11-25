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
 "sync/atomic"
 "testing"
)

func bridgeFixture(t *testing.T)(string,Digest,ed25519.PublicKey,ed25519.PrivateKey,ed25519.PublicKey,ed25519.PrivateKey,[authorityCallers]ed25519.PublicKey,[authorityCallers]ed25519.PrivateKey,ed25519.PublicKey,ed25519.PrivateKey,*AuthorityWitness,*httptest.Server){
 t.Helper()
 var current atomic.Pointer[AuthorityWitness]
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  witness:=current.Load();if witness==nil{w.WriteHeader(http.StatusServiceUnavailable);return}
  witness.ServeHTTP(w,r)
 }))
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 witnessPub,witnessKey:=witnessKeys()
 witnessDir:=privateTemp(t)
 // Genesis is supplied after the authority is created by each caller.
 _=witnessDir
 return srv.URL,ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey,witnessPub,witnessKey,nil,srv
}

func TestWitnessCoordinatorProcessCrashBoundaries(t *testing.T){
 if os.Getenv("SUTRA_BRIDGE_CHILD")=="1"{
  origin:=os.Getenv("SUTRA_BRIDGE_ORIGIN")
  stage:=os.Getenv("SUTRA_BRIDGE_STAGE")
  dir:=os.Getenv("SUTRA_BRIDGE_AUTHORITY_DIR")
  genesisPath:=os.Getenv("SUTRA_BRIDGE_GENESIS")
  ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
  witnessPub,_:=witnessKeys()
  var genesis Digest
  raw,e:=os.ReadFile(genesisPath);if e!=nil||len(raw)!=len(genesis){t.Fatal("genesis",e)}
  copy(genesis[:],raw)
  a,e:=OpenSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
  client,e:=NewWitnessClient(origin,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
  coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
  coordinator.fault=func(at string)error{
   if at==stage{os.Exit(0)}
   return nil
  }
  req:=approve(t,0,ctx,ak);wire,e:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0]);if e!=nil{t.Fatal(e)}
  if _,e=coordinator.Process(wire);e!=nil{t.Fatal(e)}
  t.Fatal("child did not exit at requested bridge stage")
 }
 for _,stage:=range []string{"after-intent","after-authority","after-witness"}{
  t.Run(stage,func(t *testing.T){
   var current atomic.Pointer[AuthorityWitness]
   srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
    witness:=current.Load();if witness==nil{w.WriteHeader(http.StatusServiceUnavailable);return}
    witness.ServeHTTP(w,r)
   }));defer srv.Close()
   ctx,approver,_,authorityPub,authorityKey,callerPub,_:=authorityFixture(t,srv.URL)
   witnessPub,witnessKey:=witnessKeys()
   authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
   a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
   genesis,e:=a.Head();if e!=nil{t.Fatal(e)};a.Close()
   witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};current.Store(witness);defer witness.Close()
   genesisFile:=filepath.Join(privateTemp(t),"genesis.bin");if e=os.WriteFile(genesisFile,genesis[:],0600);e!=nil{t.Fatal(e)}
   cmd:=exec.Command(os.Args[0],"-test.run=^TestWitnessCoordinatorProcessCrashBoundaries/"+stage+"$")
   cmd.Env=append(os.Environ(),
    "SUTRA_BRIDGE_CHILD=1",
    "SUTRA_BRIDGE_ORIGIN="+srv.URL,
    "SUTRA_BRIDGE_STAGE="+stage,
    "SUTRA_BRIDGE_AUTHORITY_DIR="+authorityDir,
    "SUTRA_BRIDGE_GENESIS="+genesisFile,
   )
   if out,e:=cmd.CombinedOutput();e!=nil{t.Fatalf("bridge child %s: %v\n%s",stage,e,out)}
   a,e=OpenSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
   client,e:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
   coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
   if e=coordinator.Recover();e!=nil{t.Fatal("recovery",stage,e)}
   view,e:=client.View();if e!=nil{t.Fatal(e)}
   head,e:=a.Head();if e!=nil{t.Fatal(e)}
   spent,total,effects,e:=a.Counts();if e!=nil{t.Fatal(e)}
   if _,e=os.Stat(filepath.Join(authorityDir,bridgeIntentName));!errors.Is(e,os.ErrNotExist){t.Fatal("intent survived recovery",e)}
   if view.Head!=head{t.Fatal("authority/witness not converged")}
   if stage=="after-intent"{
    if head!=genesis||view.Head!=genesis||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("prepared-only crash changed durable state",spent,total,effects)}
   }else{
    if head==genesis||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("committed crash lost state",spent,total,effects)}
   }
  })
 }
 t.Log("actual process exits after intent, authority rename, and witness advance all recover to a single converged durable state")
}

func TestWitnessCoordinatorLostWitnessReplyRecoversWithoutSecondEffect(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 var drop atomic.Bool
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  witness:=witnessPtr.Load();if witness==nil{w.WriteHeader(503);return}
  if r.Method==http.MethodPost&&drop.CompareAndSwap(true,false){
   recorder:=httptest.NewRecorder();witness.ServeHTTP(recorder,r)
   if recorder.Code!=http.StatusOK{t.Errorf("witness advance failed: %d",recorder.Code);return}
   conn,_,e:=w.(http.Hijacker).Hijack();if e!=nil{t.Error(e);return};conn.Close();return
  }
  witness.ServeHTTP(w,r)
 }));defer srv.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 genesis,_:=a.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 client,e:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 drop.Store(true)
 if _,e=coordinator.Process(wire);!errors.Is(e,ErrUnknown){t.Fatal("lost witness reply not unknown",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("authority result",spent,total,effects,e)}
 if e=coordinator.Recover();e!=nil{t.Fatal("recover lost witness reply",e)}
 view,e:=client.View();if e!=nil{t.Fatal(e)};head,_:=a.Head()
 if view.Head!=head||view.Sequence!=1{t.Fatal("witness did not converge")}
 // Same stale caller request after recovery consumes the second contact but
 // cannot repeat the effect.
 response,e:=coordinator.Process(wire);if e!=nil||response.Authority.Outcome!=AuthorityConflict||response.Authority.Stale!=1{t.Fatal("stale retry",e,response)}
 spent,total,effects,e=a.Counts();if e!=nil||spent!=[authorityCallers]byte{2,0}||total!=2||effects!=1{t.Fatal("stale retry accounting",spent,total,effects,e)}
 t.Log("witness POST response loss remained unknown; recovery observed committed witness head, cleared intent, and stale retry produced no duplicate effect")
}

func TestWitnessCoordinatorSingleWitnessRejectsAuthorityCloneFork(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer srv.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 witnessPub,witnessKey:=witnessKeys()
 leftDir:=privateTemp(t);rightDir:=privateTemp(t);witnessDir:=privateTemp(t)
 left,e:=CreateSharedAuthority(leftDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
 genesis,_:=left.Head()
 state,e:=os.ReadFile(filepath.Join(leftDir,"authority.bin"));if e!=nil{t.Fatal(e)}
 if e=os.WriteFile(filepath.Join(rightDir,"authority.bin"),state,0600);e!=nil{t.Fatal(e)}
 right,e:=OpenSharedAuthority(rightDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer right.Close()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 client,e:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 leftCoordinator,_:=NewWitnessCoordinator(left,client);rightCoordinator,_:=NewWitnessCoordinator(right,client)
 r0:=approve(t,0,ctx,ak);q0,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,r0,callerKey[0])
 if response,e:=leftCoordinator.Process(q0);e!=nil||response.Authority.Outcome!=AuthorityCommitted{t.Fatal("left",e)}
 left.Close()
 r1:=approve(t,1,ctx,ak);q1,_:=SignAuthorityRequest(1,AuthorityCommit,genesis,r1,callerKey[1])
 if _,e=rightCoordinator.Process(q1);!errors.Is(e,ErrWitnessRollback){t.Fatal("cloned authority fork not blocked by single witness",e)}
 spent,total,effects,e:=right.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("right clone mutated before witness check",spent,total,effects,e)}
 t.Log("one independently retained witness prevents two cloned authority stores from both advancing; cloning the witness remains the separate retained counterexample")
}

func TestWitnessCoordinatorTamperedIntentFailsClosed(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer srv.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
 genesis,_:=a.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 client,_:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis)
 coordinator,_:=NewWitnessCoordinator(a,client)
 coordinator.fault=func(at string)error{if at=="after-intent"{return errors.New("injected")};return nil}
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 if _,e=coordinator.Process(wire);!errors.Is(e,ErrUnknown){t.Fatal(e)}
 path:=filepath.Join(authorityDir,bridgeIntentName);raw,e:=os.ReadFile(path);if e!=nil{t.Fatal(e)};raw[len(raw)-1]^=1
 if e=os.WriteFile(path,raw,0600);e!=nil{t.Fatal(e)}
 coordinator.fault=nil
 if e=coordinator.Recover();!errors.Is(e,ErrStore){t.Fatal("tampered signed intent accepted",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("tampered intent changed authority",spent,total,effects,e)}
 t.Log("tampered bridge intent fails closed before authority or witness mutation")
}


func TestWitnessedResponseCompositeProofAndHTTPBoundary(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 witnessServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer witnessServer.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,witnessServer.URL)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
 genesis,_:=a.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 client,e:=NewWitnessClient(witnessServer.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
 api:=httptest.NewServer(coordinator);defer api.Close()
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 httpReq,e:=http.NewRequest(http.MethodPost,api.URL+"/authority-witnessed",bytes.NewReader(wire.Bytes()));if e!=nil{t.Fatal(e)}
 httpReq.Header.Set("Content-Type",media)
 res,e:=http.DefaultClient.Do(httpReq);if e!=nil{t.Fatal(e)}
 raw,e:=io.ReadAll(res.Body);res.Body.Close();if e!=nil||res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media{t.Fatal("witnessed endpoint",e,res.StatusCode)}
 combined,e:=ParseWitnessedResponse(raw);if e!=nil||!VerifyWitnessedResponse(combined,wire,ctx,authorityPub,witnessPub,genesis){t.Fatal("composite proof",e)}
 if combined.Authority.After!=combined.Witness.Head||combined.Authority.Outcome!=AuthorityCommitted{t.Fatal("head binding")}
 // Either half alone is insufficient for the composite verifier.
 forged:=combined;forged.Witness.Head=genesis
 if VerifyWitnessedResponse(forged,wire,ctx,authorityPub,witnessPub,genesis){t.Fatal("authority-only result accepted without matching witness")}
 forged=combined;forged.Authority.After=genesis
 if VerifyWitnessedResponse(forged,wire,ctx,authorityPub,witnessPub,genesis){t.Fatal("witness-only head accepted without matching authority response")}
 // A raw authority endpoint response has the wrong wire length and cannot be
 // interpreted as a witnessed acknowledgement.
 if _,e=ParseWitnessedResponse(combined.Authority.Bytes());e==nil{t.Fatal("raw authority response parsed as witnessed proof")}
 t.Log("external acknowledgement requires both exact authority receipt and pinned independent witness view at the same head")
}


func TestWitnessedAuthorityClientEndToEndAndTamperedComposite(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 witnessServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer witnessServer.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,witnessServer.URL)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
 genesis,_:=a.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 rootView,e:=witness.View();if e!=nil{t.Fatal(e)}
 witnessClient,e:=NewWitnessClient(witnessServer.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,witnessClient);if e!=nil{t.Fatal(e)}
 authorityServer:=httptest.NewServer(coordinator);defer authorityServer.Close()

 req0:=approve(t,0,ctx,ak)
 client0,e:=NewWitnessedAuthorityClient(authorityServer.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,rootView,req0);if e!=nil{t.Fatal(e)}
 receipt0,combined0,e:=client0.Commit();if e!=nil||receipt0.Version!=1||combined0.Authority.After!=combined0.Witness.Head{t.Fatal("first witnessed commit",e)}
 if client0.Head()!=combined0.Witness.Head||client0.Sequence()!=combined0.Witness.Sequence||client0.Contacts()!=1{t.Fatal("client head/contact state")}

 req1:=approve(t,1,ctx,ak)
 client1,e:=NewWitnessedAuthorityClient(authorityServer.URL,1,callerKey[1],authorityPub,witnessPub,ctx,genesis,combined0.Witness,req1);if e!=nil{t.Fatal(e)}
 receipt1,combined1,e:=client1.Commit();if e!=nil||receipt1.Version!=2||combined1.Authority.After!=combined1.Witness.Head{t.Fatal("second witnessed commit",e)}
 if client1.Head()!=combined1.Witness.Head||client1.Sequence()!=combined1.Witness.Sequence||client1.Contacts()!=1{t.Fatal("second client state")}

 // Proxy one otherwise-valid response and flip the last witness-signature byte.
 tamper:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  recorder:=httptest.NewRecorder();coordinator.ServeHTTP(recorder,r)
  if recorder.Code!=http.StatusOK{
   w.WriteHeader(recorder.Code);return
  }
  raw:=append([]byte(nil),recorder.Body.Bytes()...);raw[len(raw)-1]^=1
  w.Header().Set("Content-Type",media);w.WriteHeader(http.StatusOK);_,_=w.Write(raw)
 }));defer tamper.Close()
 // Only one aggregate contact remains. Use client 0's action as a status query
 // at the latest head; the server may advance durable contact state, but the
 // caller refuses the forged composite proof and returns unknown.
 tamperedClient,e:=NewWitnessedAuthorityClient(tamper.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,combined1.Witness,req0);if e!=nil{t.Fatal(e)}
 if _,_,e=tamperedClient.Status();!errors.Is(e,ErrUnknown){t.Fatal("tampered composite accepted",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{2,1}||total!=3||effects!=2{t.Fatal("tamper contact accounting",spent,total,effects,e)}
 view,e:=witnessClient.View();if e!=nil{t.Fatal(e)};head,_:=a.Head()
 if view.Head!=head{t.Fatal("server state diverged after caller rejected forged transport")}
 t.Log("actual clients accepted only composite authority+witness proofs; tampered witness signature became unknown without refunding the real third contact")
}
