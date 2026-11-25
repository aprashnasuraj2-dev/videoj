#!/usr/bin/env python3
"""Independent set/Fraction-based measurement relaxation; never evidence admission."""
import json
import sys
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
from verify import canonical, keys, recompute
from verify_conflict import bounded_load, require, rawhash, wire_value, frontier
from verify_pinned_investigation import replay, alignment, state, fixture
VERSION='sutra-measurement-sensitivity/v1'
QUAL='Hypothetical inclusive interval relaxation of admitted point readings in the same declared finite model. No measurement uncertainty, source truth, shared calibration, independence, freshness or permission to change evidence is established.'
def sensitivity(case_text,pin,event_text,request_text):
    q=bounded_load(request_text,4096,3)
    require(keys(q,('observationId','lower','upper')) and isinstance(q['observationId'],str))
    wire_value(q['lower']);wire_value(q['upper'])
    lo,hi=Fraction(q['lower']),Fraction(q['upper']);require(lo<=hi)
    original=replay(case_text,pin,event_text);shape=alignment(case_text);report=original['report']
    active=sorted(report['activeEvidence'],key=lambda x:x['observationId'])
    selected=next((o for o in active if o['observationId']==q['observationId']),None)
    require(selected is not None and lo<=Fraction(selected['value'])<=hi)
    cohort=[r['observationId'] for r in active if all(r[k]==selected[k] for k in ('lineage','nodeId','value','dimension'))]
    c=bounded_load(case_text,262144,9);worlds=sorted(c['worlds'],key=lambda w:w['id'])
    summaries={w['id']:w for w in report['worlds']}
    predictions={w['id']:{r['id']:r['outcome'] for r in json.loads(recompute(w['graphText']))['receipts']} for w in worlds}
    available=[o for o in sorted(c['offers'],key=lambda o:o['id']) if o['sourceId'] not in report['unavailableSources'] and all(r['observationId']!=o['id'] for r in active)]
    baseline=report['survivingWorlds']
    def variant(relaxed):
        blockers=[]
        for w in worlds:
            i=w['id'];bad=[]
            for r in active:
                v=predictions[i][r['nodeId']]['value']
                match=lo<=Fraction(v)<=hi if r['observationId'] in relaxed else v==r['value']
                if not match:bad.append(r['observationId'])
            blockers.append(dict(world=i,observations=bad))
        survivors=[b['world'] for b in blockers if not b['observations']]
        require(set(baseline)<=set(survivors))
        values=[]
        if survivors:
            for o in available:
                vs=sorted({predictions[w][o['nodeId']]['value'] for w in survivors})
                values.append(dict(id=o['id'],dimension=o['dimension'],outcomes=[dict(label='value_'+str(i),value=v,worlds=[w for w in survivors if predictions[w][o['nodeId']]['value']==v]) for i,v in enumerate(vs)]))
        plan=frontier(c,{w:summaries[w] for w in survivors},predictions,available) if survivors else None
        return dict(relaxed=relaxed,state=state(survivors,summaries),survivingWorlds=survivors,readmittedWorlds=[w for w in survivors if w not in baseline],blockers=blockers,frontier=plan,observationValues=values)
    single=variant([selected['observationId']]);shared=variant(cohort);require(set(single['survivingWorlds'])<=set(shared['survivingWorlds']))
    sel={k:selected[k] for k in ('observationId','lineage','nodeId','value','dimension')};sel.update(lower=q['lower'],upper=q['upper'])
    return dict(version=VERSION,caseDigest=pin,eventDigest=original['eventDigest'],schemaDigest=shape['schemaDigest'],requestDigest=rawhash(request_text),
                baseline=dict(state=original['state'],survivingWorlds=baseline),selected=sel,cohort=cohort,single=single,shared=shared,qualification=QUAL)
def verify(b,pin):
    try:
        require(keys(b,('version','caseText','eventText','requestText','result')) and b['version']==VERSION)
        return canonical(sensitivity(b['caseText'],pin,b['eventText'],b['requestText']))==canonical(b['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):return False
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,args[1]));print('VERIFIED hypothetical measurement policy');return
    require(len(args)==3 and args[0]=='--challenge')
    pin=rawhash(fixture())
    for path,expected in zip(args[1:],('CONFLICTED','REFUTED')):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin) and b['result']['baseline']['state']==expected)
        r=b['result'];require(r['cohort']==['read_meter','read_mirror'] and r['single']['state']==expected)
        require(r['shared']['state']==('SUPPORTED' if expected=='CONFLICTED' else 'UNDERDETERMINED'))
        variants=[]
        for k,v in (('cohort',['read_meter','read_mirror','read_alternate']),('qualification','observed uncertainty'),('eventDigest','sha256:'+'0'*64),('requestDigest','sha256:'+'0'*64)):
            bad=deepcopy(b);bad['result'][k]=v;variants.append(bad)
        for k,v in (('state','FORGED'),('readmittedWorlds',[]),('blockers',[]),('frontier',None)):
            bad=deepcopy(b);bad['result']['shared'][k]=v;variants.append(bad)
        bad=deepcopy(b);bad['requestText']=bad['requestText'].replace('10/1','31/1');variants.append(bad)
        bad=deepcopy(b);bad['eventText']+=' ';variants.append(bad)
        bad=deepcopy(b);bad['caseText']+=' ';variants.append(bad)
        for bad in variants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,expected,'REJECTED',len(variants),'mutants')
if __name__=='__main__':main()
