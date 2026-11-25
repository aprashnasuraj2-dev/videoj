//go:build linux

package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "encoding/hex"
 "encoding/json"
 "errors"
 "io"
 "net/http"
 "net/http/httptest"
 "os"
 "os/exec"
 "path/filepath"
 "sync/atomic"
 "syscall"
 "testing"
)


type bridgeTraceIntent struct{
 RequestHash string `json:"requestHash"`
 Before string `json:"before"`
 After string `json:"after"`
}
type bridgeTraceEvent struct{
 Profile string `json:"profile"`
 Event string `json:"event"`
 AuthorityHead string `json:"authorityHead"`
 WitnessHead string `json:"witnessHead"`
 WitnessSequence uint32 `json:"witnessSequence"`
 CallerSpent [authorityCallers]byte `json:"callerSpent"`
 TotalSpent int `json:"totalSpent"`
 Effects int `json:"effects"`
 Intent *bridgeTraceIntent `json:"intent"`
}
// Test-only observation. Read the actual signed durable authority snapshot,
// compare it to in-memory state, read a challenge-bound witness view, and
// verify the signed intent on disk. Do not serialize keys or approval bytes.
// Call only while the coordinator holds the authority mutex.
func bridgeTraceLocked(c *WitnessCoordinator,scenario,event string)error{
 dir:=os.Getenv("SUTRA_BRIDGE_TRACE_DIR");if dir==""{return nil}
 a:=c.authority
 raw,e:=os.ReadFile(filepath.Join(a.dir,"authority.bin"));if e!=nil{return e}
 spent,requests,e:=a.decode(raw);if e!=nil{return e}
 if spent!=a.spent||!bytes.Equal(a.stateBody(spent,requests),a.stateBody(a.spent,a.requests)){return ErrStore}
 head:=a.headLocked()
 view,e:=c.witness.View();if e!=nil{return e}
 intent,exists,e:=c.loadIntentLocked();if e!=nil{return e}
 entry:=bridgeTraceEvent{
  Profile:"SUTRA/witness-bridge-refinement/v1",Event:event,
  AuthorityHead:hex.EncodeToString(head[:]),WitnessHead:hex.EncodeToString(view.Head[:]),
  WitnessSequence:view.Sequence,CallerSpent:spent,TotalSpent:int(spent[0])+int(spent[1]),Effects:len(requests),
 }
 if exists{entry.Intent=&bridgeTraceIntent{
  RequestHash:hex.EncodeToString(intent.RequestHash[:]),Before:hex.EncodeToString(intent.Before[:]),After:hex.EncodeToString(intent.After[:]),
 }}
 f,e:=os.OpenFile(filepath.Join(dir,scenario+".jsonl"),os.O_CREATE|os.O_WRONLY|os.O_APPEND,0600);if e!=nil{return e}
 if e=json.NewEncoder(f).Encode(entry);e!=nil{f.Close();return e}
 if e=f.Sync();e!=nil{f.Close();return e}
 return f.Close()
}
func bridgeTrace(c *WitnessCoordinator,scenario,event string)error{
 c.authority.mu.Lock();defer c.authority.mu.Unlock()
 return bridgeTraceLocked(c,scenario,event)
}
func traceMust(t *testing.T,c *WitnessCoordinator,scenario,event string){
 t.Helper();if e:=bridgeTrace(c,scenario,event);e!=nil{t.Fatal("bridge trace observation",scenario,event,e)}
}
func traceFault(c *WitnessCoordinator,scenario string)func(string)error{
 return func(event string)error{return bridgeTraceLocked(c,scenario,event)}
}

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
  ctx,approver,_,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,origin)
  witnessPub,_:=witnessKeys()
  var genesis Digest
  raw,e:=os.ReadFile(genesisPath);if e!=nil||len(raw)!=len(genesis){t.Fatal("genesis",e)}
  copy(genesis[:],raw)
  a,e:=OpenSharedAuthority(dir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
  client,e:=NewWitnessClient(origin,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
  coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
  traceMust(t,coordinator,stage,"init")
  coordinator.fault=func(at string)error{
   if e:=bridgeTraceLocked(coordinator,stage,at);e!=nil{return e}
   if at==stage{
    if e:=bridgeTraceLocked(coordinator,stage,"crash");e!=nil{return e}
    os.Exit(0)
   }
   return nil
  }
  requestRaw,e:=os.ReadFile(os.Getenv("SUTRA_BRIDGE_REQUEST"));if e!=nil{t.Fatal(e)}
  req,e:=ParseRequest(requestRaw);if e!=nil{t.Fatal(e)}
  wire,e:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0]);if e!=nil{t.Fatal(e)}
  if _,e=coordinator.Process(wire);e!=nil{t.Fatal(e)}
  t.Fatal("child did not exit at requested bridge stage")
 }
 for _,stage:=range []string{"after-intent","after-authority","after-witness","after-clear"}{
  t.Run(stage,func(t *testing.T){
   var current atomic.Pointer[AuthorityWitness]
   srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
    witness:=current.Load();if witness==nil{w.WriteHeader(http.StatusServiceUnavailable);return}
    witness.ServeHTTP(w,r)
   }));defer srv.Close()
   ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
   witnessPub,witnessKey:=witnessKeys()
   authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
   a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)}
   genesis,e:=a.Head();if e!=nil{t.Fatal(e)};a.Close()
   witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};current.Store(witness);defer witness.Close()
   genesisFile:=filepath.Join(privateTemp(t),"genesis.bin");if e=os.WriteFile(genesisFile,genesis[:],0600);e!=nil{t.Fatal(e)}
   req:=approve(t,0,ctx,ak)
   requestFile:=filepath.Join(privateTemp(t),"request.bin")
   if e=os.WriteFile(requestFile,req.Bytes(),0600);e!=nil{t.Fatal(e)}
   cmd:=exec.Command(os.Args[0],"-test.run=^TestWitnessCoordinatorProcessCrashBoundaries/"+stage+"$")
   cmd.Env=append(os.Environ(),
    "SUTRA_BRIDGE_CHILD=1",
    "SUTRA_BRIDGE_ORIGIN="+srv.URL,
    "SUTRA_BRIDGE_STAGE="+stage,
    "SUTRA_BRIDGE_AUTHORITY_DIR="+authorityDir,
    "SUTRA_BRIDGE_GENESIS="+genesisFile,
    "SUTRA_BRIDGE_REQUEST="+requestFile,
   )
   if out,e:=cmd.CombinedOutput();e!=nil{t.Fatalf("bridge child %s: %v\n%s",stage,e,out)}
   a,e=OpenSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
   client,e:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
   coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{t.Fatal(e)}
   traceMust(t,coordinator,stage,"restart")
   coordinator.fault=traceFault(coordinator,stage)
   if stage=="after-clear"{
    if _,e=os.Lstat(filepath.Join(authorityDir,bridgeIntentName));!errors.Is(e,os.ErrNotExist){t.Fatal("post-clear crash retained intent",e)}
   }
   if e=coordinator.Recover();e!=nil{t.Fatal("recovery",stage,e)}
   traceMust(t,coordinator,stage,"recovered")
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
   if stage=="after-clear"{
    // A different authenticated status contact recovers the result after
    // the child died before exposing its composite acknowledgement.
    status,e:=SignAuthorityRequest(0,AuthorityStatus,genesis,req,callerKey[0]);if e!=nil{t.Fatal(e)}
    challenge,e:=randomWitnessChallenge();if e!=nil{t.Fatal(e)}
    response,e:=coordinator.ProcessAttested(status,challenge)
    if e!=nil||response.Authority.Outcome!=AuthorityCommitted||
     !VerifyWitnessedEnvelope(response,status,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("post-clear authenticated status",e)}
    traceMust(t,coordinator,stage,"ack")
    spent,total,effects,e=a.Counts()
    if e!=nil||spent!=[authorityCallers]byte{2,0}||total!=2||effects!=1{t.Fatal("post-clear status repeated effect",spent,total,effects,e)}
    finalView,e:=client.View();if e!=nil{t.Fatal(e)}
    finalHead,e:=a.Head();if e!=nil||finalView.Head!=finalHead||finalView.Sequence!=2{t.Fatal("status did not converge",e)}
   }
  })
 }
 t.Log("actual process exits after intent, authority rename, witness advance, and durable intent deletion all recover to a converged durable state; post-clear status returns a fresh composite proof without repeating the effect")
}

