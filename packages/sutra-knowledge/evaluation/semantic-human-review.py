#!/usr/bin/env python3
"""Generate blinded review packets and summarize two self-attested human reviews.
Never changes model-authored source labels or claims reviewer identities were verified.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import median, mean
import unittest

EVAL=Path(__file__).resolve().parent
FAMILIES=set(json.loads((EVAL/"semantic-model-authored-manifest-v1.json").read_bytes())["families"])
DISPOSITIONS={"MATERIAL_AMBIGUITY","NO_MATERIAL_AMBIGUITY","INSUFFICIENT_CONTEXT"}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def digest(data):
    return sha256(data).hexdigest()

def packet(source_bytes):
    source=json.loads(source_bytes)
    cases=[]
    for r in source["cases"]:
        token=digest(("sutra-blind-review-v1\0"+r["id"]+"\0"+r["question"]).encode())[:24]
        cases.append({"caseToken":token,"question":r["question"],"context":r["context"]})
    require(len({x["caseToken"] for x in cases})==len(cases),"duplicate tokens")
    return {"version":"sutra-blind-human-review/v1","sourceSha256":digest(source_bytes),
            "cases":sorted(cases,key=lambda x:x["caseToken"])}

def encode(x):
    return (json.dumps(x,ensure_ascii=False,indent=2)+"\n").encode("utf-8")

def validate(packet_bytes,review):
    p=json.loads(packet_bytes)
    require(review.get("packetSha256")==digest(packet_bytes),"packet pin")
    require(review.get("independentReviewAttested") is True and review.get("goldNotViewedAttested") is True,
            "reviewer must attest independence and blinding")
    reviewer=review.get("reviewerCode")
    require(isinstance(reviewer,str) and 1<=len(reviewer)<=64 and reviewer.strip()==reviewer,"pseudonymous reviewer code")
    rows=review.get("annotations")
    require(isinstance(rows,list),"annotations")
    expected={r["caseToken"] for r in p["cases"]}
    actual={}
    for r in rows:
        require(isinstance(r,dict) and set(r)=={"caseToken","disposition","family","elapsedSeconds","candidateMeanings","notes"},"annotation shape")
        token=r["caseToken"]
        require(token in expected and token not in actual,"unknown or duplicate token")
        require(r["disposition"] in DISPOSITIONS and r["family"] in FAMILIES|{"OTHER","NONE"},"taxonomy")
        require(type(r["elapsedSeconds"]) is int and 1<=r["elapsedSeconds"]<=86400,"elapsed seconds")
        meanings=r["candidateMeanings"]
        require(isinstance(meanings,list) and len(meanings)<=8 and all(isinstance(x,str) and x.strip() and len(x)<=2048 for x in meanings),"candidate meanings")
        if r["disposition"]=="MATERIAL_AMBIGUITY":
            require(len(set(meanings))>=2 and r["family"]!="NONE","material ambiguity needs distinct readings and family")
        require(isinstance(r["notes"],str) and len(r["notes"])<=4096,"notes")
        actual[token]=r
    require(set(actual)==expected,"incomplete review")
    return reviewer,actual

def agreement(a,b,key):
    n=len(a)
    agreement=sum(a[t][key]==b[t][key] for t in a)/n
    ca,cb=Counter(r[key] for r in a.values()),Counter(r[key] for r in b.values())
    chance=sum(ca[k]*cb[k] for k in ca.keys()|cb.keys())/(n*n)
    return {"observed":agreement,"cohenKappa":(agreement-chance)/(1-chance) if chance!=1 else None}

def time_summary(rows):
    xs=sorted(r["elapsedSeconds"] for r in rows.values())
    return {"cases":len(xs),"meanSeconds":mean(xs),"medianSeconds":median(xs),"p90Seconds":xs[math.ceil(.9*len(xs))-1],"totalSeconds":sum(xs)}

def score(packet_bytes,first,second):
    reviewer_a,a=validate(packet_bytes,first)
    reviewer_b,b=validate(packet_bytes,second)
    require(reviewer_a!=reviewer_b,"reviewers must have distinct pseudonyms")
    disagreements=[t for t in a if (a[t]["disposition"],a[t]["family"])!=(b[t]["disposition"],b[t]["family"])]
    return {"version":"sutra-human-review-measurement/v1","packetSha256":digest(packet_bytes),
            "reviewerCodes":[reviewer_a,reviewer_b],"cases":len(a),
            "dispositionAgreement":agreement(a,b,"disposition"),"familyAgreement":agreement(a,b,"family"),
            "elapsedReviewTime":[time_summary(a),time_summary(b)],"adjudicationRequired":sorted(disagreements),
            "provenance":"Self-attested independent human reviews; identity and blinding not independently verified.",
            "originalLabelsChanged":False,"semanticAccuracy":"NOT_ESTABLISHED"}

class ReviewTests(unittest.TestCase):
    def test_blind_packet_and_rejection(self):
        src=encode({"cases":[{"id":"a","question":"Which period?","context":"Two reports.","family":"reporting_period","alternatives":["secret"]}]})
        p=encode(packet(src))
        self.assertNotIn(b'"family"',p)
        self.assertNotIn(b"secret",p)
        t=json.loads(p)["cases"][0]["caseToken"]
        row={"caseToken":t,"disposition":"MATERIAL_AMBIGUITY","family":"reporting_period","elapsedSeconds":40,
             "candidateMeanings":["Fiscal period","Calendar period"],"notes":""}
        a={"packetSha256":digest(p),"reviewerCode":"A","independentReviewAttested":True,"goldNotViewedAttested":True,"annotations":[row]}
        b={**a,"reviewerCode":"B"}
        self.assertEqual(score(p,a,b)["elapsedReviewTime"][0]["medianSeconds"],40)
        self.assertEqual(score(p,a,b)["dispositionAgreement"]["observed"],1)
        for bad in [{**b,"reviewerCode":"A"},{**b,"annotations":[]},{**b,"goldNotViewedAttested":False},{**b,"packetSha256":"bad"}]:
            with self.assertRaises(ValueError):
                score(p,a,bad)

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test",action="store_true")
    sub=parser.add_subparsers(dest="command")
    e=sub.add_parser("export")
    e.add_argument("output",type=Path)
    s=sub.add_parser("score")
    s.add_argument("packet",type=Path)
    s.add_argument("review_a",type=Path)
    s.add_argument("review_b",type=Path)
    args=parser.parse_args()
    if args.self_test:
        unittest.main(argv=[__file__])
    elif args.command=="export":
        data=encode(packet((EVAL/"semantic-contrast-v1.json").read_bytes()))
        with args.output.open("xb") as out:
            out.write(data)
        print(digest(data))
    elif args.command=="score":
        print(json.dumps(score(args.packet.read_bytes(),json.loads(args.review_a.read_bytes()),json.loads(args.review_b.read_bytes())),indent=2))
    else:
        parser.error("specify --self-test, export or score")
