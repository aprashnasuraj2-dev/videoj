#!/usr/bin/env python3
"""Independent replay of the bounded product fixture; not a truth or freshness proof."""
import json
import sys
from copy import deepcopy
from itertools import combinations, product
from pathlib import Path
from verify import canonical, keys
from verify_conflict import reconstruct, rawhash, require, bounded_load

VERSION="sutra-debugger-state/v1"
QUAL="Synthetic finite-model replay. Lineage is declared; unknown copying and shared measurement errors are not detected. Neither source truth nor independence is certified."
CLAIMS=("target","control_ok")
def compact(x):
    return json.dumps(x,ensure_ascii=False,separators=(",",":"))
def anchor():
    scope="debugger_binary_models"
    records=[("lab_a","a","0/1","sample_one","read_a",1),("lab_b","a","1/1","sample_two","read_b",1),("lab_c","b","1/1","sample_three","read_c",3),("lab_control","c","1/1","sample_control","read_control",2)]
    worlds,sources,offers,texts=[],[],[],{}
    for i,node,value,lineage,o,cost in records:
        t=compact(dict(version=1,sourceId=i,sourceVersion="v1",scope=scope,values={node:dict(value=value,dimension=[0,0,0])}))
        texts[o]=t
        sources.append(dict(id=i,version="v1",digest=rawhash(t),lineage=lineage))
        offers.append(dict(id=o,nodeId=node,sourceId=i,cost=cost,dimension=[0,0,0]))
    for a,b,c in product(range(2),repeat=3):
        nodes=[dict(id=i,kind="input",value=str(v),dimension=[0,0,0],basis="Synthetic binary assumption") for i,v in (("a",a),("b",b),("c",c),("one",1))]
        nodes += [dict(id="sum",kind="derive",op="add",args=["a","b"]),dict(id="target",kind="constraint",op="le",args=["sum","one"]),dict(id="control_ok",kind="constraint",op="eq",args=["c","one"])]
        worlds.append(dict(id=f"w{a}{b}{c}",graphText=compact(dict(schemaVersion=1,nodes=nodes)),constraintId="target"))
    model=dict(version=1,decisionId="sum_at_most_one",scope=scope,costUnit="synthetic_effort",worlds=worlds,sources=sources,offers=offers)
    copies={}
    for n in range(1,10):
        i=f"copy_{n:02d}"
        copies[i]=compact(dict(version=1,artifactId=i,derivedFrom="lab_a",sourceText=texts["read_a"]))
    return model,copies

def state(worlds,claim):
    if not worlds:return "CONFLICTED"
    values={(int(w[1])+int(w[2])<=1) if claim=="target" else int(w[3])==1 for w in worlds}
    return "SUPPORTED" if values=={True} else "REFUTED" if values=={False} else "UNDERDETERMINED"

