//go:build linux

package actionprotocol

// SharedAuthority is a finite synthetic recovery laboratory. It combines the
// authority head, owned synthetic effect+ledger, and contact accounting in one
// signed durable snapshot. It is NOT distributed consensus, a production RPC
// service, or authority for arbitrary upstream side effects.
import (
 "bytes"
 "crypto/ed25519"
 "crypto/sha256"
 "errors"
 "io"
 "net"
 "net/http"
 "net/url"
 "os"
 "path/filepath"
 "sync"
 "syscall"
 "time"
)

const authorityDomain = "SUTRA/shared-authority-state/v1\x00"
const authorityRequestDomain = "SUTRA/shared-authority-request/v1\x00"
const authorityResponseDomain = "SUTRA/shared-authority-response/v1\x00"
const authorityCallers = 2
const authorityPerCallerContacts = 2
const authorityTotalContacts = 3

const (
 AuthorityCommit byte = 1
 AuthorityStatus byte = 2
)
const (
 AuthorityCommitted byte = 1
 AuthorityAbsent byte = 2
 AuthorityConflict byte = 3
 AuthorityBudget byte = 4
)

const authorityRequestSize = 1+1+32+requestSize+ed25519.SignatureSize
const authorityResponseBodySize = 6+32+32+32+receiptSize
const authorityResponseSize = authorityResponseBodySize+ed25519.SignatureSize

var ErrAuthorityAuth = errors.New("authority caller authentication refused")

type AuthorityRequest struct {
 Caller byte
 Op byte
 Expected Digest
 Action Request
 Signature [ed25519.SignatureSize]byte
}
func (r AuthorityRequest) body() []byte {
 b:=[]byte{r.Caller,r.Op}
 b=append(b,r.Expected[:]...)
 return append(b,r.Action.Bytes()...)
}
func (r AuthorityRequest) message() []byte {
 return append([]byte(authorityRequestDomain),r.body()...)
}
func (r AuthorityRequest) Bytes() []byte {
 return append(r.body(),r.Signature[:]...)
}
func (r AuthorityRequest) Hash() Digest { return sha256.Sum256(r.Bytes()) }
func ParseAuthorityRequest(b []byte)(AuthorityRequest,error){
 var r AuthorityRequest
 if len(b)!=authorityRequestSize{return r,ErrPolicy}
 r.Caller=b[0];r.Op=b[1];copy(r.Expected[:],b[2:34])
 action,e:=ParseRequest(b[34:34+requestSize]);if e!=nil{return r,e}
 r.Action=action;copy(r.Signature[:],b[34+requestSize:])
 return r,nil
}
func SignAuthorityRequest(caller,op byte,expected Digest,action Request,key ed25519.PrivateKey)(AuthorityRequest,error){
 if caller>=authorityCallers||(op!=AuthorityCommit&&op!=AuthorityStatus)||len(key)!=ed25519.PrivateKeySize{return AuthorityRequest{},ErrPolicy}
 r:=AuthorityRequest{Caller:caller,Op:op,Expected:expected,Action:action}
 copy(r.Signature[:],ed25519.Sign(key,r.message()))
 return r,nil
}

type AuthorityResponse struct {
 Caller byte
 Op byte
 Outcome byte
 Stale byte
 CallerSpent byte
 TotalSpent byte
 RequestHash Digest
 Before Digest
 After Digest
 Receipt Receipt
 Signature [ed25519.SignatureSize]byte
}
func (r AuthorityResponse) body() []byte {
 b:=[]byte{r.Caller,r.Op,r.Outcome,r.Stale,r.CallerSpent,r.TotalSpent}
 b=append(b,r.RequestHash[:]...)
 b=append(b,r.Before[:]...)
 b=append(b,r.After[:]...)
 return append(b,r.Receipt.Bytes()...)
}
func (r AuthorityResponse) message() []byte {
 return append([]byte(authorityResponseDomain),r.body()...)
}
func (r AuthorityResponse) Bytes() []byte {
 return append(r.body(),r.Signature[:]...)
}
func ParseAuthorityResponse(b []byte)(AuthorityResponse,error){
 var r AuthorityResponse
 if len(b)!=authorityResponseSize{return r,ErrPolicy}
 r.Caller=b[0];r.Op=b[1];r.Outcome=b[2];r.Stale=b[3];r.CallerSpent=b[4];r.TotalSpent=b[5]
 copy(r.RequestHash[:],b[6:38]);copy(r.Before[:],b[38:70]);copy(r.After[:],b[70:102])
 receipt,e:=ParseReceipt(b[102:102+receiptSize]);if e!=nil{return r,e}
 r.Receipt=receipt;copy(r.Signature[:],b[102+receiptSize:])
 return r,nil
}
func VerifyAuthorityResponse(resp AuthorityResponse,req AuthorityRequest,authority ed25519.PublicKey)bool{
 if len(authority)!=ed25519.PublicKeySize||resp.Caller!=req.Caller||resp.Op!=req.Op||resp.RequestHash!=req.Hash()||resp.Stale>1||
  resp.CallerSpent>authorityPerCallerContacts||resp.TotalSpent>authorityTotalContacts||
  (resp.Outcome<AuthorityCommitted||resp.Outcome>AuthorityBudget)||
  !ed25519.Verify(authority,resp.message(),resp.Signature[:]){return false}
 if resp.Outcome==AuthorityCommitted{return Verify(resp.Receipt,req.Action,authority)}
 return resp.Receipt==(Receipt{})
}

