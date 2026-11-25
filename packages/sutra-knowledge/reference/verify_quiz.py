"""Independent, fixed-profile replay of the original synthetic subgroup lesson."""
import hashlib
import json
import sys
from fractions import Fraction
from verify import load, recompute

SOURCE = '{"version":1,"id":"quiz_group_table","sourceVersion":"v1","scope":"synthetic_quiz_strata","rows":{"a_beginner":[72,80],"a_advanced":[8,20],"b_beginner":[19,20],"b_advanced":[41,80]}}'
ROWS = {
    "balanced": {"a_beginner":[40,50],"a_advanced":[40,50],"b_beginner":[30,50],"b_advanced":[30,50]},
    "reversal": json.loads(SOURCE)["rows"]
}
ALLOWED = {"a_total_rate","b_total_rate","a_beginner_n","a_advanced_n","b_beginner_n","b_advanced_n","a_beginner_rate","a_advanced_rate","b_beginner_rate","b_advanced_rate"}

def require(ok, code):
    if not ok:
        raise ValueError(code)

def exact(x):
    x = Fraction(x)
    return f"{x.numerator}/{x.denominator}"

def expected_graph(rows):
    def q(id,value,basis):
        return dict(id=id,kind="input",value=str(value),dimension=[0,0,0],basis=basis)
    def d(id,op,a,b):
        return dict(id=id,kind="derive",op=op,args=[a,b])
    nodes = [q("two",2,"Equal standardization weight divisor")]
    for id,(passes,total) in rows.items():
        nodes += [q(id+"_pass",passes,"Declared passes"),q(id+"_n",total,"Declared sample count"),d(id+"_rate","div",id+"_pass",id+"_n")]
    for m in ("a","b"):
        b,a=m+"_beginner",m+"_advanced"
        nodes += [d(m+"_total_pass","add",b+"_pass",a+"_pass"),d(m+"_total_n","add",b+"_n",a+"_n"),d(m+"_total_rate","div",m+"_total_pass",m+"_total_n"),d(m+"_rate_sum","add",b+"_rate",a+"_rate"),d(m+"_standardized","div",m+"_rate_sum","two")]
    nodes += [dict(id="a_standardized_higher",kind="constraint",op="gt",args=["a_standardized","b_standardized"])]
    return dict(schemaVersion=1,nodes=nodes)

def verify_plan(p, source_available):
    require(p["sourceAvailable"] is source_available and p["truthStatus"]=="synthetic_model_only" and p["scope"]=="synthetic_quiz_strata" and p["caseId"]=="quiz_strata_v1","PLAN_SCOPE")
    case=load(p["caseText"],262144)
    require(case["version"]==1 and case["decisionId"]=="quiz_strata_v1" and case["costUnit"]=="synthetic_effort","CASE")
    require([w["id"] for w in case["worlds"]]==["balanced","reversal"],"WORLDS")
    reports={}
    receipts={}
    world_summaries=[]
    for w in case["worlds"]:
        id=w["id"]
        require(load(w["graphText"],65536)==expected_graph(ROWS[id]) and w["constraintId"]=="a_standardized_higher","GRAPH")
        report=json.loads(recompute(w["graphText"]))
        reports[id]=report
        receipts[id]={r["id"]:r for r in report["receipts"]}
        outcome=receipts[id][w["constraintId"]]
        world_summaries.append(dict(id=id,decision=outcome["outcome"]["status"],graphDigest=report["graphDigest"],receiptDigest=outcome["receiptDigest"]))
    require([w["decision"] for w in world_summaries]==["constraint_satisfied","constraint_refuted"],"DECISIONS")
    require(p["plan"]["worlds"]==world_summaries,"WORLD_RECEIPTS")
    require(p["aggregates"]==[dict(id=w,a="4/5",b="3/5") for w in ROWS],"AGGREGATES")
    offers=p["offers"]
    require(len(offers)<=8 and offers[:2]==[dict(nodeId="a_total_rate",cost=1),dict(nodeId="a_beginner_rate",cost=6)],"BASE_OFFERS")
    seen=set()
    observations=[]
    for o in offers:
        node,cost=o["nodeId"],o["cost"]
        require(set(o)=={"nodeId","cost"} and node in ALLOWED and node not in seen and type(cost) is int and 1<=cost<=1000000,"OFFER")
        seen.add(node)
        outcomes={w:"v_"+receipts[w][node]["outcome"]["value"].replace("-","neg_").replace("/","_") for w in ROWS}
        observations.append(dict(id=node,cost=cost,outcomes=outcomes))
    require(case["observations"]==(observations if source_available else []),"PARTITIONS")
    if not source_available:
        require(p["plan"]["status"]=="insufficient_observations" and p["plan"]["plan"] is None and p["plan"]["witness"]==["balanced","reversal"],"WITHDRAWN_PLAN")
        return reports,receipts,None
    # For exactly two opposite worlds, any distinguishing observation alone
    # is sufficient; a redundant observation cannot improve a positive cost.
    decisive=[o for o in observations if len(set(o["outcomes"].values()))==2]
    best=min(decisive,key=lambda o:(o["cost"],o["id"]))
    leaves={w["id"]:dict(kind="decision",worlds=[w["id"]],decision=w["decision"],worstCost=0,bestCost=0) for w in world_summaries}
    expected=dict(kind="observe",worlds=list(ROWS),observationId=best["id"],cost=best["cost"],worstCost=best["cost"],bestCost=best["cost"],branches=[dict(outcome=label,next=leaves[w]) for w,label in sorted(best["outcomes"].items(),key=lambda item:item[1])])
    require(p["plan"]["status"]=="conditional_observation_plan" and p["plan"]["plan"]==expected,"OPTIMAL_POLICY")
    return reports,receipts,best

