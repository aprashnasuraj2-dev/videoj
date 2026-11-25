//go:build linux

package actionprotocol

// WitnessCoordinator couples the synthetic SharedAuthority to an independently
// keyed monotonic AuthorityWitness through a crash-recoverable signed intent.
// It narrows the two-store crash window; it is not a distributed transaction,
// consensus protocol, public transparency service, or arbitrary effect adapter.
import (
 "bytes"
 "crypto/ed25519"
 "crypto/rand"
 "encoding/hex"
 "errors"
 "io"
 "net"
 "net/http"
 "net/url"
 "os"
 "path/filepath"
 "sync"
 "time"
)

const bridgeIntentDomain = "SUTRA/authority-witness-intent/v1\x00"
const bridgeIntentSize = 32+32+32+ed25519.SignatureSize
const bridgeIntentName = "witness-intent.bin"
const witnessedResponseSize = authorityResponseSize+witnessViewSize
const witnessedEnvelopeSize = authorityResponseSize+witnessAttestationSize

var ErrWitnessUnavailable = errors.New("independent witness unavailable or ambiguous")

func randomWitnessChallenge()(Digest,error){
 for i:=0;i<2;i++{
  var challenge Digest
  if _,e:=rand.Read(challenge[:]);e!=nil{return Digest{},e}
  if challenge!=(Digest{}){return challenge,nil}
 }
 return Digest{},ErrUnknown
}

type BridgeIntent struct {
 RequestHash Digest
 Before Digest
 After Digest
 Signature [ed25519.SignatureSize]byte
}
func (i BridgeIntent) message(ctx Digest)[]byte{
 b:=append([]byte(bridgeIntentDomain),ctx[:]...)
 b=append(b,i.RequestHash[:]...)
 b=append(b,i.Before[:]...)
 return append(b,i.After[:]...)
}
func (i BridgeIntent) Bytes()[]byte{
 b:=append([]byte(nil),i.RequestHash[:]...)
 b=append(b,i.Before[:]...)
 b=append(b,i.After[:]...)
 return append(b,i.Signature[:]...)
}
func parseBridgeIntent(raw []byte,ctx Digest,authority ed25519.PublicKey)(BridgeIntent,error){
 var i BridgeIntent
 if len(raw)!=bridgeIntentSize||ctx==(Digest{})||len(authority)!=ed25519.PublicKeySize{return i,ErrStore}
 copy(i.RequestHash[:],raw[:32]);copy(i.Before[:],raw[32:64]);copy(i.After[:],raw[64:96]);copy(i.Signature[:],raw[96:])
 if i.RequestHash==(Digest{})||i.Before==(Digest{})||i.After==(Digest{})||i.Before==i.After||
  !ed25519.Verify(authority,i.message(ctx),i.Signature[:]){return BridgeIntent{},ErrStore}
 return i,nil
}
func signBridgeIntent(ctx Digest,requestHash,before,after Digest,key ed25519.PrivateKey)(BridgeIntent,error){
 if ctx==(Digest{})||requestHash==(Digest{})||before==(Digest{})||after==(Digest{})||before==after||len(key)!=ed25519.PrivateKeySize{return BridgeIntent{},ErrPolicy}
 i:=BridgeIntent{RequestHash:requestHash,Before:before,After:after}
 copy(i.Signature[:],ed25519.Sign(key,i.message(ctx)))
 return i,nil
}
func (i BridgeIntent) transition(ctx Digest,key ed25519.PrivateKey)(WitnessTransition,error){
 return SignWitnessTransition(ctx,i.Before,i.After,key)
}

type WitnessedResponse struct {
 Authority AuthorityResponse
 Witness WitnessView
}
func (r WitnessedResponse) Bytes()[]byte{
 b:=append([]byte(nil),r.Authority.Bytes()...)
 return append(b,r.Witness.Bytes()...)
}
func ParseWitnessedResponse(raw []byte)(WitnessedResponse,error){
 if len(raw)!=witnessedResponseSize{return WitnessedResponse{},ErrPolicy}
 authority,e:=ParseAuthorityResponse(raw[:authorityResponseSize]);if e!=nil{return WitnessedResponse{},e}
 witness,e:=ParseWitnessView(raw[authorityResponseSize:]);if e!=nil{return WitnessedResponse{},e}
 return WitnessedResponse{Authority:authority,Witness:witness},nil
}
func VerifyWitnessedResponse(r WitnessedResponse,req AuthorityRequest,ctx Digest,authority,witness ed25519.PublicKey,genesis Digest)bool{
 return VerifyAuthorityResponse(r.Authority,req,authority)&&
  VerifyWitnessViewPinned(r.Witness,ctx,authority,witness,genesis)&&
  r.Witness.Head==r.Authority.After
}


