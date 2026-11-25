#!/usr/bin/env python3
"""Independent finite model-coverage counterexample reconstruction."""
import json
import sys
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys, recompute, ident
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import replay, alignment, fixture
VERSION='sutra-world-coverage-attack/v1'
QUAL='Hypothetical addition of one structurally aligned, nonduplicate input assignment. No empirical plausibility, model completeness, probability, evidence change or adoption is established.'
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def inputs(graph_text):
    graph=bounded_load(graph_text,65536,12)
    receipts={r['id']:r['outcome'] for r in json.loads(recompute(graph_text))['receipts']}
    vals=[dict(id=n['id'],value=receipts[n['id']]['value'],dimension=n['dimension']) for n in sorted(graph['nodes'],key=lambda n:n['id']) if n['kind']=='input']
    return vals,receipts
def attack(case_text,pin,event_text,request_text):
    q=bounded_load(request_text,4096,4)
    require(keys(q,('worldId','baseWorldId','overrides')) and ident(q['worldId']) and ident(q['baseWorldId']) and isinstance(q['overrides'],dict)
            and 1<=len(q['overrides'])<=256 and all(ident(k) and isinstance(v,str) for k,v in q['overrides'].items()))
    a=replay(case_text,pin,event_text);shape=alignment(case_text);c=bounded_load(case_text,262144,9)
    base=next((w for w in c['worlds'] if w['id']==q['baseWorldId']),None)
    require(base is not None and len(c['worlds'])<12 and all(w['id']!=q['worldId'] for w in c['worlds']))
    g=bounded_load(base['graphText'],65536,12);require(set(q['overrides'])<={n['id'] for n in g['nodes'] if n['kind']=='input'})
    for n in g['nodes']:
        if n['kind']=='input' and n['id'] in q['overrides']:n['value']=q['overrides'][n['id']]
    added=dict(id=q['worldId'],graphText=compact(g),constraintId=base['constraintId'])
    vals,receipts=inputs(added['graphText']);old=None
    for w in c['worlds']:
        existing,_=inputs(w['graphText']);require(existing!=vals)
        if w['id']==base['id']:old={n['id']:n['value'] for n in existing}
    changes=[dict(id=n['id'],**{'from':old[n['id']],'to':n['value']},dimension=n['dimension']) for n in vals if n['value']!=old[n['id']]]
    require(changes)
    c['worlds'].append(added);variant_text=compact(c);variant_pin=rawhash(variant_text)
    b=replay(variant_text,variant_pin,event_text);variant_shape=alignment(variant_text)
    require(a['eventDigest']==b['eventDigest'] and shape['schemaDigest']==variant_shape['schemaDigest'])
    ar,br=a['report'],b['report']
    for k in ('activeEvidence','history','unavailableSources'):require(ar[k]==br[k])
    require(ar['worlds']==[w for w in br['worlds'] if w['id']!=q['worldId']] and ar['survivingWorlds']==[w for w in br['survivingWorlds'] if w!=q['worldId']])
    blockers=[dict(observationId=r['observationId'],lineage=r['lineage'],nodeId=r['nodeId'],expected=receipts[r['nodeId']]['value'],observed=r['value']) for r in sorted(ar['activeEvidence'],key=lambda r:r['observationId']) if receipts[r['nodeId']]['value']!=r['value']]
    compatible=q['worldId'] in br['survivingWorlds'];require(compatible==(not blockers))
    candidate=dict(id=q['worldId'],baseWorldId=q['baseWorldId'],changes=changes,compatible=compatible,decision=next(w['decision'] for w in br['worlds'] if w['id']==q['worldId']),blockers=blockers)
    variant=dict(caseDigest=variant_pin,state=b['state'],survivingWorlds=br['survivingWorlds'],minimum=b['minimum'],repairs=b['repairs'],frontier=br['frontier'],observationValues=b['observationValues'])
    return dict(version=VERSION,caseDigest=pin,eventDigest=a['eventDigest'],schemaDigest=shape['schemaDigest'],requestDigest=rawhash(request_text),baseline=dict(state=a['state'],survivingWorlds=ar['survivingWorlds']),candidate=candidate,variantCaseText=variant_text,variant=variant,qualification=QUAL)
def verify(bundle,pin):
    try:
        require(keys(bundle,('version','caseText','eventText','requestText','result')) and bundle['version']==VERSION)
        return canonical(attack(bundle['caseText'],pin,bundle['eventText'],bundle['requestText']))==canonical(bundle['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,args[1]));print('VERIFIED conditional coverage attack');return
    require(len(args)==3 and args[0]=='--challenge')
    pin=rawhash(fixture())
    for path,expected in zip(args[1:],('UNDERDETERMINED','SUPPORTED')):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin) and b['result']['baseline']['state']=='SUPPORTED' and b['result']['variant']['state']==expected)
        require(b['result']['candidate']['compatible']==(expected=='UNDERDETERMINED'))
        variants=[]
        for key,val in (('variantCaseText','{}'),('eventDigest','sha256:'+'0'*64),('requestDigest','sha256:'+'0'*64),('qualification','empirically complete')):
            bad=deepcopy(b);bad['result'][key]=val;variants.append(bad)
        for key,val in (('state','FORGED'),('caseDigest','sha256:'+'0'*64),('survivingWorlds',[]),('frontier',None)):
            bad=deepcopy(b);bad['result']['variant'][key]=val;variants.append(bad)
        bad=deepcopy(b);bad['result']['candidate']['compatible']=not bad['result']['candidate']['compatible'];variants.append(bad)
        bad=deepcopy(b);bad['result']['candidate']['changes']=[];variants.append(bad)
        bad=deepcopy(b);bad['requestText']+=' ';variants.append(bad)
        bad=deepcopy(b);bad['caseText']+=' ';variants.append(bad)
        bad=deepcopy(b);bad['eventText']+=' ';variants.append(bad)
        for bad in variants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,expected,'REJECTED',len(variants),'mutants')
if __name__=='__main__':main()