func TestWitnessCoordinatorLostWitnessReplyRecoversWithoutSecondEffect(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 var drop atomic.Bool
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  witness:=witnessPtr.Load();if witness==nil{w.WriteHeader(503);return}
  if r.URL.Path=="/witness"&&r.Method==http.MethodPost&&drop.CompareAndSwap(true,false){
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
 traceMust(t,coordinator,"lost-witness","init")
 coordinator.fault=traceFault(coordinator,"lost-witness")
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 drop.Store(true)
 if _,e=coordinator.Process(wire);!errors.Is(e,ErrUnknown){t.Fatal("lost witness reply not unknown",e)}
 traceMust(t,coordinator,"lost-witness","lost-witness-response")
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("authority result",spent,total,effects,e)}
 if e=coordinator.Recover();e!=nil{t.Fatal("recover lost witness reply",e)}
 traceMust(t,coordinator,"lost-witness","recovered")
 view,e:=client.View();if e!=nil{t.Fatal(e)};head,_:=a.Head()
 if view.Head!=head||view.Sequence!=1{t.Fatal("witness did not converge")}
 // Same stale caller request after recovery consumes the second contact but
 // cannot repeat the effect.
 challenge,e:=randomWitnessChallenge();if e!=nil{t.Fatal(e)}
 response,e:=coordinator.ProcessAttested(wire,challenge);if e!=nil||response.Authority.Outcome!=AuthorityConflict||response.Authority.Stale!=1||
  !VerifyWitnessedEnvelope(response,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("stale retry",e,response)}
 traceMust(t,coordinator,"lost-witness","ack")
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
 traceMust(t,rightCoordinator,"clone-rejected","init")
 r0:=approve(t,0,ctx,ak);q0,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,r0,callerKey[0])
 if response,e:=leftCoordinator.Process(q0);e!=nil||response.Authority.Outcome!=AuthorityCommitted{t.Fatal("left",e)}
 left.Close()
 r1:=approve(t,1,ctx,ak);q1,_:=SignAuthorityRequest(1,AuthorityCommit,genesis,r1,callerKey[1])
 if _,e=rightCoordinator.Process(q1);!errors.Is(e,ErrWitnessRollback){t.Fatal("cloned authority fork not blocked by single witness",e)}
 traceMust(t,rightCoordinator,"clone-rejected","clone-rejected")
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
 path:=filepath.Join(authorityDir,bridgeIntentName);raw,e:=os.ReadFile(path);if e!=nil{t.Fatal(e)}
 coordinator.fault=nil
 flip:=func(index int)[]byte{copyRaw:=append([]byte(nil),raw...);copyRaw[index]^=1;return copyRaw}
 parsed,e:=parseBridgeIntent(raw,ctx,authorityPub);if e!=nil{t.Fatal(e)}
 otherCtx:=ctx;otherCtx[0]^=1
 foreign,e:=signBridgeIntent(otherCtx,parsed.RequestHash,parsed.Before,parsed.After,authorityKey);if e!=nil{t.Fatal(e)}
 cases:=[]struct{name string;install func()error}{
  {"truncated",func()error{return os.WriteFile(path,raw[:len(raw)-1],0600)}},
  {"oversized",func()error{return os.WriteFile(path,append(append([]byte(nil),raw...),0),0600)}},
  {"random",func()error{return os.WriteFile(path,bytes.Repeat([]byte{0xa5},len(raw)),0600)}},
  {"request-hash",func()error{return os.WriteFile(path,flip(0),0600)}},
  {"before",func()error{return os.WriteFile(path,flip(32),0600)}},
  {"after",func()error{return os.WriteFile(path,flip(64),0600)}},
  {"signature",func()error{return os.WriteFile(path,flip(len(raw)-1),0600)}},
  {"foreign-context",func()error{return os.WriteFile(path,foreign.Bytes(),0600)}},
  {"permissions",func()error{if e:=os.WriteFile(path,raw,0600);e!=nil{return e};return os.Chmod(path,0644)}},
  {"symlink",func()error{target:=filepath.Join(privateTemp(t),"valid-intent.bin");if e:=os.WriteFile(target,raw,0600);e!=nil{return e};return os.Symlink(target,path)}},
  {"fifo",func()error{return syscall.Mkfifo(path,0600)}},
 }
 for _,tc:=range cases{t.Run(tc.name,func(t *testing.T){
  if e:=os.Remove(path);e!=nil{t.Fatal(e)}
  if e:=tc.install();e!=nil{t.Fatal(e)}
  if e:=coordinator.Recover();!errors.Is(e,ErrStore){t.Fatal("invalid intent accepted",e)}
  spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("invalid intent changed authority",spent,total,effects,e)}
  view,e:=client.View();if e!=nil||view.Head!=genesis||view.Sequence!=0{t.Fatal("invalid intent changed witness",e)}
 })}
 if e=os.Remove(path);e!=nil{t.Fatal(e)}
 if e=os.WriteFile(path,raw,0600);e!=nil{t.Fatal(e)}
 if e=coordinator.Recover();e!=nil{t.Fatal("valid prepared intent could not abort",e)}
 t.Log("eleven malformed or unsafe bridge intent entries fail closed; valid prepared intent remains recoverable")
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
 traceMust(t,coordinator,"normal","init")
 coordinator.fault=traceFault(coordinator,"normal")
 api:=httptest.NewServer(coordinator);defer api.Close()
 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 challenge:=Digest{1}
 httpReq,e:=http.NewRequest(http.MethodPost,api.URL+"/authority-witnessed",bytes.NewReader(wire.Bytes()));if e!=nil{t.Fatal(e)}
 httpReq.Header.Set("Content-Type",media);httpReq.Header.Set("X-Sutra-Witness-Challenge",hex.EncodeToString(challenge[:]))
 res,e:=http.DefaultClient.Do(httpReq);if e!=nil{t.Fatal(e)}
 raw,e:=io.ReadAll(res.Body);res.Body.Close();if e!=nil||res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media{t.Fatal("witnessed endpoint",e,res.StatusCode)}
 envelope,e:=ParseWitnessedEnvelope(raw);if e!=nil||!VerifyWitnessedEnvelope(envelope,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("attested composite proof",e)}
 if envelope.Authority.After!=envelope.Attestation.View.Head||envelope.Authority.Outcome!=AuthorityCommitted{t.Fatal("head binding")}
 traceMust(t,coordinator,"normal","ack")
 // The static authority+witness pair remains internally verifiable, but only
 // the challenge-bound envelope is an external acknowledgement.
 combined:=WitnessedResponse{Authority:envelope.Authority,Witness:envelope.Attestation.View}
 if !VerifyWitnessedResponse(combined,wire,ctx,authorityPub,witnessPub,genesis){t.Fatal("static pair invalid")}
 forged:=envelope;forged.Attestation.View.Head=genesis
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("authority-only result accepted without matching witness")}
 forged=envelope;forged.Authority.After=genesis
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("witness-only head accepted without matching authority response")}
 wrongChallenge:=Digest{2}
 if VerifyWitnessedEnvelope(envelope,wire,wrongChallenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("witness envelope replay accepted under a new challenge")}
 if _,e=ParseWitnessedEnvelope(envelope.Authority.Bytes());e==nil{t.Fatal("raw authority response parsed as attested proof")}
 // Correct signatures alone are insufficient if the two signers describe
 // inconsistent versions/counters or an impossible no-op contact.
 forged=envelope;forged.Attestation.View.Sequence++
 copy(forged.Attestation.View.Signature[:],ed25519.Sign(witnessKey,forged.Attestation.View.message(ctx,authorityPub)))
 copy(forged.Attestation.Signature[:],ed25519.Sign(witnessKey,forged.Attestation.message(ctx,authorityPub)))
 if !VerifyWitnessAttestation(forged.Attestation,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("negative control lacks valid witness signature")}
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("signed witness sequence inconsistent with total contacts")}
 forged=envelope;forged.Authority.TotalSpent++
 copy(forged.Authority.Signature[:],ed25519.Sign(authorityKey,forged.Authority.message()))
 if !VerifyAuthorityResponse(forged.Authority,wire,authorityPub){t.Fatal("negative control lacks valid authority signature")}
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("signed authority counters inconsistent with witness sequence")}
 forged=envelope;forged.Authority.Stale=1
 copy(forged.Authority.Signature[:],ed25519.Sign(authorityKey,forged.Authority.message()))
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("signed stale flag inconsistent with request parent")}
 forged=envelope;forged.Authority.Before=forged.Authority.After;forged.Authority.Stale=1
 copy(forged.Authority.Signature[:],ed25519.Sign(authorityKey,forged.Authority.message()))
 if VerifyWitnessedEnvelope(forged,wire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("signed committed contact cannot be a no-op")}
 t.Log("external acknowledgement requires exact authority receipt plus nonce-bound pinned witness attestation at the same head")
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
 receipt0,combined0,e:=client0.Commit();if e!=nil||receipt0.Version!=1||combined0.Authority.After!=combined0.Attestation.View.Head{t.Fatal("first witnessed commit",e)}
 if client0.Head()!=combined0.Attestation.View.Head||client0.Sequence()!=combined0.Attestation.View.Sequence||client0.Contacts()!=1{t.Fatal("client head/contact state")}

 req1:=approve(t,1,ctx,ak)
 client1,e:=NewWitnessedAuthorityClient(authorityServer.URL,1,callerKey[1],authorityPub,witnessPub,ctx,genesis,combined0.Attestation.View,req1);if e!=nil{t.Fatal(e)}
 receipt1,combined1,e:=client1.Commit();if e!=nil||receipt1.Version!=2||combined1.Authority.After!=combined1.Attestation.View.Head{t.Fatal("second witnessed commit",e)}
 if client1.Head()!=combined1.Attestation.View.Head||client1.Sequence()!=combined1.Attestation.View.Sequence||client1.Contacts()!=1{t.Fatal("second client state")}

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
 tamperedClient,e:=NewWitnessedAuthorityClient(tamper.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,combined1.Attestation.View,req0);if e!=nil{t.Fatal(e)}
 if _,_,e=tamperedClient.Status();!errors.Is(e,ErrUnknown){t.Fatal("tampered composite accepted",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{2,1}||total!=3||effects!=2{t.Fatal("tamper contact accounting",spent,total,effects,e)}
 view,e:=witnessClient.View();if e!=nil{t.Fatal(e)};head,_:=a.Head()
 if view.Head!=head{t.Fatal("server state diverged after caller rejected forged transport")}
 t.Log("actual clients accepted only nonce-bound authority+witness envelopes; tampered witness signature became unknown without refunding the real third contact")
}


func TestWitnessChallengeStopsReplayToRolledBackClient(t *testing.T){
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
 api:=httptest.NewServer(coordinator);defer api.Close()

 req:=approve(t,0,ctx,ak);wire,_:=SignAuthorityRequest(0,AuthorityCommit,genesis,req,callerKey[0])
 firstChallenge:=Digest{1}
 firstReq,e:=http.NewRequest(http.MethodPost,api.URL+"/authority-witnessed",bytes.NewReader(wire.Bytes()));if e!=nil{t.Fatal(e)}
 firstReq.Header.Set("Content-Type",media);firstReq.Header.Set("X-Sutra-Witness-Challenge",hex.EncodeToString(firstChallenge[:]))
 firstRes,e:=http.DefaultClient.Do(firstReq);if e!=nil{t.Fatal(e)}
 captured,e:=io.ReadAll(firstRes.Body);firstRes.Body.Close();if e!=nil||firstRes.StatusCode!=http.StatusOK{t.Fatal("capture",e,firstRes.StatusCode)}
 envelope,e:=ParseWitnessedEnvelope(captured);if e!=nil||!VerifyWitnessedEnvelope(envelope,wire,firstChallenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("captured envelope",e)}
 // Counterfactual: the static pair alone is replayable to the exact old request.
 static:=WitnessedResponse{Authority:envelope.Authority,Witness:envelope.Attestation.View}
 if !VerifyWitnessedResponse(static,wire,ctx,authorityPub,witnessPub,genesis){t.Fatal("static replay control invalid")}

 replayServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Content-Type",media);w.WriteHeader(http.StatusOK);_,_=w.Write(captured)
 }));defer replayServer.Close()
 rolled,e:=NewWitnessedAuthorityClient(replayServer.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,rootView,req);if e!=nil{t.Fatal(e)}
 rolled.challenge=func()(Digest,error){return Digest{2},nil}
 if _,_,e=rolled.Commit();!errors.Is(e,ErrUnknown){t.Fatal("captured envelope replay accepted under fresh challenge",e)}
 if rolled.Head()!=genesis||rolled.Sequence()!=0{t.Fatal("rolled-back client advanced on replay")}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("replay proxy changed server accounting",spent,total,effects,e)}
 t.Log("an exact old authority request plus captured signed witness view cannot be replayed as success when the client supplies a fresh witness challenge")
}


