#!/usr/bin/env python3
"""Negative controls for the concrete pinned policy refinement checker."""
import copy,json,sys
from refine_pinned_policy_trace import verify,RefinementError

def reject(name,data):
    try: verify(data)
    except RefinementError: return name
    raise SystemExit("mutant unexpectedly accepted: "+name)

def scenario(data,name):
    return next(s for s in data["scenarios"] if s["name"]==name)

def main(path):
    with open(path,"r",encoding="utf-8") as f: base=json.load(f)
    verify(base)
    cases=[]
    m=copy.deepcopy(base);scenario(m,"revoked")["events"][1]["upstreamEffects"]=1;cases.append(("revoked-effect",m))
    m=copy.deepcopy(base);scenario(m,"expired")["events"][1]["admitted"]=True;cases.append(("expired-admission",m))
    m=copy.deepcopy(base);scenario(m,"alternate-pin")["events"][1]["admitted"]=True;cases.append(("alternate-pin-admission",m))
    m=copy.deepcopy(base);scenario(m,"alternate-pin")["events"][1]["upstreamEffects"]=1;cases.append(("alternate-pin-effect",m))
    m=copy.deepcopy(base);scenario(m,"active")["events"][1]["upstreamEffects"]=0;cases.append(("active-lost-effect",m))
    m=copy.deepcopy(base);scenario(m,"active")["events"][1]["pinMember"]=False;cases.append(("active-unpinned-effect",m))
    m=copy.deepcopy(base);scenario(m,"revoked-reconcile")["events"][3]["admitted"]=False;cases.append(("unadmitted-reconcile",m))
    m=copy.deepcopy(base);scenario(m,"revoked-reconcile")["events"][4]["upstreamEffects"]=2;cases.append(("post-revoke-duplicate",m))
    m=copy.deepcopy(base);scenario(m,"never-admitted-recovery")["events"][1]["reconciled"]=True;cases.append(("never-admitted-reconcile",m))
    m=copy.deepcopy(base);scenario(m,"alternate-pin")["events"][1]["policySequence"]+=1;cases.append(("rejected-pin-policy-mutation",m))
    rejected=[reject(name,m) for name,m in cases]
    print(json.dumps({"mutants":len(rejected),"rejected":rejected},indent=2))

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("usage: refine_pinned_policy_trace_mutants.py TRACE.json")
    main(sys.argv[1])
