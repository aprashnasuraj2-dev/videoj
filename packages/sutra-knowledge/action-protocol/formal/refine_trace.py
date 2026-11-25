#!/usr/bin/env python3
"""Independent finite checker for one concrete Go SharedAuthority execution trace.

This is a trace-refinement witness, not a proof that every Go execution refines
AnchoredRecovery.tla. It intentionally checks only the exported bounded profile.
"""
import json
import sys

def fail(msg):
    raise SystemExit("refinement failure: " + msg)

def main(path):
    data=json.load(open(path,"r",encoding="utf-8"))
    if data.get("profile")!="SUTRA/shared-authority-refinement/v1": fail("profile")
    per=data.get("perCallerLimit"); total_limit=data.get("totalLimit")
    if per!=2 or total_limit!=3: fail("limits")
    events=data.get("events")
    if not isinstance(events,list) or len(events)!=4: fail("event count")
    spent=[0,0]; total=0; history=[]; previous=None
    abstract=[]
    saw_lost=saw_stale=saw_budget=False
    for i,e in enumerate(events):
        caller=e["caller"]-1
        if caller not in (0,1): fail(f"caller {i}")
        if previous is not None and e["before"]!=previous: fail(f"head chain {i}")
        if e["stale"] != (e["expected"]!=e["before"]): fail(f"stale flag {i}")
        outcome=e["outcome"]; op=e["op"]; key=e["key"]
        if outcome=="budget":
            if spent[caller] < per and total < total_limit: fail("premature budget")
            if e["after"]!=e["before"]: fail("budget changed head")
            if e["callerSpent"]!=spent[caller] or e["totalSpent"]!=total: fail("budget counters")
            abstract.append(["Refused",caller+1,key,"CanContact=false"])
            saw_budget=True
        else:
            if spent[caller]>=per or total>=total_limit: fail("contact exceeded budget")
            spent[caller]+=1;total+=1
            if e["callerSpent"]!=spent[caller] or e["totalSpent"]!=total: fail(f"counter step {i}")
            if e["after"]==e["before"]: fail(f"accepted contact did not advance head {i}")
            if op=="commit":
                abstract.append(["Dispatch",caller+1,key])
                if e["stale"]:
                    if outcome!="conflict" or e["receiptVersion"]!=0: fail("stale commit mutated")
                    abstract.append(["Deliver",caller+1,key,False,"stale-parent-refused"])
                elif outcome=="committed":
                    if key not in history:
                        history.append(key)
                        if e["receiptVersion"]!=len(history): fail("new receipt version")
                    elif e["receiptVersion"]!=history.index(key)+1: fail("dedup receipt version")
                    abstract.append(["Deliver",caller+1,key,bool(e["ack"])])
                else: fail("unexpected commit outcome")
            elif op=="status":
                abstract.append(["Status",caller+1,key])
                if outcome=="committed":
                    if key not in history or e["receiptVersion"]!=history.index(key)+1: fail("unsound status receipt")
                elif outcome=="absent":
                    if key in history: fail("committed key reported absent")
                else: fail("unexpected status outcome")
            else: fail("op")
        previous=e["after"]
        if not e["ack"]: saw_lost=True
        if e["stale"]: saw_stale=True
    if spent!=[2,1] or total!=3: fail("final budget")
    if len(history)!=2: fail("two committed approved keys not observed")
    if not (saw_lost and saw_stale and saw_budget): fail("missing adversarial witness")
    print(json.dumps({
      "accepted":True,
      "goEvents":len(events),
      "abstractSteps":abstract,
      "finalSpent":[2,1],
      "finalHistoryKeys":history,
      "witnesses":{"lostAcknowledgement":saw_lost,"stalePinRecovery":saw_stale,"globalBudgetRefusal":saw_budget},
      "scope":"one bounded concrete trace; not general Go/TLA refinement proof"
    },indent=2))

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("usage: refine_trace.py TRACE.json")
    main(sys.argv[1])
