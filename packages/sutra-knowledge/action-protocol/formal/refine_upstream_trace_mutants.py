#!/usr/bin/env python3
"""Mutation controls for refine_upstream_trace.py against the actual Go trace."""
import copy, json, sys
from refine_upstream_trace import verify, RefinementError

def reject(name,data):
    try:
        verify(data)
    except RefinementError:
        return name
    raise SystemExit(f"mutant unexpectedly accepted: {name}")

def main(path):
    base=json.load(open(path,"r",encoding="utf-8"))
    verify(base)
    mutants=[]
    m=copy.deepcopy(base);m["profile"]="SUTRA/upstream-terminal-refinement/v0";mutants.append(("profile",m))
    m=copy.deepcopy(base);m["scenarios"][0]["events"][1]["state"]="closed";mutants.append(("apply-state",m))
    m=copy.deepcopy(base);m["scenarios"][0]["events"][1]["effectCount"]=0;mutants.append(("lost-effect",m))
    m=copy.deepcopy(base);m["scenarios"][0]["events"][2]["terminalCount"]=0;mutants.append(("terminal-rollback",m))
    m=copy.deepcopy(base);m["scenarios"][1]["events"][1]["effectCount"]=1;mutants.append(("closed-effect",m))
    m=copy.deepcopy(base);m["scenarios"][1]["events"][2]["op"]="retry-applied";mutants.append(("wrong-retry",m))
    m=copy.deepcopy(base);del m["scenarios"][0]["events"][2];mutants.append(("missing-event",m))
    rejected=[reject(name,m) for name,m in mutants]
    print(json.dumps({"mutants":len(rejected),"rejected":rejected},indent=2))

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("usage: refine_upstream_trace_mutants.py TRACE.json")
    main(sys.argv[1])
