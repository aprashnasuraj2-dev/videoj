#!/usr/bin/env python3
"""Independent receipt-only comparison, explicitly not a merged history."""
import sys
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import replay, fixture
from verify_proposal_challenge import attack, compact
VERSION='sutra-proposal-clash/v1'
QUAL='Hypothetical receipt-only set comparison under the same pinned model; historical withdrawal and availability are not applied in this separate test. No merged history, newly authorized source, next-observation availability, independence, source truth or adoption is established.'
def summary(r):
    return dict(state=r['state'],survivingWorlds=r['report']['survivingWorlds'],minimum=r['minimum'],repairs=r['repairs'],minimumObservationConflict=r['report'].get('conflict'))
def read(events,id):
    return next(x for x in reversed(events) if x['type']=='read' and x['observationId']==id)
def diagnose(case_text,pin,event_text,proposal_text):
    c=attack(case_text,pin,event_text,proposal_text)
    q=bounded_load(proposal_text,262144,5);a=bounded_load(event_text,262144,6);b=bounded_load(q['eventText'],262144,6)
    e=c['evidence'];common=[]
    for r in e['shared']:
        x=read(a,r['observationId']);y=read(b,r['observationId']);require(x['sourceText']==y['sourceText']);common.append(x)
    all_reads=sorted(common+[read(a,r['observationId']) for r in e['baselineOnly']]+[read(b,r['observationId']) for r in e['proposalOnly']],key=lambda x:x['observationId'])
    shared=replay(case_text,pin,compact(common));joint=replay(case_text,pin,compact(all_reads))
    require(joint['report']['survivingWorlds']==c['worlds']['shared'])
    require(set(c['baseline']['survivingWorlds'])|set(c['proposal']['survivingWorlds'])<=set(shared['report']['survivingWorlds']))
    kind='BRANCH_ALREADY_CONFLICTED' if 'CONFLICTED' in (c['baseline']['state'],c['proposal']['state']) else 'CROSS_BRANCH_CLASH' if joint['state']=='CONFLICTED' else 'JOINT_COMPATIBLE'
    u=e['unavailableSources'];ua=set(u['shared']+u['baselineOnly']);ub=set(u['shared']+u['proposalOnly'])
    return dict(version=VERSION,caseDigest=pin,proposalDigest=c['proposalDigest'],baselineEventDigest=c['baseline']['eventDigest'],proposalEventDigest=c['proposal']['eventDigest'],classification=kind,claim=c['claim'],baselineState=c['baseline']['state'],proposalState=c['proposal']['state'],sharedFinal=dict(observationIds=[x['observationId'] for x in common],**summary(shared)),jointFinal=dict(observationIds=[x['observationId'] for x in all_reads],**summary(joint)),unavailableInOtherBranch=dict(baselineReadings=[r['observationId'] for r in e['baselineOnly'] if r['sourceId'] in ub],proposalReadings=[r['observationId'] for r in e['proposalOnly'] if r['sourceId'] in ua]),qualification=QUAL)
def verify(bundle,pin):
    try:
        require(keys(bundle,('version','caseText','eventText','proposalText','result')) and bundle['version']==VERSION)
        return canonical(diagnose(bundle['caseText'],pin,bundle['eventText'],bundle['proposalText']))==canonical(bundle['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,args[1]));print('VERIFIED hypothetical receipt-only comparison');return
    require(len(args)==3 and args[0]=='--challenge');pin=rawhash(fixture())
    for path,expected in zip(args[1:],('CROSS_BRANCH_CLASH','JOINT_COMPATIBLE')):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin));r=b['result'];require(r['classification']==expected)
        require(r['jointFinal']['state']==('CONFLICTED' if expected=='CROSS_BRANCH_CLASH' else 'SUPPORTED'))
        variants=[]
        for k,v in (('classification','FORGED'),('qualification','authorized merged history'),('proposalDigest','sha256:'+'0'*64),('baselineEventDigest','sha256:'+'0'*64),('proposalEventDigest','sha256:'+'0'*64),('unavailableInOtherBranch',{})):
            bad=deepcopy(b);bad['result'][k]=v;variants.append(bad)
        for key,sub,val in (('claim','matches',not r['claim']['matches']),('sharedFinal','state','FORGED'),('jointFinal','observationIds',[]),('jointFinal','minimumObservationConflict',['fabricated']),('jointFinal','minimum',{}),('jointFinal','frontier',{'status':'invented'})):
            bad=deepcopy(b);bad['result'][key][sub]=val;variants.append(bad)
        for k in ('caseText','eventText','proposalText'):
            bad=deepcopy(b);bad[k]+=' ';variants.append(bad)
        for bad in variants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,expected,'REJECTED',len(variants),'mutants')
if __name__=='__main__':main()