type SharedAuthority struct {
 mu sync.Mutex
 dir string
 lock *os.File
 ctx Digest
 approver ed25519.PublicKey
 signer ed25519.PrivateKey
 callers [authorityCallers]ed25519.PublicKey
 limit uint32
 spent [authorityCallers]byte
 receiver *Receiver
 requests []Request
 poisoned bool
 fault func(string)error
}

func CreateSharedAuthority(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,callers [authorityCallers]ed25519.PublicKey,limit uint32)(*SharedAuthority,error){
 return openSharedAuthority(dir,ctx,approver,signer,callers,limit,true)
}
func OpenSharedAuthority(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,callers [authorityCallers]ed25519.PublicKey,limit uint32)(*SharedAuthority,error){
 return openSharedAuthority(dir,ctx,approver,signer,callers,limit,false)
}
func openSharedAuthority(dir string,ctx Digest,approver ed25519.PublicKey,signer ed25519.PrivateKey,callers [authorityCallers]ed25519.PublicKey,limit uint32,create bool)(*SharedAuthority,error){
 receiver,e:=NewReceiver(ctx,approver,signer,limit);if e!=nil{return nil,e}
 if !bytes.Equal(ed25519.NewKeyFromSeed(signer[:ed25519.SeedSize]),signer){return nil,ErrPolicy}
 var pinned [authorityCallers]ed25519.PublicKey
 for i,key:=range callers{
  if len(key)!=ed25519.PublicKeySize{return nil,ErrPolicy}
  pinned[i]=append(ed25519.PublicKey(nil),key...)
 }
 if bytes.Equal(pinned[0],pinned[1]){return nil,ErrPolicy}
 dir,e=filepath.Abs(dir);if e!=nil{return nil,e}
 info,e:=os.Stat(dir);if e!=nil||!info.IsDir()||info.Mode().Perm()&0077!=0{return nil,ErrStore}
 lock,e:=os.OpenFile(filepath.Join(dir,"authority.lock"),os.O_CREATE|os.O_RDWR,0600);if e!=nil{return nil,e}
 if e=syscall.Flock(int(lock.Fd()),syscall.LOCK_EX|syscall.LOCK_NB);e!=nil{
  lock.Close();if errors.Is(e,syscall.EWOULDBLOCK){return nil,ErrStoreBusy};return nil,e
 }
 a:=&SharedAuthority{dir:dir,lock:lock,ctx:ctx,approver:append(ed25519.PublicKey(nil),approver...),signer:append(ed25519.PrivateKey(nil),signer...),callers:pinned,limit:limit,receiver:receiver}
 ok:=false;defer func(){if !ok{a.Close()}}()
 path:=filepath.Join(dir,"authority.bin")
 if create{
  if _,e=os.Lstat(path);!errors.Is(e,os.ErrNotExist){return nil,ErrStore}
  if e=a.persist(a.spent,nil);e!=nil{return nil,e}
 }else{
  f,e:=os.Open(path);if e!=nil{return nil,e}
  raw,e:=io.ReadAll(io.LimitReader(f,int64(a.maxSize()+1)));ce:=f.Close()
  if e!=nil||ce!=nil{return nil,ErrStore}
  spent,requests,e:=a.decode(raw);if e!=nil{return nil,e}
  for _,req:=range requests{if _,e=receiver.Commit(req);e!=nil{return nil,ErrStore}}
  if int(receiver.Count())!=len(requests){return nil,ErrStore}
  a.spent=spent;a.requests=requests
  if e=syncDirectory(dir);e!=nil{return nil,e}
 }
 ok=true;return a,nil
}
func (a *SharedAuthority) stateBody(spent [authorityCallers]byte,requests []Request)[]byte{
 b:=append([]byte(authorityDomain),a.ctx[:]...)
 b=append(b,a.approver...)
 b=append(b,a.signer.Public().(ed25519.PublicKey)...)
 for _,key:=range a.callers{b=append(b,key...)}
 b=append(b,byte(a.limit),authorityPerCallerContacts,authorityTotalContacts)
 b=append(b,spent[0],spent[1],byte(len(requests)))
 for _,r:=range requests{b=append(b,r.Bytes()...)}
 return b
}
func (a *SharedAuthority) maxSize()int{
 return len(a.stateBody([authorityCallers]byte{},make([]Request,int(a.limit))))+ed25519.SignatureSize
}
func (a *SharedAuthority) encode(spent [authorityCallers]byte,requests []Request)[]byte{
 body:=a.stateBody(spent,requests)
 return append(body,ed25519.Sign(a.signer,body)...)
}
func (a *SharedAuthority) decode(raw []byte)([authorityCallers]byte,[]Request,error){
 var spent [authorityCallers]byte
 base:=len(a.stateBody(spent,nil))
 if len(raw)<base+ed25519.SignatureSize||len(raw)>a.maxSize(){return spent,nil,ErrStore}
 body:=raw[:len(raw)-ed25519.SignatureSize]
 if !ed25519.Verify(a.signer.Public().(ed25519.PublicKey),body,raw[len(body):]){return spent,nil,ErrStore}
 prefix:=base-3
 if !bytes.Equal(body[:prefix],a.stateBody(spent,nil)[:prefix]){return spent,nil,ErrStore}
 spent[0]=body[prefix];spent[1]=body[prefix+1];n:=int(body[prefix+2])
 if spent[0]>authorityPerCallerContacts||spent[1]>authorityPerCallerContacts||int(spent[0])+int(spent[1])>authorityTotalContacts||n>int(a.limit)||
  len(body)!=base+n*requestSize{return spent,nil,ErrStore}
 requests:=make([]Request,0,n)
 for i:=0;i<n;i++{
  start:=base+i*requestSize
  r,e:=ParseRequest(body[start:start+requestSize]);if e!=nil{return spent,nil,ErrStore}
  requests=append(requests,r)
 }
 if !bytes.Equal(body,a.stateBody(spent,requests)){return spent,nil,ErrStore}
 return spent,requests,nil
}
func (a *SharedAuthority) persist(spent [authorityCallers]byte,requests []Request)error{
 f,e:=os.CreateTemp(a.dir,".authority-");if e!=nil{return e}
 defer os.Remove(f.Name());defer f.Close()
 raw:=a.encode(spent,requests);n,e:=f.Write(raw);if e!=nil{return e};if n!=len(raw){return io.ErrShortWrite}
 if e=f.Sync();e!=nil{return e};if e=f.Close();e!=nil{return e}
 if a.fault!=nil{if e=a.fault("before-rename");e!=nil{return e}}
 if e=os.Rename(f.Name(),filepath.Join(a.dir,"authority.bin"));e!=nil{return e}
 if a.fault!=nil{if e=a.fault("after-rename");e!=nil{return e}}
 return syncDirectory(a.dir)
}
func (a *SharedAuthority) headLocked()Digest{
 return sha256.Sum256(a.stateBody(a.spent,a.requests))
}
func (a *SharedAuthority) Head()(Digest,error){
 a.mu.Lock();defer a.mu.Unlock()
 if a.lock==nil||a.poisoned{return Digest{},ErrStore}
 return a.headLocked(),nil
}
func (a *SharedAuthority) Counts()([authorityCallers]byte,int,uint32,error){
 a.mu.Lock();defer a.mu.Unlock()
 if a.lock==nil||a.poisoned{return [authorityCallers]byte{},0,0,ErrStore}
 return a.spent,int(a.spent[0])+int(a.spent[1]),a.receiver.Count(),nil
}
func (a *SharedAuthority) replayCandidate()(*Receiver,error){
 r,e:=NewReceiver(a.ctx,a.approver,a.signer,a.limit);if e!=nil{return nil,e}
 for _,req:=range a.requests{if _,e=r.Commit(req);e!=nil{return nil,ErrStore}}
 return r,nil
}
func (a *SharedAuthority) signResponse(req AuthorityRequest,outcome byte,stale bool,before,after Digest,receipt Receipt)AuthorityResponse{
 total:=a.spent[0]+a.spent[1]
 r:=AuthorityResponse{Caller:req.Caller,Op:req.Op,Outcome:outcome,CallerSpent:a.spent[req.Caller],TotalSpent:total,RequestHash:req.Hash(),Before:before,After:after,Receipt:receipt}
 if stale{r.Stale=1}
 copy(r.Signature[:],ed25519.Sign(a.signer,r.message()))
 return r
}
type authorityPlan struct {
 before Digest
 after Digest
 nextSpent [authorityCallers]byte
 nextRequests []Request
 candidate *Receiver
 outcome byte
 stale bool
 receipt Receipt
 persist bool
}

