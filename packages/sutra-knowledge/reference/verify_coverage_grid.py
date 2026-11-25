#!/usr/bin/env python3
"""Independent bounded Cartesian audit of the model's observed input domains."""
import json
import sys
from copy import deepcopy
from fractions import Fraction
from itertools import product
from math import prod
from pathlib import Path
from verify import canonical, keys, recompute
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import replay, alignment, fixture
VERSION='sutra-observed-domain-grid/v1'
QUAL='Hypothetical Cartesian closure over exact input values already present in the pinned model. Input independence, feasibility, empirical completeness and adoption are not established. No new observation policy or source availability is asserted.'
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def state(outcomes):
    if not outcomes:return 'CONFLICTED'
    if any(x not in ('constraint_satisfied','constraint_refuted') for x in outcomes):return 'UNVERIFIED'
    if all(x=='constraint_satisfied' for x in outcomes):return 'SUPPORTED'
    if all(x=='constraint_refuted' for x in outcomes):return 'REFUTED'
    return 'UNDERDETERMINED'
def audit(case_text,pin,event_text):
    a=replay(case_text,pin,event_text);shape=alignment(case_text);c=bounded_load(case_text,262144,9);domains={};groups={};prepared=[]
    for w in sorted(c['worlds'],key=lambda x:x['id']):
        graph=bounded_load(w['graphText'],65536,12);r=json.loads(recompute(w['graphText']));receipts={x['id']:x for x in r['receipts']};values=[]
        for n in sorted((n for n in graph['nodes'] if n['kind']=='input'),key=lambda n:n['id']):
            v=receipts[n['id']]['outcome']['value'];d=domains.setdefault(n['id'],dict(dimension=n['dimension'],raw={}));d['raw'].setdefault(v,n['value']);values.append(v)
        values=tuple(values);groups.setdefault(values,[]).append(w['id']);prepared.append((w,graph,values))
    axes=[dict(id=i,dimension=d['dimension'],values=sorted(d['raw'],key=Fraction)) for i,d in domains.items()];size=prod(len(x['values']) for x in axes);missing=size-len(groups)
    base=dict(version=VERSION,caseDigest=pin,eventDigest=a['eventDigest'],schemaDigest=shape['schemaDigest'],baseline=dict(state=a['state'],survivingWorlds=a['report']['survivingWorlds']),axes=axes,gridSize=str(size),uniqueAssignments=len(groups),missingCount=str(missing),duplicateGroups=[g for g in groups.values() if len(g)>1],qualification=QUAL)
    if size>12:return dict(base,status='GRID_LIMIT_EXCEEDED',candidates=[],closureState=None)
    candidates=[]
    for values in product(*(x['values'] for x in axes)):
        if values in groups:continue
        w,g,old=min(prepared,key=lambda x:(sum(a!=b for a,b in zip(x[2],values)),x[0]['id']));graph=deepcopy(g);changes=[]
        for axis,prev,v in zip(axes,old,values):
            i=axis['id']
            if prev!=v:changes.append(dict(id=i,**{'from':prev,'to':v}))
            next(n for n in graph['nodes'] if n['id']==i)['value']=domains[i]['raw'][v]
        run=json.loads(recompute(compact(graph)));receipts={r['id']:r for r in run['receipts']};target=receipts[w['constraintId']];invalid=[]
        for o in c['offers']:
            v=receipts[o['nodeId']]['outcome']
            if not isinstance(v.get('value'),str) or v.get('dimension')!=o['dimension']:invalid.append(o['id'])
        blockers=[]
        for r in sorted(a['report']['activeEvidence'],key=lambda r:r['observationId']):
            expected=receipts[r['nodeId']]['outcome'].get('value')
            if expected!=r['value']:blockers.append(dict(observationId=r['observationId'],lineage=r['lineage'],expected=expected,observed=r['value']))
        candidates.append(dict(assignment=[dict(id=x['id'],value=v) for x,v in zip(axes,values)],nearestWorld=w['id'],changedInputs=changes,graphDigest=run['graphDigest'],targetReceiptDigest=target['receiptDigest'],decision=target['outcome']['status'],invalidOffers=sorted(invalid),blockers=blockers,compatible=None if invalid else not blockers))
    require(len(candidates)==missing)
    outcomes=[w['decision'] for w in a['report']['worlds'] if w['id'] in a['report']['survivingWorlds']]+[x['decision'] for x in candidates if x['compatible'] is True]
    closure='UNVERIFIED' if any(x['invalidOffers'] for x in candidates) else state(outcomes)
    return dict(base,status='MISSING_COMBINATIONS' if missing else 'CLOSED_OVER_OBSERVED_VALUES',candidates=candidates,closureState=closure)
def verify(bundle,pin):
    try:
        require(keys(bundle,('version','caseText','eventText','result')) and bundle['version']==VERSION)
        return canonical(audit(bundle['caseText'],pin,bundle['eventText']))==canonical(bundle['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,args[1]));print('VERIFIED hypothetical observed-domain closure');return
    require(len(args)==3 and args[0]=='--challenge');c=json.loads(fixture());c['worlds']=[w for w in c['worlds'] if w['id']!='load_30_cap_20'];pin=rawhash(compact(c))
    for path,expected in zip(args[1:],('UNDERDETERMINED','SUPPORTED')):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin));r=b['result'];require(r['baseline']['state']=='SUPPORTED' and r['status']=='MISSING_COMBINATIONS' and r['closureState']==expected and r['missingCount']=='1')
        variants=[]
        for k,v in (('status','CLOSED_OVER_OBSERVED_VALUES'),('gridSize','5'),('uniqueAssignments',6),('missingCount','0'),('axes',[]),('duplicateGroups',[['fake']]),('qualification','complete empirical model'),('closureState','REFUTED'),('eventDigest','sha256:'+'0'*64)):
            bad=deepcopy(b);bad['result'][k]=v;variants.append(bad)
        for k,v in (('assignment',[]),('nearestWorld','fake'),('changedInputs',[]),('decision','constraint_satisfied'),('compatible',not r['candidates'][0]['compatible']),('targetReceiptDigest','sha256:'+'0'*64),('invalidOffers',['invented'])):
            bad=deepcopy(b);bad['result']['candidates'][0][k]=v;variants.append(bad)
        for k in ('caseText','eventText'):
            bad=deepcopy(b);bad[k]+=' ';variants.append(bad)
        for bad in variants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,expected,'REJECTED',len(variants),'mutants')
if __name__=='__main__':main()
