#!/usr/bin/env python3
"""Independent finite explorer for causal compensation authorization."""
from collections import deque

NONE, PRIMARY, COMP = "none", "primary", "compensation"
STARTS=[(prior,False,NONE,False,0) for prior in (False,True)]

def safe_steps(s):
    prior,auth,grant,admitted,effects=s
    out=[("Status",s)]
    if grant==NONE:
        out.append(("IssueCompGrant",(prior,auth,COMP,admitted,effects)))
        out.append(("IssuePrimaryGrant",(prior,auth,PRIMARY,admitted,effects)))
    if prior and not auth:
        out.append(("AuthorizeCausalCompensation",(prior,True,grant,admitted,effects)))
    if prior and auth and grant==COMP and not admitted:
        out.append(("DispatchCompensation",(prior,auth,grant,True,1)))
    if admitted and effects==1:
        out.append(("RetrySameCompensation",s))
    return out

def violation(s):
    prior,auth,grant,admitted,effects=s
    if prior not in (False,True) or auth not in (False,True) or grant not in (NONE,PRIMARY,COMP) or admitted not in (False,True) or effects not in (0,1):
        return "TypeOK"
    if effects and not (prior and auth and grant==COMP and admitted):
        return "CompensationRequiresCausalAuthority"
    return None

def explore(stepper, expected=None):
    q=deque(STARTS);prev={s:None for s in STARTS};action={};edges=0
    while q:
        s=q.popleft()
        bad=violation(s)
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

def noauth(s):
    out=list(safe_steps(s));prior,auth,grant,admitted,effects=s
    if prior and not auth and grant==COMP and effects==0:
        out.append(("DispatchWithoutSeparateAuth",(prior,auth,grant,True,1)))
    return out
print("noauth",explore(noauth,"CompensationRequiresCausalAuthority"))

def primary(s):
    out=list(safe_steps(s));prior,auth,grant,admitted,effects=s
    if prior and auth and grant==PRIMARY and effects==0:
        out.append(("DispatchPrimaryAsCompensation",(prior,auth,grant,True,1)))
    return out
print("primary",explore(primary,"CompensationRequiresCausalAuthority"))

def noprior(s):
    out=list(safe_steps(s));prior,auth,grant,admitted,effects=s
    if not prior and effects==0:
        out.append(("DispatchWithoutPriorApplied",(prior,auth,grant,True,1)))
    return out
print("noprior",explore(noprior,"CompensationRequiresCausalAuthority"))