type WitnessedEnvelope struct {
 Authority AuthorityResponse
 Attestation WitnessAttestation
}
func (e WitnessedEnvelope) Bytes()[]byte{
 b:=append([]byte(nil),e.Authority.Bytes()...)
 return append(b,e.Attestation.Bytes()...)
}
func ParseWitnessedEnvelope(raw []byte)(WitnessedEnvelope,error){
 if len(raw)!=witnessedEnvelopeSize{return WitnessedEnvelope{},ErrPolicy}
 authority,e:=ParseAuthorityResponse(raw[:authorityResponseSize]);if e!=nil{return WitnessedEnvelope{},e}
 attestation,e:=ParseWitnessAttestation(raw[authorityResponseSize:]);if e!=nil{return WitnessedEnvelope{},e}
 return WitnessedEnvelope{Authority:authority,Attestation:attestation},nil
}
func VerifyWitnessedEnvelope(e WitnessedEnvelope,req AuthorityRequest,challenge Digest,ctx Digest,authority,witness ed25519.PublicKey,genesis Digest)bool{
 return VerifyAuthorityResponse(e.Authority,req,authority)&&
  VerifyWitnessAttestation(e.Attestation,challenge,ctx,authority,witness,genesis)&&
  e.Attestation.View.Head==e.Authority.After
}

type WitnessClient struct {
 origin string
 ctx Digest
 authority ed25519.PublicKey
 witness ed25519.PublicKey
 genesis Digest
 http *http.Client
}
func NewWitnessClient(origin string,ctx Digest,authority,witness ed25519.PublicKey,genesis Digest)(*WitnessClient,error){
 u,e:=url.Parse(origin)
 if e!=nil||u.Scheme!="http"||u.User!=nil||u.Path!=""||u.RawQuery!=""||u.Fragment!=""||u.Opaque!=""||u.Port()==""||u.Host==""{return nil,ErrPolicy}
 ip:=net.ParseIP(u.Hostname())
 if ip==nil||!ip.IsLoopback()||origin!="http://"+u.Host||ctx==(Digest{})||genesis==(Digest{})||len(authority)!=ed25519.PublicKeySize||len(witness)!=ed25519.PublicKeySize{return nil,ErrPolicy}
 tr:=&http.Transport{Proxy:nil,DialContext:(&net.Dialer{Timeout:time.Second}).DialContext,DisableKeepAlives:true}
 h:=&http.Client{Transport:tr,Timeout:2*time.Second,CheckRedirect:func(*http.Request,[]*http.Request)error{return http.ErrUseLastResponse}}
 return &WitnessClient{origin:origin,ctx:ctx,authority:append(ed25519.PublicKey(nil),authority...),witness:append(ed25519.PublicKey(nil),witness...),genesis:genesis,http:h},nil
}
func (c *WitnessClient) parseResponse(res *http.Response)(WitnessView,error){
 if res==nil{return WitnessView{},ErrWitnessUnavailable}
 defer res.Body.Close()
 if res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media||res.Request==nil||res.Request.URL.String()!=c.origin+"/witness"{
  return WitnessView{},ErrWitnessUnavailable
 }
 raw,e:=io.ReadAll(io.LimitReader(res.Body,witnessViewSize+1));if e!=nil||len(raw)!=witnessViewSize{return WitnessView{},ErrWitnessUnavailable}
 v,e:=ParseWitnessView(raw);if e!=nil||!VerifyWitnessViewPinned(v,c.ctx,c.authority,c.witness,c.genesis){return WitnessView{},ErrWitnessUnavailable}
 return v,nil
}
func (c *WitnessClient) AttestChallenge(challenge Digest)(WitnessAttestation,error){
 if challenge==(Digest{}){return WitnessAttestation{},ErrWitnessUnavailable}
 req,e:=http.NewRequest(http.MethodPost,c.origin+"/witness/view",bytes.NewReader(challenge[:]));if e!=nil{return WitnessAttestation{},ErrWitnessUnavailable}
 req.Header.Set("Content-Type",media);req.Header.Set("Accept",media)
 res,e:=c.http.Do(req);if e!=nil{return WitnessAttestation{},ErrWitnessUnavailable}
 if res==nil{return WitnessAttestation{},ErrWitnessUnavailable}
 defer res.Body.Close()
 if res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media||res.Request==nil||res.Request.URL.String()!=c.origin+"/witness/view"{
  return WitnessAttestation{},ErrWitnessUnavailable
 }
 raw,e:=io.ReadAll(io.LimitReader(res.Body,witnessAttestationSize+1));if e!=nil||len(raw)!=witnessAttestationSize{return WitnessAttestation{},ErrWitnessUnavailable}
 attestation,e:=ParseWitnessAttestation(raw)
 if e!=nil||!VerifyWitnessAttestation(attestation,challenge,c.ctx,c.authority,c.witness,c.genesis){return WitnessAttestation{},ErrWitnessUnavailable}
 return attestation,nil
}
func (c *WitnessClient) View()(WitnessView,error){
 var challenge Digest
 if _,e:=rand.Read(challenge[:]);e!=nil{return WitnessView{},ErrWitnessUnavailable}
 attestation,e:=c.AttestChallenge(challenge);if e!=nil{return WitnessView{},e}
 return attestation.View,nil
}
func (c *WitnessClient) Advance(t WitnessTransition)(WitnessView,error){
 req,e:=http.NewRequest(http.MethodPost,c.origin+"/witness",bytes.NewReader(t.Bytes()));if e!=nil{return WitnessView{},ErrWitnessUnavailable}
 req.Header.Set("Content-Type",media);req.Header.Set("Accept",media)
 res,e:=c.http.Do(req);if e!=nil{return WitnessView{},ErrWitnessUnavailable}
 if res.StatusCode==http.StatusConflict{res.Body.Close();return WitnessView{},ErrWitnessConflict}
 return c.parseResponse(res)
}

