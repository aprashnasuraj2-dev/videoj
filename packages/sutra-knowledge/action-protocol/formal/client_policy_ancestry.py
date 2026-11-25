#!/usr/bin/env python3
"""Independent bounded explorer for returning-client policy ancestry.

Safe machine requires exact (sequence, head) membership. Numeric-only checking
must expose an alternate-history effect. A separate fresh-provisioning mutant
shows why local history proof cannot reveal a history the client never saw.
"""
from collections import deque

MAX=3
HEADS=range(1,6)

def pinned_member(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq=s
    return pseq <= len(history)-1 and history[pseq] == phead

def inv(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq=s
    if not (1<=len(history)<=MAX+1 and history[0]==0 and
            all(0<=h<=5 for h in history) and 0<=pseq<=MAX and
            0<=phead<=5 and isinstance(checked,bool) and effects>=0 and
            isinstance(last_ok,bool) and 0<=maxever<=MAX and 0<=lastseq<=MAX):
        return "TypeOK"
    if not last_ok: return "NoUnpinnedEffect"
    if pseq>maxever: return "ReturningPinNeverAhead"
    return None

def safe_steps(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq=s
    out=[];cur=len(history)-1
    if cur<MAX:
        for h in HEADS:
            if h not in history:
                out.append((f"Advance({h})",(history+(h,),pseq,phead,False,effects,last_ok,max(maxever,cur+1),lastseq)))
    if pinned_member(s):
        out.append(("ObserveCurrent",(history,cur,history[-1],False,effects,last_ok,maxever,lastseq)))
        out.append(("MembershipCheck",(history,pseq,phead,True,effects,last_ok,maxever,lastseq)))
    if len(history)>1:
        out.append(("CoordinatedRollback",(history[:-1],pseq,phead,False,effects,last_ok,maxever,lastseq)))
    if checked:
        out.append(("Dispatch",(history,pseq,phead,False,effects+1,pinned_member(s),maxever,cur)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s));history,pseq,phead,checked,effects,last_ok,maxever,lastseq=s
    cur=len(history)-1
    if kind=="numeric" and cur>=pseq:
        out.append(("NumericCheck",(history,pseq,phead,True,effects,last_ok,maxever,lastseq)))
    return out

def explore(kind=None, expected=None):
    start=((0,),0,0,False,0,True,0,0)
    q=deque([start]);prev={start:None};act={};edges=0
    while q:
        s=q.popleft();bad=inv(s)
        if bad:
            if expected and bad!=expected: raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((act[cur],cur));cur=prev[cur]
            return len(prev),edges,bad,list(reversed(trace))
        for name,n in safe_steps(s) if kind is None else mutant_steps(s,kind):
            edges+=1
            if n not in prev:
                prev[n]=s;act[n]=name;q.append(n)
    if expected: raise SystemExit(f"{kind}: no {expected} counterexample")
    return len(prev),edges,None,[]

states,edges,bad,_=explore()
if bad: raise SystemExit("safe ancestry failed "+bad)
print(f"client ancestry safe {states} states, {edges} edges; all effects follow exact pinned membership")
states,edges,bad,trace=explore("numeric","NoUnpinnedEffect")
print(f"numeric-only {bad} counterexample after {states} states / {edges} edges:",trace)

def provision_counterexample():
    start=((0,),0,0,False,0,True,0,0)
    q=deque([start]);prev={start:None};act={}
    while q:
        s=q.popleft()
        history,pseq,phead,checked,effects,last_ok,maxever,lastseq=s
        if effects>0 and lastseq<maxever:
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((act[cur],cur));cur=prev[cur]
            return len(prev),list(reversed(trace))
        cur=len(history)-1;out=[]
        if cur<MAX:
            for h in HEADS:
                if h not in history:
                    out.append((f"Advance({h})",(history+(h,),pseq,phead,False,effects,last_ok,max(maxever,cur+1),lastseq)))
        if len(history)>1:
            out.append(("CoordinatedRollback",(history[:-1],pseq,phead,False,effects,last_ok,maxever,lastseq)))
        out.append(("ProvisionFresh",(history,cur,history[-1],False,effects,last_ok,maxever,lastseq)))
        # Membership is valid for this newly provisioned pin, even if history is rolled.
        if pseq<=cur and history[pseq]==phead:
            out.append(("MembershipCheck",(history,pseq,phead,True,effects,last_ok,maxever,lastseq)))
        if checked:
            out.append(("Dispatch",(history,pseq,phead,False,effects+1,True,maxever,cur)))
        for name,n in out:
            if n not in prev:
                prev[n]=s;act[n]=name;q.append(n)
    raise SystemExit("fresh provisioning counterexample missing")

states,trace=provision_counterexample()
print(f"fresh-provisioning NoEffectBelowExternalMax counterexample after {states} states:",trace)