def replay(events):
    model,copies=anchor()
    require(isinstance(events,list) and len(events)<=24)
    admitted=[];root_active=False;copies_active=False
    for e in events:
        require(isinstance(e,dict))
        t=e.get("type")
        if t=="add_copies":
            require(keys(e,("type","artifacts")) and root_active and not copies_active and isinstance(e["artifacts"],list) and len(e["artifacts"])==9)
            seen=set()
            for a in e["artifacts"]:
                require(keys(a,("id","text")) and a["id"] in copies and a["id"] not in seen and a["text"]==copies[a["id"]])
                seen.add(a["id"])
            copies_active=True
        else:
            require(t in ("read","withdraw_lineage","restore_lineage"))
            if t=="read" and e.get("observationId")=="read_a":root_active=True
            if t=="withdraw_lineage" and e.get("lineage")=="sample_one":root_active=copies_active=False
            admitted.append(e)
    report=reconstruct(compact(model),admitted)
    control_model={**model,"decisionId":"control_ok","worlds":[{**w,"constraintId":"control_ok"} for w in model["worlds"]]}
    control=reconstruct(compact(control_model),admitted)
    active=report["activeEvidence"]
    require(root_active==any(a["observationId"]=="read_a" for a in active))
    universe=[w["id"] for w in model["worlds"]]
    matches={a["observationId"]:{w for w in universe if int(w[{"a":1,"b":2,"c":3}[a["nodeId"]]])==int(a["value"].split("/")[0])} for a in active}
    def outcome(removed):
        surviving=sorted(set(universe).intersection(*(matches[a["observationId"]] for a in active if a["lineage"] not in removed)))
        return {k:dict(state=state(surviving,k),survivingWorlds=surviving) for k in CLAIMS}
    current=outcome(())
    require(current["target"]["survivingWorlds"]==report["survivingWorlds"]==control["survivingWorlds"])
    target=current["target"]["state"]
    roots=sorted({a["lineage"] for a in active});cuts=[]
    if target in ("SUPPORTED","REFUTED","CONFLICTED"):
        for n in range(1,len(roots)+1):
            for cut in combinations(roots,n):
                result=outcome(cut)
                if result["target"]["state"]!=target:cuts.append(dict(removed=list(cut),claims=result))
            if cuts:break
    kind="minimum_consistency_repairs" if target=="CONFLICTED" else "minimum_decision_changes" if target in ("SUPPORTED","REFUTED") else "not_applicable"
    artifacts=[dict(id=a["sourceId"],parent=None,lineage=a["lineage"],digest=a["sourceDigest"],observationId=a["observationId"]) for a in active]
    if copies_active:
        artifacts += [dict(id=i,parent="lab_a",lineage="sample_one",digest=rawhash(t),observationId="read_a") for i,t in copies.items()]
    artifacts.sort(key=lambda a:a["id"])
    groups={r:[a["id"] for a in artifacts if a["lineage"]==r] for r in roots}
    plan=(report["frontier"] or {}).get("plan") or {}
    next_obs=dict(id=plan["observationId"],cost=plan["cost"],worstCost=plan["worstCost"],bestCost=plan["bestCost"]) if plan.get("kind")=="observe" else None
    projection=dict(version=1,worlds=[dict(id=w["id"],decision=w["decision"]) for w in report["worlds"]],observations=[dict(id=i,mask=sum(1<<n for n,w in enumerate(universe) if w in m)) for i,m in sorted(matches.items())])
    return dict(version=VERSION,caseDigest=rawhash(compact(model)),historyDigest=rawhash(compact(events)),claims=current,diagnostics=dict(kind=kind,minimumCuts=cuts),activeArtifacts=artifacts,declaredRoots=len(roots),groups=groups,conflict=report.get("conflict"),nextObservation=next_obs,unavailableSources=report["unavailableSources"],report=report,controlReport=control,projection=projection,qualification=QUAL)

def verify(bundle):
    try:
        require(keys(bundle,("version","events","result")) and bundle["version"]==VERSION)
        return canonical(replay(bundle["events"]))==canonical(bundle["result"])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):
        return False

def main():
    expected=["SUPPORTED","UNDERDETERMINED","SUPPORTED","CONFLICTED","UNDERDETERMINED","REFUTED"]
    require(len(sys.argv)==len(expected)+1)
    for path,state_expected in zip(sys.argv[1:],expected):
        bundle=bounded_load(Path(path).read_text(encoding="utf-8"),262144,20)
        require(verify(bundle) and bundle["result"]["claims"]["target"]["state"]==state_expected)
        print("ACCEPTED",Path(path).name,state_expected)
        mutants=[]
        for field,value in (("declaredRoots",99),("historyDigest","sha256:"+"0"*64),("activeArtifacts",[]),("diagnostics",{}),("nextObservation",{"id":"forged"})):
            bad=deepcopy(bundle);bad["result"][field]=value;mutants.append(bad)
        bad=deepcopy(bundle);bad["events"][0]["sourceText"]+=" ";mutants.append(bad)
        if any(e["type"]=="add_copies" for e in bundle["events"]):
            bad=deepcopy(bundle);next(e for e in bad["events"] if e["type"]=="add_copies")["artifacts"][0]["text"]+=" ";mutants.append(bad)
        for bad in mutants:require(not verify(bad))
        print("REJECTED",len(mutants),"mutants")

if __name__=="__main__":main()
