#!/usr/bin/env python3
"""Independent bounded checker for grant-policy freshness.

Storage rollback of only GrantBook is included in the safe machine and must
remain fail-closed. Mutants demonstrate static-view replay, skipped freshness,
and coordinated rollback of both policy trust domains.
"""
from collections import deque
MAX=3
NONE=None
NOCHECK=MAX+1
NODISPATCH=MAX+1

def inv(s):
    book,witness,intent,checked,maxw,ldb,ldw,ldc=s
    if not (0<=book<=MAX and 0<=witness<=MAX and 0<=maxw<=MAX): return "TypeOK"
    if checked not in set(range(MAX+1))|{NOCHECK}: return "TypeOK"
    if ldb not in set(range(MAX+1))|{NODISPATCH} or ldw not in set(range(MAX+1))|{NODISPATCH}: return "TypeOK"
    if ldc not in set(range(MAX+1))|{NOCHECK}: return "TypeOK"
    if witness!=maxw: return "WitnessMonotonic"
    if book>witness and (intent is None or intent!=(witness,book)): return "ForwardMutationRecoverable"
    if ldb!=NODISPATCH and ldb!=ldw: return "NoStaleDispatch"
    if ldb!=NODISPATCH and not (ldc==ldb==ldw): return "DispatchWasFresh"
    return None

def safe_steps(s):
    book,witness,intent,checked,maxw,ldb,ldw,ldc=s;out=[]
    if intent is None and book==witness and book<MAX:
        out.append(("PrepareMutation",(book,witness,(book,book+1),NOCHECK,maxw,ldb,ldw,ldc)))
    if intent is not None and book==witness==intent[0]:
        out.append(("CommitBook",(intent[1],witness,intent,NOCHECK,maxw,ldb,ldw,ldc)))
    if intent is not None and book==intent[1] and witness==intent[0]:
        out.append(("AdvanceWitness",(book,intent[1],intent,checked,intent[1],ldb,ldw,ldc)))
    if intent is not None and book==witness==intent[1]:
        out.append(("ClearIntent",(book,witness,None,checked,maxw,ldb,ldw,ldc)))
    if intent is None and book==witness:
        out.append(("FreshCheck",(book,witness,None,witness,maxw,ldb,ldw,ldc)))
    if intent is None and checked==book==witness:
        out.append(("Dispatch",(book,witness,None,NOCHECK,maxw,book,witness,checked)))
    if intent is None and witness>0 and book==witness:
        out.append(("RollbackBook",(witness-1,witness,None,NOCHECK,maxw,ldb,ldw,ldc)))
    if intent is None and book<witness:
        out.append(("ReloadCurrentBook",(witness,witness,None,NOCHECK,maxw,ldb,ldw,ldc)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s));book,witness,intent,checked,maxw,ldb,ldw,ldc=s
    if kind=="replay":
        if intent is None and book<witness:
            out.append(("ReplayOldView",(book,witness,None,book,maxw,ldb,ldw,ldc)))
        if intent is None and book<witness and checked==book:
            out.append(("DispatchReplayed",(book,witness,None,NOCHECK,maxw,book,witness,checked)))
    if kind=="no-check" and intent is None and book==witness and checked==NOCHECK:
        out.append(("DispatchWithoutCheck",(book,witness,None,checked,maxw,book,witness,checked)))
    if kind=="coordinated" and intent is None and witness>0 and book==witness:
        out.append(("CoordinatedRollback",(witness-1,witness-1,None,NOCHECK,maxw,ldb,ldw,ldc)))
    return out

def run(kind=None,expected=None):
    start=(0,0,None,NOCHECK,0,NODISPATCH,NODISPATCH,NOCHECK)
    q=deque([start]);seen={start};prev={start:None};act={};edges=0
    while q:
        s=q.popleft();bad=inv(s)
        if bad:
            if expected is not None and bad!=expected:
                raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((act[cur],cur));cur=prev[cur]
            return len(seen),edges,bad,list(reversed(trace))
        for name,n in safe_steps(s) if kind is None else mutant_steps(s,kind):
            edges+=1
            if n not in seen:
                seen.add(n);prev[n]=s;act[n]=name;q.append(n)
    if expected is not None: raise SystemExit(f"{kind}: no {expected} counterexample")
    return len(seen),edges,None,[]

states,edges,bad,_=run()
if bad: raise SystemExit("safe failed "+bad)
print(f"policy freshness safe {states} states, {edges} edges; book-only rollback remains fail-closed")
for kind,expected in [("replay","NoStaleDispatch"),("no-check","DispatchWasFresh"),("coordinated","WitnessMonotonic")]:
    states,edges,bad,trace=run(kind,expected)
    print(f"{kind} {bad} counterexample after {states} states / {edges} edges:",trace)