func TestWitnessedAuthorityClientRefusesChallengeReuseBeforeContact(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 witnessServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer witnessServer.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,witnessServer.URL)
 witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
 genesis,_:=a.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};witnessPtr.Store(witness);defer witness.Close()
 rootView,e:=witness.View();if e!=nil{t.Fatal(e)}
 wc,e:=NewWitnessClient(witnessServer.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,wc);if e!=nil{t.Fatal(e)}
 var calls atomic.Int32
 api:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){calls.Add(1);coordinator.ServeHTTP(w,r)}));defer api.Close()
 action:=approve(t,0,ctx,ak)
 client,e:=NewWitnessedAuthorityClient(api.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,rootView,action);if e!=nil{t.Fatal(e)}
 fixed:=Digest{7};client.challenge=func()(Digest,error){return fixed,nil}
 if _,_,e=client.Commit();e!=nil{t.Fatal("first fixed challenge",e)}
 firstCalls:=calls.Load();if firstCalls!=1{t.Fatal("first contact count",firstCalls)}
 // A broken RNG or injected callback returning the same nonce must fail locally.
 if _,_,e=client.Status();!errors.Is(e,ErrUnknown){t.Fatal("repeated challenge accepted",e)}
 if calls.Load()!=firstCalls{t.Fatal("reused challenge reached authority")}
 if client.Contacts()!=1{t.Fatal("reused challenge charged local contact",client.Contacts())}
 t.Log("repeated challenge is refused before HTTP contact, preventing captured-envelope replay when nonce generation repeats")
}


