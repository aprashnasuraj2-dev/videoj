#!/usr/bin/env python3
"""Independent set-based diagnostic reconstruction for caller-pinned finite cases."""
import sys
from itertools import combinations
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys, recompute
from verify_conflict import bounded_load, require, reconstruct, rawhash
import json
import re
VERSION='sutra-pinned-investigation/v1'
QUAL='Conditional on the supplied finite case, declared source ancestry and exact pinned bytes. Neither model completeness, source truth, independence, freshness nor authorization to discard evidence is established.'
MAX=262144
def bounded_text(t):
    require(isinstance(t,str) and 1<=len(t.encode('utf-8'))<=MAX)
    return t
def state(ws,summaries):
    if not ws:return 'CONFLICTED'
    ds={summaries[w]['decision'] for w in ws}
    if not ds<={'constraint_satisfied','constraint_refuted'}:return 'UNVERIFIED'
    return 'SUPPORTED' if ds=={'constraint_satisfied'} else 'REFUTED' if ds=={'constraint_refuted'} else 'UNDERDETERMINED'
def replay(case_text,pin,event_text):
    require(isinstance(pin,str) and re.fullmatch(r'sha256:[a-f0-9]{64}',pin) and rawhash(bounded_text(case_text))==pin)
    events=bounded_load(bounded_text(event_text),MAX,6)
    c=bounded_load(case_text,MAX,9)
    report=reconstruct(case_text,events)
    summaries={w['id']:w for w in report['worlds']};universe=set(summaries)
    predictions={w['id']:{r['id']:r['outcome'].get('value') for r in json.loads(recompute(w['graphText']))['receipts']} for w in c['worlds']}
    active=report['activeEvidence'];roots=sorted(report['lineageGroups'])
    matches={r:{w for w in universe if all(predictions[w][o['nodeId']]==o['value'] for o in active if o['lineage']==r)} for r in roots}
    groups=[g for n in range(len(roots)+1) for g in combinations(roots,n)]
    def surviving(g):return sorted(universe.intersection(*(matches[r] for r in g)))
    minimum=dict(support=[],refutation=[],conflict=[])
    for g in groups:
        ws=surviving(g);s=state(ws,summaries)
        k={'SUPPORTED':'support','REFUTED':'refutation','CONFLICTED':'conflict'}.get(s)
        if k and not any(set(x['roots'])<=set(g) for x in minimum[k]):minimum[k].append(dict(roots=list(g),worlds=ws))
    full=surviving(roots);current=state(full,summaries);require(full==report['survivingWorlds'])
    repairs=[]
    if current=='CONFLICTED':
        for g in groups:
            ws=surviving([r for r in roots if r not in g])
            if ws and not any(set(x['remove'])<=set(g) for x in repairs):repairs.append(dict(remove=list(g),state=state(ws,summaries),worlds=ws))
    observation_values=[]
    for o in sorted(c['offers'],key=lambda x:x['id']):
        if not full or o['sourceId'] in report['unavailableSources'] or any(a['observationId']==o['id'] for a in active):continue
        vals=sorted({predictions[w][o['nodeId']] for w in full})
        observation_values.append(dict(id=o['id'],dimension=o['dimension'],outcomes=[dict(label='value_'+str(i),value=v,worlds=[w for w in full if predictions[w][o['nodeId']]==v]) for i,v in enumerate(vals)]))
    root_summary=[dict(root=r,sourceIds=sorted({o['sourceId'] for o in active if o['lineage']==r}),observationIds=sorted(o['observationId'] for o in active if o['lineage']==r)) for r in roots]
    return dict(version=VERSION,caseDigest=pin,eventDigest=rawhash(event_text),state=current,rootSummary=root_summary,minimum=minimum,repairs=repairs,observationValues=observation_values,report=report,qualification=QUAL)
def verify(bundle,pin):
    try:
        require(keys(bundle,('version','caseText','eventText','result')) and bundle['version']==VERSION)
        return canonical(replay(bundle['caseText'],pin,bundle['eventText']))==canonical(bundle['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):return False
def fixture():
    # Separate construction of the synthetic browser example; never trust its exported pin.
    scope='synthetic_capacity';dim=[0,0,0];worlds=[];sources=[];offers=[]
    def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
    for load in (10,20,30):
        for cap in (20,40):
            nodes=[dict(id=i,kind='input',value=str(v),dimension=dim,basis='Synthetic capacity assumption') for i,v in (('load',load),('capacity',cap))]
            nodes.append(dict(id='target',kind='constraint',op='le',args=['load','capacity']))
            worlds.append(dict(id=f'load_{load}_cap_{cap}',graphText=compact(dict(schemaVersion=1,nodes=nodes)),constraintId='target'))
    for i,node,v,root,obs,cost in (('meter','load','30/1','meter_root','read_meter',1),('mirror','load','30/1','meter_root','read_mirror',1),('alternate','load','10/1','alternate_root','read_alternate',2),('capacity_record','capacity','20/1','capacity_root','read_capacity',3)):
        t=compact(dict(version=1,sourceId=i,sourceVersion='v1',scope=scope,values={node:dict(value=v,dimension=dim)}))
        sources.append(dict(id=i,version='v1',digest=rawhash(t),lineage=root))
        offers.append(dict(id=obs,nodeId=node,sourceId=i,cost=cost,dimension=dim))
    return compact(dict(version=1,decisionId='load_within_capacity',scope=scope,costUnit='synthetic_effort',worlds=worlds,sources=sources,offers=offers))
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,32)
        require(verify(b,args[1]));print('VERIFIED conditional replay');return
    require(len(args)==4 and args[0]=='--challenge')
    pin=rawhash(fixture())
    for path,expected in zip(args[1:],('UNDERDETERMINED','CONFLICTED','REFUTED')):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,32)
        require(verify(b,pin) and b['result']['state']==expected)
        mutants=[]
        for field,value in (('state','FORGED'),('rootSummary',[]),('minimum',{}),('eventDigest','sha256:'+'0'*64),('qualification','verified fact')):
            bad=deepcopy(b);bad['result'][field]=value;mutants.append(bad)
        bad=deepcopy(b);bad['caseText']+=' ';mutants.append(bad)
        bad=deepcopy(b);bad['eventText']+=' ';mutants.append(bad)
        if b['result']['repairs']:
            bad=deepcopy(b);bad['result']['repairs']=[];mutants.append(bad)
        if b['result']['observationValues']:
            bad=deepcopy(b);bad['result']['observationValues'][0]['outcomes'][0]['value']='999/1';mutants.append(bad)
        for bad in mutants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,expected,'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