def replay(bundle):
    require(bundle["version"]==1,"VERSION")
    p,r=bundle["plan"],bundle["result"]
    reports,receipts,best=verify_plan(p,True)
    e=r["evidence"]
    require(e["sourceText"]==SOURCE and e["sourceDigest"]=="sha256:"+hashlib.sha256(SOURCE.encode()).hexdigest() and e["sourceVersion"]=="v1" and e["scope"]=="synthetic_quiz_strata" and e["level"]=="host_pinned_synthetic_source","SOURCE")
    node=best["id"]
    require(r["nodeId"]==node and r["cost"]==best["cost"] and e["observationReceipt"]==receipts["reversal"][node] and e["graphDigest"]==reports["reversal"]["graphDigest"] and r["value"]==receipts["reversal"][node]["outcome"]["value"],"OBSERVED")
    # Independent direct Fraction calculation, in addition to receipt replay.
    rows=ROWS["reversal"]
    rates={k+"_rate":Fraction(passes,n) for k,(passes,n) in rows.items()}
    rates["a_standardized"]=(rates["a_beginner_rate"]+rates["a_advanced_rate"])/2
    rates["b_standardized"]=(rates["b_beginner_rate"]+rates["b_advanced_rate"])/2
    require(r["standardized"]=={k:exact(v) for k,v in rates.items()},"RATES")
    require(r["truthStatus"]=="synthetic_model_only" and r["status"]=="conditional_question_resolved" and r["answer"]=="not_a_higher" and r["excludedWorlds"]==["balanced"],"RESULT")
    prediction=r["prediction"]
    require(prediction in ("a_higher","not_a_higher","unsure"),"PREDICTION")
    expected_feedback={"a_higher":"prediction_revised","not_a_higher":"prediction_supported","unsure":"uncertainty_resolved"}[prediction]
    require(r["feedback"]==expected_feedback,"FEEDBACK")
    remaining=r["remaining"]
    require(remaining["status"]=="invariant_decision" and remaining["worlds"]==[p["plan"]["worlds"][1]] and remaining["plan"]==dict(kind="decision",worlds=["reversal"],decision="constraint_refuted",worstCost=0,bestCost=0),"PRUNING")
    # These are recorded discovery claims, not proof of historical network traffic.
    require([x["offer"] for x in bundle["publishers"]]==p["offers"][2:] and all(x["authority"]=="declared_capability_only" for x in bundle["publishers"]),"PUBLISHER_METADATA")
    return dict(cost=best["cost"],answer=r["answer"],standardized={k:exact(v) for k,v in rates.items()},truthStatus=r["truthStatus"])

def replay_withdrawal(h):
    require(h["version"]==1 and h["transition"]=="simulated_source_withdrawal","TRANSITION")
    prior=replay(h["prior"])
    verify_plan(h["current"],False)
    require(h["prior"]["plan"]["offers"]==h["current"]["offers"],"WITHDRAWAL_OFFERS")
    return dict(historical_answer=prior["answer"],current="insufficient_observations",witness=h["current"]["plan"]["witness"])

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: verify_quiz.py resolved.json withdrawal.json")
    def read(path):
        with open(path,encoding="utf-8") as f:
            return load(f.read(262145),262144)
    resolved,withdrawn=map(read,sys.argv[1:])
    print(json.dumps(dict(resolved=replay(resolved),withdrawal=replay_withdrawal(withdrawn)),indent=2))
    for label,base,fn,verify in [
        ("forged-cost",resolved,lambda x:x["plan"]["plan"]["plan"].update(worstCost=1),replay),
        ("forged-partition",resolved,lambda x:x["plan"].update(caseText=x["plan"]["caseText"].replace('"balanced":"v_50_1"','"balanced":"v_80_1"')),replay),
        ("wrong-source",resolved,lambda x:x["result"]["evidence"].update(sourceText=SOURCE.replace("[72,80]","[71,80]")),replay),
        ("false-causal-truth",resolved,lambda x:x["result"].update(truthStatus="verified"),replay),
        ("false-withdrawal-verdict",withdrawn,lambda x:x["current"]["plan"].update(status="invariant_decision"),replay_withdrawal),
    ]:
        candidate=json.loads(json.dumps(base));fn(candidate)
        try:
            verify(candidate)
        except ValueError:
            print("REJECTED",label)
        else:
            raise SystemExit("FALSE_ACCEPTANCE "+label)
