#!/usr/bin/env python3
"""Independent replay of two untrusted histories under a single pinned case."""
import json
import sys
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import replay, alignment, fixture
VERSION='sutra-proposal-challenge/v1'
QUAL='Untrusted hypothetical proposal independently recomputed against the same pinned finite case. Agreement is not corroboration; divergence is not authorization to change evidence. No agent identity, source truth, freshness or adoption is established.'
STATES=('SUPPORTED','REFUTED','UNDERDETERMINED','CONFLICTED','UNVERIFIED')
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def diff(a,b):return dict(shared=sorted(set(a)&set(b)),baselineOnly=sorted(set(a)-set(b)),proposalOnly=sorted(set(b)-set(a)))
def summary(r):
    return dict(eventDigest=r['eventDigest'],state=r['state'],survivingWorlds=r['report']['survivingWorlds'],minimum=r['minimum'],repairs=r['repairs'],frontier=r['report']['frontier'],observationValues=r['observationValues'])
def attack(case_text,pin,event_text,proposal_text):
    q=bounded_load(proposal_text,262144,5)
    require(keys(q,('caseDigest','eventText','claimedState')) and q['caseDigest']==pin and isinstance(q['eventText'],str) and q['claimedState'] in STATES)
    a=replay(case_text,pin,event_text);b=replay(case_text,pin,q['eventText']);shape=alignment(case_text)
    ar,br=a['report'],b['report'];require(ar['worlds']==br['worlds'])
    ae=bounded_load(event_text,262144,6);be=bounded_load(q['eventText'],262144,6)
    prefix=0
    for x,y in zip(ae,be):
        if canonical(x)!=canonical(y):break
        prefix+=1
    common=replay(case_text,pin,compact(ae[:prefix]))
    aa={r['observationId']:r for r in ar['activeEvidence']};ba={r['observationId']:r for r in br['activeEvidence']}
    d=diff(aa,ba);require(all(aa[i]==ba[i] for i in d['shared']))
    worlds=diff(ar['survivingWorlds'],br['survivingWorlds']);opposite={a['state'],b['state']}=={'SUPPORTED','REFUTED'}
    require(not opposite or not worlds['shared'])
    evidence=dict(shared=[aa[i] for i in d['shared']],baselineOnly=[aa[i] for i in d['baselineOnly']],proposalOnly=[ba[i] for i in d['proposalOnly']],declaredRoots=diff(ar['lineageGroups'],br['lineageGroups']),unavailableSources=diff(ar['unavailableSources'],br['unavailableSources']))
    return dict(version=VERSION,caseDigest=pin,schemaDigest=shape['schemaDigest'],proposalDigest=rawhash(proposal_text),claim=dict(claimedState=q['claimedState'],recomputedState=b['state'],matches=q['claimedState']==b['state']),comparison='OPPOSITE_DECISIVE_STATES' if opposite else 'SAME_STATE' if a['state']==b['state'] else 'DIFFERENT_STATES',history=dict(commonEventCount=prefix,baselineEventCount=len(ae),proposalEventCount=len(be),commonPrefix=summary(common),baselineTail=ar['history'][prefix:],proposalTail=br['history'][prefix:]),evidence=evidence,worlds=worlds,baseline=summary(a),proposal=summary(b),qualification=QUAL)
def verify(bundle,pin):
    try:
        require(keys(bundle,('version','caseText','eventText','proposalText','result')) and bundle['version']==VERSION)
        return canonical(attack(bundle['caseText'],pin,bundle['eventText'],bundle['proposalText']))==canonical(bundle['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):return False
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        with Path(args[0]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,args[1]));print('VERIFIED conditional proposal challenge');return
    require(len(args)==3 and args[0]=='--challenge');pin=rawhash(fixture())
    for path,expected in zip(args[1:],(True,False)):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin));r=b['result'];require(r['claim']['matches'] is expected and r['baseline']['state']=='SUPPORTED' and r['proposal']['state']=='REFUTED' and r['comparison']=='OPPOSITE_DECISIVE_STATES' and r['history']['commonEventCount']==1)
        variants=[]
        for k,v in (('proposalDigest','sha256:'+'0'*64),('comparison','SAME_STATE'),('qualification','agent certified truth')):
            bad=deepcopy(b);bad['result'][k]=v;variants.append(bad)
        for key,sub,val in (('claim','matches',not expected),('claim','recomputedState','SUPPORTED'),('history','commonEventCount',2),('history','baselineTail',[]),('evidence','proposalOnly',[]),('evidence','declaredRoots',{}),('worlds','shared',['load_10_cap_20']),('proposal','state','SUPPORTED'),('proposal','minimum',{})):
            bad=deepcopy(b);bad['result'][key][sub]=val;variants.append(bad)
        for k in ('caseText','eventText','proposalText'):
            bad=deepcopy(b);bad[k]+=' ';variants.append(bad)
        for bad in variants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,'claim matches:',expected,'REJECTED',len(variants),'mutants')
if __name__=='__main__':main()