type WitnessCoordinator struct {
 authority *SharedAuthority
 witness *WitnessClient
 fault func(string)error
}
func NewWitnessCoordinator(authority *SharedAuthority,witness *WitnessClient)(*WitnessCoordinator,error){
 if authority==nil||witness==nil||authority.ctx!=witness.ctx||
  !bytes.Equal(authority.signer.Public().(ed25519.PublicKey),witness.authority){return nil,ErrPolicy}
 return &WitnessCoordinator{authority:authority,witness:witness},nil
}
func (c *WitnessCoordinator) intentPath()string{return filepath.Join(c.authority.dir,bridgeIntentName)}
func (c *WitnessCoordinator) loadIntentLocked()(BridgeIntent,bool,error){
 path:=c.intentPath()
 info,e:=os.Lstat(path)
 if errors.Is(e,os.ErrNotExist){return BridgeIntent{},false,nil}
 if e!=nil||!info.Mode().IsRegular()||info.Mode().Perm()&0077!=0||info.Size()!=bridgeIntentSize{return BridgeIntent{},false,ErrStore}
 f,e:=os.Open(path);if e!=nil{return BridgeIntent{},false,e}
 raw,e:=io.ReadAll(io.LimitReader(f,bridgeIntentSize+1));ce:=f.Close()
 if e!=nil||ce!=nil{return BridgeIntent{},false,ErrStore}
 intent,e:=parseBridgeIntent(raw,c.authority.ctx,c.authority.signer.Public().(ed25519.PublicKey));if e!=nil{return BridgeIntent{},false,e}
 return intent,true,nil
}
func (c *WitnessCoordinator) persistIntentLocked(intent BridgeIntent)error{
 if _,exists,e:=c.loadIntentLocked();e!=nil{return e}else if exists{return ErrStore}
 f,e:=os.CreateTemp(c.authority.dir,".witness-intent-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=intent.Bytes();n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if e=os.Rename(f.Name(),c.intentPath());e!=nil{return e}
 return syncDirectory(c.authority.dir)
}
func (c *WitnessCoordinator) clearIntentLocked()error{
 e:=os.Remove(c.intentPath());if errors.Is(e,os.ErrNotExist){return nil};if e!=nil{return e}
 return syncDirectory(c.authority.dir)
}
func (c *WitnessCoordinator) recoverLocked()error{
 if c.authority.lock==nil||c.authority.poisoned{return ErrStore}
 intent,exists,e:=c.loadIntentLocked();if e!=nil{return e}
 view,e:=c.witness.View();if e!=nil{return ErrWitnessUnavailable}
 current:=c.authority.headLocked()
 if !exists{
  if view.Head!=current{return ErrWitnessRollback}
  return nil
 }
 switch {
 case current==intent.Before&&view.Head==intent.Before:
  // Prepared intent never reached the authoritative rename.
  return c.clearIntentLocked()
 case current==intent.After&&view.Head==intent.Before:
  transition,e:=intent.transition(c.authority.ctx,c.authority.signer);if e!=nil{return e}
  next,e:=c.witness.Advance(transition);if e!=nil{return ErrWitnessUnavailable}
  if next.Head!=intent.After{return ErrWitnessRollback}
  return c.clearIntentLocked()
 case current==intent.After&&view.Head==intent.After:
  // Witness accepted but caller lost the response or process died before cleanup.
  return c.clearIntentLocked()
 default:
  return ErrWitnessRollback
 }
}
func (c *WitnessCoordinator) Recover()error{
 a:=c.authority;a.mu.Lock();defer a.mu.Unlock()
 return c.recoverLocked()
}
func (c *WitnessCoordinator) processLocked(req AuthorityRequest)(WitnessedResponse,error){
 a:=c.authority
 if a.lock==nil||a.poisoned{return WitnessedResponse{},ErrStore}
 if e:=a.preflight(req);e!=nil{return WitnessedResponse{},e}
 if e:=c.recoverLocked();e!=nil{return WitnessedResponse{},e}
 plan,e:=a.planLocked(req);if e!=nil{return WitnessedResponse{},e}
 if !plan.persist{
  response,e:=a.applyPlanLocked(req,plan);if e!=nil{return WitnessedResponse{},e}
  view,e:=c.witness.View();if e!=nil{return WitnessedResponse{},ErrWitnessUnavailable}
  witnessed:=WitnessedResponse{Authority:response,Witness:view}
  if !VerifyWitnessedResponse(witnessed,req,a.ctx,a.signer.Public().(ed25519.PublicKey),c.witness.witness,c.witness.genesis){
   return WitnessedResponse{},ErrWitnessRollback
  }
  return witnessed,nil
 }
 intent,e:=signBridgeIntent(a.ctx,req.Hash(),plan.before,plan.after,a.signer);if e!=nil{return WitnessedResponse{},e}
 if e=c.persistIntentLocked(intent);e!=nil{return WitnessedResponse{},e}
 if c.fault!=nil{if e=c.fault("after-intent");e!=nil{return WitnessedResponse{},ErrUnknown}}
 response,e:=a.applyPlanLocked(req,plan);if e!=nil{return WitnessedResponse{},e}
 if c.fault!=nil{if e=c.fault("after-authority");e!=nil{return WitnessedResponse{},ErrUnknown}}
 transition,e:=intent.transition(a.ctx,a.signer);if e!=nil{return WitnessedResponse{},e}
 view,e:=c.witness.Advance(transition)
 if e!=nil{
  return WitnessedResponse{},ErrUnknown
 }
 if view.Head!=plan.after{return WitnessedResponse{},ErrWitnessRollback}
 if c.fault!=nil{if e=c.fault("after-witness");e!=nil{return WitnessedResponse{},ErrUnknown}}
 if e=c.clearIntentLocked();e!=nil{return WitnessedResponse{},ErrUnknown}
 witnessed:=WitnessedResponse{Authority:response,Witness:view}
 if !VerifyWitnessedResponse(witnessed,req,a.ctx,a.signer.Public().(ed25519.PublicKey),c.witness.witness,c.witness.genesis){
  return WitnessedResponse{},ErrWitnessRollback
 }
 return witnessed,nil
}
func (c *WitnessCoordinator) Process(req AuthorityRequest)(WitnessedResponse,error){
 a:=c.authority;a.mu.Lock();defer a.mu.Unlock()
 return c.processLocked(req)
}
func (c *WitnessCoordinator) ProcessAttested(req AuthorityRequest,challenge Digest)(WitnessedEnvelope,error){
 if challenge==(Digest{}){return WitnessedEnvelope{},ErrPolicy}
 a:=c.authority;a.mu.Lock();defer a.mu.Unlock()
 witnessed,e:=c.processLocked(req);if e!=nil{return WitnessedEnvelope{},e}
 attestation,e:=c.witness.AttestChallenge(challenge);if e!=nil{return WitnessedEnvelope{},ErrWitnessUnavailable}
 if attestation.View!=witnessed.Witness{return WitnessedEnvelope{},ErrWitnessRollback}
 envelope:=WitnessedEnvelope{Authority:witnessed.Authority,Attestation:attestation}
 if !VerifyWitnessedEnvelope(envelope,req,challenge,a.ctx,a.signer.Public().(ed25519.PublicKey),c.witness.witness,c.witness.genesis){
  return WitnessedEnvelope{},ErrWitnessRollback
 }
 return envelope,nil
}

func parseWitnessChallengeHeader(r *http.Request)(Digest,error){
 var challenge Digest
 if r==nil{return challenge,ErrPolicy}
 values:=r.Header.Values("X-Sutra-Witness-Challenge")
 if len(values)!=1||len(values[0])!=64{return challenge,ErrPolicy}
 decoded,e:=hex.DecodeString(values[0]);if e!=nil||len(decoded)!=32||hex.EncodeToString(decoded)!=values[0]{return challenge,ErrPolicy}
 copy(challenge[:],decoded)
 if challenge==(Digest{}){return Digest{},ErrPolicy}
 return challenge,nil
}

func (c *WitnessCoordinator) ServeHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 if r.Method!=http.MethodPost||r.URL.Path!="/authority-witnessed"||r.URL.RawQuery!=""||r.Header.Get("Content-Type")!=media{
  w.WriteHeader(http.StatusBadRequest);return
 }
 challenge,e:=parseWitnessChallengeHeader(r);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 defer r.Body.Close()
 raw,e:=io.ReadAll(io.LimitReader(r.Body,authorityRequestSize+1));if e!=nil||len(raw)!=authorityRequestSize{w.WriteHeader(http.StatusBadRequest);return}
 req,e:=ParseAuthorityRequest(raw);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 response,e:=c.ProcessAttested(req,challenge)
 if e!=nil{
  switch {
  case errors.Is(e,ErrAuthorityAuth),errors.Is(e,ErrPolicy):
   w.WriteHeader(http.StatusForbidden)
  case errors.Is(e,ErrWitnessRollback):
   w.WriteHeader(http.StatusConflict)
  case errors.Is(e,ErrWitnessUnavailable),errors.Is(e,ErrUnknown):
   w.WriteHeader(http.StatusServiceUnavailable)
  default:
   w.WriteHeader(http.StatusInternalServerError)
  }
  return
 }
 w.Header().Set("Content-Type",media)
 _,_=w.Write(response.Bytes())
}

