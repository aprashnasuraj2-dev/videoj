#!/usr/bin/env python3
"""Independent finite explorer for the V2-012 authority/witness bridge model.

This intentionally reimplements the transition system rather than parsing TLA+.
It checks the same MaxVersion=2 safety invariants and emits shortest mutant
counterexamples. It is bounded evidence, not a proof about Go, filesystems or
distributed systems.
"""
from collections import deque

MAX=2

def inv(state, max_version=MAX):
    a,w,intent,ack=state
    if not (0<=a<=max_version and 0<=w<=max_version and 0<=ack<=max_version): return "TypeOK"
    if w>a: return "WitnessNotAhead"
    if ack>w: return "AckNotAhead"
    if a-w>1: return "GapBound"
    if intent is not None:
        b,n=intent
        if not (0<=b<max_version) or n!=b+1 or a not in (b,n) or w not in (b,n) or w>a:
            return "IntentCoherent"
    if a!=w:
        if intent is None or intent[0]!=w or intent[1]!=a:
            return "RecoverableGap"
    return None

def safe_steps(s, allow_unacked=False, max_version=MAX):
    a,w,i,ack=s
    out=[]
    if i is None and a==w and (allow_unacked or ack==a) and a<max_version:
        out.append(("Prepare",(a,w,(a,a+1),ack)))
    if i is not None:
        b,n=i
        if a==b and w==b:
            out.append(("CommitAuthority",(n,w,i,ack)))
            out.append(("AbortPrepared",(a,w,None,ack)))
        if a==n and w==b:
            out.append(("AdvanceWitness",(a,n,i,ack)))
        if a==n and w==n:
            out.append(("ClearIntent",(a,w,None,ack)))
    if i is None and a==w and ack<a:
        out.append(("Acknowledge",(a,w,None,a)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s));a,w,i,ack=s
    if kind=="early" and i is not None:
        b,n=i
        if a==b and w==b:
            out.append(("AdvanceWitnessEarly",(a,n,i,ack)))
    if kind=="double" and a>w and a<MAX:
        out.append(("DoubleCommit",(a+1,w,(a,a+1),ack)))
    if kind=="clear" and i is not None:
        b,n=i
        if a==n and w==b:
            out.append(("ClearIntentEarly",(a,w,None,ack)))
    if kind=="ack" and a>w and ack<a:
        out.append(("AcknowledgeEarly",(a,w,i,a)))
    return out

def explore(allow_unacked=False, max_version=MAX):
    start=(0,0,None,0);q=deque([start]);seen={start};edges=0
    while q:
        s=q.popleft()
        bad=inv(s, max_version)
        if bad: raise SystemExit(f"safe invariant failed {bad}: {s}")
        for _,n in safe_steps(s, allow_unacked, max_version):
            edges+=1
            if n not in seen:
                seen.add(n);q.append(n)
    return seen,edges

def counterexample(kind,expected):
    start=(0,0,None,0);q=deque([start]);prev={start:None};action={}
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
    ("ack","AckNotAhead"),
]:
    discovered,trace,bad=counterexample(kind,expected)
    print(f"{kind} {bad} counterexample after discovering {discovered} states:")
    state=(0,0,None,0)
    print("  Init",state)
    for act,state in trace:
        print(" ",act,state)

# The wider three-contact profile deliberately admits new contacts before the
# previous acknowledgement was observed. It preserves all six safety invariants.
lossy_states,lossy_edges=explore(True,3)
print(f"lossy safe {len(lossy_states)} states, {lossy_edges} edges; all invariants hold")
s=(0,0,None,0)
for expected in ("Prepare","CommitAuthority","AdvanceWitness","ClearIntent","Prepare"):
    next_states=[n for act,n in safe_steps(s,True,3) if act==expected]
    if len(next_states)!=1: raise SystemExit(f"lost-ack trace missing {expected}: {s}")
    s=next_states[0]
    print("  lost-ack",expected,s)
if s!=(1,1,(1,2),0): raise SystemExit("lost-ack trace did not permit later contact")
# An endless abort/reprepare cycle disables Acknowledge intermittently: weak
# fairness alone does not imply unconditional eventual acknowledgement.
settled=(1,1,None,0)
prepared=(1,1,(1,2),0)
if ("Prepare",prepared) not in safe_steps(settled,True,3) or ("AbortPrepared",settled) not in safe_steps(prepared,True,3):
    raise SystemExit("weak-fairness cycle missing")
if any(act=="Acknowledge" for act,_ in safe_steps(prepared,True,3)):
    raise SystemExit("ack unexpectedly enabled throughout cycle")
print("lossy weak-fairness negative cycle: Prepare -> AbortPrepared -> repeat; acknowledgement intermittently disabled")
