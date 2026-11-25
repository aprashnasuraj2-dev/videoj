#!/usr/bin/env python3
"""Independent finite-session consumer. No JS execution or network.
A case is a trust input, never authenticated by the exported report itself.
CLI uses a separately constructed synthetic fixture as its case anchor.
"""
from copy import deepcopy
from fractions import Fraction
from hashlib import sha256
from itertools import combinations
from pathlib import Path
import json
import re
import sys
from verify import canonical, dim, ident, keys, load, recompute, fail

QUAL = "Conditional on the finite host-approved worlds, source pins and exact observations. Shared lineage is declared, not proof of independence. Costs are declared per observation; source bytes may contain multiple fields."
FQUAL = "Optimal only over declared finite worlds, deterministic observation partitions and additive costs. Neither model completeness nor observation validity is verified."
DECISIVE = {"constraint_satisfied", "constraint_refuted"}


def require(ok):
    if not ok:
        fail()


def rawhash(text):
    return "sha256:" + sha256(text.encode("utf-8")).hexdigest()


def bounded_load(text, cap, depth):
    obj = load(text, cap)
    stack = [(obj, 0)]
    while stack:
        x, d = stack.pop()
        require(d <= depth)
        if isinstance(x, dict):
            stack.extend((v, d+1) for v in x.values())
        elif isinstance(x, list):
            stack.extend((v, d+1) for v in x)
    return obj


def wire_value(v):
    require(isinstance(v, str) and re.fullmatch(r"-?(?:0|[1-9][0-9]{0,154})/[1-9][0-9]{0,154}", v))
    f = Fraction(v)
    require(v == f"{f.numerator}/{f.denominator}" and abs(f.numerator).bit_length() <= 512
            and f.denominator.bit_length() <= 512)


def indexed(items, fields, maximum, minimum=0):
    require(isinstance(items, list) and minimum <= len(items) <= maximum)
    result = {}
    for x in items:
        require(keys(x, fields) and ident(x["id"]) and x["id"] not in result)
        result[x["id"]] = x
    return dict(sorted(result.items()))


def frontier(case, summaries, predictions, available):
    """Set-based recursive policy search; retain visited subsets for diagnostics."""
    ids = tuple(summaries)
    common = dict(version=1, decisionId=case["decisionId"], costUnit=case["costUnit"],
                  worlds=list(summaries.values()), qualification=FQUAL)
    unresolved = [i for i in ids if summaries[i]["decision"] not in DECISIVE]
    if unresolved:
        return dict(common, status="unresolved_worlds", unresolved=unresolved, plan=None, statesEvaluated=0)
    partitions = {}
    for o in available:
        values = sorted({predictions[i][o["nodeId"]]["value"] for i in ids})
        partitions[o["id"]] = {i: "value_"+str(values.index(predictions[i][o["nodeId"]]["value"])) for i in ids}
    memo = {}

    def search(group):
        if group in memo:
            return memo[group]
        labels = {summaries[i]["decision"] for i in group}
        if len(labels) == 1:
            result = dict(kind="decision", worlds=list(group), decision=next(iter(labels)), worstCost=0, bestCost=0)
        else:
            candidates = []
            for o in available:
                p = partitions[o["id"]]
                parts = {label: tuple(i for i in group if p[i] == label) for label in sorted({p[i] for i in group})}
                if len(parts) < 2:
                    continue
                branches = []
                for label, part in parts.items():
                    sub = search(part)
                    if sub is None:
                        break
                    branches.append(dict(outcome=label, next=sub))
                if len(branches) != len(parts):
                    continue
                cost = o["cost"]
                candidates.append(dict(kind="observe", worlds=list(group), observationId=o["id"], cost=cost,
                    worstCost=cost+max(b["next"]["worstCost"] for b in branches),
                    bestCost=cost+min(b["next"]["bestCost"] for b in branches), branches=branches))
            result = min(candidates, key=lambda p: (p["worstCost"], p["bestCost"], p["observationId"]), default=None)
        memo[group] = result
        return result

    plan = search(ids)
    if plan is not None:
        return dict(common, status="invariant_decision" if plan["kind"] == "decision" else "conditional_observation_plan",
                    plan=plan, statesEvaluated=len(memo))
    witness = next(([a,b] for a in ids for b in ids if summaries[a]["decision"] != summaries[b]["decision"]
                    and all(p[a] == p[b] for p in partitions.values())), None)
    require(witness is not None)
    return dict(common, status="insufficient_observations", witness=witness, plan=None, statesEvaluated=len(memo))


def minimum_conflict(matches, world_ids):
    # Set intersection rather than producer bitmasks. Test every smaller subset.
    for size in range(1, len(matches)+1):
        for subset in combinations(sorted(matches), size):
            if not set(world_ids).intersection(*(matches[i] for i in subset)):
                return list(subset)
    return None


