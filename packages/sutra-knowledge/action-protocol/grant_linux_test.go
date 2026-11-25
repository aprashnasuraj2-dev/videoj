//go:build linux

package actionprotocol

import (
 "bytes"
 "crypto/ed25519"
 "encoding/hex"
 "io"
 "errors"
 "time"
 "net/http"
 "net/http/httptest"
 "os"
 "path/filepath"
 "sync/atomic"
 "testing"
)

func grantFixture(t *testing.T)(*GrantBook,*GrantGuard,*SharedAuthority,*AuthorityWitness,*WitnessClient,*httptest.Server,Digest,ed25519.PrivateKey,ed25519.PublicKey,ed25519.PrivateKey,[authorityCallers]ed25519.PrivateKey){
 t.Helper()
 var witnessPtr atomic.Pointer[AuthorityWitness]
 var witnessContacts atomic.Int32
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  witnessContacts.Add(1)
  witnessPtr.Load().ServeHTTP(w,r)
 }))
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,srv.URL)
 consentPub,consentKey:=keys(11)
 _,bookKey:=keys(12)
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t);bookDir:=privateTemp(t)
 a,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{srv.Close();t.Fatal(e)}
 genesis,_:=a.Head()
 witnessPub,witnessKey:=witnessKeys()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{a.Close();srv.Close();t.Fatal(e)}
 witnessPtr.Store(witness)
 client,e:=NewWitnessClient(srv.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{a.Close();witness.Close();srv.Close();t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(a,client);if e!=nil{a.Close();witness.Close();srv.Close();t.Fatal(e)}
 book,e:=CreateGrantBook(bookDir,ctx,consentPub,approver,bookKey,10);if e!=nil{a.Close();witness.Close();srv.Close();t.Fatal(e)}
 guard,e:=NewGrantGuard(book,coordinator);if e!=nil{book.Close();a.Close();witness.Close();srv.Close();t.Fatal(e)}
 _=witnessContacts
 return book,guard,a,witness,client,srv,ctx,ak,consentPub,consentKey,callerKey
}

func TestGrantBookExactConsentExpiryRevocationAndReconcile(t *testing.T){
 book,guard,a,witness,client,srv,ctx,ak,_,consentKey,callerKey:=grantFixture(t)
 defer srv.Close();defer witness.Close();defer a.Close();defer book.Close()
 request:=approve(t,0,ctx,ak)
 grant,e:=IssueActionGrant(request,GrantPrimary,10,11,consentKey);if e!=nil{t.Fatal(e)}
 root,_:=a.Head()
 wire,e:=SignAuthorityRequest(0,AuthorityCommit,root,request,callerKey[0]);if e!=nil{t.Fatal(e)}
 response,e:=guard.Commit(grant,wire,GrantPrimary);if e!=nil||response.Authority.Outcome!=AuthorityCommitted{t.Fatal("valid grant",e)}
 receipt:=response.Authority.Receipt
 if receipt.Version!=1{t.Fatal("receipt version")}

 // A class substitution is refused before the coordinator can consume another
 // contact or advance the witness.
 beforeSpent,beforeTotal,beforeEffects,_:=a.Counts();beforeView,e:=client.View();if e!=nil{t.Fatal(e)}
 if _,e=guard.Commit(grant,wire,GrantCompensation);!errors.Is(e,ErrGrantClass){t.Fatal("primary grant used as compensation",e)}
 afterSpent,afterTotal,afterEffects,_:=a.Counts();afterView,e:=client.View();if e!=nil{t.Fatal(e)}
 if beforeSpent!=afterSpent||beforeTotal!=afterTotal||beforeEffects!=afterEffects||beforeView.Head!=afterView.Head||beforeView.Sequence!=afterView.Sequence{t.Fatal("class refusal contacted authority")}

 // Revoke persists. Revocation blocks another effect-producing dispatch but
 // still permits status reconciliation of the exact historical action.
 if e=book.Revoke(grant,request);e!=nil{t.Fatal(e)}
 if _,e=guard.Commit(grant,wire,GrantPrimary);!errors.Is(e,ErrGrantRevoked){t.Fatal("revoked dispatch",e)}
 head,_:=a.Head()
 statusWire,e:=SignAuthorityRequest(0,AuthorityStatus,head,request,callerKey[0]);if e!=nil{t.Fatal(e)}
 status,e:=guard.Status(grant,statusWire);if e!=nil||status.Authority.Outcome!=AuthorityCommitted||status.Authority.Receipt!=receipt{t.Fatal("revoked reconcile",e)}
 if e=book.AdvanceEpoch(10,12);e!=nil{t.Fatal(e)}
 if _,e=guard.Commit(grant,wire,GrantPrimary);!errors.Is(e,ErrGrantRevoked){t.Fatal("revocation lost after epoch advance",e)}
 t.Log("exact primary grant committed once; class substitution and revoked dispatch refused before mutation; revoked/expired grant still reconciled exact historical receipt")
}

func TestGrantBookModifiedInputNewKeyFutureAndExpiryRefusedBeforeContact(t *testing.T){
 book,guard,a,witness,client,srv,ctx,ak,_,consentKey,callerKey:=grantFixture(t)
 defer srv.Close();defer witness.Close();defer a.Close();defer book.Close()
 original:=approve(t,0,ctx,ak)
 grant,e:=IssueActionGrant(original,GrantPrimary,11,12,consentKey);if e!=nil{t.Fatal(e)}
 root,_:=a.Head()
 originalWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,original,callerKey[0])
 baselineView,e:=client.View();if e!=nil{t.Fatal(e)}
 // Future grant refuses at epoch 10.
 if _,e=guard.Commit(grant,originalWire,GrantPrimary);!errors.Is(e,ErrGrantInactive){t.Fatal("future grant",e)}
 // Fresh host-approved key is a distinct logical action and cannot borrow grant.
 other:=approve(t,1,ctx,ak);otherWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,other,callerKey[0])
 if _,e=guard.Commit(grant,otherWire,GrantPrimary);!errors.Is(e,ErrPolicy){t.Fatal("new-key replay",e)}
 // Modified exact request, even re-approved by the action approver, is not the
 // request hash signed by consent.
 modified:=original;modified.Slot=2;copy(modified.Approval[:],ed25519.Sign(ak,modified.message()))
 modifiedWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,modified,callerKey[0])
 if _,e=guard.Commit(grant,modifiedWire,GrantPrimary);!errors.Is(e,ErrPolicy){t.Fatal("modified action",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("invalid grants reached authority",spent,total,effects,e)}
 currentView,e:=client.View();if e!=nil{t.Fatal(e)}
 if currentView.Head!=baselineView.Head||currentView.Sequence!=baselineView.Sequence{t.Fatal("invalid grants advanced witness")}
 // Advance into active window, then beyond expiry.
 if e=book.AdvanceEpoch(10,11);e!=nil{t.Fatal(e)}
 if _,e=guard.Commit(grant,originalWire,GrantPrimary);e!=nil{t.Fatal("active grant refused",e)}
 if e=book.AdvanceEpoch(11,13);e!=nil{t.Fatal(e)}
 latest,_:=a.Head();expiredWire,_:=SignAuthorityRequest(0,AuthorityCommit,latest,original,callerKey[0])
 if _,e=guard.Commit(grant,expiredWire,GrantPrimary);!errors.Is(e,ErrGrantInactive){t.Fatal("expired grant dispatched",e)}
 t.Log("future, modified, fresh-key and expired dispatches are refused; only exact active consent reaches the authority")
}

