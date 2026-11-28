#!/usr/bin/env python3
"""Independent report arithmetic and provenance oracle; not a semantic parser."""
from collections import Counter
from hashlib import sha1, sha256
from pathlib import Path
import json
import math
import re
import sys

ROOT = Path(__file__).resolve().parents[1] / "evaluation"
SIGNALS = {"REVIEW_REQUIRED", "EXPLICIT_OR_REVIEW", "NO_SIGNAL", "EXPLICIT_POINTS", "EXPLICIT_RELATIVE"}
REVIEW = {"REVIEW_REQUIRED", "EXPLICIT_OR_REVIEW"}
STATES = {"UNSUPPORTED_GRAMMAR", "UNRESOLVED_BINDINGS", "UNREVIEWED_CANDIDATES"}
PIN = re.compile(r"sha256:[0-9a-f]{64}\Z")

def require(condition, message):
    if not condition:
        raise ValueError(message)

def load_rows(name, blob):
    data = (ROOT / name).read_bytes()
    require(sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() == blob, name)
    return [json.loads(x) for x in data.splitlines()]

def digest(s):
    return sha256(s.encode("utf-8")).hexdigest()

def divide(a, b):
    return a / b if b else None

def compare(actual, expected, label):
    if isinstance(expected, dict):
        require(isinstance(actual, dict) and set(actual) == set(expected), label + " keys")
        for key, value in expected.items():
            compare(actual[key], value, label + "/" + key)
    elif isinstance(expected, float):
        require(type(actual) in (int, float) and math.isclose(actual, expected, abs_tol=1e-12), label)
    else:
        require(type(actual) is type(expected) and actual == expected, label)

def tally(rows, key):
    return dict(Counter(x[key] for x in rows))

def summary(rows):
    return {"records":len(rows), "uniqueQuestions":len({x["questionHash"] for x in rows}),
            "states":tally(rows, "state"), "targetFamilyStates":tally(rows, "signal"),
            "reviewCueRate":divide(sum(x["signal"] in REVIEW for x in rows),len(rows)),
            "strictReviewRate":divide(sum(x["signal"] == "REVIEW_REQUIRED" for x in rows),len(rows)),
            "candidateBearing":sum(x["candidates"] > 0 for x in rows),
            "zeroCandidate":sum(x["candidates"] == 0 for x in rows)}

def select_summary(actual, rows, label):
    expected = summary(rows)
    compare({k:actual[k] for k in expected}, expected, label)

def confusion(rows):
    buckets = Counter((x["gold"],x["cue"]) for x in rows)
    tp, tn, fp, fn = (buckets[True,True], buckets[False,False],
                       buckets[False,True], buckets[True,False])
    return {"n":len(rows), "tp":tp, "tn":tn, "fp":fp, "fn":fn,
            "precision":divide(tp,tp+fp), "recall":divide(tp,tp+fn), "specificity":divide(tn,tn+fp)}

def observation(row):
    require(row["state"] in STATES, "unknown engine state")
    require(type(row["candidates"]) is int and row["candidates"] >= 0, "candidate count")
    require((row["candidates"] > 0) == (row["state"] == "UNREVIEWED_CANDIDATES"), "candidate state")
    require(type(row["cue"]) is bool and PIN.fullmatch(row["previewPin"]), "cue or preview digest")

