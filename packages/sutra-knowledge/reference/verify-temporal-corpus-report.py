#!/usr/bin/env python3
"""Independent deterministic baseline and report arithmetic; no semantic authority."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import copy
import json
import math
import re
import sys

EVAL = Path(__file__).resolve().parents[1] / "evaluation"
SHA = "e71fa96f389e45d73c61915461f9b0b3f6207e956fd5b3eb72d19c66cfee9942"
STATES = {"UNSUPPORTED_GRAMMAR", "UNRESOLVED_BINDINGS", "UNREVIEWED_CANDIDATES"}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def match(pattern, text):
    return bool(re.search(pattern, text, re.ASCII))

def independent_baseline(question):
    if not isinstance(question,str) or not question.strip() or len(question.encode("utf-16-le"))//2 > 2048:
        return "ABSTAIN","INVALID_OR_OVERSIZE"
    q = question.lower()
    year = match(r"\b(?:18|19|20)\d{2}\b",q)
    relative = match(r"\b(?:currently|current|today|tomorrow|yesterday|now|latest|newest|recently|this (?:year|month|week)|next (?:year|month|week|season|election|summer|winter)|last (?:year|month|week|season|election|time)|as of now|so far|to date)\b",q)
    role = match(r"\b(?:who|what)\b.{0,35}\b(?:is|are)\b.{0,60}\b(?:president|prime minister|governor|mayor|ceo|chairperson|chairman|captain|coach|director|manager|leader|owner|job title|head of)\b",q)
    quantity = match(r"\b(?:how much|how many|what (?:is|are) the)\b.{0,80}\b(?:cost|price|salary|population|employees|members|subscribers|students|exchange rate|interest rate|worth|revenue|market share)\b",q)
    record = match(r"\b(?:most|highest|lowest|largest|smallest|fastest|record for)\b.{0,70}\b(?:goals|wins|points|population|sales|revenue|attendance|titles|awards|score|price|finishes|record|episodes)\b",q)
    if year and (relative or role or quantity or record):
        return "ABSTAIN","MIXED_ANCHOR_AND_DYNAMIC_CUE"
    if year:
        return "PREDICT_UNAMBIGUOUS","EXPLICIT_YEAR_BASELINE"
    for signal, reason in ((relative,"RELATIVE_TIME_CUE"),(role,"TIME_VARYING_ROLE_CUE"),
                           (quantity,"TIME_VARYING_QUANTITY_CUE"),(record,"TIME_VARYING_RECORD_CUE")):
        if signal:
            return "PREDICT_AMBIGUOUS",reason
    return "ABSTAIN","NO_DECLARED_TEMPORAL_CUE"

def rate(n,d):
    return n/d if d else None

def score(rows):
    count=Counter((r["prediction"],r["gold"]) for r in rows)
    tp,tn,fp,fn,aa,au=(count["PREDICT_AMBIGUOUS",True],count["PREDICT_UNAMBIGUOUS",False],
                      count["PREDICT_AMBIGUOUS",False],count["PREDICT_UNAMBIGUOUS",True],
                      count["ABSTAIN",True],count["ABSTAIN",False])
    n=len(rows)
    resolved=tp+tn+fp+fn
    return {"tp":tp,"tn":tn,"fp":fp,"fn":fn,"abstainAmbiguous":aa,"abstainUnambiguous":au,
            "n":n,"resolved":resolved,"coverage":rate(resolved,n),"selectiveAccuracy":rate(tp+tn,resolved),
            "selectivePrecision":rate(tp,tp+fp),"selectiveRecall":rate(tp,tp+fn),
            "allAmbiguousRecall":rate(tp,tp+fn+aa),"overallCorrect":rate(tp+tn,n)}

def compare(actual,expected):
    require(set(actual)==set(expected),"score fields")
    for k,v in expected.items():
        a=actual[k]
        if isinstance(v,float):
            require(type(a) in (int,float) and math.isclose(a,v,abs_tol=1e-12),"metric "+k)
        else:
            require(type(a) is type(v) and a==v,"count "+k)

def verify(report):
    raw=(EVAL/"tempambiqa-human-full-v1.json").read_bytes()
    require(len(raw)==937488 and sha256(raw).hexdigest()==SHA,"raw provenance")
    source=json.loads(raw)
    rows=report["rows"]
    require(report["version"]=="sutra-temporal-corpus-execution/v1" and report["rawSha256"]==SHA and report["authority"]=="NONE","report root")
    require(len(source)==len(rows)==8162,"row count")
    require(sum(x["is_ambiguous"] for x in source)==3879,"gold count")
    seen={}
    for i,(r,original) in enumerate(zip(rows,source)):
        q=original["question"]
        require(r["index"]==i and r["questionHash"]==sha256(q.encode("utf-8")).hexdigest(),"record identity")
        require(r["gold"] is original["is_ambiguous"],"gold mismatch")
        require((r["prediction"],r["reason"])==independent_baseline(q),"independent baseline mismatch at row "+str(i))
        require(r["engineState"] in STATES and r["engineReportingPeriod"] in {"NO_SIGNAL","EXPLICIT_OR_REVIEW"},"engine state")
        require(bool(re.fullmatch(r"sha256:[a-f0-9]{64}",r["previewPin"])),"preview pin")
        if q in seen:
            require({k:v for k,v in r.items() if k!="index"}=={k:v for k,v in seen[q].items() if k!="index"},"duplicate inconsistent")
        seen[q]=r
    require(len(seen)==8161,"distinct questions")
    compare(report["recordWeighted"],score(rows))
    compare(report["deduplicated"],score(list(seen.values())))
    for key,field in (("engineStates","engineState"),("engineReportingPeriodSignals","engineReportingPeriod"),("reasonCounts","reason")):
        require(report[key]==dict(Counter(x[field] for x in rows)),key)
    require(math.isclose(report["alwaysAmbiguousAccuracy"],3879/8162) and math.isclose(report["alwaysUnambiguousAccuracy"],4283/8162),"constant baselines")
    return {"records":len(rows),"distinctQuestions":len(seen),"recordWeighted":score(rows),"deduplicated":score(list(seen.values())),
            "scope":"Independent implementation of frozen cue rules and exact report aggregation; not independent human semantic judgment."}

def mutants(report):
    changes=[
        lambda r:r.update(authority="APPROVED"),
        lambda r:r["rows"][0].update(gold=not r["rows"][0]["gold"]),
        lambda r:r["rows"][0].update(questionHash="0"*64),
        lambda r:r["rows"][0].update(reason="TAMPERED"),
        lambda r:r["rows"][0].update(previewPin="not-a-digest"),
        lambda r:r["recordWeighted"].update(tp=0),
        lambda r:r["deduplicated"].update(n=0),
        lambda r:r["rows"].pop(),
    ]
    for change in changes:
        altered=copy.deepcopy(report)
        change(altered)
        try:
            verify(altered)
        except ValueError:
            continue
        raise ValueError("mutation accepted")
    return len(changes)

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("usage: verify-temporal-corpus-report.py report.json")
    report=json.loads(Path(sys.argv[1]).read_bytes())
    result=verify(report)
    result["rejectedMutants"]=mutants(report)
    print(json.dumps(result,indent=2))
