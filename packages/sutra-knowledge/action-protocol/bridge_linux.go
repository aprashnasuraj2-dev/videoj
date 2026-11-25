//go:build linux

package actionprotocol

// WitnessCoordinator couples the synthetic SharedAuthority to an independently
// keyed monotonic AuthorityWitness through a crash-recoverable signed intent.
// It narrows the two-store crash window; it is not a distributed transaction,
// consensus protocol, public transparency service, or arbitrary effect adapter.
import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "io"
 "net"
 "net/http"
 "net/url"
 "os"
 "path/filepath"
 "time"
)

const bridgeIntentDomain = "SUTRA/authority-witness-intent/v1\x00"
const bridgeIntentSize = 32+32+32+ed25519.SignatureSize
const bridgeIntentName = "witness-intent.bin"

var ErrWitnessUnavailable = errors.New("independent witness unavailable or ambiguous")

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
func (c *WitnessClient) View()(WitnessView,error){
 req,e:=http.NewRequest(http.MethodGet,c.origin+"/witness",nil);if e!=nil{return WitnessView{},ErrWitnessUnavailable}
 req.Header.Set("Accept",media)
 res,e:=c.http.Do(req);if e!=nil{return WitnessView{},ErrWitnessUnavailable}
 return c.parseResponse(res)
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
func (c *WitnessCoordinator) Process(req AuthorityRequest)(AuthorityResponse,error){
 a:=c.authority;a.mu.Lock();defer a.mu.Unlock()
 if a.lock==nil||a.poisoned{return AuthorityResponse{},ErrStore}
 if e:=c.recoverLocked();e!=nil{return AuthorityResponse{},e}
 plan,e:=a.planLocked(req);if e!=nil{return AuthorityResponse{},e}
 if !plan.persist{return a.applyPlanLocked(req,plan)}
 intent,e:=signBridgeIntent(a.ctx,req.Hash(),plan.before,plan.after,a.signer);if e!=nil{return AuthorityResponse{},e}
 if e=c.persistIntentLocked(intent);e!=nil{return AuthorityResponse{},e}
 if c.fault!=nil{if e=c.fault("after-intent");e!=nil{return AuthorityResponse{},ErrUnknown}}
 response,e:=a.applyPlanLocked(req,plan);if e!=nil{return AuthorityResponse{},e}
 if c.fault!=nil{if e=c.fault("after-authority");e!=nil{return AuthorityResponse{},ErrUnknown}}
 transition,e:=intent.transition(a.ctx,a.signer);if e!=nil{return AuthorityResponse{},e}
 view,e:=c.witness.Advance(transition)
 if e!=nil{
  // A lost POST response is ambiguous. Keep the signed intent for Recover.
  return AuthorityResponse{},ErrUnknown
 }
 if view.Head!=plan.after{return AuthorityResponse{},ErrWitnessRollback}
 if c.fault!=nil{if e=c.fault("after-witness");e!=nil{return AuthorityResponse{},ErrUnknown}}
 if e=c.clearIntentLocked();e!=nil{return AuthorityResponse{},ErrUnknown}
 return response,nil
}
