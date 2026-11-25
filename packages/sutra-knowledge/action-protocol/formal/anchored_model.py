"""Independent bounded state exploration, not a Go or TLA refinement proof."""
from collections import deque

ALLOWED = {1, 2}
INIT = ((), frozenset({()}), (0, 0), frozenset(), frozenset())

def prefix(a, b):
    return b[:len(a)] == a

def violations(state):
    history, published, spent, pending, acked = state
    result = set()
    if not set(history) <= ALLOWED:
        result.add("Authorized")
    if len(set(history)) != len(history):
        result.add("Unique")
    if sum(spent) > 3 or max(spent) > 2:
        result.add("BoundedContacts")
    if not acked <= set(history):
        result.add("ReceiptSound")
    if not all(prefix(h, history) for h in published):
        result.add("NoRollback")
    if not all(prefix(a, b) or prefix(b, a) for a in published for b in published):
        result.add("NoFork")
    return result

def successors(state, mode):
    history, published, spent, pending, acked = state
    for c in range(2):
        if spent[c] >= (3 if mode == "budget" else 2) or sum(spent) >= (4 if mode == "budget" else 3):
            continue
        count = tuple(n + (i == c) for i, n in enumerate(spent))
        for k in (1, 2, 3):
            yield ("dispatch", c, k), (history, published, count, pending | {(c, k, history)}, acked)
            yield ("status", c, k), (history, published, count, pending, acked | ({k} if k in history else set()))
    for msg in sorted(pending):
        c, k, parent = msg
        remaining = pending - {msg}
        yield ("drop", msg), (history, published, spent, remaining, acked)
        for ack in (False, True):
            h, p, a = history, published, acked
            if (k in ALLOWED or mode == "unauthorized") and (parent == history or mode == "stale"):
                if k in history:
                    a = acked | ({k} if ack else set())
                elif len(parent) < 2 and k not in parent:
                    h = parent + (k,)
                    p = published | {h}
                    a = acked | ({k} if ack else set())
            yield ("deliver", msg, ack), (h, p, spent, remaining, a)
    if mode == "rollback" and history:
        yield ("rollback",), (history[:-1], published, spent, pending, acked)
    yield ("crash",), state

def explore(mode, target=None):
    parents = {INIT: None}
    queue = deque([INIT])
    edges = 0
    exhausted_unknown = False
    while queue:
        state = queue.popleft()
        bad = violations(state)
        if (target in bad) if target else bool(bad):
            trace = []
            cursor = state
            while parents[cursor] is not None:
                cursor, label = parents[cursor]
                trace.append(label)
            if target is None:
                raise AssertionError((bad, trace[::-1]))
            print(mode, target, "counterexample:", trace[::-1], "states", len(parents), "edges", edges)
            return
        h, p, spent, pending, acked = state
        # Committed but no receipt, no contacts left: unconditional recovery
        # is impossible even if the receiver is correct.
        exhausted_unknown |= bool(h and not acked and sum(spent) == 3 and not pending)
        for label, nxt in successors(state, mode):
            edges += 1
            if nxt not in parents:
                parents[nxt] = (state, label)
                queue.append(nxt)
    if target:
        raise AssertionError("mutant survived: " + mode)
    assert exhausted_unknown, "missing bounded-liveness counterexample"
    print("safe", len(parents), "states", edges, "edges; exhausted unknown reachable")

if __name__ == "__main__":
    explore("safe")
    for mode, target in (("unauthorized","Authorized"), ("budget","BoundedContacts"), ("rollback","NoRollback"), ("stale","NoFork")):
        explore(mode, target)
