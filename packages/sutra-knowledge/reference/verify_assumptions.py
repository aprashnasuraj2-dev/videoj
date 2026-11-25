#!/usr/bin/env python3
"""Independent replay of five isolated target-threshold variants using Fraction."""
import json
import sys
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from verify import canonical, keys, recompute
from verify_conflict import bounded_load, require, rawhash
from verify_debugger import replay, anchor, compact

VERSION='sutra-debugger-assumptions/v1'
LIMITS=['0/1','1/2','1/1','3/2','2/1']
QUAL='Conditional target-limit alternatives in the fixed synthetic model. Original evidence and surviving worlds are unchanged. Sampled minimum change is only over the five declared limits, not a global optimization. No alternative is adopted automatically.'

@lru_cache(maxsize=1)
def anchored_variants():
    model,_=anchor()
    variants=[]
    for limit in LIMITS:
        worlds=deepcopy(model['worlds'])
        if limit!='1/1':
            for w in worlds:
                graph=json.loads(w['graphText'])
                graph['nodes'].append(dict(id='target_limit',kind='input',value=limit,dimension=[0,0,0],basis='Counterfactual target threshold'))
                target=next(n for n in graph['nodes'] if n['id']=='target')
                require(target['op']=='le' and target['args']==['sum','one'])
                target['args']=['sum','target_limit']
                w['graphText']=compact(graph)
        case_digest=rawhash(compact(dict(model,worlds=worlds)))
        computed=[]
        for w in worlds:
            report=json.loads(recompute(w['graphText']))
            receipts={r['id']:r for r in report['receipts']}
            t,c=receipts['target'],receipts['control_ok']
            computed.append(dict(id=w['id'],sum=receipts['sum']['outcome']['value'],target=t['outcome']['status'],control=c['outcome']['status'],
                graphDigest=report['graphDigest'],targetReceiptDigest=t['receiptDigest'],controlReceiptDigest=c['receiptDigest'],
                observed=[dict(id=i,value=receipts[i]['outcome']['value'],receiptDigest=receipts[i]['receiptDigest']) for i in ('a','b','c')]))
        variants.append(dict(limit=limit,caseDigest=case_digest,worlds=computed))
    require(variants[2]['caseDigest']==rawhash(compact(model)) and len({v['caseDigest'] for v in variants})==5)
    for v in variants:
        for w,b in zip(v['worlds'],variants[2]['worlds']):
            require(all(w[k]==b[k] for k in ('id','sum','control','controlReceiptDigest','observed')))
    return variants

def state(worlds,claim):
    if not worlds:return 'CONFLICTED'
    decisions={w[claim] for w in worlds}
    return 'SUPPORTED' if decisions=={'constraint_satisfied'} else 'REFUTED' if decisions=={'constraint_refuted'} else 'UNDERDETERMINED'

def sensitivity(result):
    variants=anchored_variants();base=variants[2]
    ids=result['claims']['target']['survivingWorlds']
    require(result['caseDigest']==base['caseDigest'] and ids==result['claims']['control_ok']['survivingWorlds'])
    require([dict(id=w['id'],decision=w['target']) for w in base['worlds']]==result['projection']['worlds'])
    for k,claim in (('report','target'),('controlReport','control')):
        digest_key='targetReceiptDigest' if claim=='target' else 'controlReceiptDigest'
        require([dict(id=w['id'],decision=w[claim],graphDigest=w['graphDigest'],receiptDigest=w[digest_key]) for w in base['worlds']]==result[k]['worlds'])
    alive=set(ids);baseline=[w for w in base['worlds'] if w['id'] in alive]
    require([w['id'] for w in baseline]==ids)
    require(state(baseline,'target')==result['claims']['target']['state'] and state(baseline,'control')==result['claims']['control_ok']['state'])
    sums=[int(w['sum'].split('/')[0]) for w in baseline]
    boundaries=dict(minSum=f'{min(sums)}/1',maxSum=f'{max(sums)}/1') if sums else None
    reports=[]
    for v in variants:
        current=[w for w in v['worlds'] if w['id'] in alive]
        target,control=state(current,'target'),state(current,'control')
        require(control==result['claims']['control_ok']['state'])
        reports.append(dict(limit=v['limit'],caseDigest=v['caseDigest'],targetState=target,controlState=control,survivingWorlds=ids,
            changedSurvivingWorlds=[w['id'] for w,b in zip(current,baseline) if w['target']!=b['target']],
            worlds=[{k:x for k,x in w.items() if k!='observed'} for w in v['worlds']]))
    changes=[(abs(i-2),v['limit']) for i,v in enumerate(reports) if v['targetState']!=result['claims']['target']['state']]
    distance=min((d for d,_ in changes),default=None)
    minimum=dict(halfUnits=distance,limits=[l for d,l in changes if d==distance]) if distance is not None else None
    return dict(version=VERSION,caseDigest=result['caseDigest'],historyDigest=result['historyDigest'],baselineLimit='1/1',
                boundaries=boundaries,variants=reports,minimumSampledChange=minimum,qualification=QUAL)

def verify(bundle):
    try:
        require(keys(bundle,('version','events','sensitivity')) and bundle['version']==VERSION)
        return canonical(sensitivity(replay(bundle['events'])))==canonical(bundle['sensitivity'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):
        return False

def main():
    expected=[
        ['UNDERDETERMINED','UNDERDETERMINED','SUPPORTED','SUPPORTED','SUPPORTED'],
        ['UNDERDETERMINED','UNDERDETERMINED','UNDERDETERMINED','UNDERDETERMINED','SUPPORTED'],
        ['CONFLICTED']*5,
        ['REFUTED','REFUTED','REFUTED','REFUTED','SUPPORTED']]
    require(len(sys.argv)==len(expected)+1)
    for path,states in zip(sys.argv[1:],expected):
        with Path(path).open(encoding='utf-8') as f:
            bundle=bounded_load(f.read(262145),262144,24)
        require(verify(bundle))
        s=bundle['sensitivity'];require([v['targetState'] for v in s['variants']]==states)
        mutants=[]
        for field,value in (('caseDigest','sha256:'+'0'*64),('historyDigest','sha256:'+'0'*64),('qualification','new limit is true'),('baselineLimit','2/1')):
            bad=deepcopy(bundle);bad['sensitivity'][field]=value;mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['variants'][0]['targetState']='SUPPORTED';mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['variants'][0]['controlState']='REFUTED';mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['variants'][0]['worlds'][0]['controlReceiptDigest']='sha256:'+'0'*64;mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['variants'][0]['caseDigest']=s['caseDigest'];mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['boundaries']={'minSum':'9/1','maxSum':'9/1'};mutants.append(bad)
        bad=deepcopy(bundle);bad['sensitivity']['minimumSampledChange']={'halfUnits':0,'limits':['1/1']};mutants.append(bad)
        bad=deepcopy(bundle);bad['events'][0]['sourceText']+=' ';mutants.append(bad)
        for bad in mutants:require(not verify(bad))
        print('ACCEPTED',Path(path).name,'REJECTED',len(mutants),'mutations')

if __name__=='__main__':main()
