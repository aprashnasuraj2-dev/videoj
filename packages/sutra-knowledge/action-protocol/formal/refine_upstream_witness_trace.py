#!/usr/bin/env python3
"""Independent checker for concrete Go upstream-witness traces.

The checker maps three actual executions to the bounded UpstreamWitness
transition relation: normal commit, receiver-ahead restart recovery, and
receiver-only rollback refusal. It is a finite trace witness, not universal
implementation refinement, clone safety, coordinated-rollback resistance, or a
claim about real provider effects.
"""
import json
import sys

PROFILE = "SUTRA/upstream-witness-refinement/v1"
SCENARIOS = {
    "normal": ["init", "prepare", "apply-store", "advance-witness"],
    "store-ahead-recovery": ["init", "prepare", "apply-store", "restart", "recover-store-ahead"],
    "receiver-only-rollback": ["init", "prepare", "apply-store", "advance-witness", "rollback-store", "recover-refused"],
}
RESULTS = {
    "init": "ready",
    "prepare": "prepared",
    "apply-store": None,
    "advance-witness": "success",
    "restart": "restarted",
    "recover-store-ahead": "reconciled",
    "rollback-store": "rolled-back",
    "recover-refused": "rollback-refused",
}

class RefinementError(ValueError):
    pass

def fail(msg):
    raise RefinementError(msg)

def read_event(e, i, scenario):
    if not isinstance(e, dict):
        fail(f"{scenario}[{i}] not object")
    required = {"op","result","terminal","storeVersion","witnessVersion","intent","physicalEffects"}
    if set(e) != required:
        fail(f"{scenario}[{i}] fields")
    op=e["op"]; result=e["result"]; terminal=e["terminal"]
    store=e["storeVersion"]; witness=e["witnessVersion"]; intent=e["intent"]; physical=e["physicalEffects"]
    if op not in set(sum(SCENARIOS.values(), [])):
        fail(f"{scenario}[{i}] op")
    expected_result=RESULTS[op]
    if expected_result is not None and result != expected_result:
        fail(f"{scenario}[{i}] result")
    if op=="apply-store" and result not in {"applied","applied-unknown"}:
        fail(f"{scenario}[{i}] apply result")
    if terminal not in {"none","applied"}:
        fail(f"{scenario}[{i}] terminal")
    for name,value in (("storeVersion",store),("witnessVersion",witness),("physicalEffects",physical)):
        if not isinstance(value,int) or isinstance(value,bool) or value not in range(3):
            fail(f"{scenario}[{i}] {name}")
    if not isinstance(intent,bool):
        fail(f"{scenario}[{i}] intent")
    return (terminal,store,witness,intent,physical)

def transition(op,before):
    terminal,store,witness,intent,physical=before
    if op=="prepare":
        if intent or terminal!="none" or store!=witness:
            fail("Prepare precondition")
        return (terminal,store,witness,True,physical),"Prepare"
    if op=="apply-store":
        if not intent or terminal!="none" or store!=0 or witness!=0:
            fail("ApplyStore precondition")
        return ("applied",1,0,True,physical+1),"ApplyStore"
    if op in {"advance-witness","recover-store-ahead"}:
        if not intent or terminal!="applied" or store!=1 or witness!=0 or physical!=1:
            fail("AdvanceWitness precondition")
        label="AdvanceWitness" if op=="advance-witness" else "RecoverStoreAhead(AdvanceWitness)"
        return ("applied",1,1,False,physical),label
    if op=="restart":
        if before != ("applied",1,0,True,1):
            fail("Restart stutter precondition")
        return before,"Stutter(restart)"
    if op=="rollback-store":
        if before != ("applied",1,1,False,1):
            fail("RollbackStore precondition")
        return ("none",0,1,False,1),"RollbackStore"
    if op=="recover-refused":
        if before != ("none",0,1,False,1):
            fail("rollback refusal precondition")
        return before,"Stutter(ErrWitnessRollback)"
    fail("unsupported transition "+op)

def check_scenario(s):
    if not isinstance(s,dict) or set(s)!={"name","events"}:
        fail("scenario shape")
    name=s["name"]; events=s["events"]
    if name not in SCENARIOS:
        fail("scenario name")
    expected_ops=SCENARIOS[name]
    if not isinstance(events,list) or len(events)!=len(expected_ops):
        fail(f"{name} event count")
    observed=[read_event(e,i,name) for i,e in enumerate(events)]
    ops=[e["op"] for e in events]
    if ops != expected_ops:
        fail(f"{name} op sequence")
    if observed[0] != ("none",0,0,False,0):
        fail(f"{name} initial state")
    steps=[{"op":"init","before":observed[0],"after":observed[0]}]
    abstract=observed[0]
    for i,op in enumerate(ops[1:],1):
        after,label=transition(op,abstract)
        if observed[i] != after:
            fail(f"{name}[{i}] expected {after} got {observed[i]}")
        if after[4] > 1:
            fail(f"{name}[{i}] AtMostOnePhysicalEffect")
        steps.append({"op":label,"before":abstract,"after":after})
        abstract=after
    if name=="normal" and abstract != ("applied",1,1,False,1):
        fail("normal final")
    if name=="store-ahead-recovery" and abstract != ("applied",1,1,False,1):
        fail("recovery final")
    if name=="receiver-only-rollback" and abstract != ("none",0,1,False,1):
        fail("rollback final")
    return steps

def verify(data):
    if not isinstance(data,dict) or set(data)!={"profile","limit","scenarios"}:
        fail("trace shape")
    if data["profile"] != PROFILE:
        fail("profile")
    if data["limit"] != 1:
        fail("limit")
    scenarios=data["scenarios"]
    if not isinstance(scenarios,list) or len(scenarios)!=3:
        fail("scenario count")
    by={s.get("name"):s for s in scenarios if isinstance(s,dict)}
    if set(by) != set(SCENARIOS):
        fail("scenario set")
    mapped={name:check_scenario(by[name]) for name in SCENARIOS}
    return {
        "accepted":True,
        "profile":PROFILE,
        "scenarios":mapped,
        "scope":"three concrete witnessed traces; physical-effect count is retained across receiver rollback; clones, coordinated rollback, storage internals and real providers are outside this refinement witness",
    }

def main(path):
    try:
        data=json.load(open(path,"r",encoding="utf-8"))
        print(json.dumps(verify(data),indent=2))
    except RefinementError as e:
        raise SystemExit("upstream witness refinement failure: "+str(e))

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("usage: refine_upstream_witness_trace.py TRACE.json")
    main(sys.argv[1])