func (a *SharedAuthority) planLocked(req AuthorityRequest)(authorityPlan,error){
 if req.Caller>=authorityCallers||(req.Op!=AuthorityCommit&&req.Op!=AuthorityStatus)||!a.receiver.admit(req.Action)||
  !ed25519.Verify(a.callers[req.Caller],req.message(),req.Signature[:]){return authorityPlan{},ErrAuthorityAuth}
 before:=a.headLocked()
 if a.spent[req.Caller]>=authorityPerCallerContacts||int(a.spent[0])+int(a.spent[1])>=authorityTotalContacts{
  return authorityPlan{before:before,after:before,outcome:AuthorityBudget,stale:req.Expected!=before},nil
 }
 candidate,e:=a.replayCandidate();if e!=nil{return authorityPlan{},e}
 nextSpent:=a.spent;nextSpent[req.Caller]++
 nextRequests:=append([]Request(nil),a.requests...)
 stale:=req.Expected!=before
 outcome:=AuthorityAbsent
 var receipt Receipt
 if req.Op==AuthorityCommit{
  if stale{outcome=AuthorityConflict}else{
   prior:=candidate.Count()
   receipt,e=candidate.Commit(req.Action)
   if e==nil{
    outcome=AuthorityCommitted
    if candidate.Count()>prior{nextRequests=append(nextRequests,req.Action)}
   }else if errors.Is(e,ErrConflict)||errors.Is(e,ErrOccupied)||errors.Is(e,ErrBudget){
    outcome=AuthorityConflict;e=nil
   }
  }
 }else{
  receipt,e=candidate.Status(req.Action)
  if e==nil{outcome=AuthorityCommitted}else if errors.Is(e,ErrAbsent){outcome=AuthorityAbsent;e=nil}
 }
 if e!=nil{return authorityPlan{},e}
 after:=sha256.Sum256(a.stateBody(nextSpent,nextRequests))
 return authorityPlan{
  before:before,after:after,nextSpent:nextSpent,nextRequests:nextRequests,candidate:candidate,
  outcome:outcome,stale:stale,receipt:receipt,persist:true,
 },nil
}

