#!/usr/bin/env python3
"""Independent finite explorer for fenced pre-effect admission.

The first machine mirrors FenceAdmission.tla at MaxVersion=3. The second
models two cloned authorities competing for one admission fence. This is
bounded evidence, not a proof of Go, signatures, filesystems or remote effects.
"""
from collections import deque

MAX=3

def inv(s):
    authority,fence,local,reserved,effects,ack=s
    if not (0<=authority<=MAX and 0<=fence<=MAX and 0<=effects<=MAX and 0<=ack<=MAX): return "TypeOK"
    if fence>authority: return "FenceNotAhead"
    if authority-fence>1: return "GapBound"
    if effects!=authority: return "EffectsMatchAuthority"
    if ack>fence: return "AckNotAhead"
    if reserved is not None and reserved!=local: return "ReservationOwned"
    if local is not None:
        b,n=local
        if n!=b+1 or authority not in (b,n) or fence not in (b,n) or fence>authority: return "LocalCoherent"
    if authority!=fence:
        if local is None or reserved!=local or local!=(fence,authority): return "AdmissionBeforeEffect"
    return None

def safe_steps(s):
    authority,fence,local,reserved,effects,ack=s;out=[]
    if local is None and reserved is None and authority==fence and authority<MAX:
        out.append(("PrepareLocal",(authority,fence,(authority,authority+1),None,effects,ack)))
    if local is not None and reserved is None and authority==fence==local[0]:
        out.append(("Reserve",(authority,fence,local,local,effects,ack)))
    if local is not None and reserved==local and authority==fence==local[0]:
        out.append(("AbortReserved",(authority,fence,None,None,effects,ack)))
        out.append(("CommitAuthority",(local[1],fence,local,reserved,effects+1,ack)))
    if local is not None and reserved==local and authority==local[1] and fence==local[0]:
        out.append(("FinalizeFence",(authority,local[1],local,None,effects,ack)))
    if local is not None and reserved is None and authority==fence==local[1]:
        out.append(("ClearLocal",(authority,fence,None,None,effects,ack)))
    if local is None and reserved is None and authority==fence and ack<authority:
        out.append(("Acknowledge",(authority,fence,None,None,effects,authority)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s));authority,fence,local,reserved,effects,ack=s
    if kind=="bypass" and local is not None and reserved is None and authority==fence==local[0]:
        out.append(("CommitWithoutReservation",(local[1],fence,local,None,effects+1,ack)))
    if kind=="early" and local is not None and reserved==local and authority==fence==local[0]:
        out.append(("FinalizeEarly",(authority,local[1],local,None,effects,ack)))
    if kind=="drop" and authority>fence and reserved==local:
        out.append(("DropReservation",(authority,fence,local,None,effects,ack)))
    if kind=="ack" and authority>fence and ack<authority:
        out.append(("AcknowledgeEarly",(authority,fence,local,reserved,effects,authority)))
    return out

def explore():
    start=(0,0,None,None,0,0);q=deque([start]);seen={start};edges=0
    while q:
        s=q.popleft();bad=inv(s)
        if bad: raise SystemExit(f"safe invariant failed {bad}: {s}")
        for _,n in safe_steps(s):
            edges+=1
            if n not in seen: seen.add(n);q.append(n)
    return seen,edges

def counterexample(kind,expected):
    start=(0,0,None,None,0,0);q=deque([start]);prev={start:None};action={}
    while q:
        s=q.popleft();bad=inv(s)
        if bad:
            if bad!=expected: raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((action[cur],cur));cur=prev[cur]
            return list(reversed(trace)),bad
        for act,n in mutant_steps(s,kind):
            if n not in prev: prev[n]=s;action[n]=act;q.append(n)
    raise SystemExit(f"{kind}: no counterexample")

states,edges=explore()
print(f"fence safe {len(states)} states, {edges} edges; all invariants hold")
for kind,expected in [("bypass","AdmissionBeforeEffect"),("early","FenceNotAhead"),("drop","AdmissionBeforeEffect"),("ack","AckNotAhead")]:
    trace,bad=counterexample(kind,expected);print(kind,bad,"counterexample:",trace)

C=frozenset((1,2))
def clone_inv(s):
    fence,intent,reserved,effects=s
    if fence not in (0,1) or not intent<=C or not reserved<=C or not effects<=C: return "TypeOK"
    if len(reserved)>1: return "AtMostOneAdmission"
    if len(effects)>1: return "AtMostOneEffect"
    if effects and not (effects==reserved or fence==1): return "EffectRequiresAdmission"
    if fence==1 and len(effects)!=1: return "FinalizedHasEffect"
    return None

def clone_safe(s):
    fence,intent,reserved,effects=s;out=[]
    for c in C:
        if c not in intent: out.append((f"Prepare{c}",(fence,intent|{c},reserved,effects)))
        if c in intent and fence==0 and not reserved: out.append((f"Reserve{c}",(fence,intent,frozenset((c,)),effects)))
        if reserved==frozenset((c,)) and c not in effects: out.append((f"Abort{c}",(fence,intent,frozenset(),effects)))
        if c in reserved and c not in effects: out.append((f"Commit{c}",(fence,intent,reserved,effects|{c})))
        if reserved==frozenset((c,)) and c in effects and fence==0: out.append((f"Finalize{c}",(1,intent,frozenset(),effects)))
    return out

def clone_mutant(s,kind):
    out=list(clone_safe(s));fence,intent,reserved,effects=s
    for c in C:
        if kind=="double" and c in intent and fence==0 and reserved and c not in reserved:
            out.append((f"DoubleReserve{c}",(fence,intent,reserved|{c},effects)))
        if kind=="bypass" and c in intent and c not in reserved and c not in effects:
            out.append((f"CommitWithoutAdmission{c}",(fence,intent,reserved,effects|{c})))
    return out

def clone_explore(kind=None,check="safe"):
    start=(0,frozenset(),frozenset(),frozenset());q=deque([start]);seen={start};prev={start:None};act={};edges=0
    while q:
        s=q.popleft()
        if check=="effect":
            bad=None if len(s[3])<=1 else "AtMostOneEffect"
        elif check=="admission":
            bad=None if (not s[3] or s[3]==s[2] or s[0]==1) else "EffectRequiresAdmission"
        else:
            bad=clone_inv(s)
        if bad:
            trace=[];cur=s
            while prev[cur] is not None: trace.append((act[cur],cur));cur=prev[cur]
            return seen,edges,bad,list(reversed(trace))
        for name,n in (clone_safe(s) if kind is None else clone_mutant(s,kind)):
            edges+=1
            if n not in seen: seen.add(n);prev[n]=s;act[n]=name;q.append(n)
    return seen,edges,None,[]

seen,edges,bad,_=clone_explore()
if bad: raise SystemExit(f"clone safe failed {bad}")
print(f"clone safe {len(seen)} states, {edges} edges; at most one effect")
seen,edges,bad,trace=clone_explore("double","effect")
if bad!="AtMostOneEffect": raise SystemExit(f"clone double: expected AtMostOneEffect, got {bad}")
print(f"clone double AtMostOneEffect counterexample after {len(seen)} states:",trace)
seen,edges,bad,trace=clone_explore("bypass","admission")
if bad!="EffectRequiresAdmission": raise SystemExit(f"clone bypass: expected EffectRequiresAdmission, got {bad}")
print(f"clone bypass EffectRequiresAdmission counterexample after {len(seen)} states:",trace)
