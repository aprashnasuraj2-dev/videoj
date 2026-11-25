#!/usr/bin/env python3
"""Map actual Go pinned-consent traces to existing bounded policy abstractions.

The checker uses GrantLifecycle transition semantics at API-boundary granularity:
a successful process call refines ReserveDispatch;Commit, while rejected calls
refine stutter. Exact policy ancestry is abstracted to the real witness-derived
pinMember observation. This is concrete trace refinement, not a universal proof.
"""
import json, re, sys

PROFILE="SUTRA/pinned-policy-refinement/v1"
SCENARIOS={"active","historical-ancestor","revoked","expired","alternate-pin","revoked-reconcile","never-admitted-recovery"}

class RefinementError(ValueError): pass
def fail(msg): raise RefinementError(msg)

def event(e, scenario, i):
    if not isinstance(e,dict): fail(f"{scenario}[{i}] not object")
    required=["op","result","epoch","notBefore","expiresAfter","revoked","admitted","reconciled",
              "pinMember","pinSequence","pinHead","policySequence","policyHead","upstreamEffects","localEffects"]
    if any(k not in e for k in required): fail(f"{scenario}[{i}] missing field")
    if not all(isinstance(e[k],bool) for k in ["revoked","admitted","reconciled","pinMember"]):
        fail(f"{scenario}[{i}] bool field")
    for k in ["epoch","notBefore","expiresAfter","pinSequence","policySequence","upstreamEffects","localEffects"]:
        if not isinstance(e[k],int) or isinstance(e[k],bool) or e[k] < 0: fail(f"{scenario}[{i}] {k}")
    for k in ["pinHead","policyHead"]:
        if not isinstance(e[k],str) or not re.fullmatch(r"[0-9a-f]{64}",e[k]):
            fail(f"{scenario}[{i}] {k}")
    if e["pinMember"] and e["pinSequence"]>e["policySequence"]:
        fail(f"{scenario}[{i}] member pin ahead of policy")
    if e["upstreamEffects"]>1 or e["localEffects"]>1: fail(f"{scenario}[{i}] effect bound")
    if e["reconciled"] and not e["admitted"]: fail(f"{scenario}[{i}] ReconcileRequiresAdmission")
    if e["localEffects"]>e["upstreamEffects"]: fail(f"{scenario}[{i}] local acknowledgement ahead of upstream")
    return e

def active(e):
    return (not e["revoked"]) and e["notBefore"] <= e["epoch"] <= e["expiresAfter"]

def same_policy_state(a,b):
    keys=["epoch","notBefore","expiresAfter","revoked","admitted","reconciled","pinMember","pinSequence",
          "pinHead","policySequence","policyHead","upstreamEffects","localEffects"]
    return all(a[k]==b[k] for k in keys)

def same_grant(a,b):
    return a["notBefore"]==b["notBefore"] and a["expiresAfter"]==b["expiresAfter"]

def same_pin(a,b):
    return a["pinSequence"]==b["pinSequence"] and a["pinHead"]==b["pinHead"]

def current_pin(e):
    return e["pinMember"] and e["pinSequence"]==e["policySequence"] and e["pinHead"]==e["policyHead"]

def historical_pin(e):
    return e["pinMember"] and e["pinSequence"]<e["policySequence"] and e["pinHead"]!=e["policyHead"]

def policy_advanced_once(a,b,label):
    if b["policySequence"]!=a["policySequence"]+1 or b["policyHead"]==a["policyHead"]:
        fail(label+" policy transition")
    if not same_grant(a,b) or b["epoch"]!=a["epoch"]:
        fail(label+" changed grant epoch/window")

