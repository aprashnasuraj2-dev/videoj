#!/usr/bin/env python3
"""Check concrete Go bridge snapshots against WitnessBridgeLossy.tla.

No Go import, no generated synthetic trace accepted in place of the eight
required scenarios. Signed snapshots and challenge responses are checked in
Go; this checker independently checks the exported abstract transition order,
digest/version consistency, contact/effect accounting and acknowledgement.
A rejected clone is outside the admitted model, deliberately not a safe state.
"""
import copy
import json
import pathlib
import re
import sys

PROFILE = "SUTRA/witness-bridge-refinement/v1"
BASE = ("init", "after-intent", "after-authority", "after-witness", "after-clear")
TRANSITION = BASE[1:]
EXPECTED = {
    "normal": (BASE + ("ack",), (1, 1, 1, 1)),
    "after-intent": (BASE[:2] + ("crash", "restart", "after-recover-abort", "recovered"), (0, 0, 0, 0)),
    "after-authority": (BASE[:3] + ("crash", "restart", "after-recover-advance", "after-recover-clear", "recovered"), (1, 1, 1, 0)),
    "after-witness": (BASE[:4] + ("crash", "restart", "after-recover-clear", "recovered"), (1, 1, 1, 0)),
    "after-clear": (BASE + ("crash", "restart", "recovered") + TRANSITION + ("ack",), (2, 2, 1, 2)),
    "lost-witness": (BASE[:3] + ("lost-witness-response", "after-recover-clear", "recovered") + TRANSITION + ("ack",), (2, 2, 1, 2)),
    "lost-final": (BASE + ("lost-final-response",) + TRANSITION + ("ack",), (2, 2, 1, 2)),
    "clone-rejected": (("init", "clone-rejected"), (0, 1, 0, 0)),
}
FIELDS = {"profile", "event", "authorityHead", "witnessHead", "witnessSequence", "callerSpent", "totalSpent", "effects", "intent"}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def digest(s):
    return isinstance(s, str) and re.fullmatch("[0-9a-f]{64}", s) is not None and s != "0"*64