func TestGrantBookUnadmittedStatusAndInvalidActionApprovalRefusedBeforeContact(t *testing.T){
 book,guard,a,witness,client,srv,ctx,ak,_,consentKey,callerKey:=grantFixture(t)
 defer srv.Close();defer witness.Close();defer a.Close();defer book.Close()
 req:=approve(t,0,ctx,ak);grant,e:=IssueActionGrant(req,GrantPrimary,10,20,consentKey);if e!=nil{t.Fatal(e)}
 root,_:=a.Head();statusWire,_:=SignAuthorityRequest(0,AuthorityStatus,root,req,callerKey[0])
 before,e:=client.View();if e!=nil{t.Fatal(e)}
 if _,e=guard.Status(grant,statusWire);!errors.Is(e,ErrGrantNotDispatched){t.Fatal("unadmitted grant reconciled",e)}
 after,e:=client.View();if e!=nil{t.Fatal(e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0||before.Head!=after.Head||before.Sequence!=after.Sequence{t.Fatal("unadmitted status contacted authority")}

 // Consent can sign arbitrary bytes, but the GrantBook independently pins the
 // action approver. A consent signature around a request with a forged action
 // approval must fail before witness/authority contact.
 forged:=req;forged.Slot=1
 forgedGrant,e:=IssueActionGrant(forged,GrantPrimary,10,20,consentKey);if e!=nil{t.Fatal(e)}
 forgedWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,forged,callerKey[0])
 if _,e=guard.Commit(forgedGrant,forgedWire,GrantPrimary);!errors.Is(e,ErrPolicy){t.Fatal("consent signature bypassed action approval",e)}
 spent,total,effects,e=a.Counts();if e!=nil||spent!=[authorityCallers]byte{}||total!=0||effects!=0{t.Fatal("forged action reached authority",spent,total,effects,e)}
 t.Log("status requires a prior durable dispatch admission; consent signature cannot replace the independently pinned action approval")
}

func TestGrantGuardSerializesRevocationAgainstDispatchBoundary(t *testing.T){
 book,guard,a,witness,_,srv,ctx,ak,_,consentKey,callerKey:=grantFixture(t)
 defer srv.Close();defer witness.Close();defer a.Close();defer book.Close()
 req:=approve(t,0,ctx,ak);grant,e:=IssueActionGrant(req,GrantPrimary,10,20,consentKey);if e!=nil{t.Fatal(e)}
 root,_:=a.Head();wire,_:=SignAuthorityRequest(0,AuthorityCommit,root,req,callerKey[0])
 entered:=make(chan struct{});release:=make(chan struct{})
 guard.coordinator.fault=func(at string)error{
  if at=="after-intent"{
   close(entered);<-release
  }
  return nil
 }
 commitDone:=make(chan error,1)
 go func(){_,e:=guard.Commit(grant,wire,GrantPrimary);commitDone<-e}()
 <-entered
 revokeDone:=make(chan error,1)
 go func(){revokeDone<-book.Revoke(grant,req)}()
 select{
 case e:=<-revokeDone:
  t.Fatal("revocation crossed active dispatch boundary",e)
 case <-time.After(50*time.Millisecond):
 }
 close(release)
 if e:=<-commitDone;e!=nil{t.Fatal("admitted dispatch",e)}
 if e:=<-revokeDone;e!=nil{t.Fatal("post-dispatch revoke",e)}
 guard.coordinator.fault=nil
 latest,_:=a.Head();retry,_:=SignAuthorityRequest(0,AuthorityCommit,latest,req,callerKey[0])
 if _,e=guard.Commit(grant,retry,GrantPrimary);!errors.Is(e,ErrGrantRevoked){t.Fatal("revocation did not block later dispatch",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,0}||total!=1||effects!=1{t.Fatal("revocation serialization counts",spent,total,effects,e)}
 t.Log("revocation cannot interleave after the final grant check but before an admitted transaction; once revoke completes, later effect dispatch is refused")
}

func TestGrantBookSeparateCompensationApproval(t *testing.T){
 book,guard,a,witness,_,srv,ctx,ak,_,consentKey,callerKey:=grantFixture(t)
 defer srv.Close();defer witness.Close();defer a.Close();defer book.Close()
 primaryReq:=approve(t,0,ctx,ak);compReq:=approve(t,1,ctx,ak)
 primary,e:=IssueActionGrant(primaryReq,GrantPrimary,10,20,consentKey);if e!=nil{t.Fatal(e)}
 compensation,e:=IssueActionGrant(compReq,GrantCompensation,10,20,consentKey);if e!=nil{t.Fatal(e)}
 root,_:=a.Head()
 primaryWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,primaryReq,callerKey[0])
 if _,e=guard.Commit(primary,primaryWire,GrantPrimary);e!=nil{t.Fatal(e)}
 head,_:=a.Head();compWire,_:=SignAuthorityRequest(1,AuthorityCommit,head,compReq,callerKey[1])
 if _,e=guard.Commit(primary,compWire,GrantCompensation);!errors.Is(e,ErrPolicy){t.Fatal("primary consent authorized different compensation request",e)}
 if _,e=guard.Commit(compensation,compWire,GrantPrimary);!errors.Is(e,ErrGrantClass){t.Fatal("compensation grant used as primary",e)}
 if response,e:=guard.Commit(compensation,compWire,GrantCompensation);e!=nil||response.Authority.Outcome!=AuthorityCommitted{t.Fatal("separately approved compensation fixture",e)}
 spent,total,effects,e:=a.Counts();if e!=nil||spent!=[authorityCallers]byte{1,1}||total!=2||effects!=2{t.Fatal("separate grant counts",spent,total,effects,e)}
 t.Log("synthetic compensation path requires a distinct exact request and GrantCompensation signature; primary consent cannot authorize it")
}

func TestGrantBookRestartLockCorruptionAndRollbackCounterexample(t *testing.T){
 origin:="http://127.0.0.1:19121"
 ctx,approver,ak,_,_,_,_:=authorityFixture(t,origin)
 consentPub,consentKey:=keys(11);_,bookKey:=keys(12)
 dir:=privateTemp(t)
 book,e:=CreateGrantBook(dir,ctx,consentPub,approver,bookKey,5);if e!=nil{t.Fatal(e)}
 req:=approve(t,0,ctx,ak);grant,e:=IssueActionGrant(req,GrantPrimary,5,9,consentKey);if e!=nil{t.Fatal(e)}
 genesis,e:=os.ReadFile(filepath.Join(dir,"grantbook.bin"));if e!=nil{t.Fatal(e)}
 if second,e:=OpenGrantBook(dir,ctx,consentPub,approver,bookKey);!errors.Is(e,ErrStoreBusy){if second!=nil{second.Close()};t.Fatal("second owner",e)}
 if e=book.Revoke(grant,req);e!=nil{t.Fatal(e)}
 if e=book.AdvanceEpoch(5,7);e!=nil{t.Fatal(e)}
 book.Close()
 reopened,e:=OpenGrantBook(dir,ctx,consentPub,approver,bookKey);if e!=nil{t.Fatal(e)}
 if epoch,e:=reopened.Epoch();e!=nil||epoch!=7{t.Fatal("epoch restart",epoch,e)}
 if e=reopened.CheckDispatch(grant,req,GrantPrimary);!errors.Is(e,ErrGrantRevoked){t.Fatal("revocation restart",e)}
 reopened.Close()

 // Deliberate boundary: restoring an older genuinely signed book resets epoch
 // and revocation. The book therefore needs an independent monotonic anchor
 // before this mechanism can be called production revocation.
 if e=os.WriteFile(filepath.Join(dir,"grantbook.bin"),genesis,0600);e!=nil{t.Fatal(e)}
 rolled,e:=OpenGrantBook(dir,ctx,consentPub,approver,bookKey);if e!=nil{t.Fatal("signed rollback refused unexpectedly",e)}
 if epoch,e:=rolled.Epoch();e!=nil||epoch!=5{t.Fatal("rollback epoch",epoch,e)}
 if e=rolled.CheckDispatch(grant,req,GrantPrimary);e!=nil{t.Fatal("rollback counterexample missing",e)}
 rolled.Close()

 // Signature corruption fails closed.
 raw,e:=os.ReadFile(filepath.Join(dir,"grantbook.bin"));if e!=nil{t.Fatal(e)};raw[len(raw)-1]^=1
 if e=os.WriteFile(filepath.Join(dir,"grantbook.bin"),raw,0600);e!=nil{t.Fatal(e)}
 if bad,e:=OpenGrantBook(dir,ctx,consentPub,approver,bookKey);!errors.Is(e,ErrStore){if bad!=nil{bad.Close()};t.Fatal("corrupt book opened",e)}
 t.Log("revocation and epoch survive restart/lock contention; old valid signed GrantBook rollback is a retained counterexample")
}

func TestGrantBookAmbiguousPersistencePoisonsUntilReopen(t *testing.T){
 origin:="http://127.0.0.1:19122"
 ctx,approver,_,_,_,_,_:=authorityFixture(t,origin)
 consentPub,_:=keys(11);_,bookKey:=keys(12)
 for _,stage:=range []string{"before-rename","after-rename"}{
  t.Run(stage,func(t *testing.T){
   dir:=privateTemp(t);book,e:=CreateGrantBook(dir,ctx,consentPub,approver,bookKey,1);if e!=nil{t.Fatal(e)}
   book.fault=func(at string)error{if at==stage{return errors.New("injected")};return nil}
   if e=book.AdvanceEpoch(1,2);!errors.Is(e,ErrUnknown){t.Fatal("ambiguous epoch change",e)}
   if _,e=book.Epoch();!errors.Is(e,ErrStore){t.Fatal("poisoned book readable",e)}
   book.Close()
   book,e=OpenGrantBook(dir,ctx,consentPub,approver,bookKey);if e!=nil{t.Fatal(e)};defer book.Close()
   epoch,e:=book.Epoch();if e!=nil{t.Fatal(e)}
   if stage=="before-rename"&&epoch!=1{t.Fatal("before rename committed",epoch)}
   if stage=="after-rename"&&epoch!=2{t.Fatal("after rename lost",epoch)}
  })
 }
}


func TestGrantGuardExternalBoundaryConsentBeforeWitnessContact(t *testing.T){
 var witnessPtr atomic.Pointer[AuthorityWitness]
 var contacts atomic.Int32
 witnessServer:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  contacts.Add(1);witnessPtr.Load().ServeHTTP(w,r)
 }));defer witnessServer.Close()
 ctx,approver,ak,authorityPub,authorityKey,callerPub,callerKey:=authorityFixture(t,witnessServer.URL)
 consentPub,consentKey:=keys(11);_,bookKey:=keys(12);witnessPub,witnessKey:=witnessKeys()
 authorityDir:=privateTemp(t);witnessDir:=privateTemp(t);bookDir:=privateTemp(t)
 authority,e:=CreateSharedAuthority(authorityDir,ctx,approver,authorityKey,callerPub,2);if e!=nil{t.Fatal(e)};defer authority.Close()
 genesis,_:=authority.Head()
 witness,e:=CreateAuthorityWitness(witnessDir,ctx,authorityPub,witnessKey,genesis);if e!=nil{t.Fatal(e)};defer witness.Close();witnessPtr.Store(witness)
 witnessClient,e:=NewWitnessClient(witnessServer.URL,ctx,authorityPub,witnessPub,genesis);if e!=nil{t.Fatal(e)}
 coordinator,e:=NewWitnessCoordinator(authority,witnessClient);if e!=nil{t.Fatal(e)}
 book,e:=CreateGrantBook(bookDir,ctx,consentPub,approver,bookKey,10);if e!=nil{t.Fatal(e)};defer book.Close()
 guard,e:=NewGrantGuard(book,coordinator);if e!=nil{t.Fatal(e)}
 api:=httptest.NewServer(guard);defer api.Close()

 challenge:=Digest{7}
 do:=func(grant ActionGrant,wire AuthorityRequest,challengeHeader string)(int,[]byte){
  body:=GrantedAuthorityRequest{Grant:grant,Authority:wire}.Bytes()
  req,e:=http.NewRequest(http.MethodPost,api.URL+"/authority-granted",bytes.NewReader(body));if e!=nil{t.Fatal(e)}
  req.Header.Set("Content-Type",media);req.Header.Set("X-Sutra-Witness-Challenge",challengeHeader)
  res,e:=http.DefaultClient.Do(req);if e!=nil{t.Fatal(e)}
  raw,e:=io.ReadAll(res.Body);res.Body.Close();if e!=nil{t.Fatal(e)}
  return res.StatusCode,raw
 }
 action:=approve(t,0,ctx,ak);root,_:=authority.Head()
 commitWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,action,callerKey[0])
 active,e:=IssueActionGrant(action,GrantPrimary,10,20,consentKey);if e!=nil{t.Fatal(e)}
 future,e:=IssueActionGrant(action,GrantPrimary,11,20,consentKey);if e!=nil{t.Fatal(e)}
 header:=hex.EncodeToString(challenge[:])

 baseline:=contacts.Load()
 if status,_:=do(future,commitWire,header);status!=http.StatusForbidden{t.Fatal("future grant status",status)}
 if contacts.Load()!=baseline{t.Fatal("future grant contacted witness")}

 other:=approve(t,1,ctx,ak);otherWire,_:=SignAuthorityRequest(0,AuthorityCommit,root,other,callerKey[0])
 if status,_:=do(active,otherWire,header);status!=http.StatusForbidden{t.Fatal("new-key grant substitution status",status)}
 if contacts.Load()!=baseline{t.Fatal("new-key substitution contacted witness")}

 statusWire,_:=SignAuthorityRequest(0,AuthorityStatus,root,action,callerKey[0])
 if status,_:=do(active,statusWire,header);status!=http.StatusForbidden{t.Fatal("unadmitted status",status)}
 if contacts.Load()!=baseline{t.Fatal("unadmitted status contacted witness")}

 if status,_:=do(active,commitWire,"00");status!=http.StatusBadRequest{t.Fatal("malformed challenge",status)}
 if contacts.Load()!=baseline{t.Fatal("malformed challenge contacted witness")}

 status,raw:=do(active,commitWire,header)
 if status!=http.StatusOK{t.Fatal("active external grant",status)}
 envelope,e:=ParseWitnessedEnvelope(raw);if e!=nil||!VerifyWitnessedEnvelope(envelope,commitWire,challenge,ctx,authorityPub,witnessPub,genesis){t.Fatal("external consent envelope",e)}
 if contacts.Load()<=baseline{t.Fatal("valid dispatch never contacted witness")}
 admittedContacts:=contacts.Load()

 if e=book.Revoke(active,action);e!=nil{t.Fatal(e)}
 latest:=envelope.Attestation.View.Head
 revokedCommit,_:=SignAuthorityRequest(0,AuthorityCommit,latest,action,callerKey[0])
 if status,_:=do(active,revokedCommit,header);status!=http.StatusForbidden{t.Fatal("revoked external commit",status)}
 if contacts.Load()!=admittedContacts{t.Fatal("revoked commit contacted witness")}

 // Exact admitted action can still reconcile after revocation.
 revokedStatus,_:=SignAuthorityRequest(0,AuthorityStatus,latest,action,callerKey[0])
 challenge2:=Digest{8};header2:=hex.EncodeToString(challenge2[:])
 status,raw=do(active,revokedStatus,header2)
 if status!=http.StatusOK{t.Fatal("revoked status reconcile",status)}
 statusEnvelope,e:=ParseWitnessedEnvelope(raw);if e!=nil||!VerifyWitnessedEnvelope(statusEnvelope,revokedStatus,challenge2,ctx,authorityPub,witnessPub,genesis){t.Fatal("revoked status envelope",e)}
 if statusEnvelope.Authority.Receipt!=envelope.Authority.Receipt{t.Fatal("reconciliation receipt changed")}
 t.Log("external consent boundary rejects future, new-key, unadmitted-status, malformed-challenge and revoked dispatch before witness contact; exact admitted status remains reconcilable")
}
