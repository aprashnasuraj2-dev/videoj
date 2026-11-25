#!/usr/bin/env python3
"""Bounded independent explorer for orphaned admission availability.

This deliberately separates safety from liveness. A lost reservation owner
can block progress forever without creating a second effect. A mutant that
steals/clears the orphan restores availability but permits two delayed external
effects. This is finite evidence, not a distributed impossibility proof.
"""
from collections import deque

CLIENTS=("A","B")
NONE=None
START=(NONE,frozenset(),frozenset(),frozenset(),0)

def type_inv(s):
    owner,alive,dispatched,effects,fence=s
    if owner not in (NONE,*CLIENTS) or not alive<=set(CLIENTS) or not dispatched<=set(CLIENTS) or not effects<=set(CLIENTS) or fence not in (0,1):
        return "TypeOK"
    return None

def inv(s):
    owner,alive,dispatched,effects,fence=s
    bad=type_inv(s)
    if bad:
        return bad
    if len(effects)>1:
        return "AtMostOneEffect"
    if fence==1 and len(effects)!=1:
        return "FinalizedHasOneEffect"
    if owner is NONE and fence!=1 and dispatched!=effects:
        return "OwnedOrQuiescent"
    return None

def effect_inv(s):
    bad=type_inv(s)
    if bad:
        return bad
    return "AtMostOneEffect" if len(s[3])>1 else None

def safe_steps(s):
    owner,alive,dispatched,effects,fence=s
    out=[]
    for c in CLIENTS:
        if owner is NONE and fence==0:
            out.append((f"Reserve{c}",(c,alive|{c},dispatched,effects,fence)))
        if owner==c and c in alive and c not in dispatched:
            out.append((f"Dispatch{c}",(owner,alive,dispatched|{c},effects,fence)))
        if owner==c and c in alive:
            out.append((f"LoseOwner{c}",(owner,alive-{c},dispatched,effects,fence)))
        if owner==c and c in alive and c not in dispatched:
            out.append((f"AbortOwned{c}",(NONE,alive-{c},dispatched,effects,fence)))
        if c in dispatched and c not in effects:
            out.append((f"Deliver{c}",(owner,alive,dispatched,effects|{c},fence)))
        if owner==c and c in alive and c in effects and fence==0:
            out.append((f"FinalizeOwned{c}",(NONE,alive-{c},dispatched,effects,1)))
    return out

def steal_steps(s):
    out=list(safe_steps(s))
    owner,alive,dispatched,effects,fence=s
    if owner is not NONE and owner not in alive:
        out.append((f"StealOrphan{owner}",(NONE,alive,dispatched,effects,fence)))
    return out

def explore(stepper, stop=None, checker=inv):
    q=deque([START]);prev={START:None};act={};edges=0
    while q:
        s=q.popleft()
        bad=checker(s)
        if bad:
            if stop==bad:
                trace=[];cur=s
                while prev[cur] is not None:
                    trace.append((act[cur],cur));cur=prev[cur]
                return prev,edges,bad,list(reversed(trace))
            raise SystemExit(f"unexpected invariant {bad}: {s}")
        for name,n in stepper(s):
            edges+=1
            if n not in prev:
                prev[n]=s;act[n]=name
                if stop=="orphan" and n[0] is not NONE and n[0] not in n[1]:
                    trace=[];cur=n
                    while prev[cur] is not None:
                        trace.append((act[cur],cur));cur=prev[cur]
                    return prev,edges,"orphan",list(reversed(trace))
                q.append(n)
    return prev,edges,None,[]

seen,edges,bad,_=explore(safe_steps)
print(f"availability safe {len(seen)} states, {edges} edges; safety invariants hold")

seen,edges,bad,trace=explore(safe_steps,"orphan")
if bad!="orphan":
    raise SystemExit("orphan state not reachable")
orphan=trace[-1][1]
reachable={orphan};q=deque([orphan])
while q:
    s=q.popleft()
    for _,n in safe_steps(s):
        if n not in reachable:
            reachable.add(n);q.append(n)
if any(s[0] is NONE for s in reachable):
    raise SystemExit("orphan unexpectedly self-settles without owner evidence")
print("orphan liveness counterexample:",trace)

# Mirror FenceAvailabilitySteal.cfg exactly: this negative control checks
# TypeOK plus AtMostOneEffect, not the safe machine's stronger availability
# invariants. Otherwise the reference can stop at an earlier, irrelevant
# OwnedOrQuiescent violation and never demonstrate the intended double effect.
seen,edges,bad,trace=explore(steal_steps,"AtMostOneEffect",effect_inv)
if bad!="AtMostOneEffect":
    raise SystemExit(f"steal mutant expected AtMostOneEffect, got {bad}")
print("steal orphan AtMostOneEffect counterexample:",trace)