def reconstruct(case_text, events):
    c = bounded_load(case_text, 262144, 9)
    require(keys(c, ("version","decisionId","scope","costUnit","worlds","sources","offers"))
            and type(c["version"]) is int and c["version"] == 1
            and all(ident(c[k]) for k in ("decisionId","scope","costUnit")))
    worlds = indexed(c["worlds"], ("id","graphText","constraintId"), 12, 1)
    sources = indexed(c["sources"], ("id","version","digest","lineage"), 8, 1)
    offers = indexed(c["offers"], ("id","nodeId","sourceId","cost","dimension"), 8)
    for s in sources.values():
        require(ident(s["version"]) and ident(s["lineage"]) and isinstance(s["digest"],str)
                and re.fullmatch(r"sha256:[a-f0-9]{64}",s["digest"]))
    for o in offers.values():
        require(ident(o["nodeId"]) and ident(o["sourceId"]) and o["sourceId"] in sources
                and type(o["cost"]) is int and 1 <= o["cost"] <= 1000000 and dim(o["dimension"]))
    require(len({(o["sourceId"],o["nodeId"]) for o in offers.values()}) == len(offers))
    summaries, predictions = {}, {}
    for i,w in worlds.items():
        g = bounded_load(w["graphText"],65536,12)
        require(ident(w["constraintId"]) and any(n.get("id")==w["constraintId"] and n.get("kind")=="constraint" for n in g["nodes"]))
        r = json.loads(recompute(w["graphText"]))
        receipts = {x["id"]:x for x in r["receipts"]}
        predictions[i] = {k:v["outcome"] for k,v in receipts.items()}
        target = receipts[w["constraintId"]]
        summaries[i] = dict(id=i, decision=target["outcome"]["status"], graphDigest=r["graphDigest"],receiptDigest=target["receiptDigest"])
        for o in offers.values():
            q = predictions[i].get(o["nodeId"],{})
            require(q.get("dimension")==o["dimension"])
            wire_value(q.get("value"))
    require(isinstance(events,list) and len(events)<=24)
    blocked_sources, blocked_lineages, active, history = set(),set(),{},[]
    def available(s):
        return s["id"] not in blocked_sources and s["lineage"] not in blocked_lineages
    for e in events:
        require(isinstance(e,dict))
        t=e.get("type")
        if t=="read":
            require(keys(e,("type","observationId","sourceText")) and ident(e["observationId"])
                    and e["observationId"] in offers and e["observationId"] not in active)
            o=offers[e["observationId"]]; s=sources[o["sourceId"]]
            require(available(s) and isinstance(e["sourceText"],str) and rawhash(e["sourceText"])==s["digest"])
            d=bounded_load(e["sourceText"],65536,7)
            require(keys(d,("version","sourceId","sourceVersion","scope","values"))
                    and type(d["version"]) is int and d["version"]==1 and d["sourceId"]==s["id"]
                    and d["sourceVersion"]==s["version"] and d["scope"]==c["scope"]
                    and isinstance(d["values"],dict) and len(d["values"])<=32)
            for n,v in d["values"].items():
                require(ident(n) and keys(v,("value","dimension")) and dim(v["dimension"]))
                wire_value(v["value"])
            v=d["values"].get(o["nodeId"],{})
            require(v.get("dimension")==o["dimension"])
            r=dict(observationId=o["id"],nodeId=o["nodeId"],sourceId=s["id"],sourceVersion=s["version"],
                   sourceDigest=s["digest"],lineage=s["lineage"],scope=c["scope"],value=v["value"],
                   dimension=v["dimension"],level="host_pinned_bytes",truthStatus="unverified")
            active[o["id"]]=r
            history.append(dict(type="read",receipt=r))
        else:
            require(t in ("withdraw_source","restore_source","withdraw_lineage","restore_lineage"))
            is_source=t.endswith("_source")
            field="sourceId" if is_source else "lineage"
            valid=sources if is_source else {s["lineage"] for s in sources.values()}
            blocked=blocked_sources if is_source else blocked_lineages
            require(keys(e,("type",field)) and ident(e[field]) and e[field] in valid)
            if t.startswith("withdraw"):
                require(e[field] not in blocked)
                blocked.add(e[field])
            else:
                require(e[field] in blocked)
                blocked.remove(e[field])
            active={i:r for i,r in active.items() if available(sources[r["sourceId"]])}
            history.append(e)
    matches={i:{w for w in worlds if predictions[w][r["nodeId"]]["value"]==r["value"]} for i,r in active.items()}
    surviving=sorted(set(worlds).intersection(*matches.values()))
    groups={l:sorted(i for i,r in active.items() if r["lineage"]==l) for l in sorted({r["lineage"] for r in active.values()})}
    base=dict(version=1,decisionId=c["decisionId"],scope=c["scope"],costUnit=c["costUnit"],truthStatus="unverified",
              qualification=QUAL,worlds=list(summaries.values()),survivingWorlds=surviving,
              unavailableSources=[i for i,s in sources.items() if not available(s)],lineageGroups=groups,
              activeEvidence=list(active.values()),history=history)
    if not surviving:
        return dict(base,status="inconsistent_observations",conflict=minimum_conflict(matches,worlds),frontier=None)
    f=frontier(c,{i:summaries[i] for i in surviving},predictions,
               [o for i,o in offers.items() if i not in active and available(sources[o["sourceId"]])])
    return dict(base,status=f["status"],frontier=f)


