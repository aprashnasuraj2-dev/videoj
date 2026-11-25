#!/usr/bin/env python3
"""Independent set-based cost policy reconstruction; exact synthetic pins."""
import sys,json
from pathlib import Path
from copy import deepcopy
from verify import canonical
from verify_conflict import bounded_load,require,rawhash
from verify_pinned_investigation import fixture,replay,alignment
QUAL='Exact minimax only over declared finite deterministic worlds and offered fields, with nonnegative one-time per-source acquisition and per-field read costs. No probability, verified real cost, independent evidence, disclosure permission or automatic acquisition. Best cost describes the selected policy, not a separately optimized objective.'
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def case_fixture(mode):
    c=json.loads(fixture());c['worlds']=[w for w in c['worlds'] if not w['id'].startswith('load_20_')]
    c['sources']=[s for s in c['sources'] if s['id'] in ('meter','capacity_record')]
    c['offers']=[dict(o,cost=2) for o in c['offers'] if o['id'] in ('read_meter','read_capacity')]
    d=[0,0,0];st=compact(dict(version=1,sourceId='bundle',sourceVersion='v1',scope=c['scope'],values=dict(load=dict(value='30/1',dimension=d),capacity=dict(value='20/1',dimension=d))))
    c['sources'].append(dict(id='bundle',version='v1',digest=rawhash(st),lineage='bundle_root'))
    c['offers']+=[dict(id='bundle_'+n,nodeId=n,sourceId='bundle',cost=3,dimension=d) for n in ('load','capacity')]
    ct=compact(c);et=compact([dict(type='withdraw_source',sourceId='bundle')] if mode=='withdrawn' else [])
    e=dict(version=1,caseDigest=rawhash(ct),eventDigest=rawhash(et),costUnit=c['costUnit'],sourceCosts=[dict(id=s['id'],cost=3 if s['id']=='bundle' else 2) for s in c['sources']],fieldCosts=[dict(id=o['id'],cost=0) for o in c['offers']],initiallyAcquired=['bundle'] if mode=='acquired' else [])
    return ct,et,compact(e)
def policy(worlds,offers,source_cost,acquired):
    # Sets of world identifiers, not JavaScript bitmasks. Independent
    # grouping and complete recursive minimax with set-state memoization.
    decisions={w['id']:w['decision'] for w in worlds};memo={}
    def solve(ws,acq):
        key=(ws,acq)
        if key in memo:return memo[key]
        if len({decisions[w] for w in ws})==1:
            p=dict(kind='decision',worlds=sorted(ws),decision=decisions[next(iter(ws))],worstCost=0,bestCost=0)
            memo[key]=p;return p
        best=None
        for o in sorted(offers,key=lambda x:x['id']):
            labels=sorted({o['outcomes'][w] for w in ws})
            if len(labels)<2:continue
            s=o['sourceId'];ac=0 if s in acq else source_cost[s];cost=ac+o['readCost'];branches=[]
            for label in labels:
                nxt=solve(frozenset(w for w in ws if o['outcomes'][w]==label),acq|{s})
                if nxt is None:break
                branches.append(dict(outcome=label,next=nxt))
            if len(branches)!=len(labels):continue
            p=dict(kind='observe',worlds=sorted(ws),observationId=o['id'],sourceId=s,acquisitionCost=ac,readCost=o['readCost'],cost=cost,worstCost=cost+max(b['next']['worstCost'] for b in branches),bestCost=cost+min(b['next']['bestCost'] for b in branches),branches=branches)
            if best is None or (p['worstCost'],p['observationId'])<(best['worstCost'],best['observationId']):best=p
        memo[key]=best;return best
    p=solve(frozenset(decisions),frozenset(acquired))
    require(p is not None)
    return dict(status='invariant_decision' if p['kind']=='decision' else 'conditional_observation_plan',plan=p,statesEvaluated=len(memo))
def expected(mode):
    ct,et,xt=case_fixture(mode);c=json.loads(ct);e=json.loads(xt);pin=rawhash(ct);alignment(ct);r=replay(ct,pin,et)
    report=r['report'];worlds=[w for w in report['worlds'] if w['id'] in report['survivingWorlds']]
    byid={o['id']:o for o in c['offers']};source_cost={s['id']:s['cost'] for s in e['sourceCosts']};field_cost={s['id']:s['cost'] for s in e['fieldCosts']}
    offers=[dict(id=v['id'],sourceId=byid[v['id']]['sourceId'],readCost=field_cost[v['id']],outcomes={w:g['label'] for g in v['outcomes'] for w in g['worlds']}) for v in r['observationValues']]
    result=policy(worlds,offers,source_cost,e['initiallyAcquired'])
    per=policy(worlds,[dict(o,readCost=o['readCost']+(0 if o['sourceId'] in e['initiallyAcquired'] else source_cost[o['sourceId']])) for o in offers],dict.fromkeys(source_cost,0),[])
    a=per['plan']['worstCost'];b=result['plan']['worstCost']
    return dict(version='sutra-source-economics/v1',caseText=ct,eventText=et,economicText=xt,caseDigest=pin,eventDigest=rawhash(et),economicDigest=rawhash(xt),costUnit=e['costUnit'],initiallyAcquired=e['initiallyAcquired'],availableObservationIds=[o['id'] for o in offers],survivingWorlds=[w['id'] for w in worlds],result=result,comparison=dict(legacyDeclaredWorstCost=report['frontier']['plan']['worstCost'],perFieldCounterfactualWorstCost=a,sharedAcquisitionWorstCost=b,avoidedCost=a-b),qualification=QUAL)
def main():
    require(len(sys.argv)==4)
    for filename,mode in zip(sys.argv[1:],('fresh','acquired','withdrawn')):
        with Path(filename).open(encoding='utf-8') as fp:actual=bounded_load(fp.read(1048577),1048576,32)
        exp=expected(mode)
        def verify(x):return canonical(x)==canonical(exp)
        require(verify(actual));mutants=[]
        for k,v in [('economicDigest','sha256:'+'0'*64),('initiallyAcquired',['unknown']),('availableObservationIds',[]),('qualification','real evidence'),('eventText',actual['eventText']+' '),('economicText',actual['economicText']+' '),('caseDigest','sha256:'+'0'*64)]:
            m=deepcopy(actual);m[k]=v;mutants.append(m)
        for k in actual['comparison']:
            m=deepcopy(actual);m['comparison'][k]+=1;mutants.append(m)
        for k in ('acquisitionCost','readCost','worstCost','bestCost'):
            m=deepcopy(actual);m['result']['plan'][k]+=1;mutants.append(m)
        m=deepcopy(actual);m['result']['plan']['branches'].pop();mutants.append(m)
        for m in mutants:require(not verify(m))
        print('ACCEPTED',mode,exp['comparison'],'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
