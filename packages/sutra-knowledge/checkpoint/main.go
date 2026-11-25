// SUTRA signed history checkpoint. This authenticates an observed prefix,
// not factual truth, completeness before first observation, or wall-clock time.
// No third-party modules or network. The witness key must be separate from the producer.
package main

import (
 "bytes"
 "crypto/ed25519"
 "crypto/rand"
 "crypto/sha256"
 "encoding/binary"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "os"
 "regexp"
 "strconv"
 "unicode/utf8"
)

const maxExport = 2 << 20
const maxCase = 262144
const maxEvents = 24
var identifier = regexp.MustCompile("^[A-Za-z][A-Za-z0-9_-]{0,63}$")
var refused = errors.New("checkpoint refused")
type Digest [32]byte

// JSON arrays for digests/signature are avoided in the portable CLI report.
func (d Digest) String() string { return hex.EncodeToString(d[:]) }
func sum(b []byte) Digest { return sha256.Sum256(b) }

type Export struct {
 Version int
 CaseText string
 Events []json.RawMessage
 Result json.RawMessage
}
type Snapshot struct {
 caseDigest Digest
 eventDigests []Digest
 eventHead Digest
 exportDigest Digest
}
type Checkpoint struct {
 Session string
 Sequence uint32
 Count uint32
 CaseDigest Digest
 Head Digest
 ExportDigest Digest
 Previous Digest
 Signature [ed25519.SignatureSize]byte
}
// Anchor must be held separately from an untrusted export/checkpoint pair.
// Latest is an exact expected checkpoint ID, not a value obtained from the peer.
type Anchor struct {
 Session string
 CaseDigest Digest
 Key ed25519.PublicKey
 Latest Digest
}

