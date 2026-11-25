package main

// Independent replay of the fixed synthetic binary conflict lesson. The
// case is supplied separately; source records, events and support families
// are re-derived without Rust, JS, Python, or a reported survivor set.
// Deliberately NOT a general exact graph interpreter or third-party certification.
import (
 "bytes"
 "encoding/json"
 "fmt"
 "io"
 "reflect"
 "sort"
)

type lessonCase struct {
 Version int
 Scope string
 Worlds []struct{ID string}
 Sources []struct{ID,Version,Digest,Lineage string}
 Offers []struct{ID,NodeID,SourceID string}
}
type lessonRead struct {
 Type string
 ObservationID string
 SourceText string
 SourceID string
 Lineage string
}
type lessonSource struct {
 Version int
 SourceID,SourceVersion,Scope string
 Values map[string]struct{Value string;Dimension []int}
}
type row struct{ID string;Mask uint32}
type supportWorld struct{ID,Decision string}
func lessonMasks(caseBytes []byte,events []json.RawMessage)([]row,error){
 var c lessonCase
 if json.Unmarshal(caseBytes,&c)!=nil||c.Version!=1||c.Scope!="synthetic_binary_models"||
 len(c.Worlds)!=4||len(c.Sources)!=4||len(c.Offers)!=4{return nil,refused}
 for i,w:=range c.Worlds{if w.ID!=fmt.Sprintf("w%d%d",i/2,i%2){return nil,refused}}
 // The case file has already been selected by the verifier, not supplied
 // by the report. This fixed-profile decoder intentionally refuses other worlds.
 active:=map[string]row{}
 blockedSources:=map[string]bool{}
 blockedLineages:=map[string]bool{}
 sourceIndex:=map[string]int{}
 offerIndex:=map[string]int{}
 for i,s:=range c.Sources{sourceIndex[s.ID]=i}
 for i,o:=range c.Offers{offerIndex[o.ID]=i}
 available:=func(sourceID string)bool{
  i,ok:=sourceIndex[sourceID];return ok&&!blockedSources[sourceID]&&!blockedLineages[c.Sources[i].Lineage]
 }
 for _,raw:=range events{
  var e lessonRead
  if json.Unmarshal(raw,&e)!=nil{return nil,refused}
  switch e.Type {
  case "read":
   if _,err:=exactFields(raw,"type","observationId","sourceText");err!=nil{return nil,err}
   j,ok:=offerIndex[e.ObservationID];if !ok||!available(c.Offers[j].SourceID){return nil,refused}
   if _,ok=active[e.ObservationID];ok{return nil,refused}
   o:=c.Offers[j];s:=c.Sources[sourceIndex[o.SourceID]]
   src:=[]byte(e.SourceText)
   if strictJSON(src,65536)!=nil||"sha256:"+sum(src).String()!=s.Digest{return nil,refused}
   var record lessonSource
   if _,err:=exactFields(src,"version","sourceId","sourceVersion","scope","values");err!=nil{return nil,err}
   if json.Unmarshal(src,&record)!=nil||record.Version!=1||record.SourceID!=s.ID||
    record.SourceVersion!=s.Version||record.Scope!=c.Scope{return nil,refused}
   v,ok:=record.Values[o.NodeID]
   if !ok||!reflect.DeepEqual(v.Dimension,[]int{0,0,0})||(v.Value!="0/1"&&v.Value!="1/1"){return nil,refused}
   var mask uint32
   for i:=0;i<4;i++{
    var bit int
    switch o.NodeID{case "a":bit=i/2;case "b":bit=i%2;default:return nil,refused}
    if v.Value==fmt.Sprintf("%d/1",bit){mask|=1<<i}
   }
   active[o.ID]=row{o.ID,mask}
  case "withdraw_source","restore_source","withdraw_lineage","restore_lineage":
   isSource:=e.Type=="withdraw_source"||e.Type=="restore_source"
   var field,key string;var blocked map[string]bool
   if isSource{field,key,blocked="sourceId",e.SourceID,blockedSources
    if _,ok:=sourceIndex[key];!ok{return nil,refused}
   }else{field,key,blocked="lineage",e.Lineage,blockedLineages
    found:=false;for _,s:=range c.Sources{found=found||s.Lineage==key};if !found{return nil,refused}
   }
   if _,err:=exactFields(raw,"type",field);err!=nil{return nil,err}
   withdrawing:=e.Type=="withdraw_source"||e.Type=="withdraw_lineage"
   if withdrawing==blocked[key]{return nil,refused}
   blocked[key]=withdrawing
   for id:=range active{if !available(c.Offers[offerIndex[id]].SourceID){delete(active,id)}}
  default:return nil,refused
  }
 }
 rows:=make([]row,0,len(active))
 for _,r:=range active{rows=append(rows,r)}
 sort.Slice(rows,func(i,j int)bool{return rows[i].ID<rows[j].ID})
 return rows,nil
}
func supportOracle(rows []row)(map[string]any,map[string]any){
 // Independent direct world membership and proper-subset tests. No Rust
 // bitset closure, no reported verdicts. World 3 is the only refuted world.
 worldNames:=[]string{"w00","w01","w10","w11"}
 worlds:=make([]map[string]any,0,4)
 for i,id:=range worldNames{
  decision:="constraint_satisfied";if i==3{decision="constraint_refuted"}
  worlds=append(worlds,map[string]any{"id":id,"decision":decision})
 }
 observations:=make([]map[string]any,0,len(rows))
 for _,r:=range rows{observations=append(observations,map[string]any{"id":r.ID,"mask":r.Mask})}
 projection:=map[string]any{"version":1,"worlds":worlds,"observations":observations}
 surviving:=func(subset int)[]string{
  alive:=[]string{}
  for w,id:=range worldNames{
   compatible:=true
   for j,r:=range rows{if subset&(1<<j)!=0&&r.Mask&(1<<w)==0{compatible=false;break}}
   if compatible{alive=append(alive,id)}
  }
  return alive
 }
 classify:=func(subset int)string{
  alive:=surviving(subset);if len(alive)==0{return "conflict"}
  if len(alive)==1&&alive[0]=="w11"{return "refuted"}
  for _,w:=range alive{if w=="w11"{return "ambiguous"}}
  return "satisfied"
 }
 family:=map[string][][]string{"conflict":{},"satisfied":{},"refuted":{}}
 total:=1<<len(rows);var minimum any
 count:=func(s int)int{n:=0;for s!=0{s&=s-1;n++};return n}
 for size:=0;size<=len(rows);size++{
  for subset:=0;subset<total;subset++{
   if count(subset)!=size{continue}
   kind:=classify(subset)
   if _,ok:=family[kind];!ok{continue}
   if kind=="conflict"&&minimum==nil{minimum=size}
   minimal:=true
   for p:=0;p<subset;p++{if p&subset==p&&classify(p)==kind{minimal=false;break}}
   if !minimal{continue}
   ids:=[]string{};for j,r:=range rows{if subset&(1<<j)!=0{ids=append(ids,r.ID)}}
   family[kind]=append(family[kind],ids)
  }
 }
 analysis:=map[string]any{"version":1,"engine":"rust-wasm-support/v1","current":classify(total-1),
  "survivingWorlds":surviving(total-1),"complete":true,"subsetsEvaluated":total,"subsetsTotal":total,
  "minimumConflictSize":minimum,"allMinimumConflictsComplete":true,"conflicts":family["conflict"],
  "satisfiedSupports":family["satisfied"],"refutedSupports":family["refuted"],
  "qualification":"Conditional finite-model support only; inconsistent evidence cannot authorize a conclusion. Declared lineage does not establish independence."}
 return projection,analysis
}
func exactJSONEqual(raw []byte,expected any)bool{
 // Strict JSON has already checked duplicates. Unmarshal both sides to
 // compare types and values without depending on object field order.
 var got,want any
 encoded,e:=json.Marshal(expected)
 if e!=nil||json.Unmarshal(raw,&got)!=nil||json.Unmarshal(encoded,&want)!=nil{return false}
 return reflect.DeepEqual(got,want)
}
func verifySupportBundle(raw,caseBytes []byte)error{
 if strictJSON(raw,maxExport)!=nil||strictJSON(caseBytes,maxCase)!=nil{return refused}
 m,e:=exactFields(raw,"version","caseText","events","projection","analysis");if e!=nil{return e}
 var version int;var caseText string;var events []json.RawMessage
 if json.Unmarshal(m["version"],&version)!=nil||version!=1||
 json.Unmarshal(m["caseText"],&caseText)!=nil||!bytes.Equal([]byte(caseText),caseBytes)||
 json.Unmarshal(m["events"],&events)!=nil||events==nil||len(events)>maxEvents{return refused}
 rows,e:=lessonMasks(caseBytes,events);if e!=nil{return e}
 projection,analysis:=supportOracle(rows)
 if !exactJSONEqual(m["projection"],projection)||!exactJSONEqual(m["analysis"],analysis){return refused}
 return nil
}
func verifySupportFiles(args []string,out io.Writer)error{
 if len(args)!=7{return fmt.Errorf("usage: verify-support trusted-case.json support1.json evidence1.json support2.json evidence2.json support3.json evidence3.json")}
 caseBytes,e:=readBounded(args[0],maxCase);if e!=nil{return e}
 for i:=0;i<3;i++{
  p:=args[1+2*i]
  raw,e:=readBounded(p,maxExport);if e!=nil{return e}
  base,e:=readBounded(args[2+2*i],maxExport);if e!=nil{return e}
  snapshot,e:=parseExport(base);if e!=nil||snapshot.caseDigest!=sum(caseBytes){return refused}
  if e=verifySupportBundle(raw,caseBytes);e!=nil{return fmt.Errorf("%s: %w",p,e)}
  m,_:=exactFields(raw,"version","caseText","events","projection","analysis")
  b,e:=exactFields(base,"version","caseText","events","result");if e!=nil||!bytes.Equal(m["events"],b["events"]){return refused}
  var analysis map[string]any
  if json.Unmarshal(m["analysis"],&analysis)!=nil||analysis["current"]!=[]string{"conflict","ambiguous","refuted"}[i]{return refused}
  // Alter independently checked results while retaining valid JSON/case.
  var bundle map[string]any
  if json.Unmarshal(raw,&bundle)!=nil{return refused}
  for _,field:=range []string{"current","survivingWorlds","conflicts","satisfiedSupports","refutedSupports","complete"}{
   modified:=map[string]any{};for k,v:=range analysis{modified[k]=v};modified[field]=nil
   bundle["analysis"]=modified
   bad,_:=json.Marshal(bundle);if verifySupportBundle(bad,caseBytes)==nil{return fmt.Errorf("mutation accepted: %s",field)}
  }
  bundle["analysis"]=analysis
  bundle["caseText"]=string(caseBytes)+" "
  bad,_:=json.Marshal(bundle);if verifySupportBundle(bad,caseBytes)==nil{return refused}
  bundle["caseText"]=string(caseBytes)
  bundle["projection"]=nil
  bad,_=json.Marshal(bundle);if verifySupportBundle(bad,caseBytes)==nil{return refused}
  fmt.Fprintf(out,"ACCEPTED %s against matching evidence history; rejected 8 altered reports\n",p)
 }
 return nil
}
