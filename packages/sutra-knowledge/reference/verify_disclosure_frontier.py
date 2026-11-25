#!/usr/bin/env python3
"""Independent finite-set replay against reconstructed explicit action schedule."""
import sys,json
from pathlib import Path
from copy import deepcopy
from verify import canonical
from verify_conflict import bounded_load,require,rawhash
from verify_pinned_investigation import replay,alignment
from verify_source_economics import case_fixture,compact
QUAL='Finite deterministic declared worlds, explicit candidate actions and abstract additive exposure units only. Minimax effort subject to a worst-branch exposure cap, with one-time source acquisition. Exposure numbers are not measured privacy risk; action listing is not authorization. No physical measurement, payment, bulk access, data disclosure or other action performed.'
def solve(worlds,actions,costs,initial,budget):
    decisions={w['id']:w['decision'] for w in worlds};memo={}
    if not worlds:return dict(status='inconsistent_observations',plan=None,statesEvaluated=0)
    if any(v not in ('constraint_satisfied','constraint_refuted') for v in decisions.values()):return dict(status='unresolved_worlds',plan=None,statesEvaluated=0)
    def rec(ws,acquired,left):
        key=(ws,acquired,left)
        if key in memo:return memo[key]
        outcomes={decisions[w] for w in ws}
        if len(outcomes)==1:
            p=dict(kind='decision',worlds=sorted(ws),decision=next(iter(outcomes)),worstCost=0,worstExposure=0)
            memo[key]=p;return p
        candidates=[]
        for a in actions:
            if a['exposure']>left:continue
            parts={}
            for w in ws:parts.setdefault(a['outcomes'][w],set()).add(w)
            if len(parts)<2:continue
            branches=[]
            for label,part in sorted(parts.items()):
                nxt=rec(frozenset(part),acquired|{a['sourceId']},left-a['exposure'])
                if nxt is None:break
                branches.append(dict(outcome=label,next=nxt))
            if len(branches)!=len(parts):continue
            ac=0 if a['sourceId'] in acquired else costs[a['sourceId']];c=ac+a['readCost']
            candidates.append(dict(kind='observe',worlds=sorted(ws),actionId=a['id'],sourceId=a['sourceId'],observationIds=a['observationIds'],acquisitionCost=ac,readCost=a['readCost'],cost=c,exposure=a['exposure'],worstCost=c+max(b['next']['worstCost'] for b in branches),worstExposure=a['exposure']+max(b['next']['worstExposure'] for b in branches),branches=branches))
        best=min(candidates,key=lambda p:(p['worstCost'],p['actionId'])) if candidates else None
        memo[key]=best;return best
    p=rec(frozenset(decisions),frozenset(initial),budget)
    if p:return dict(status='invariant_decision' if p['kind']=='decision' else 'conditional_observation_plan',plan=p,statesEvaluated=len(memo))
    witness=next(([a,b] for a in sorted(decisions) for b in sorted(decisions) if decisions[a]!=decisions[b] and all(o['outcomes'][a]==o['outcomes'][b] for o in actions)),None)
    return dict(status='insufficient_observations' if witness else 'exposure_budget_infeasible',plan=None,witness=witness,statesEvaluated=len(memo))
def expected(mode):
    ct,et,_=case_fixture('withdrawn' if mode=='withdrawn' else 'fresh');c=json.loads(ct);pin=rawhash(ct);cap={'open':4,'bounded':2,'infeasible':1,'withdrawn':4}[mode]
    def action(i,s,fields,e):return dict(id=i,sourceId=s,observationIds=fields,readCost=0,exposure=e)
    p=dict(version=1,caseDigest=pin,eventDigest=rawhash(et),costUnit=c['costUnit'],exposureUnit='synthetic_exposure',exposureBudget=cap,sourceCosts=[dict(id=s['id'],cost=3 if s['id']=='bundle' else 2) for s in c['sources']],initiallyAcquired=[],actions=[action('bundle_both','bundle',['bundle_load','bundle_capacity'],4),action('single_load','meter',['read_meter'],1),action('single_capacity','capacity_record',['read_capacity'],1)])
    pt=compact(p);alignment(ct);r=replay(ct,pin,et);report=r['report'];worlds=[w for w in report['worlds'] if w['id'] in report['survivingWorlds']]
    values={v['id']:{w:g['label'] for g in v['outcomes'] for w in g['worlds']} for v in r['observationValues']}
    actions=[];excluded=[]
    for a in sorted(p['actions'],key=lambda a:a['id']):
        missing=sorted(i for i in a['observationIds'] if i not in values)
        if missing:excluded.append(dict(id=a['id'],unavailableObservationIds=missing));continue
        ids=sorted(a['observationIds']);actions.append(dict(a,observationIds=ids,outcomes={w['id']:compact([values[i][w['id']] for i in ids]) for w in worlds}))
    costs={s['id']:s['cost'] for s in p['sourceCosts']}
    unrestricted=solve(worlds,actions,costs,[],sum(a['exposure'] for a in actions));constrained=solve(worlds,actions,costs,[],cap)
    return dict(version='sutra-disclosure-frontier/v1',caseText=ct,eventText=et,policyText=pt,caseDigest=pin,eventDigest=rawhash(et),policyDigest=rawhash(pt),costUnit=c['costUnit'],exposureUnit=p['exposureUnit'],exposureBudget=cap,survivingWorlds=[w['id'] for w in worlds],availableActionIds=[a['id'] for a in actions],excludedActions=excluded,unrestricted=unrestricted,constrained=constrained,qualification=QUAL)
def main():
    require(len(sys.argv)==5)
    for file,mode in zip(sys.argv[1:],('open','bounded','infeasible','withdrawn')):
        with Path(file).open(encoding='utf-8') as fp:actual=bounded_load(fp.read(1048577),1048576,32)
        exp=expected(mode)
        def verify(x):return canonical(x)==canonical(exp)
        require(verify(actual));mutants=[]
        for k,v in [('caseText',actual['caseText']+' '),('eventText',actual['eventText']+' '),('policyText',actual['policyText']+' '),('caseDigest','sha256:'+'0'*64),('eventDigest','sha256:'+'0'*64),('policyDigest','sha256:'+'0'*64),('exposureBudget',actual['exposureBudget']+1),('exposureUnit','privacy_guarantee'),('qualification','authorized'),('availableActionIds',[]),('survivingWorlds',[])]:
            m=deepcopy(actual);m[k]=v;mutants.append(m)
        m=deepcopy(actual);m['excludedActions'].append(dict(id='fabricated',unavailableObservationIds=[]));mutants.append(m)
        m=deepcopy(actual);m['constrained']['status']='authorized';mutants.append(m)
        m=deepcopy(actual);m['constrained']['statesEvaluated']+=1;mutants.append(m)
        for k in ('worstCost','worstExposure','acquisitionCost','exposure'):
            m=deepcopy(actual);m['unrestricted']['plan'][k]+=1;mutants.append(m)
        m=deepcopy(actual);m['unrestricted']['plan']['branches'].pop();mutants.append(m)
        if actual['constrained']['plan'] is None:
            m=deepcopy(actual);m['constrained']['plan']=m['unrestricted']['plan'];mutants.append(m)
        else:
            m=deepcopy(actual);m['constrained']['plan']['worstExposure']+=1;mutants.append(m)
        for m in mutants:require(not verify(m))
        print('ACCEPTED',mode,actual['constrained']['status'],'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
