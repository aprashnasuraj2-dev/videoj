package main

import (
 "bytes"
 "crypto/ed25519"
 "encoding/json"
 "strings"
 "os"
 "path/filepath"
 "testing"
)

func fixture(events ...string) []byte {
 return []byte("{\"version\":1,\"caseText\":\"{\\\"scope\\\":\\\"test\\\"}\",\"events\":["+strings.Join(events,",")+"],\"result\":{\"truthStatus\":\"unverified\"}}")
}
func testAnchor() (Anchor,ed25519.PrivateKey) {
 key:=ed25519.NewKeyFromSeed(bytes.Repeat([]byte{7},ed25519.SeedSize))
 return Anchor{Session:"test_session",CaseDigest:sum([]byte("{\"scope\":\"test\"}")),Key:key.Public().(ed25519.PublicKey)},key
}
const first = "{\"type\":\"read\",\"id\":\"one\"}"
const second = "{\"type\":\"withdraw\",\"id\":\"one\"}"
const third = "{\"type\":\"restore\",\"id\":\"one\"}"

func TestCheckpointAppendAndTamper(t *testing.T){
 a,key:=testAnchor()
 old:=fixture(first)
 c,e:=genesis(old,a,key);if e!=nil{t.Fatal(e)}
 a.Latest=c.ID()
 if _,e=verify(old,c,a);e!=nil{t.Fatal(e)}
 newer:=fixture(first,second,third)
 n,e:=advance(old,newer,c,a,key);if e!=nil{t.Fatal(e)}
 if n.Count!=3||n.Sequence!=1||n.Previous!=c.ID(){t.Fatal("incorrect chain")}
 a.Latest=n.ID()
 if _,e=verify(newer,n,a);e!=nil{t.Fatal(e)}
 bads:=[][]byte{fixture(first,third),fixture(first,third,second),fixture(first,second),
  bytes.Replace(newer,[]byte("unverified"),[]byte("verified"),1),
  bytes.Replace(newer,[]byte("test"),[]byte("fake"),1)}
 for _,bad:=range bads{if _,e=verify(bad,n,a);e==nil{t.Fatal("tampered export accepted")}}
 if _,e=verify(old,c,a);e==nil{t.Fatal("rollback accepted")}
 // A fully signed but different branch is not the pinned latest checkpoint.
 a0:=a;a0.Latest=c.ID()
 fork,e:=advance(old,fixture(first,third),c,a0,key);if e!=nil{t.Fatal(e)}
 if _,e=verify(fixture(first,third),fork,a);e==nil{t.Fatal("fork accepted")}
 wrong:=a;wrong.Key=ed25519.NewKeyFromSeed(bytes.Repeat([]byte{8},32)).Public().(ed25519.PublicKey)
 if _,e=verify(newer,n,wrong);e==nil{t.Fatal("wrong trust key accepted")}
 changed:=n;changed.Signature[0]^=1
 wrong=a;wrong.Latest=changed.ID()
 if _,e=verify(newer,changed,wrong);e==nil{t.Fatal("forged signature accepted")}
 for _,bad:=range [][]byte{old,fixture(second,third),fixture(first,second),newer}{
  if _,e=advance(newer,bad,n,a,key);e==nil{t.Fatal("non-append accepted")}
 }
}
func TestStrictWire(t *testing.T){
 valid:=fixture(first)
 if _,e:=parseExport(valid);e!=nil{t.Fatal(e)}
 bad:=[][]byte{
  []byte(strings.Replace(string(valid),"\"version\":1","\"version\":1,\"version\":1",1)),
  []byte(strings.Replace(string(valid),"\"version\":1","\"version\":1,\"\\u0076ersion\":1",1)),
  []byte(strings.Replace(string(valid),"\"version\":1","\"Version\":1",1)),
  []byte(strings.Replace(string(valid),"\"id\":\"one\"","\"id\":\"one\",\"id\":\"two\"",1)),
  []byte(strings.Replace(string(valid),"\"id\":\"one\"","\"id\":\"\\ud800\"",1)),
  []byte(strings.Replace(string(valid),"\"id\":\"one\"","\"id\":\"\\udc00\"",1)),
  []byte(strings.Replace(string(valid),"\"id\":\"one\"","\"id\":\"\\ud800\\u0041\"",1)),
  append(append([]byte{},valid...),[]byte("{}")...),
  fixture("null"),fixture("[]"),fixture("1"),
  []byte(strings.Replace(string(valid),"\"events\":[","\"events\":null,\"extra\":[",1)),
  []byte(strings.Replace(string(valid),"\"truthStatus\":\"unverified\"","\"x\":"+strings.Repeat("[",66)+"0"+strings.Repeat("]",66),1)),
 }
 for _,b:=range bad{if _,e:=parseExport(b);e==nil{t.Fatalf("ambiguous wire accepted: %.140s",b)}}
 good:=[]byte(strings.Replace(string(valid),"\"id\":\"one\"","\"id\":\"\\ud83d\\ude00\"",1))
 if _,e:=parseExport(good);e!=nil{t.Fatal("valid surrogate pair rejected",e)}
 events:=make([]string,25);for i:=range events{events[i]=first}
 if _,e:=parseExport(fixture(events...));e==nil{t.Fatal("event limit bypassed")}
 if _,e:=parseExport(bytes.Repeat([]byte(" "),maxExport+1));e==nil{t.Fatal("size limit bypassed")}
 // Parse valid nested case strings and reject decoded duplicate names inside.
 var x map[string]any
 if e:=json.Unmarshal(valid,&x);e!=nil{t.Fatal(e)}
 x["caseText"]="{\"scope\":\"test\",\"\\u0073cope\":\"test\"}"
 b,_:=json.Marshal(x);if _,e:=parseExport(b);e==nil{t.Fatal("nested case duplicate accepted")}
}
func TestGenesisAuthorityAndExactEventBytes(t *testing.T){
 a,key:=testAnchor()
 if _,e:=genesis(bytes.Replace(fixture(first),[]byte("test"),[]byte("fake"),1),a,key);e==nil{t.Fatal("untrusted case accepted")}
 c,e:=genesis(fixture(first),a,key);if e!=nil{t.Fatal(e)};a.Latest=c.ID()
 if _,e=genesis(fixture(first),a,key);e==nil{t.Fatal("second genesis accepted")}
 if _,e=advance(fixture(first),fixture("{ \"type\":\"read\",\"id\":\"one\"}",second),c,a,key);e==nil{t.Fatal("rewritten event bytes accepted")}
}