def verify(report, contrast):
    manifest = json.loads((ROOT / "semantic-model-authored-manifest-v1.json").read_bytes())
    originals = [r for shard in manifest["shards"] for r in load_rows(shard["path"],shard["gitBlob"])]
    full = load_rows("ambient-human-full-v1.jsonl","a936db483d95b4d896a21c47ec7bff44c19aeefc")
    categories = load_rows("ambient-human-categories-v1.jsonl","58e1aac10ddf95b5fb3861f842cdc6fd80ed5077")
    require(report["version"] == "sutra-semantic-corpus-execution/v1", "version")
    require(report["authority"] == "NONE" and report["semanticAccuracy"] == "NOT_ESTABLISHED"
            and report["humanReviewTime"] == "NOT_MEASURED", "authority or overstated evidence")
    syn, human = report["rows"]["synthetic"], report["rows"]["human"]
    require(len(syn) == len(originals) == 4000 and len(human) == 2*len(full) == 3290, "row count")
    pins = {}
    for actual, original in zip(syn, originals):
        for key in ("id","family","domain"):
            require(actual[key] == original[key], "synthetic identity " + key)
        require(actual["questionHash"] == digest(original["question"]), "synthetic question mismatch")
        require(actual["signal"] in SIGNALS, "invalid signal")
        observation(actual)
        k = actual["questionHash"]
        p = (actual["state"],actual["candidates"],actual["cue"],actual["previewPin"])
        require(k not in pins or pins[k] == p, "identical input inconsistent")
        pins[k] = p
    human_expected = [(r,side) for r in full for side in ("premise","hypothesis")]
    for actual, (original,side) in zip(human,human_expected):
        require(actual["id"] == original["id"] and actual["side"] == side, "human identity")
        require(actual["gold"] is original[side+"_ambiguous"], "human gold mismatch")
        require(actual["questionHash"] == digest(original[side]), "human statement mismatch")
        observation(actual)
        k = actual["questionHash"]
        p = (actual["state"],actual["candidates"],actual["cue"],actual["previewPin"])
        require(k not in pins or pins[k] == p, "identical input inconsistent")
        pins[k] = p
    s, h = report["synthetic"],report["human"]
    select_summary(s,syn,"synthetic")
    distinct = list({(x["family"],x["questionHash"]):x for x in syn}.values())
    select_summary(s["uniqueFamilyQuestion"],distinct,"deduplicated")
    require(s["repeatedQuestionRecords"] == len(syn)-len({x["questionHash"] for x in syn}),"duplicates")
    require(s["uniqueMeaningPairs"] == len({json.dumps(x["candidateMeanings"],sort_keys=True) for x in originals}),"meaning pairs")
    for field, key, values in (("byFamily","family",manifest["families"]),("byDomain","domain",manifest["domains"])):
        require(set(s[field]) == set(values),field)
        for v in values:
            select_summary(s[field][v],[x for x in syn if x[key] == v],field+"/"+v)
    expected_cells = {f+"/"+d for f in manifest["families"] for d in manifest["domains"]}
    require(set(s["byCell"]) == expected_cells,"cell keys")
    for cell in expected_cells:
        family,domain = cell.split("/")
        subset = [x for x in syn if x["family"] == family and x["domain"] == domain]
        require(len(subset) == 20,"cell balance")
        select_summary(s["byCell"][cell],subset,cell)
    compare(h["cueProxy"],confusion(human),"human proxy")
    for side in ("premise","hypothesis"):
        compare(h["bySide"][side],confusion([x for x in human if x["side"] == side]),side)
    compare(h["states"],tally(human,"state"),"human states")
    compare(h["categoryCounts"],dict(Counter(x["category"] for x in categories)),"categories")
    require(h["records"] == len(full) and h["categoryRecords"] == len(categories)
            and h["statements"] == len(human)
            and h["uniqueStatements"] == len({x["questionHash"] for x in human}),"human counts")
    fullids,catids = {x["id"] for x in full},{x["id"] for x in categories}
    require(h["overlappingIds"] == len(fullids&catids) and h["distinctIds"] == len(fullids|catids),"human overlap")
    source = json.loads((ROOT/"semantic-contrast-v1.json").read_bytes())
    require(source["provenance"]["humanAnnotation"] is False and source["provenance"]["independentValidation"] is False,"contrast provenance")
    rows = contrast["rows"]
    require(len(rows) == len(source["cases"]) == contrast["cases"] == 40 and contrast["prompts"] == 120,"contrast size")
    require(contrast["independentHumanReview"] == "PENDING","human review misrepresented")
    for row, original in zip(rows,source["cases"]):
        require(row["id"] == original["id"] and row["family"] == original["family"],"contrast identity")
        require(row["originalState"] in STATES and row["targetFamilySignal"] in SIGNALS,"contrast state")
        require(len(row["rewriteStates"]) == len(row["rewriteTargetSignals"]) == 2
                and all(s in STATES for s in row["rewriteStates"])
                and all(s in SIGNALS for s in row["rewriteTargetSignals"]),"rewrite state")
        compare(row["cueReduced"],[row["targetFamilySignal"] in REVIEW and s not in REVIEW for s in row["rewriteTargetSignals"]],"cue reduction")
    compare(contrast["originalStates"],tally(rows,"originalState"),"contrast states")
    compare(contrast["originalTargetSignals"],tally(rows,"targetFamilySignal"),"contrast signals")
    require(contrast["rewritesWithReducedReviewCue"] == sum(sum(x["cueReduced"]) for x in rows),"contrast reduction total")
    return {"syntheticRecords":len(syn),"humanStatementRecords":len(human),
            "contrastPrompts":120,"uniqueInputDigests":len(pins),"verifiedCells":len(expected_cells),
            "scope":"Independent report arithmetic, pinned data identity and consistency only; not semantic correctness."}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify-semantic-corpus-report.py corpus.json contrast.json")
    print(json.dumps(verify(json.loads(Path(sys.argv[1]).read_bytes()),
                            json.loads(Path(sys.argv[2]).read_bytes())),indent=2))