type WitnessedAuthorityClient struct {
 mu sync.Mutex
 origin string
 caller byte
 key ed25519.PrivateKey
 authority ed25519.PublicKey
 witness ed25519.PublicKey
 ctx Digest
 genesis Digest
 action Request
 head Digest
 sequence uint32
 http *http.Client
 challenge func()(Digest,error)
 lastChallenge Digest
 contacts int
}
func NewWitnessedAuthorityClient(origin string,caller byte,key ed25519.PrivateKey,authority,witness ed25519.PublicKey,ctx,genesis Digest,pin WitnessView,action Request)(*WitnessedAuthorityClient,error){
 u,e:=url.Parse(origin)
 if e!=nil||u.Scheme!="http"||u.User!=nil||u.Path!=""||u.RawQuery!=""||u.Fragment!=""||u.Opaque!=""||u.Port()==""||u.Host==""{return nil,ErrPolicy}
 ip:=net.ParseIP(u.Hostname())
 if ip==nil||!ip.IsLoopback()||origin!="http://"+u.Host||caller>=authorityCallers||len(key)!=ed25519.PrivateKeySize||
  len(authority)!=ed25519.PublicKeySize||len(witness)!=ed25519.PublicKeySize||ctx==(Digest{})||genesis==(Digest{})||action.Key==(Key{})||
  !VerifyWitnessViewPinned(pin,ctx,authority,witness,genesis){return nil,ErrPolicy}
 tr:=&http.Transport{Proxy:nil,DialContext:(&net.Dialer{Timeout:time.Second}).DialContext,DisableKeepAlives:true}
 h:=&http.Client{Transport:tr,Timeout:2*time.Second,CheckRedirect:func(*http.Request,[]*http.Request)error{return http.ErrUseLastResponse}}
 return &WitnessedAuthorityClient{
  origin:origin,caller:caller,key:append(ed25519.PrivateKey(nil),key...),authority:append(ed25519.PublicKey(nil),authority...),
  witness:append(ed25519.PublicKey(nil),witness...),ctx:ctx,genesis:genesis,action:action,head:pin.Head,sequence:pin.Sequence,http:h,challenge:randomWitnessChallenge,
 },nil
}
func (c *WitnessedAuthorityClient) Head()Digest{c.mu.Lock();defer c.mu.Unlock();return c.head}
func (c *WitnessedAuthorityClient) Sequence()uint32{c.mu.Lock();defer c.mu.Unlock();return c.sequence}
func (c *WitnessedAuthorityClient) Contacts()int{c.mu.Lock();defer c.mu.Unlock();return c.contacts}
func (c *WitnessedAuthorityClient) exchange(op byte)(Receipt,WitnessedEnvelope,error){
 req,e:=SignAuthorityRequest(c.caller,op,c.head,c.action,c.key);if e!=nil{return Receipt{},WitnessedEnvelope{},e}
 challenge,e:=c.challenge();if e!=nil||challenge==(Digest{})||challenge==c.lastChallenge{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 c.lastChallenge=challenge
 c.contacts++
 h,e:=http.NewRequest(http.MethodPost,c.origin+"/authority-witnessed",bytes.NewReader(req.Bytes()));if e!=nil{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 h.GetBody=nil;h.Header.Set("Content-Type",media);h.Header.Set("Accept",media);h.Header.Set("X-Sutra-Witness-Challenge",hex.EncodeToString(challenge[:]))
 res,e:=c.http.Do(h);if e!=nil{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 defer res.Body.Close()
 switch res.StatusCode{
 case http.StatusForbidden:
  return Receipt{},WitnessedEnvelope{},ErrAuthorityAuth
 case http.StatusConflict:
  return Receipt{},WitnessedEnvelope{},ErrWitnessRollback
 case http.StatusServiceUnavailable:
  return Receipt{},WitnessedEnvelope{},ErrUnknown
 case http.StatusOK:
 default:
  return Receipt{},WitnessedEnvelope{},ErrUnknown
 }
 if res.Header.Get("Content-Type")!=media||res.Request==nil||res.Request.URL.String()!=c.origin+"/authority-witnessed"{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 raw,e:=io.ReadAll(io.LimitReader(res.Body,witnessedEnvelopeSize+1));if e!=nil||len(raw)!=witnessedEnvelopeSize{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 response,e:=ParseWitnessedEnvelope(raw)
 if e!=nil||!VerifyWitnessedEnvelope(response,req,challenge,c.ctx,c.authority,c.witness,c.genesis){return Receipt{},WitnessedEnvelope{},ErrUnknown}
 view:=response.Attestation.View
 if response.Authority.After==c.head{
  if view.Sequence!=c.sequence{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 }else{
  if view.Sequence!=c.sequence+1{return Receipt{},WitnessedEnvelope{},ErrUnknown}
 }
 c.head=response.Authority.After;c.sequence=view.Sequence
 switch response.Authority.Outcome{
 case AuthorityCommitted:return response.Authority.Receipt,response,nil
 case AuthorityAbsent:return Receipt{},response,ErrAbsent
 case AuthorityConflict:return Receipt{},response,ErrHeadConflict
 case AuthorityBudget:return Receipt{},response,ErrContacts
 default:return Receipt{},WitnessedEnvelope{},ErrUnknown
 }
}
func (c *WitnessedAuthorityClient) Commit()(Receipt,WitnessedEnvelope,error){c.mu.Lock();defer c.mu.Unlock();return c.exchange(AuthorityCommit)}
func (c *WitnessedAuthorityClient) Status()(Receipt,WitnessedEnvelope,error){c.mu.Lock();defer c.mu.Unlock();return c.exchange(AuthorityStatus)}