func TestPortableConsumer(t *testing.T){
 dir:=t.TempDir()
 write:=func(name string,b []byte)string{p:=filepath.Join(dir,name);if e:=os.WriteFile(p,b,0600);e!=nil{t.Fatal(e)};return p}
 casePath:=write("case.json",[]byte("{\"scope\":\"test\"}"))
 p1:=write("one.json",fixture(first))
 p2:=write("two.json",fixture(first,second))
 var report bytes.Buffer
 if e:=run([]string{casePath,p1,p2},&report);e!=nil{t.Fatal(e)}
 var m map[string]any
 if e:=json.Unmarshal(report.Bytes(),&m);e!=nil{t.Fatal(e)}
 pub,latest,session:=m["PublicKey"].(string),m["Latest"].(string),m["Session"].(string)
 path:=write("receipts.json",report.Bytes())
 args:=[]string{casePath,session,pub,latest,path,p2}
 var output bytes.Buffer
 if e:=verifyFile(args,&output);e!=nil{t.Fatal(e)}
 if !strings.HasPrefix(output.String(),"ACCEPTED"){t.Fatal(output.String())}
 for i,v:=range map[int]string{0:write("wrongcase.json",[]byte("{}")),1:"wrong_session",2:strings.Repeat("00",32),3:strings.Repeat("00",32),5:p1}{
  bad:=append([]string{},args...);bad[i]=v
  if e:=verifyFile(bad,&output);e==nil{t.Fatal("external anchor substitution accepted",i)}
 }
 for _,badReport:=range [][]byte{
  []byte(strings.Replace(report.String(),"\"Sequence\":0","\"Sequence\":null",1)),
  []byte(strings.Replace(report.String(),"\"Sequence\":0","\"sequence\":0",1)),
  []byte(strings.Replace(report.String(),"\"Count\":1","\"Count\":2",1)),
 }{
  bad:=append([]string{},args...);bad[4]=write("bad.json",badReport)
  if e:=verifyFile(bad,&output);e==nil{t.Fatal("malformed receipt accepted")}
 }
}