// Reject ambiguous JSON before decoding. Go otherwise accepts duplicate keys
// and silently replaces isolated surrogate escapes with U+FFFD.
func scalarStrings(b []byte) bool {
 in := false
 for i:=0;i<len(b);i++ {
  if b[i]=='"' { in=!in; continue }
  if !in || b[i]!='\\' { continue }
  i++
  if i>=len(b) { return false }
  if b[i]!='u' { continue }
  if i+4>=len(b) { return false }
  n,err:=strconv.ParseUint(string(b[i+1:i+5]),16,16)
  if err!=nil { return false }
  i+=4
  if n>=0xDC00 && n<=0xDFFF { return false }
  if n>=0xD800 && n<=0xDBFF {
   if i+6>=len(b) || b[i+1]!='\\' || b[i+2]!='u' { return false }
   low,e:=strconv.ParseUint(string(b[i+3:i+7]),16,16)
   if e!=nil || low<0xDC00 || low>0xDFFF { return false }
   i+=6
  }
 }
 return !in
}
func strictJSON(b []byte,limit int) error {
 if len(b)==0 || len(b)>limit || !utf8.Valid(b) || !json.Valid(b) || !scalarStrings(b) { return refused }
 d:=json.NewDecoder(bytes.NewReader(b));d.UseNumber()
 var walk func(int) error
 walk=func(depth int) error {
  if depth>64 { return refused }
  t,e:=d.Token();if e!=nil {return e}
  switch t {
  case json.Delim('{'):
   seen:=map[string]bool{}
   for d.More() {
    k,e:=d.Token();if e!=nil{return e}
    s,ok:=k.(string);if !ok||seen[s]{return refused};seen[s]=true
    if e=walk(depth+1);e!=nil{return e}
   }
   end,e:=d.Token();if e!=nil||end!=json.Delim('}'){return refused}
  case json.Delim('['):
   for d.More(){if e=walk(depth+1);e!=nil{return e}}
   end,e:=d.Token();if e!=nil||end!=json.Delim(']'){return refused}
  }
  return nil
 }
 if e:=walk(0);e!=nil{return e}
 if _,e:=d.Token();e!=io.EOF{return refused}
 return nil
}
func parseExport(raw []byte) (Snapshot,error) {
 var s Snapshot
 if e:=strictJSON(raw,maxExport);e!=nil{return s,e}
 // Decode exact field names, not Go's case-insensitive struct matching.
 var m map[string]json.RawMessage
 if e:=json.Unmarshal(raw,&m);e!=nil||len(m)!=4{return s,refused}
 for _,k:=range []string{"version","caseText","events","result"} {if _,ok:=m[k];!ok{return s,refused}}
 var x Export
 if json.Unmarshal(m["version"],&x.Version)!=nil||x.Version!=1||
 json.Unmarshal(m["caseText"],&x.CaseText)!=nil||json.Unmarshal(m["events"],&x.Events)!=nil||
 x.Events==nil||len(x.Events)>maxEvents||len(m["result"])==0||m["result"][0]!='{' {return s,refused}
 if e:=strictJSON([]byte(x.CaseText),maxCase);e!=nil{return s,e}
 // Case must be an object, but semantic admission belongs to the separate replay engine.
 var c map[string]json.RawMessage
 if json.Unmarshal([]byte(x.CaseText),&c)!=nil||c==nil{return s,refused}
 s.caseDigest=sum([]byte(x.CaseText));s.exportDigest=sum(raw)
 s.eventHead=sum(append([]byte("SUTRA/event-root/v1\x00"),s.caseDigest[:]...))
 for _,event:=range x.Events {
  if len(event)==0||event[0]!='{'{return Snapshot{},refused}
  h:=sum(event);s.eventDigests=append(s.eventDigests,h)
  b:=append([]byte("SUTRA/event-link/v1\x00"),s.eventHead[:]...);b=append(b,h[:]...)
  s.eventHead=sum(b)
 }
 return s,nil
}
// Fixed, domain-separated binary wire; no JSON canonicalization dependency.
func (c Checkpoint) message() []byte {
 b:=append([]byte("SUTRA/checkpoint/v1\x00"),byte(len(c.Session)))
 b=append(b,c.Session...)
 b=binary.BigEndian.AppendUint32(b,c.Sequence)
 b=binary.BigEndian.AppendUint32(b,c.Count)
 for _,d:=range []Digest{c.CaseDigest,c.Head,c.ExportDigest,c.Previous}{b=append(b,d[:]...)}
 return b
}
func (c Checkpoint) ID() Digest {
 return sum(append(c.message(),c.Signature[:]...))
}
func validAnchor(a Anchor) bool {
 return identifier.MatchString(a.Session)&&len(a.Key)==ed25519.PublicKeySize
}
func verify(raw []byte,c Checkpoint,a Anchor) (Snapshot,error) {
 var zero Snapshot
 if !validAnchor(a)||c.Session!=a.Session||c.CaseDigest!=a.CaseDigest||c.Count>maxEvents||
 c.ID()!=a.Latest||!ed25519.Verify(a.Key,c.message(),c.Signature[:]) {return zero,refused}
 if (c.Sequence==0)!=(c.Previous==(Digest{})) {return zero,refused}
 s,e:=parseExport(raw)
 if e!=nil||s.caseDigest!=c.CaseDigest||s.exportDigest!=c.ExportDigest||
 s.eventHead!=c.Head||len(s.eventDigests)!=int(c.Count){return zero,refused}
 return s,nil
}
func sign(s Snapshot,session string,seq uint32,previous Digest,key ed25519.PrivateKey) Checkpoint {
 c:=Checkpoint{Session:session,Sequence:seq,Count:uint32(len(s.eventDigests)),CaseDigest:s.caseDigest,
 Head:s.eventHead,ExportDigest:s.exportDigest,Previous:previous}
 copy(c.Signature[:],ed25519.Sign(key,c.message()))
 return c
}
func signerMatches(a Anchor,key ed25519.PrivateKey) bool {
 return len(key)==ed25519.PrivateKeySize&&validAnchor(a)&&bytes.Equal(key.Public().(ed25519.PublicKey),a.Key)
}
func genesis(raw []byte,a Anchor,key ed25519.PrivateKey)(Checkpoint,error){
 if !signerMatches(a,key)||a.Latest!=(Digest{}){return Checkpoint{},refused}
 s,e:=parseExport(raw);if e!=nil||s.caseDigest!=a.CaseDigest{return Checkpoint{},refused}
 return sign(s,a.Session,0,Digest{},key),nil
}
// Advancement requires the exact externally pinned previous checkpoint and
// the old observed export. Never sign a rollback, rewrite, fork, or empty advance.
func advance(oldRaw,newRaw []byte,old Checkpoint,a Anchor,key ed25519.PrivateKey)(Checkpoint,error){
 if !signerMatches(a,key)||old.Sequence==^uint32(0){return Checkpoint{},refused}
 before,e:=verify(oldRaw,old,a);if e!=nil{return Checkpoint{},e}
 after,e:=parseExport(newRaw)
 if e!=nil||after.caseDigest!=a.CaseDigest||len(after.eventDigests)<=len(before.eventDigests){return Checkpoint{},refused}
 for i,h:=range before.eventDigests{if after.eventDigests[i]!=h{return Checkpoint{},refused}}
 return sign(after,a.Session,old.Sequence+1,old.ID(),key),nil
}
func readBounded(path string,limit int)([]byte,error){
 f,e:=os.Open(path);if e!=nil{return nil,e};defer f.Close()
 b,e:=io.ReadAll(io.LimitReader(f,int64(limit)+1));if e!=nil{return nil,e}
 if len(b)>limit{return nil,refused};return b,nil
}
type Receipt struct {
 Sequence uint32
 Count uint32
 CaseDigest string
 EventHead string
 ExportDigest string
 Previous string
 ID string
 Signature string
}
// Demo witnesses actual CI browser exports with an ephemeral key. There is no
// persistent third-party observer or externally published trust anchor yet.
func run(args []string,out io.Writer) error {
 if len(args)<3||len(args)>25{return errors.New("usage: go run main.go trusted-case.json export1.json export2.json [...]")}
 caseBytes,e:=readBounded(args[0],maxCase);if e!=nil{return e}
 if e=strictJSON(caseBytes,maxCase);e!=nil{return e}
 pub,key,e:=ed25519.GenerateKey(rand.Reader);if e!=nil{return e}
 a:=Anchor{Session:"synthetic_conflict_journey",CaseDigest:sum(caseBytes),Key:pub}
 var prev Checkpoint;var old []byte;receipts:=[]Receipt{}
 for i,p:=range args[1:]{
  raw,e:=readBounded(p,maxExport);if e!=nil{return e}
  var c Checkpoint
  if i==0{c,e=genesis(raw,a,key)}else{c,e=advance(old,raw,prev,a,key)}
  if e!=nil{return fmt.Errorf("%s: %w",p,e)}
  a.Latest=c.ID()
  if _,e=verify(raw,c,a);e!=nil{return e}
  receipts=append(receipts,Receipt{c.Sequence,c.Count,c.CaseDigest.String(),c.Head.String(),c.ExportDigest.String(),
    c.Previous.String(),c.ID().String(),hex.EncodeToString(c.Signature[:])})
  if i>0{
   if _,e=verify(old,prev,a);e==nil{return errors.New("stale checkpoint accepted")}
   if _,e=advance(raw,old,c,a,key);e==nil{return errors.New("rollback accepted")}
  }
  old,prev=raw,c
 }
 return json.NewEncoder(out).Encode(struct{
  Profile string
  Session string
  PublicKey string
  Latest string
  Receipts []Receipt
  Qualification string
 }{"sutra-checkpoint/v1",a.Session,hex.EncodeToString(pub),a.Latest.String(),receipts,
 "Ephemeral CI witness; observed byte-prefix integrity only. No truth, pre-genesis completeness, trusted time, external witness, or persistent freshness claim."})
}
// Verify a received checkpoint using separately obtained key, case and latest ID.
// The embedded key/ID are informational only. The exact export is mandatory.
func decodeDigest(s string)(Digest,error){
 var d Digest
 b,e:=hex.DecodeString(s);if e!=nil||len(b)!=len(d)||hex.EncodeToString(b)!=s{return d,refused}
 copy(d[:],b);return d,nil
}
func fromReceipt(session string,r Receipt)(Checkpoint,error){
 c:=Checkpoint{Session:session,Sequence:r.Sequence,Count:r.Count}
 fields:=[]struct{s string;d *Digest}{{r.CaseDigest,&c.CaseDigest},{r.EventHead,&c.Head},
 {r.ExportDigest,&c.ExportDigest},{r.Previous,&c.Previous}}
 for _,f:=range fields{d,e:=decodeDigest(f.s);if e!=nil{return Checkpoint{},e};*f.d=d}
 b,e:=hex.DecodeString(r.Signature);if e!=nil||len(b)!=len(c.Signature)||hex.EncodeToString(b)!=r.Signature{return Checkpoint{},refused}
 copy(c.Signature[:],b)
 if c.ID().String()!=r.ID{return Checkpoint{},refused}
 return c,nil
}
func verifyFile(args []string,out io.Writer)error{
 if len(args)!=6{return errors.New("usage: verify trusted-case.json session trusted-public-key-hex trusted-latest-id-hex receipt-report.json export.json")}
 caseBytes,e:=readBounded(args[0],maxCase);if e!=nil{return e}
 if e=strictJSON(caseBytes,maxCase);e!=nil{return e}
 key,e:=hex.DecodeString(args[2]);if e!=nil||len(key)!=ed25519.PublicKeySize{return refused}
 latest,e:=decodeDigest(args[3]);if e!=nil{return e}
 a:=Anchor{Session:args[1],CaseDigest:sum(caseBytes),Key:ed25519.PublicKey(key),Latest:latest}
 data,e:=readBounded(args[4],maxExport);if e!=nil{return e}
 if e=strictJSON(data,maxExport);e!=nil{return e}
 var report struct{
  Profile string
  Session string
  PublicKey string
  Latest string
  Receipts []Receipt
  Qualification string
 }
 d:=json.NewDecoder(bytes.NewReader(data));d.DisallowUnknownFields()
 if d.Decode(&report)!=nil||report.Profile!="sutra-checkpoint/v1"||report.Session!=a.Session||
 report.PublicKey!=hex.EncodeToString(a.Key)||report.Latest!=a.Latest.String()||
 len(report.Receipts)==0||len(report.Receipts)>maxEvents+1{return refused}
 // Verify signatures and linkage for the supplied checkpoints; only the last
 // export is available here, so previous raw event prefixes are not replayed.
 var previous Digest
 for i,r:=range report.Receipts{
  c,e:=fromReceipt(report.Session,r)
  if e!=nil||c.CaseDigest!=a.CaseDigest||c.Sequence!=uint32(i)||c.Previous!=previous||
  c.Count>maxEvents||(i>0&&c.Count<=report.Receipts[i-1].Count)||
  !ed25519.Verify(a.Key,c.message(),c.Signature[:]){return refused}
  previous=c.ID()
 }
 c,e:=fromReceipt(report.Session,report.Receipts[len(report.Receipts)-1]);if e!=nil{return e}
 raw,e:=readBounded(args[5],maxExport);if e!=nil{return e}
 if _,e=verify(raw,c,a);e!=nil{return e}
 _,e=fmt.Fprintln(out,"ACCEPTED exact externally anchored latest checkpoint",c.ID().String())
 return e
}
func main(){
 args:=os.Args[1:];var e error
 if len(args)>0&&args[0]=="verify"{e=verifyFile(args[1:],os.Stdout)}else{e=run(args,os.Stdout)}
 if e!=nil{fmt.Fprintln(os.Stderr,e);os.Exit(1)}
}
