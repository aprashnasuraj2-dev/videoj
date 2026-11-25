#!/usr/bin/env python3
"""Independent finite explorer for post-effect upstream rollback witness semantics."""
from collections import deque

NONE, APPLIED = "none", "applied"
START = (NONE, 0, 0, False, 0)

def safe_steps(s):
    terminal, store, witness, intent, physical = s
    out=[("Status",s)]
    if not intent and terminal==NONE and store==witness:
        out.append(("Prepare",(terminal,store,witness,True,physical)))
    if intent and terminal==NONE and store==witness==0:
        out.append(("ApplyStore",(APPLIED,1,witness,True,physical+1)))
    if intent and terminal==APPLIED and store==1 and witness==0:
        out.append(("AdvanceWitness",(terminal,store,1,False,physical)))
    if intent and terminal==NONE and store==witness:
        out.append(("AbortPrepared",(terminal,store,witness,False,physical)))
    if terminal==APPLIED and witness==1:
        out.append(("RollbackStore",(NONE,0,witness,False,physical)))
    return out

def invariant(s):
    terminal,store,witness,intent,physical=s
    if terminal not in (NONE,APPLIED) or store not in (0,1) or witness not in (0,1) or not isinstance(intent,bool) or physical not in (0,1,2):
        return "TypeOK"
    if physical>1: return "AtMostOnePhysicalEffect"
    return None

def explore(stepper,expected=None):
    q=deque([START]);prev={START:None};action={};edges=0
    while q:
        s=q.popleft();bad=invariant(s)
        if bad:
            if bad!=expected: raise SystemExit(f"unexpected {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((action[cur],cur));cur=prev[cur]
            return len(prev),edges,bad,list(reversed(trace))
        for name,nxt in stepper(s):
            edges+=1
            if nxt not in prev:
                prev[nxt]=s;action[nxt]=name;q.append(nxt)
    if expected: raise SystemExit(f"expected {expected} counterexample not found")
    return len(prev),edges,None,[]

print("safe",explore(safe_steps)[:2])

def clone_steps(s):
    out=list(safe_steps(s))
    if s[0]==APPLIED:
        out.append(("CloneApply",(s[0],s[1],s[2],s[3],s[4]+1)))
    return out
print("clone",explore(clone_steps,"AtMostOnePhysicalEffect"))

def coordinated_steps(s):
    out=list(safe_steps(s))
    if s[0]==APPLIED and s[2]==1:
        out.append(("CoordinatedRollback",(NONE,0,0,False,s[4])))
    return out
print("coordinated",explore(coordinated_steps,"AtMostOnePhysicalEffect"))