// A real client loses the final composite HTTP reply, not the witness POST.
// The authority and witness have already converged when the connection dies.
func TestWitnessedAuthorityClientLostFinalReplyRecoversStatus(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 witnessServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){witnessPtr.Load().ServeHTTP(w,r)}));defer witnessServer.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,witnessServer.URL)
 witnessPub,witnessKey:=witnessKeys()
 a,e:=CreateSharedAuthority(privateTemp(t),ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer a.Close()
 genesis,e:=a.Head();if e!=nil{t.Fatal(e)}
 witness,e:=CreateAuthorityWitness(privateTemp(t),ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};defer witness.Close();witnessPtr.Store(witness)
 rootView,e:=witness.View();if e!=nil{t.Fatal(e)}
 witnessClient,e:=NewWitnessClient(witnessServer.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,witnessClient);if e!=nil{t.Fatal(e)}
 traceMust(t,coordinator,"lost-final","init")
 coordinator.fault=traceFault(coordinator,"lost-final")
 var drop atomic.Bool;drop.Store(true)
 dropped:=make(chan WitnessedEnvelope,1)
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if !drop.CompareAndSwap(true,false){coordinator.ServeHTTP(w,r);return}
  recorder:=httptest.NewRecorder();coordinator.ServeHTTP(recorder,r)
  envelope,parseErr:=ParseWitnessedEnvelope(recorder.Body.Bytes())
  if recorder.Code!=http.StatusOK||parseErr!=nil{t.Errorf("coordinator did not complete before lost reply: %d %v",recorder.Code,parseErr);w.WriteHeader(500);return}
  dropped<-envelope
  conn,_,hijackErr:=w.(http.Hijacker).Hijack();if hijackErr!=nil{t.Error(hijackErr);return}
  conn.Close()
 }));defer server.Close()
 approved:=approve(t,0,ctx,ak)
 client,e:=NewWitnessedAuthorityClient(server.URL,0,callerKey[0],authorityPub,witnessPub,ctx,genesis,rootView,approved);if e!=nil{t.Fatal(e)}
 if _,_,e=client.Commit();!errors.Is(e,ErrUnknown){t.Fatal("lost final HTTP reply was not unknown",e)}
 var first WitnessedEnvelope
 select{case first=<-dropped:default:t.Fatal("no completed envelope before HTTP loss")}
 if first.Authority.Outcome!=AuthorityCommitted||first.Attestation.View.Sequence!=1||client.Head()!=genesis||client.Sequence()!=0||client.Contacts()!=1{t.Fatal("lost reply did not leave stale client pin",first.Authority.Outcome,first.Attestation.View.Sequence)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("lost reply accounting",spent,total,effects,e)}
 if _,e=os.Lstat(coordinator.intentPath());!errors.Is(e,os.ErrNotExist){t.Fatal("final reply lost before durable intent cleanup",e)}
 traceMust(t,coordinator,"lost-final","lost-final-response")
 receipt,recovered,e:=client.Status()
 if e!=nil||receipt!=first.Authority.Receipt||recovered.Authority.Stale!=1||recovered.Attestation.View.Sequence!=2{
  t.Fatal("fresh status must recover identical receipt across two-step witness sequence gap",e)
 }
 if client.Head()!=recovered.Authority.After||client.Sequence()!=2||client.Contacts()!=2{t.Fatal("recovered client cursor")}
 traceMust(t,coordinator,"lost-final","ack")
 spent,total,effects,e=a.Counts();if e!=nil||spent!=[authorityCallers]byte{2,0}||total!=2||effects!=1{t.Fatal("status repeated effect",spent,total,effects,e)}
 view,e:=witnessClient.View();if e!=nil||view.Head!=recovered.Authority.After||view.Sequence!=2{t.Fatal("witness not converged",e)}
 t.Log("real HTTP final envelope loss recovered identical receipt via fresh authenticated status across a two-version witness gap; exactly two contacts and one effect")
}