func (a *SharedAuthority) applyPlanLocked(req AuthorityRequest,p authorityPlan)(AuthorityResponse,error){
 if !p.persist{return a.signResponse(req,p.outcome,p.stale,p.before,p.after,p.receipt),nil}
 if a.headLocked()!=p.before{return AuthorityResponse{},ErrHeadConflict}
 if e:=a.persist(p.nextSpent,p.nextRequests);e!=nil{
  a.poisoned=true;return AuthorityResponse{},ErrUnknown
 }
 a.spent=p.nextSpent;a.requests=p.nextRequests;a.receiver=p.candidate
 if a.headLocked()!=p.after{
  a.poisoned=true;return AuthorityResponse{},ErrStore
 }
 return a.signResponse(req,p.outcome,p.stale,p.before,p.after,p.receipt),nil
}

func (a *SharedAuthority) Process(req AuthorityRequest)(AuthorityResponse,error){
 a.mu.Lock();defer a.mu.Unlock()
 if a.lock==nil||a.poisoned{return AuthorityResponse{},ErrStore}
 p,e:=a.planLocked(req);if e!=nil{return AuthorityResponse{},e}
 return a.applyPlanLocked(req,p)
}
func (a *SharedAuthority) Close()error{
 a.mu.Lock();defer a.mu.Unlock()
 if a.lock==nil{return nil}
 e:=a.lock.Close();a.lock=nil;return e
}
func (a *SharedAuthority) ServeHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 if r.Method!=http.MethodPost||r.URL.Path!="/authority"||r.URL.RawQuery!=""||r.Header.Get("Content-Type")!=media{
  w.WriteHeader(http.StatusBadRequest);return
 }
 defer r.Body.Close()
 raw,e:=io.ReadAll(io.LimitReader(r.Body,authorityRequestSize+1));if e!=nil||len(raw)!=authorityRequestSize{w.WriteHeader(http.StatusBadRequest);return}
 req,e:=ParseAuthorityRequest(raw);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 resp,e:=a.Process(req)
 if e!=nil{
  if errors.Is(e,ErrAuthorityAuth){w.WriteHeader(http.StatusForbidden)}else{w.WriteHeader(http.StatusInternalServerError)}
  return
 }
 w.Header().Set("Content-Type",media);w.Write(resp.Bytes())
}

