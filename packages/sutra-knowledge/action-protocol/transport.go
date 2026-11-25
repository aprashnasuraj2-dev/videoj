package actionprotocol

// Loopback-only transport for the synthetic interoperability laboratory.
// It does NOT add an external write capability to SUTRA's browser runtime.

import (
 "bytes"
 "crypto/ed25519"
 "errors"
 "fmt"
 "io"
 "net"
 "net/http"
 "net/url"
 "sync"
 "time"
)
const media="application/octet-stream"
const maxContacts=4
var ErrUnknown=errors.New("outcome unknown; reconcile status, do not assume failure")
var ErrContacts=errors.New("contact budget exhausted")

func (s *Receiver) ServeHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 if r.Method!=http.MethodPost||r.URL.RawQuery!=""||
 (r.URL.Path!="/commit"&&r.URL.Path!="/status")||r.Header.Get("Content-Type")!=media{
  w.WriteHeader(http.StatusBadRequest);return
 }
 defer r.Body.Close()
 b,e:=io.ReadAll(io.LimitReader(r.Body,requestSize+1))
 if e!=nil||len(b)!=requestSize{w.WriteHeader(http.StatusBadRequest);return}
 request,e:=ParseRequest(b);if e!=nil{w.WriteHeader(http.StatusBadRequest);return}
 var receipt Receipt
 if r.URL.Path=="/commit"{receipt,e=s.Commit(request)}else{receipt,e=s.Status(request)}
 if e!=nil{
  switch e{
  case ErrAbsent:w.WriteHeader(http.StatusNotFound)
  case ErrPolicy:w.WriteHeader(http.StatusForbidden)
  case ErrConflict,ErrOccupied:w.WriteHeader(http.StatusConflict)
  case ErrBudget:w.WriteHeader(http.StatusTooManyRequests)
  default:w.WriteHeader(http.StatusInternalServerError)
  }
  return
 }
 w.Header().Set("Content-Type",media);w.Write(receipt.Bytes())
}

type State string
const (
 Proposed State="proposed"
 Dispatched State="dispatched"
 Unknown State="unknown"
 Committed State="committed"
)

// One approved action, bounded contact count and no automatic retries.
// Unknown is deliberately sticky even when a status read returns absence:
// a previously dispatched request could still be in flight.
type Client struct {
 mu sync.Mutex
 origin string
 approval Request
 receiver ed25519.PublicKey
 transport *http.Client
 state State
 contacts int
 receipt Receipt
}
func NewClient(origin,manifest,session string,r Request,receiver ed25519.PublicKey)(*Client,error){
 u,e:=url.Parse(origin)
 if e!=nil||u.Scheme!="http"||u.User!=nil||u.Path!=""||u.RawQuery!=""||u.Fragment!=""||u.Opaque!=""||u.Port()==""||u.Host==""{return nil,ErrPolicy}
 ip:=net.ParseIP(u.Hostname())
 if ip==nil||!ip.IsLoopback()||origin!="http://"+u.Host{return nil,ErrPolicy}
 ctx,e:=Context(origin,manifest,session)
 if e!=nil||ctx!=r.Context||len(receiver)!=ed25519.PublicKeySize||r.Slot>=maxSlots||r.Key==(Key{}){return nil,ErrPolicy}
 // No proxy, cookies, or redirects. Caller must provision the exact receiver
 // origin and public key; HTTP loopback is not production transport identity.
 t:=&http.Transport{Proxy:nil,DialContext:(&net.Dialer{Timeout:time.Second}).DialContext,DisableKeepAlives:true}
 h:=&http.Client{Transport:t,Timeout:2*time.Second,CheckRedirect:func(*http.Request,[]*http.Request)error{return http.ErrUseLastResponse}}
 return &Client{origin:origin,approval:r,receiver:append(ed25519.PublicKey(nil),receiver...),transport:h,state:Proposed},nil
}
func (c *Client) State()State{c.mu.Lock();defer c.mu.Unlock();return c.state}
func (c *Client) Contacts()int{c.mu.Lock();defer c.mu.Unlock();return c.contacts}
func (c *Client) exchange(path string)(Receipt,error){
 if c.contacts>=maxContacts{return Receipt{},ErrContacts}
 c.contacts++
 // bytes.NewReader gives net/http a replayable body. Clear GetBody so
 // automatic replay cannot occur; no Idempotency-Key HTTP header either.
 req,e:=http.NewRequest(http.MethodPost,c.origin+path,bytes.NewReader(c.approval.Bytes()))
 if e!=nil{return Receipt{},ErrUnknown}
 req.GetBody=nil;req.Header.Set("Content-Type",media)
 res,e:=c.transport.Do(req);if e!=nil{return Receipt{},ErrUnknown}
 defer res.Body.Close()
 if res.StatusCode==http.StatusNotFound&&path=="/status"{return Receipt{},ErrAbsent}
 if res.StatusCode!=http.StatusOK||res.Header.Get("Content-Type")!=media{return Receipt{},fmt.Errorf("%w: response status %d",ErrUnknown,res.StatusCode)}
 b,e:=io.ReadAll(io.LimitReader(res.Body,receiptSize+1))
 if e!=nil{return Receipt{},ErrUnknown}
 r,e:=ParseReceipt(b)
 if e!=nil||!Verify(r,c.approval,c.receiver){return Receipt{},ErrUnknown}
 return r,nil
}
func (c *Client) Dispatch()(Receipt,error){
 c.mu.Lock();defer c.mu.Unlock()
 if c.state==Committed{return c.receipt,nil}
 if c.state!=Proposed{return Receipt{},ErrUnknown}
 c.state=Dispatched
 r,e:=c.exchange("/commit")
 if e!=nil{c.state=Unknown;return Receipt{},e}
 c.state=Committed;c.receipt=r;return r,nil
}
func (c *Client) Reconcile()(Receipt,error){
 c.mu.Lock();defer c.mu.Unlock()
 if c.state==Committed{return c.receipt,nil}
 if c.state!=Unknown{return Receipt{},ErrPolicy}
 r,e:=c.exchange("/status")
 if e!=nil{return Receipt{},e}
 c.state=Committed;c.receipt=r;return r,nil
}
// Explicit caller-controlled retry after unknown status. Same signed bytes,
// never a new key; safe ONLY for this receiver's atomic deduplication contract.
func (c *Client) RetrySameApproval()(Receipt,error){
 c.mu.Lock();defer c.mu.Unlock()
 if c.state==Committed{return c.receipt,nil}
 if c.state!=Unknown{return Receipt{},ErrPolicy}
 r,e:=c.exchange("/commit")
 if e!=nil{return Receipt{},e}
 c.state=Committed;c.receipt=r;return r,nil
}
