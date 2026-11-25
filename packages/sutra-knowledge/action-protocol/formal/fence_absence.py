#!/usr/bin/env python3
"""Independent bounded explorer for externally attested orphan resolution.

A truthful absence proof is available only for an orphan whose effect was never
sent. A lying proof mutant may clear a dispatched orphan, after which two
delayed effects become reachable. This is finite protocol evidence, not a proof
that a real provider's status API is trustworthy.
"""
from collections import deque

CLIENTS=("A","B")
NONE=None
START=(NONE,frozenset(),frozenset(),frozenset(),0,frozenset())

def inv(s, require_truth=True):
    owner,alive,dispatched,effects,fence,absence=s
    if owner not in (NONE,*CLIENTS) or not alive<=set(CLIENTS) or not dispatched<=set(CLIENTS) or not effects<=set(CLIENTS) or fence not in (0,1) or not absence<=set(CLIENTS):
        return "TypeOK"
    if len(effects)>1:
        return "AtMostOneEffect"
    if fence==1 and len(effects)!=1:
        return "FinalizedHasOneEffect"
    if owner is NONE and fence!=1 and dispatched!=effects:
        return "OwnedOrQuiescent"
    if require_truth and absence & dispatched:
        return "TruthfulAbsence"
    return None

def base_steps(s):
    owner,alive,dispatched,effects,fence,absence=s
    out=[]
    for c in CLIENTS:
        if owner is NONE and fence==0:
            out.append((f"Reserve{c}",(c,alive|{c},dispatched,effects,fence,absence)))
        if owner==c and c in alive and c not in dispatched:
            out.append((f"Dispatch{c}",(owner,alive,dispatched|{c},effects,fence,absence)))
        if owner==c and c in alive:
            out.append((f"LoseOwner{c}",(owner,alive-{c},dispatched,effects,fence,absence)))
        if owner==c and c in alive and c not in dispatched:
            out.append((f"AbortOwned{c}",(NONE,alive-{c},dispatched,effects,fence,absence)))
        if c in dispatched and c not in effects:
            out.append((f"Deliver{c}",(owner,alive,dispatched,effects|{c},fence,absence)))
        if owner==c and c in alive and c in effects and fence==0:
            out.append((f"FinalizeOwned{c}",(NONE,alive-{c},dispatched,effects,1,absence)))
    return out

def proof_steps(s, lying=False):
    out=list(base_steps(s))
    owner,alive,dispatched,effects,fence,absence=s
    for c in CLIENTS:
        if owner==c and c not in alive and c not in absence and (lying or c not in dispatched):
            out.append((f"{'Lie' if lying and c in dispatched else 'Prove'}Absent{c}",(owner,alive,dispatched,effects,fence,absence|{c})))
        if owner==c and c not in alive and c in absence:
            out.append((f"ResolveProvenAbsent{c}",(NONE,alive,dispatched,effects,fence,absence-{c})))
    return out

def explore(stepper, require_truth=True, stop=None):
    q=deque([START]);prev={START:None};act={};edges=0
    while q:
        s=q.popleft()
        bad=inv(s,require_truth)
        if bad:
            if bad==stop:
                trace=[];cur=s
                while prev[cur] is not None:
                    trace.append((act[cur],cur));cur=prev[cur]
                return prev,edges,bad,list(reversed(trace))
            raise SystemExit(f"unexpected invariant {bad}: {s}")
        for name,n in stepper(s):
            edges+=1
            if n not in prev:
                prev[n]=s;act[n]=name;q.append(n)
    return prev,edges,None,[]

seen,edges,bad,_=explore(lambda s:proof_steps(s,False),True)
print(f"absence-proof safe {len(seen)} states, {edges} edges; safety invariants hold")

# Every reachable undispatched orphan has the exact two-step proof/resolve path.
orphans=[s for s in seen if s[0] is not NONE and s[0] not in s[1] and s[0] not in s[2]]
if not orphans:
    raise SystemExit("no undispatched orphan reachable")
for s in orphans:
    owner=s[0]
    p=[n for name,n in proof_steps(s,False) if name==f"ProveAbsent{owner}"]
    if not p:
        raise SystemExit(f"truthful proof not enabled for {s}")
    r=[n for name,n in proof_steps(p[0],False) if name==f"ResolveProvenAbsent{owner}"]
    if not r or r[0][0] is not NONE:
        raise SystemExit(f"truthful resolution missing for {s}")
print(f"truthful absence resolution checked for {len(orphans)} undispatched orphan states")

seen,edges,bad,trace=explore(lambda s:proof_steps(s,True),False,"AtMostOneEffect")
if bad!="AtMostOneEffect":
    raise SystemExit(f"lying absence mutant expected AtMostOneEffect, got {bad}")
print("lying absence AtMostOneEffect counterexample:",trace)