def verify_export(bundle, trusted_case):
    # Never let the report replace the caller's independently selected case.
    try:
        require(keys(bundle,("version","caseText","events","result")) and type(bundle["version"]) is int
                and bundle["version"]==1 and bundle["caseText"]==trusted_case)
        events=bounded_load(canonical(bundle["events"]),262144,6)
        return canonical(reconstruct(trusted_case,events))==canonical(bundle["result"])
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError, UnicodeError, RecursionError):
        return False


def fixture_anchor():
    """Frozen synthetic fixture constructed separately, not taken from the export."""
    def compact(o):
        return json.dumps(o,ensure_ascii=False,separators=(",",":"))
    scope="synthetic_binary_models"
    records=[("lab_a","a","0/1","sample_one"),("lab_copy","a","0/1","sample_one"),
             ("lab_b","a","1/1","sample_two"),("lab_c","b","1/1","sample_three")]
    sources=[]
    for i,n,v,l in records:
        text=compact(dict(version=1,sourceId=i,sourceVersion="v1",scope=scope,values={n:dict(value=v,dimension=[0,0,0])}))
        sources.append(dict(id=i,version="v1",digest=rawhash(text),lineage=l))
    worlds=[]
    for a in range(2):
        for b in range(2):
            nodes=[dict(id=i,kind="input",value=str(v),dimension=[0,0,0],basis="Synthetic binary assumption")
                   for i,v in (("a",a),("b",b),("one",1))]
            nodes.extend([dict(id="sum",kind="derive",op="add",args=["a","b"]),
                          dict(id="target",kind="constraint",op="le",args=["sum","one"])])
            worlds.append(dict(id=f"w{a}{b}",graphText=compact(dict(schemaVersion=1,nodes=nodes)),constraintId="target"))
    offers=[dict(id=i,nodeId=n,sourceId=s,cost=cost,dimension=[0,0,0]) for i,n,s,cost in
            (("read_a","a","lab_a",1),("read_copy","a","lab_copy",2),("read_b","a","lab_b",1),("read_c","b","lab_c",3))]
    return compact(dict(version=1,decisionId="sum_at_most_one",scope=scope,costUnit="synthetic_effort",
                        worlds=worlds,sources=sources,offers=offers))


def main():
    require(len(sys.argv)==4)
    trusted=fixture_anchor()
    for path,expected in zip(sys.argv[1:],("inconsistent_observations","conditional_observation_plan","invariant_decision")):
        with Path(path).open(encoding="utf-8") as f:
            bundle=load(f.read(1048577),1048576)
        require(verify_export(bundle,trusted) and bundle["result"]["status"]==expected)
        print("ACCEPTED",Path(path).name,expected)
        variants=[]
        bad=deepcopy(bundle);bad["result"]["truthStatus"]="verified";variants.append(("truth escalation",bad))
        bad=deepcopy(bundle);bad["result"]["survivingWorlds"]=["w00"];variants.append(("forged survivors",bad))
        bad=deepcopy(bundle);bad["events"][0]["sourceText"]+=" ";variants.append(("changed source bytes",bad))
        bad=deepcopy(bundle);bad["result"]["history"]=[];variants.append(("erased history",bad))
        bad=deepcopy(bundle);bad["caseText"]+=" ";variants.append(("untrusted case substitution",bad))
        if expected=="inconsistent_observations":
            bad=deepcopy(bundle);bad["result"]["conflict"]=["read_a","read_b","read_copy"];variants.append(("nonminimal witness",bad))
        else:
            bad=deepcopy(bundle);bad["result"]["frontier"]["plan"]["worstCost"]+=1;variants.append(("forged policy cost",bad))
        for name,bad in variants:
            require(not verify_export(bad,trusted))
            print("REJECTED",name)


if __name__=="__main__":
    main()
