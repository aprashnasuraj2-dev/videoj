#!/usr/bin/env python3
"""Independent bounded explorer for permanent non-application closure.

A truthful external closure permanently retires one exact idempotency identity
only if it was never dispatched. A lying closure mutant may retire a dispatched
identity while its delayed effect remains deliverable; after another identity
is admitted, two effects become reachable. This is finite protocol evidence,
not evidence that any real provider offers or honors this contract.
"""
from collections import deque

CLIENTS=("A","B")
NONE=None
START=(NONE,frozenset(),frozenset(),frozenset(),0,frozenset())

def inv(s, require_closure=True):
    owner,alive,dispatched,effects,fence,closed=s
    if owner not in (NONE,*CLIENTS) or not alive<=set(CLIENTS) or not dispatched<=set(CLIENTS) or not effects<=set(CLIENTS) or fence not in (0,1) or not closed<=set(CLIENTS):
        return "TypeOK"
    if len(effects)>1:
        return "AtMostOneEffect"
    if fence==1 and len(effects)!=1:
        return "FinalizedHasOneEffect"
    if owner is NONE and fence!=1 and dispatched!=effects:
        return "OwnedOrQuiescent"
    if require_closure and closed & dispatched:
        return "ClosureSound"
    return None

def effect_inv(s):
    owner,alive,dispatched,effects,fence,closed=s
    if owner not in (NONE,*CLIENTS) or not alive<=set(CLIENTS) or not dispatched<=set(CLIENTS) or not effects<=set(CLIENTS) or fence not in (0,1) or not closed<=set(CLIENTS):
        return "TypeOK"
    return "AtMostOneEffect" if len(effects)>1 else None

def base_steps(s):
    owner,alive,dispatched,effects,fence,closed=s
    out=[]
    for c in CLIENTS:
        if owner is NONE and fence==0 and c not in closed:
            out.append((f"Reserve{c}",(c,alive|{c},dispatched,effects,fence,closed)))
        if owner==c and c in alive and c not in dispatched and c not in closed:
            out.append((f"Dispatch{c}",(owner,alive,dispatched|{c},effects,fence,closed)))
        if owner==c and c in alive:
            out.append((f"LoseOwner{c}",(owner,alive-{c},dispatched,effects,fence,closed)))
        if owner==c and c in alive and c not in dispatched:
            out.append((f"AbortOwned{c}",(NONE,alive-{c},dispatched,effects,fence,closed)))
        if c in dispatched and c not in effects:
            out.append((f"Deliver{c}",(owner,alive,dispatched,effects|{c},fence,closed)))
        if owner==c and c in alive and c in effects and fence==0:
            out.append((f"FinalizeOwned{c}",(NONE,alive-{c},dispatched,effects,1,closed)))
    return out

def closure_steps(s, lying=False):
    out=list(base_steps(s))
    owner,alive,dispatched,effects,fence,closed=s
    for c in CLIENTS:
        if owner==c and c not in alive and c not in closed and c not in dispatched:
            out.append((f"CloseUnapplied{c}",(owner,alive,dispatched,effects,fence,closed|{c})))
        if lying and owner==c and c not in alive and c not in closed:
            out.append((f"LieClosed{c}",(owner,alive,dispatched,effects,fence,closed|{c})))
        if owner==c and c not in alive and c in closed:
            out.append((f"ResolveClosed{c}",(NONE,alive,dispatched,effects,fence,closed)))
    return out

def explore(stepper, checker, stop=None):
    q=deque([START]);prev={START:None};act={};edges=0
    while q:
        s=q.popleft()
        bad=checker(s)
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

seen,edges,bad,_=explore(lambda s:closure_steps(s,False),lambda s:inv(s,True))
print(f"closure safe {len(seen)} states, {edges} edges; safety invariants hold")

orphans=[s for s in seen if s[0] is not NONE and s[0] not in s[1] and s[0] not in s[2] and s[0] not in s[5]]
if not orphans:
    raise SystemExit("no unresolved undispatched orphan reachable")
for s in orphans:
    owner=s[0]
    p=[n for name,n in closure_steps(s,False) if name==f"CloseUnapplied{owner}"]
    if not p:
        raise SystemExit(f"truthful closure not enabled for {s}")
    r=[n for name,n in closure_steps(p[0],False) if name==f"ResolveClosed{owner}"]
    if not r or r[0][0] is not NONE or owner not in r[0][5]:
        raise SystemExit(f"closure resolution missing or not durable for {s}")
closed_orphans=[s for s in seen if s[0] is not NONE and s[0] not in s[1] and s[0] in s[5]]
for s in closed_orphans:
    owner=s[0]
    if not any(name==f"ResolveClosed{owner}" and n[0] is NONE and owner in n[5] for name,n in closure_steps(s,False)):
        raise SystemExit(f"already-closed orphan cannot resolve: {s}")
print(f"permanent closure checked for {len(orphans)} unresolved and {len(closed_orphans)} already-closed orphan states")

seen,edges,bad,trace=explore(lambda s:closure_steps(s,True),effect_inv,"AtMostOneEffect")
if bad!="AtMostOneEffect":
    raise SystemExit(f"lying closure mutant expected AtMostOneEffect, got {bad}")
print("lying closure AtMostOneEffect counterexample:",trace)