type AuthorityClient struct {
 mu sync.Mutex
 origin string
 caller byte
 key ed25519.PrivateKey
 authority ed25519.PublicKey
 action Request
 head Digest
 transport *http.Client
 contacts int
}
func NewAuthorityClient(origin string,caller byte,key ed25519.PrivateKey,authority ed25519.PublicKey,action Request,head Digest)(*AuthorityClient,error){
 u,e:=url.Parse(origin)
 if e!=nil||u.Scheme!="http"||u.User!=nil||u.Path!=""||u.RawQuery!=""||u.Fragment!=""||u.Opaque!=""||u.Port()==""||u.Host==""{return nil,ErrPolicy}
 ip:=net.ParseIP(u.Hostname())
 if ip==nil||!ip.IsLoopback()||origin!="http://"+u.Host||caller>=authorityCallers||len(key)!=ed25519.PrivateKeySize||len(authority)!=ed25519.PublicKeySize||action.Key==(Key{})||head==(Digest{}){return nil,ErrPolicy}
 t:=&http.Transport{Proxy:nil,DialContext:(&net.Dialer{Timeout:time.Second}).DialContext,DisableKeepAlives:true}
 h:=&http.Client{Transport:t,Timeout:2*time.Second,CheckRedirect:func(*http.Request,[]*http.Request)error{return http.ErrUseLastResponse}}
 return &AuthorityClient{origin:origin,caller:caller,key:append(ed25519.PrivateKey(nil),key...),authority:append(ed25519.PublicKey(nil),authority...),action:action,head:head,transport:h},nil
}
func (c *AuthorityClient) Head()Digest{c.mu.Lock();defer c.mu.Unlock();return c.head}
func (c *AuthorityClient) Contacts()int{c.mu.Lock();defer c.mu.Unlock();return c.contacts}
func (c *AuthorityClient) exchange(op byte)(Receipt,AuthorityResponse,error){
 req,e:=SignAuthorityRequest(c.caller,op,c.head,c.action,c.key);if e!=nil{return Receipt{},AuthorityResponse{},e}
 c.contacts++
 h,e:=http.NewRequest(http.MethodPost,c.origin+"/authority",bytes.NewReader(req.Bytes()));if e!=nil{return Receipt{},AuthorityResponse{},ErrUnknown}
 h.GetBody=nil;h.Header.Set("Content-Type",media)
 res,e:=c.transport.Do(h);if e!=nil{return Receipt{},AuthorityResponse{},ErrUnknown}
 defer res.Body.Close()
 if res.StatusCode==http.StatusForbidden{return Receipt{},AuthorityResponse{},ErrAuthorityAuth}
 if res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media{return Receipt{},AuthorityResponse{},ErrUnknown}
 raw,e:=io.ReadAll(io.LimitReader(res.Body,authorityResponseSize+1));if e!=nil{return Receipt{},AuthorityResponse{},ErrUnknown}
 response,e:=ParseAuthorityResponse(raw)
 if e!=nil||!VerifyAuthorityResponse(response,req,c.authority){return Receipt{},AuthorityResponse{},ErrUnknown}
 c.head=response.After
 switch response.Outcome{
 case AuthorityCommitted:return response.Receipt,response,nil
 case AuthorityAbsent:return Receipt{},response,ErrAbsent
 case AuthorityConflict:return Receipt{},response,ErrHeadConflict
 case AuthorityBudget:return Receipt{},response,ErrContacts
 default:return Receipt{},response,ErrUnknown
 }
}
func (c *AuthorityClient) Commit()(Receipt,AuthorityResponse,error){c.mu.Lock();defer c.mu.Unlock();return c.exchange(AuthorityCommit)}
func (c *AuthorityClient) Status()(Receipt,AuthorityResponse,error){c.mu.Lock();defer c.mu.Unlock();return c.exchange(AuthorityStatus)}