def check_active(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="ready" or not active(a) or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not current_pin(a):
        fail("active initial")
    if b["op"]!="process" or b["result"]!="success" or not active(b) or not b["admitted"] or b["reconciled"] or b["revoked"] or b["upstreamEffects"]!=1 or b["localEffects"]!=1 or not b["pinMember"] or not same_pin(a,b):
        fail("active success")
    policy_advanced_once(a,b,"active")
    return ["MembershipCheck(current pin)","ReserveDispatch","Commit"]

def check_historical(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="historical-member" or not active(a) or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not historical_pin(a):
        fail("historical initial")
    if b["op"]!="process" or b["result"]!="success" or not active(b) or not b["admitted"] or b["reconciled"] or b["revoked"] or b["upstreamEffects"]!=1 or b["localEffects"]!=1 or not historical_pin(b) or not same_pin(a,b):
        fail("historical success")
    policy_advanced_once(a,b,"historical")
    return ["MembershipCheck(historical ancestor)","ReserveDispatch","Commit"]

def check_revoked(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="revoked" or not a["revoked"] or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not current_pin(a):
        fail("revoked initial")
    if b["op"]!="process" or b["result"]!="grant-revoked" or not same_policy_state(a,b):
        fail("revoked operation was not stutter")
    return ["Stutter(rejected revoked ReserveDispatch)"]

def check_expired(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="expired" or a["epoch"]<=a["expiresAfter"] or a["revoked"] or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not current_pin(a):
        fail("expired initial")
    if b["op"]!="process" or b["result"]!="grant-inactive" or not same_policy_state(a,b):
        fail("expired operation was not stutter")
    return ["Stutter(rejected expired ReserveDispatch)"]

def check_alternate(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="alternate" or a["pinMember"] or a["pinSequence"]!=a["policySequence"] or a["pinHead"]==a["policyHead"] or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0:
        fail("alternate pin initial")
    if b["op"]!="process" or b["result"]!="policy-rollback" or b["pinMember"] or not same_policy_state(a,b):
        fail("alternate pin mutated policy/effect")
    return ["Stutter(MembershipCheck disabled because PinnedMember=false)"]

def check_reconcile(ev):
    a,b,c,d,e=ev
    if a["op"]!="init" or a["result"]!="ready" or not active(a) or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not current_pin(a):
        fail("reconcile initial")
    if b["op"]!="process" or b["result"]!="unknown-applied" or not active(b) or not b["admitted"] or b["revoked"] or b["reconciled"] or b["upstreamEffects"]!=1 or b["localEffects"]!=0 or not historical_pin(b) or not same_pin(a,b):
        fail("ambiguous applied state")
    policy_advanced_once(a,b,"reconcile admission")
    if c["op"]!="revoke" or c["result"]!="revoked-after-admission" or not c["revoked"] or not c["admitted"] or c["reconciled"] or c["upstreamEffects"]!=1 or c["localEffects"]!=0 or not historical_pin(c) or not same_pin(b,c):
        fail("revoke transition")
    policy_advanced_once(b,c,"revoke")
    if d["op"]!="recover" or d["result"]!="reconciled" or not d["revoked"] or not d["admitted"] or not d["reconciled"] or d["upstreamEffects"]!=1 or d["localEffects"]!=1 or not historical_pin(d) or not same_pin(c,d):
        fail("reconcile transition")
    if not same_grant(c,d) or d["epoch"]!=c["epoch"] or d["policySequence"]!=c["policySequence"] or d["policyHead"]!=c["policyHead"]:
        fail("reconcile mutated policy")
    if e["op"]!="fresh-process" or e["result"]!="grant-revoked" or not e["revoked"] or not e["admitted"] or not e["reconciled"] or e["upstreamEffects"]!=1 or e["localEffects"]!=1 or not current_pin(e):
        fail("fresh post-revocation rejection")
    if not same_grant(d,e) or e["epoch"]!=d["epoch"] or e["policySequence"]!=d["policySequence"] or e["policyHead"]!=d["policyHead"]:
        fail("rejected fresh dispatch mutated policy")
    return ["MembershipCheck(current pin)","ReserveDispatch","Commit(external effect; local ack pending)","Revoke","Reconcile","Stutter(rejected fresh revoked dispatch)"]

def check_never(ev):
    a,b=ev
    if a["op"]!="init" or a["result"]!="ready" or a["admitted"] or a["reconciled"] or a["upstreamEffects"]!=0 or a["localEffects"]!=0 or not current_pin(a):
        fail("never-admitted initial")
    if b["op"]!="recover" or b["result"]!="not-dispatched" or not same_policy_state(a,b):
        fail("never-admitted recovery did not stutter")
    return ["Stutter(Reconcile disabled because admitted=false)"]

def verify(data):
    if not isinstance(data,dict) or data.get("profile")!=PROFILE: fail("profile")
    raw=data.get("scenarios")
    if not isinstance(raw,list) or len(raw)!=len(SCENARIOS): fail("scenario count")
    by={}
    for s in raw:
        if not isinstance(s,dict) or s.get("name") in by: fail("scenario object/name")
        name=s.get("name"); es=s.get("events")
        if name not in SCENARIOS or not isinstance(es,list): fail("scenario set")
        by[name]=[event(x,name,i) for i,x in enumerate(es)]
    if set(by)!=SCENARIOS: fail("scenario set")
    expected_lengths={"active":2,"historical-ancestor":2,"revoked":2,"expired":2,"alternate-pin":2,"revoked-reconcile":5,"never-admitted-recovery":2}
    for n,l in expected_lengths.items():
        if len(by[n])!=l: fail(f"{n} event count")
    mapped={
      "active":check_active(by["active"]),
      "historical-ancestor":check_historical(by["historical-ancestor"]),
      "revoked":check_revoked(by["revoked"]),
      "expired":check_expired(by["expired"]),
      "alternate-pin":check_alternate(by["alternate-pin"]),
      "revoked-reconcile":check_reconcile(by["revoked-reconcile"]),
      "never-admitted-recovery":check_never(by["never-admitted-recovery"]),
    }
    return {
      "accepted":True,"profile":PROFILE,"mappedTransitions":mapped,
      "scope":"actual API-boundary Go traces mapped to GrantLifecycle macros and witness-derived ClientPolicyAncestry membership; not universal simulation/refinement"
    }

def main(path):
    try:
        with open(path,"r",encoding="utf-8") as f: data=json.load(f)
        print(json.dumps(verify(data),indent=2))
    except RefinementError as e:
        raise SystemExit("pinned policy refinement failure: "+str(e))

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("usage: refine_pinned_policy_trace.py TRACE.json")
    main(sys.argv[1])
