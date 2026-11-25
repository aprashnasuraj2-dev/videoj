#!/usr/bin/env python3
"""Independent finite explorer for V2-012 exact-consent grant lifecycle.

Bounded model: epochs 0..3, active window 1..2, one logical effect. It mirrors
the TLA safety predicates but is independently implemented. This is not a proof
of wall-clock time, durable rollback resistance, or arbitrary external effects.
"""
from collections import deque

START=1
EXPIRY=2
MAX=3

def active(s):
    epoch,revoked,admitted,phase,effects,reconciled=s
    return (not revoked) and START<=epoch<=EXPIRY

def inv(s):
    epoch,revoked,admitted,phase,effects,reconciled=s
    if not (0<=epoch<=MAX and isinstance(revoked,bool) and isinstance(admitted,bool)
            and phase in ("idle","dispatching") and effects in (0,1,2)
            and isinstance(reconciled,bool)):
        return "TypeOK"
    if phase=="dispatching" and not active(s):
        return "DispatchAuthorized"
    if effects>1:
        return "AtMostOneEffect"
    if reconciled and not admitted:
        return "ReconcileRequiresAdmission"
    return None

def safe_steps(s):
    epoch,revoked,admitted,phase,effects,reconciled=s
    out=[]
    if phase=="idle" and epoch<MAX:
        out.append(("AdvanceEpoch",(epoch+1,revoked,admitted,phase,effects,reconciled)))
    if phase=="idle" and active(s):
        out.append(("ReserveDispatch",(epoch,revoked,True,"dispatching",effects,reconciled)))
    if phase=="dispatching":
        out.append(("Commit",(epoch,revoked,admitted,"idle",1 if effects==0 else effects,reconciled)))
        out.append(("FailBeforeEffect",(epoch,revoked,admitted,"idle",effects,reconciled)))
    if phase=="idle" and not revoked:
        out.append(("Revoke",(epoch,True,admitted,phase,effects,reconciled)))
    if admitted and not reconciled:
        out.append(("Reconcile",(epoch,revoked,admitted,phase,effects,True)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s))
    epoch,revoked,admitted,phase,effects,reconciled=s
    if kind=="revoked" and phase=="idle" and revoked:
        out.append(("ReserveRevoked",(epoch,revoked,True,"dispatching",effects,reconciled)))
    if kind=="expired" and phase=="idle" and epoch>EXPIRY:
        out.append(("ReserveExpired",(epoch,revoked,True,"dispatching",effects,reconciled)))
    if kind=="reconcile" and not admitted and not reconciled:
        out.append(("ReconcileUnadmitted",(epoch,revoked,admitted,phase,effects,True)))
    if kind=="race" and phase=="dispatching" and not revoked:
        out.append(("RevokeDuringDispatch",(epoch,True,admitted,phase,effects,reconciled)))
    if kind=="epoch-race" and phase=="dispatching" and epoch<MAX:
        out.append(("AdvanceEpochDuringDispatch",(epoch+1,revoked,admitted,phase,effects,reconciled)))
    if kind=="duplicate" and phase=="dispatching" and effects==1:
        out.append(("DuplicateEffect",(epoch,revoked,admitted,"idle",2,reconciled)))
    return out

def explore():
    start=(0,False,False,"idle",0,False)
    q=deque([start]);seen={start};edges=0
    while q:
        s=q.popleft()
        bad=inv(s)
        if bad: raise SystemExit(f"safe invariant failed {bad}: {s}")
        for _,n in safe_steps(s):
            edges+=1
            if n not in seen:
                seen.add(n);q.append(n)
    return seen,edges

def counterexample(kind,expected):
    start=(0,False,False,"idle",0,False)
    q=deque([start]);prev={start:None};action={}
    while q:
        s=q.popleft()
        bad=inv(s)
        if bad:
            if bad!=expected:
                raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((action[cur],cur));cur=prev[cur]
            trace.reverse()
            return len(prev),trace,bad
        for act,n in mutant_steps(s,kind):
            if n not in prev:
                prev[n]=s;action[n]=act;q.append(n)
    raise SystemExit(f"{kind}: no counterexample")

states,edges=explore()
print(f"safe {len(states)} states, {edges} edges; all invariants hold")
for kind,expected in [
    ("revoked","DispatchAuthorized"),
    ("expired","DispatchAuthorized"),
    ("reconcile","ReconcileRequiresAdmission"),
    ("race","DispatchAuthorized"),
    ("epoch-race","DispatchAuthorized"),
    ("duplicate","AtMostOneEffect"),
]:
    discovered,trace,bad=counterexample(kind,expected)
    print(f"{kind} {bad} counterexample after discovering {discovered} states:")
    state=(0,False,False,"idle",0,False)
    print("  Init",state)
    for act,state in trace:
        print(" ",act,state)
