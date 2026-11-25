#!/usr/bin/env python3
"""Independent finite explorer for upstream APPLIED-or-CLOSED semantics."""
from collections import deque
NONE, APPLIED, CLOSED = "none", "applied", "closed"
START = (NONE, 0, 0)  # terminal, signed-store effect count, physical effects

def safe_steps(s):
    terminal, store, physical = s
    out = [("Status", s)]
    if terminal == NONE and store < 1:
        out += [("Apply", (APPLIED, store + 1, physical + 1)),
                ("CloseUnapplied", (CLOSED, store, physical))]
    if terminal == APPLIED: out.append(("RetryApplied", s))
    if terminal == CLOSED: out.append(("RetryClosed", s))
    return out

def invariant(s):
    terminal, store, physical = s
    if terminal not in (NONE, APPLIED, CLOSED) or store not in range(2) or physical not in range(3): return "TypeOK"
    if physical > 1: return "AtMostOnePhysicalEffect"
    if terminal == APPLIED and store != 1: return "TerminalMatchesStore"
    if terminal == CLOSED and store != 0: return "ClosedHasNoStoreEffect"
    if store > 1: return "StoreBudget"
    return None

def explore(stepper, expected=None):
    q=deque([START]); prev={START:None}; action={}; edges=0
    while q:
        s=q.popleft(); bad=invariant(s)
        if bad:
            if bad != expected: raise SystemExit(f"unexpected {bad}: {s}")
            trace=[]; cur=s
            while prev[cur] is not None:
                trace.append((action[cur],cur)); cur=prev[cur]
            return len(prev),edges,bad,list(reversed(trace))
        for name,nxt in stepper(s):
            edges += 1
            if nxt not in prev: prev[nxt]=s; action[nxt]=name; q.append(nxt)
    if expected: raise SystemExit(f"expected {expected} counterexample not found")
    return len(prev),edges,None,[]

print("safe", explore(safe_steps)[:2])

def rollback_steps(s):
    out=list(safe_steps(s))
    if s[0] == APPLIED: out.append(("RollbackStore", (NONE,0,s[2])))
    return out
print("rollback", explore(rollback_steps,"AtMostOnePhysicalEffect"))

def clone_steps(s):
    out=list(safe_steps(s))
    if s[0] == APPLIED: out.append(("CloneApply", (s[0],s[1],s[2]+1)))
    return out
print("clone", explore(clone_steps,"AtMostOnePhysicalEffect"))
