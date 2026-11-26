"""Independent array/subset exhaustive oracle on frozen declared cases.
No JS report is used to construct states, costs, decisions, or labels.
"""
import hashlib
import itertools
import json
import pathlib
import sys

blob = pathlib.Path(__file__).with_name("acquisition-development-cases.json").read_bytes()
digest = hashlib.sha1(("blob %d\0" % len(blob)).encode() + blob).hexdigest()
assert digest == "a5bd96c1667c9b980bbdfa34e1fb814baf692be0"
cases = json.loads(blob)["cases"]
received = json.load(sys.stdin)
assert received["frozenBlob"] == digest and received["caseCount"] == len(cases) == 30
assert [c["id"] for c in cases] == [r["id"] for r in received["results"]]
LABELS = {"exact": (("low",), ("high",)), "failed": (("low", "failed"), ("high", "failed")),
          "overlap": (("low", "mid"), ("high", "mid")), "same": (("common",), ("common",))}

def terminal(worlds):
    # A homogeneous truth set can be decided without loss; mixed set abstains.
    return 0 if len({w[2] for w in worlds}) == 1 else 6

def source(case, action):
    return "sy" if action["axis"] == "y" and not case["shared"] else "sx"

def cost(case, action, acquired):
    sid = source(case, action)
    return action["read"] + (0 if sid in acquired else case["sourceCosts"][0 if sid == "sx" else 1])

def groups(worlds, action):
    index = 0 if action["axis"] == "x" else 1
    out = {}
    for w in worlds:
        for label in LABELS[action["labels"]][int(w[index] == 4)]:
            out.setdefault(label, []).append(w)
    return list(out.values())

def oracle(case, worlds, actions, acquired, budget, depth):
    best = (terminal(worlds), "stop")
    if depth == 0:
        return best
    for a in sorted(actions, key=lambda a: a["id"]):
        if a["exposure"] > budget:
            continue
        tails = [oracle(case, group, [x for x in actions if x is not a],
                        acquired | {source(case, a)}, budget - a["exposure"], depth - 1)[0]
                 for group in groups(worlds, a)]
        candidate = cost(case, a, acquired) + max(tails)
        if candidate < best[0]:
            best = (candidate, a["id"])
    return best

def nonadaptive(case, worlds):
    best = terminal(worlds)
    for n in range(1, len(case["actions"]) + 1):
        for chosen in itertools.combinations(case["actions"], n):
            if sum(a["exposure"] for a in chosen) > case["budget"]:
                continue
            acquired = set(case["initiallyAcquired"])
            total = 0
            partitions = [worlds]
            for a in chosen:
                total += cost(case, a, acquired)
                acquired.add(source(case, a))
                partitions = [g for group in partitions for g in groups(group, a)]
            best = min(best, total + max(terminal(g) for g in partitions))
    return best

rows = []
for c, r in zip(cases, received["results"]):
    two = c["model"] == "conjunction"
    worlds = [(x, y, x*y > 9 if two else x > 3)
              for x in (2, 4) for y in ((2, 4) if two else (2,))]
    best, root = oracle(c, worlds, c["actions"], set(c["initiallyAcquired"]), c["budget"], len(c["actions"]))
    assert {"objective": best, "root": root} == c["expected"] == r["observed"], c["id"]
    report = r["report"]
    assert report["decisionAuthority"] == "NONE" and report["plan"]["worstObjective"] == best
    assert report["plan"]["worstExposure"] <= c["budget"]
    one = oracle(c, worlds, c["actions"], set(c["initiallyAcquired"]), c["budget"], 1)[0]
    fixed = nonadaptive(c, worlds)
    assert best <= one <= 6 and best <= fixed <= 6
    rows.append({"id": c["id"], "noObservation": 6, "oneRead": one, "nonadaptive": fixed, "exact": best, "root": root})
print(json.dumps({"profile": "sutra-acquisition-independent/v1", "frozenBlob": digest, "matched": len(rows),
                  "totals": {k: sum(r[k] for r in rows) for k in ("noObservation", "oneRead", "nonadaptive", "exact")},
                  "strictImprovementCases": {k: sum(r["exact"] < r[k] for r in rows) for k in ("noObservation", "oneRead", "nonadaptive")},
                  "qualification": "Developer-labeled synthetic cases, abstract losses, matched finite models; no real-world or strong-baseline superiority claim.",
                  "rows": rows}))
