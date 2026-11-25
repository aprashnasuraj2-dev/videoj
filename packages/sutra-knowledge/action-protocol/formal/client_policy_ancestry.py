#!/usr/bin/env python3
"""Independent bounded explorer for returning-client policy ancestry.

The safe machine requires exact (sequence, head) membership. Numeric-only
checking must expose an alternate-history effect. The provisioning machine is
separate: it can dispatch only after an explicit fresh provisioning event on a
history below the independently retained maximum. All counters are finite.
"""
from collections import deque

MAX=3
HEADS=range(1,6)

# history,pseq,phead,checked,effect_seen,last_ok,maxever,lastseq,last_below,provisioned
START=((0,),0,0,False,0,True,0,0,False,False)

def pinned_member(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq,last_below,provisioned=s
    return pseq <= len(history)-1 and history[pseq] == phead

def inv(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq,last_below,provisioned=s
    if not (1<=len(history)<=MAX+1 and history[0]==0 and
            all(0<=h<=5 for h in history) and 0<=pseq<=MAX and
            0<=phead<=5 and isinstance(checked,bool) and effects in (0,1) and
            isinstance(last_ok,bool) and 0<=maxever<=MAX and 0<=lastseq<=MAX and
            isinstance(last_below,bool) and isinstance(provisioned,bool)):
        return "TypeOK"
    if not last_ok:
        return "NoUnpinnedEffect"
    if pseq>maxever:
        return "ReturningPinNeverAhead"
    return None

def safe_steps(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq,last_below,provisioned=s
    out=[];cur=len(history)-1
    if cur<MAX:
        for h in HEADS:
            if h not in history:
                out.append((f"Advance({h})",(history+(h,),pseq,phead,False,effects,last_ok,
                                             max(maxever,cur+1),lastseq,last_below,provisioned)))
    if pinned_member(s):
        out.append(("ObserveCurrent",(history,cur,history[-1],False,effects,last_ok,maxever,
                                      lastseq,last_below,provisioned)))
        out.append(("MembershipCheck",(history,pseq,phead,True,effects,last_ok,maxever,
                                       lastseq,last_below,provisioned)))
    if len(history)>1:
        out.append(("CoordinatedRollback",(history[:-1],pseq,phead,False,effects,last_ok,maxever,
                                           lastseq,last_below,provisioned)))
    if checked:
        out.append(("Dispatch",(history,pseq,phead,False,1,pinned_member(s),maxever,cur,
                                cur<maxever,provisioned)))
    return out

def mutant_steps(s,kind):
    out=list(safe_steps(s))
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq,last_below,provisioned=s
    cur=len(history)-1
    if kind=="numeric" and cur>=pseq:
        out.append(("NumericCheck",(history,pseq,phead,True,effects,last_ok,maxever,lastseq,
                                    last_below,provisioned)))
    return out

def explore(kind=None, expected=None):
    q=deque([START]);prev={START:None};act={};edges=0
    while q:
        s=q.popleft();bad=inv(s)
        if bad:
            if expected and bad!=expected:
                raise SystemExit(f"{kind}: expected {expected}, got {bad}: {s}")
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((act[cur],cur));cur=prev[cur]
            return len(prev),edges,bad,list(reversed(trace))
        steps=safe_steps(s) if kind is None else mutant_steps(s,kind)
        for name,n in steps:
            edges+=1
            if n not in prev:
                prev[n]=s;act[n]=name;q.append(n)
    if expected:
        raise SystemExit(f"{kind}: no {expected} counterexample")
    return len(prev),edges,None,[]

states,edges,bad,_=explore()
if bad:
    raise SystemExit("safe ancestry failed "+bad)
print(f"client ancestry safe {states} states, {edges} edges; all effects follow exact pinned membership")

states,edges,bad,trace=explore("numeric","NoUnpinnedEffect")
if not any(name=="NumericCheck" for name,_ in trace):
    raise SystemExit(f"numeric counterexample did not use NumericCheck: {trace}")
print(f"numeric-only {bad} counterexample after {states} states / {edges} edges:",trace)

def provision_steps(s):
    history,pseq,phead,checked,effects,last_ok,maxever,lastseq,last_below,provisioned=s
    out=[];cur=len(history)-1
    if cur<MAX:
        for h in HEADS:
            if h not in history:
                out.append((f"Advance({h})",(history+(h,),pseq,phead,False,effects,last_ok,
                                             max(maxever,cur+1),lastseq,last_below,provisioned)))
    if len(history)>1:
        out.append(("CoordinatedRollback",(history[:-1],pseq,phead,False,effects,last_ok,maxever,
                                           lastseq,last_below,provisioned)))
    if cur<maxever:
        out.append(("ProvisionFresh",(history,cur,history[-1],False,effects,last_ok,maxever,
                                      lastseq,last_below,True)))
    if provisioned and pinned_member(s):
        out.append(("ProvisionCheck",(history,pseq,phead,True,effects,last_ok,maxever,
                                      lastseq,last_below,provisioned)))
    if checked:
        out.append(("Dispatch",(history,pseq,phead,False,1,pinned_member(s),maxever,cur,
                                cur<maxever,provisioned)))
    return out

def provision_counterexample():
    q=deque([START]);prev={START:None};act={};edges=0
    while q:
        s=q.popleft()
        if s[8]:
            trace=[];cur=s
            while prev[cur] is not None:
                trace.append((act[cur],cur));cur=prev[cur]
            trace=list(reversed(trace))
            names=[name for name,_ in trace]
            required=["CoordinatedRollback","ProvisionFresh","ProvisionCheck","Dispatch"]
            at=-1
            for wanted in required:
                at=next((i for i,name in enumerate(names) if i>at and name==wanted),-1)
                if at<0:
                    raise SystemExit(f"fresh provisioning witness missing {wanted}: {trace}")
            return len(prev),edges,trace
        for name,n in provision_steps(s):
            edges+=1
            if n not in prev:
                prev[n]=s;act[n]=name;q.append(n)
    raise SystemExit("fresh provisioning counterexample missing")

states,edges,trace=provision_counterexample()
print(f"fresh-provisioning NoEffectBelowExternalMax counterexample after {states} states / {edges} edges:",trace)
