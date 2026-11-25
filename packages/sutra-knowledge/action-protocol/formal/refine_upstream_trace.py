#!/usr/bin/env python3
"""Independent checker for concrete Go upstream-terminal traces.

This validates two concrete executions against the bounded UpstreamTerminal
transition relation. It is a trace-refinement witness, not a universal proof
that every Go execution refines the TLA+ model or that a real provider does.
"""
import json
import sys

PROFILE = "SUTRA/upstream-terminal-refinement/v1"

class RefinementError(ValueError):
    pass

def fail(msg):
    raise RefinementError(msg)

def read_event(e, i, scenario):
    if not isinstance(e, dict): fail(f"{scenario} event {i} is not object")
    op=e.get("op"); state=e.get("state")
    terminal=e.get("terminalCount"); effects=e.get("effectCount")
    if op not in {"init","apply","retry-applied","close-unapplied","retry-closed","status"}: fail(f"{scenario} event {i} op")
    if state not in {"none","applied","closed"}: fail(f"{scenario} event {i} state")
    if not isinstance(terminal,int) or isinstance(terminal,bool) or terminal not in range(3): fail(f"{scenario} event {i} terminalCount")
    if not isinstance(effects,int) or isinstance(effects,bool) or effects not in range(2): fail(f"{scenario} event {i} effectCount")
    if effects > terminal: fail(f"{scenario} event {i} effects exceed terminals")
    return op,state,terminal,effects

def check_scenario(s):
    if not isinstance(s,dict): fail("scenario object")
    name=s.get("name"); events=s.get("events")
    if name not in {"apply","close"}: fail("scenario name")
    if not isinstance(events,list) or len(events)!=4: fail(f"{name} event count")
    abstract=("none",0,0) # terminal, storeEffects, physicalEffects
    observed_terminal=0
    abstract_steps=[]
    for i,e in enumerate(events):
        op,state,terminal_count,effect_count=read_event(e,i,name)
        before=abstract
        if i==0:
            if op!="init" or (state,terminal_count,effect_count)!=("none",0,0): fail(f"{name} initial")
            after=before
        elif op=="apply":
            if before != ("none",0,0): fail(f"{name} apply precondition")
            after=("applied",1,1); observed_terminal += 1
        elif op=="close-unapplied":
            if before != ("none",0,0): fail(f"{name} close precondition")
            after=("closed",0,0); observed_terminal += 1
        elif op=="retry-applied":
            if before[0] != "applied": fail(f"{name} retry-applied precondition")
            after=before
        elif op=="retry-closed":
            if before[0] != "closed": fail(f"{name} retry-closed precondition")
            after=before
        elif op=="status":
            if before[0] == "none": fail(f"{name} status must be terminal in this trace")
            after=before
        else:
            fail(f"{name} unsupported op {op}")
        expected=(after[0], observed_terminal, after[1])
        if (state,terminal_count,effect_count) != expected:
            fail(f"{name} event {i} observation expected {expected} got {(state,terminal_count,effect_count)}")
        if after[2] > 1: fail(f"{name} AtMostOnePhysicalEffect")
        abstract_steps.append({"op":op,"before":before,"after":after})
        abstract=after
    if name=="apply" and abstract != ("applied",1,1): fail("apply final")
    if name=="close" and abstract != ("closed",0,0): fail("close final")
    return abstract_steps

def verify(data):
    if not isinstance(data,dict): fail("trace object")
    if data.get("profile") != PROFILE: fail("profile")
    if data.get("limit") != 1: fail("limit")
    scenarios=data.get("scenarios")
    if not isinstance(scenarios,list) or len(scenarios)!=2: fail("scenario count")
    by_name={s.get("name"):s for s in scenarios if isinstance(s,dict)}
    if set(by_name)!={"apply","close"}: fail("scenario set")
    steps={name:check_scenario(by_name[name]) for name in ("apply","close")}
    return {
      "accepted":True,
      "profile":PROFILE,
      "scenarios":steps,
      "scope":"two concrete single-authority traces; signatures, storage internals, clones, rollback and real provider behavior are outside this refinement witness"
    }

def main(path):
    try:
        data=json.load(open(path,"r",encoding="utf-8"))
        print(json.dumps(verify(data),indent=2))
    except RefinementError as e:
        raise SystemExit("upstream refinement failure: "+str(e))

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("usage: refine_upstream_trace.py TRACE.json")
    main(sys.argv[1])
