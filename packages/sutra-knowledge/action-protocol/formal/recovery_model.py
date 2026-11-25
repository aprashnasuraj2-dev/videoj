"""Independent bounded state explorer; not TLC or implementation refinement."""
from collections import deque

# (durable ledger, effects, volatile staged flag, caller phases, pending set)
INITIAL = (False, 0, False, ('proposed', 'proposed'), frozenset())


def successors(state, safe):
    ledger, effects, staged, phases, pending = state
    def phase(i, value):
        return tuple(value if j == i else p for j, p in enumerate(phases))
    for i in range(2):
        if phases[i] != 'committed' and i not in pending:
            yield f'dispatch/retry({i})', (ledger, effects, staged, phase(i, 'unknown'), pending | {i})
        if i in pending:
            rest = pending - {i}
            yield f'drop({i})', (ledger, effects, staged, phases, rest)
            if ledger:
                for ack in (False, True):
                    yield f'dedup({i},ack={ack})', (ledger, effects, staged, phase(i, 'committed') if ack else phases, rest)
            elif safe:
                for ack in (False, True):
                    yield f'atomic({i},ack={ack})', (True, effects + 1, False, phase(i, 'committed') if ack else phases, rest)
            elif not staged and effects < 2:
                yield f'unsafe_effect({i})', (False, effects + 1, True, phases, rest)
        if phases[i] == 'unknown' and ledger:
            yield f'status({i})', (ledger, effects, staged, phase(i, 'committed'), pending)
    if staged:
        yield 'finalize', (True, effects, False, phases, pending)
        yield 'crash', (ledger, effects, False, phases, pending)


def explore(safe):
    todo = deque([INITIAL]); parents = {INITIAL: None}; edges = 0
    while todo:
        s = todo.popleft()
        ledger, effects, staged, phases, pending = s
        if effects > 1 or ('committed' in phases and not ledger):
            trace = []
            while parents[s] is not None:
                previous, action = parents[s]
                trace.append((action, s)); s = previous
            return len(parents), edges, trace[::-1]
        for action, nxt in successors(s, safe):
            edges += 1
            if nxt not in parents:
                parents[nxt] = (s, action); todo.append(nxt)
    return len(parents), edges, None


if __name__ == '__main__':
    count, edges, trace = explore(True)
    assert trace is None
    print(f'safe: {count} reachable states, {edges} transitions, no safety violation')
    count, edges, trace = explore(False)
    assert trace is not None and trace[-1][1][1] == 2
    print(f'unsafe: counterexample after {count} discovered states and {edges} transitions')
    for action, state in trace:
        print(action, 'ledger=', state[0], 'effects=', state[1], 'staged=', state[2])
