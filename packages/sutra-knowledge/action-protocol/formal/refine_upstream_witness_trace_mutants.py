#!/usr/bin/env python3
"""Mutation controls for refine_upstream_witness_trace.py."""
import copy
import json
import sys
from refine_upstream_witness_trace import verify, RefinementError

def scenario(data,name):
    return next(s for s in data["scenarios"] if s["name"]==name)

def reject(name,data):
    try:
        verify(data)
    except RefinementError:
        return name
    raise SystemExit(f"mutant unexpectedly accepted: {name}")

def main(path):
    base=json.load(open(path,"r",encoding="utf-8"))
    verify(base)
    cases=[]

    m=copy.deepcopy(base);m["profile"]="SUTRA/upstream-witness-refinement/v0";cases.append(("profile",m))
    m=copy.deepcopy(base);scenario(m,"normal")["events"][1]["intent"]=False;cases.append(("prepare-without-intent",m))
    m=copy.deepcopy(base);scenario(m,"normal")["events"][2]["physicalEffects"]=0;cases.append(("apply-without-physical-effect",m))
    m=copy.deepcopy(base);scenario(m,"normal")["events"][3]["witnessVersion"]=0;cases.append(("success-without-witness",m))
    m=copy.deepcopy(base);scenario(m,"store-ahead-recovery")["events"][3]["physicalEffects"]=0;cases.append(("restart-loses-physical-effect",m))
    m=copy.deepcopy(base);scenario(m,"store-ahead-recovery")["events"][4]["intent"]=True;cases.append(("recovery-keeps-intent",m))
    m=copy.deepcopy(base);scenario(m,"receiver-only-rollback")["events"][4]["physicalEffects"]=0;cases.append(("rollback-erases-physical-effect",m))
    m=copy.deepcopy(base);scenario(m,"receiver-only-rollback")["events"][4]["witnessVersion"]=0;cases.append(("rollback-also-rewinds-witness",m))
    m=copy.deepcopy(base);scenario(m,"receiver-only-rollback")["events"][5]["storeVersion"]=1;cases.append(("refused-recovery-mutates-store",m))
    m=copy.deepcopy(base);del scenario(m,"normal")["events"][2];cases.append(("missing-event",m))

    rejected=[reject(name,data) for name,data in cases]
    print(json.dumps({"mutants":len(rejected),"rejected":rejected},indent=2))

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("usage: refine_upstream_witness_trace_mutants.py TRACE.json")
    main(sys.argv[1])
