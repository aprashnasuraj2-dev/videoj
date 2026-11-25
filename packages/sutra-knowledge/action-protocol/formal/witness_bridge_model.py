#!/usr/bin/env python3
"""Independent finite explorer for the V2-012 authority/witness bridge model.

This intentionally reimplements the transition system rather than parsing TLA+.
It checks the same MaxVersion=2 safety invariants and emits shortest mutant
counterexamples. It is bounded evidence, not a proof about Go, filesystems or
distributed systems.
"""
from collections import deque

MAX=2
NONE=None

def inv(state):
    a,w,intent=state
    if not (0<=a<=MAX and 0<=w<=MAX): return "TypeOK"
    if w>a: return "WitnessNotAhead"
    if a-w>1: return "GapBound"
    if intent is not None:
        b,n=intent
        if n!=b+1 or a not in (b,n) or w not in (b,n) or w>a:
            return "IntentCoherent"
    if a!=w:
        if intent is None or intent[0]!=w or intent[1]!=a:
            return "RecoverableGap"
    return None

def safe_steps(s):
    a,w,i=s
    out=[]
    if i is None and a==w and a<MAX:
        out.append(("Prepare",(a,w,(a,a+1))))
    if i is not None:
        b,n=i
        if a==b and w==b:
            out.append(("CommitAuthority",(n,w,i)))
            out.append(("AbortPrepared",(a,w,None)))
        if a==n and w==b:
            out.append(("AdvanceWitness",(a,n,i)))
        if a==n and w==n:
            out.append(("ClearIntent",(a,w,None)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s));a,w,i=s
    if kind=="early" and i is not None:
        b,n=i
        if a==b and w==b:
            out.append(("AdvanceWitnessEarly",(a,n,i)))
    if kind=="double" and a>w and a<MAX:
        out.append(("DoubleCommit",(a+1,w,(a,a+1))))
    if kind=="clear" and i is not None:
        b,n=i
        if a==n and w==b:
            out.append(("ClearIntentEarly",(a,w,None)))
    return out

def explore():
    start=(0,0,None);q=deque([start]);seen={start};edges=0
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
    start=(0,0,None);q=deque([start]);prev={start:None};action={}
    while q:
        s=q.popleft()
        bad=inv(s)
        if bad:
            if bad!=expected:
                raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[]
            cur=s
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
    ("early","WitnessNotAhead"),
    ("double","GapBound"),
    ("clear","RecoverableGap"),
]:
    discovered,trace,bad=counterexample(kind,expected)
    print(f"{kind} {bad} counterexample after discovering {discovered} states:")
    state=(0,0,None)
    print("  Init",state)
    for act,state in trace:
        print(" ",act,state)
