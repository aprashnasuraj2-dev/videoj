"""Independent replay for the fixed synthetic timing lesson, not general empirical verification."""
import hashlib
import json
import pathlib
import sys
from verify import load, recompute

def require(ok, code):
    if not ok:
        raise ValueError(code)

def sha(b):
    return hashlib.sha256(b).hexdigest()

def replay(bundle, root):
    profile_bytes = (root / "content/content-profile.json").read_bytes()
    catalog_bytes = (root / "content/source-catalog.json").read_bytes()
    transcript = (root / "transcripts/synthetic-timing.txt").read_bytes()
    media = (root / "media/timing-fixture.mp4").read_bytes()
    profile, catalog = json.loads(profile_bytes), json.loads(catalog_bytes)
    require(profile["mode"] == "synthetic" and len(catalog["sources"]) == 1, "PROFILE")
    source = catalog["sources"][0]
    cue = next(c for c in source["cues"] if c["id"] == profile["featuredCueId"])
    require(sha(catalog_bytes) == profile["catalog"]["sha256"] and sha(transcript) == profile["transcript"]["sha256"] == source["hash"] and sha(media) == source["mediaHash"], "SOURCE_BYTES")
    require(cue["text"] in transcript.decode("utf-8"), "SOURCE_TEXT")
    result, plan = bundle["result"], bundle["plan"]
    evidence = result["evidence"]
    require(bundle["version"] == 1 and result["status"] == "catalog_question_resolved" and result["truthStatus"] == "unverified" and evidence["truthStatus"] == "unverified" and evidence["level"] == "catalog_matched", "STATUS")
    require(evidence["profileSha256"] == sha(profile_bytes) and evidence["catalogSha256"] == sha(catalog_bytes) and evidence["transcriptSha256"] == sha(transcript), "EVIDENCE_HASH")
    expected_receipt = dict(version=1,sourceId=source["id"],sourceVersion=source["version"],sourceHash=source["hash"],mediaHash=source["mediaHash"],cueId=cue["id"],start=cue["start"],end=cue["end"],excerpt=cue["text"],retrievedAt=profile["observedAt"],verification="unverified")
    require(evidence["receipt"] == expected_receipt, "RECEIPT")
    case = load(bundle["caseText"], 262144)
    require(case["version"] == 1 and case["decisionId"] == "cue_before_three" and case["costUnit"] == "synthetic_effort" and len(case["worlds"]) == 2, "CASE")
    require(case["observations"] == [dict(id="read_catalog_cue", cost=1, outcomes={"start_two":"two","start_four":"four"})], "OBSERVATION")
    worlds = []
    for world in sorted(case["worlds"], key=lambda w:w["id"]):
        start = {"start_two":2,"start_four":4}[world["id"]]
        graph = load(world["graphText"],65536)
        require(graph == {"schemaVersion":1,"nodes":[
            dict(id="cue_start",kind="input",value=str(start),dimension=[0,0,1],basis="Hypothetical catalog start time, seconds"),
            dict(id="threshold",kind="input",value="3",dimension=[0,0,1],basis="Question threshold, seconds"),
            dict(id="before_threshold",kind="constraint",op="lt",args=["cue_start","threshold"])]} and world["constraintId"] == "before_threshold", "WORLD_GRAPH")
        report = json.loads(recompute(world["graphText"]))
        receipt = next(r for r in report["receipts"] if r["id"] == world["constraintId"])
        worlds.append(dict(id=world["id"],decision=receipt["outcome"]["status"],graphDigest=report["graphDigest"],receiptDigest=receipt["receiptDigest"]))
    require([w["id"] for w in worlds] == ["start_four","start_two"], "WORLD_IDS")
    leaves = {w["id"]:dict(kind="decision",worlds=[w["id"]],decision=w["decision"],worstCost=0,bestCost=0) for w in worlds}
    expected = dict(kind="observe",worlds=["start_four","start_two"],observationId="read_catalog_cue",cost=1,worstCost=1,bestCost=1,branches=[dict(outcome="four",next=leaves["start_four"]),dict(outcome="two",next=leaves["start_two"])])
    require(plan["status"] == "conditional_observation_plan" and plan["worlds"] == worlds and plan["plan"] == expected, "PLAN")
    survivor = {2:"start_two",4:"start_four"}.get(cue["start"])
    require(survivor is not None, "OUTSIDE_WORLDS")
    remaining = result["remaining"]
    require(remaining["status"] == "invariant_decision" and remaining["worlds"] == [w for w in worlds if w["id"] == survivor] and remaining["plan"] == leaves[survivor] and result["excludedWorlds"] == [w["id"] for w in worlds if w["id"] != survivor], "PRUNING")
    answer = "before" if cue["start"] < 3 else "not_before"
    prediction = result["prediction"]
    require(prediction in ("before","not_before","unsure"), "PREDICTION")
    feedback = "uncertainty_resolved" if prediction == "unsure" else "prediction_supported" if prediction == answer else "prediction_revised"
    require(result["answer"] == answer and result["feedback"] == feedback, "ANSWER")
    return {"source":"original synthetic fixture bytes","answer":answer,"surviving_world":survivor,"truthStatus":"unverified","independent_computation":True}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify_learner.py bundle.json legacy-public-directory")
    with open(sys.argv[1], encoding="utf-8") as f:
        bundle = load(f.read(262145),262144)
    root = pathlib.Path(sys.argv[2])
    print(json.dumps(replay(bundle,root),indent=2))
    # Negative controls use deep copies of the exact browser-exported bundle.
    for key, mutate in [
        ("forged-answer",lambda x:x["result"].update(answer="not_before")),
        ("stale-cue",lambda x:x["result"]["evidence"]["receipt"].update(sourceVersion="stale")),
        ("false-truth",lambda x:x["result"].update(truthStatus="verified")),
        ("forged-plan-cost",lambda x:x["plan"]["plan"].update(worstCost=0)),
    ]:
        candidate = json.loads(json.dumps(bundle))
        mutate(candidate)
        try:
            replay(candidate,root)
        except ValueError:
            print("REJECTED",key)
        else:
            raise SystemExit("FALSE_ACCEPTANCE "+key)