def check_scenario(name, events):
    expected, final = EXPECTED[name]
    require(tuple(x.get("event") for x in events) == expected, f"{name}: exact observed event sequence")
    heads, versions = {}, {}
    previous, previous_i, ack, abstract = None, None, 0, []

    def bind(version, head):
        require(digest(head), f"{name}: head digest")
        require(heads.get(version, head) == head and versions.get(head, version) == version, f"{name}: head/version equivocation")
        heads[version], versions[head] = head, version

    for number, row in enumerate(events):
        label = row["event"]
        prefix = f"{name}/{number}/{label}"
        require(set(row) == FIELDS and row["profile"] == PROFILE, f"{prefix}: closed trace schema")
        a, w, effects = row["totalSpent"], row["witnessSequence"], row["effects"]
        spent = row["callerSpent"]
        require(type(a) is int and type(w) is int and type(effects) is int, f"{prefix}: integer counters")
        require(isinstance(spent, list) and len(spent) == 2 and all(type(x) is int and 0 <= x <= 2 for x in spent), f"{prefix}: caller limits")
        require(sum(spent) == a and 0 <= a <= 3 and 0 <= w <= 3 and 0 <= effects <= min(a, 2), f"{prefix}: bounded ledger")
        ah, wh, intent = row["authorityHead"], row["witnessHead"], row["intent"]
        bind(a, ah)
        bind(w, wh)
        i = None
        if intent is not None:
            require(set(intent) == {"requestHash", "before", "after"} and all(digest(v) for v in intent.values()), f"{prefix}: signed intent fields")
            before, after = intent["before"], intent["after"]
            require(before != after, f"{prefix}: intent must advance")
            if ah == wh == before:
                i = (a, a+1)
                require(w == a and after not in versions, f"{prefix}: prepared head coherence")
            elif ah == after and wh == before:
                i = (a-1, a)
                require(w == a-1, f"{prefix}: unresolved gap coherence")
            elif ah == wh == after:
                i = (a-1, a)
                require(w == a and heads.get(a-1) == before, f"{prefix}: settled intent coherence")
            else:
                raise ValueError(f"{prefix}: incoherent durable intent")
            require(0 <= i[0] < i[1] <= 3, f"{prefix}: intent bounds")

        if label == "clone-rejected":
            require(previous is not None and name == "clone-rejected", f"{prefix}: clone context")
            require(a == 0 and w == 1 and effects == 0 and spent == [0,0] and i is None and ack == 0, f"{prefix}: rejected clone mutated")
            abstract.append(["RejectedOutsideSpec", a, w, i, ack])
        else:
            if label == "ack":
                require(a == w and i is None and a > ack, f"{prefix}: premature acknowledgement")
                ack = a
            require(w <= a and ack <= w and a-w <= 1, f"{prefix}: witness/ack/gap bounds")
            require(a == w or i == (w,a), f"{prefix}: unrecoverable gap")
            if previous is None:
                require(label == "init" and a == w == effects == ack == 0 and i is None, f"{prefix}: genesis")
                action = "Init"
            else:
                pa, pw, pe, ps, pi, pack = previous
                same_ledger = (a, effects, spent) == (pa, pe, ps)
                if label == "after-intent":
                    require(same_ledger and w == pw == a and pi is None and i == (a,a+1), f"{prefix}: Prepare")
                    action = "PrepareWithoutAck"
                elif label == "after-authority":
                    require(pi == (pa,pa+1) and i == pi and intent == previous_i and a == pa+1 and w == pw == pa, f"{prefix}: CommitAuthority")
                    require(effects in (pe,pe+1) and sum(x-y for x,y in zip(spent,ps)) == 1 and all(x-y in (0,1) for x,y in zip(spent,ps)), f"{prefix}: one charged contact")
                    action = "CommitAuthority"
                elif label in ("after-witness", "after-recover-advance", "lost-witness-response"):
                    require(same_ledger and pi == (pw,pa) and i == pi and intent == previous_i and a == pa == w == pw+1, f"{prefix}: AdvanceWitness")
                    action = "AdvanceWitness"
                elif label in ("after-clear", "after-recover-clear"):
                    require(same_ledger and w == pw == a and pi == (a-1,a) and i is None, f"{prefix}: ClearIntent")
                    action = "ClearIntent"
                elif label == "after-recover-abort":
                    require(same_ledger and w == pw == a and pi == (a,a+1) and i is None, f"{prefix}: AbortPrepared")
                    action = "AbortPrepared"
                elif label in ("crash", "restart", "recovered", "lost-final-response", "ack"):
                    require(same_ledger and w == pw and i == pi and intent == previous_i, f"{prefix}: stutter/ack changed durable state")
                    if label == "recovered":
                        require(a == w and i is None, f"{prefix}: recovery not converged")
                    action = "Acknowledge" if label == "ack" else "Crash/Stutter"
                else:
                    raise ValueError(f"{prefix}: unsupported transition")
                if label != "ack":
                    require(ack == pack, f"{prefix}: acknowledgement moved without proof")
            abstract.append([action, a, w, i, ack])
        previous, previous_i = (a,w,effects,spent,i,ack), intent

    a,w,effects,spent,i,ack = previous
    require((a,w,effects,ack) == final and spent == [a,0] and i is None, f"{name}: final state/accounting")
    return {"scenario":name,"events":len(events),"abstract":abstract,"final":{"authority":a,"witness":w,"effects":effects,"ack":ack,"callerSpent":spent}}

def main(directory):
    root=pathlib.Path(directory)
    require({p.name for p in root.glob("*.jsonl")} == {name+".jsonl" for name in EXPECTED}, "exact eight trace files required")
    source={name:[json.loads(line) for line in (root/(name+".jsonl")).read_text(encoding="utf-8").splitlines()] for name in EXPECTED}
    mapped=[check_scenario(name, events) for name,events in source.items()]
    # Independently challenge the checker itself against altered observed traces.
    mutants=[]
    cases=[
        ("missing-intent", "after-authority", 2, "intent", None),
        ("witness-ahead", "after-intent", 1, "witnessSequence", 1),
        ("digest-equivocation", "normal", 4, "authorityHead", source["normal"][0]["authorityHead"]),
        ("counter-reset", "lost-final", -1, "callerSpent", [0,0]),
        ("premature-ack", "normal", 5, "intent", source["normal"][3]["intent"]),
    ]
    for label,name,index,key,value in cases:
        bad=copy.deepcopy(source[name]);bad[index][key]=value
        try:
            check_scenario(name,bad)
        except ValueError as error:
            mutants.append({"mutant":label,"rejected":str(error)})
        else:
            raise ValueError("trace checker accepted "+label)
    print(json.dumps({"accepted":True,"scenarios":mapped,"traceTamperControls":mutants,"scope":"eight observed bounded traces; not general refinement, physical power-loss or consensus proof"},indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: refine_bridge_trace.py TRACE_DIRECTORY")
    try:
        main(sys.argv[1])
    except (ValueError, KeyError, TypeError, OSError) as exc:
        raise SystemExit("bridge refinement failure: "+str(exc))
