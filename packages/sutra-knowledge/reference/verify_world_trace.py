#!/usr/bin/env python3
"""Independent fixed-model world trace from anchored events, not producer masks."""
import sys
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys
from verify_conflict import bounded_load, require
from verify_debugger import replay, anchor

VERSION='sutra-debugger-world-trace/v1'
QUAL='All eight worlds belong to the declared synthetic model. A world survives exactly when every active computational observation agrees. Blocking roots are hypothetical withdrawal dependencies, not adjudication or permission to discard evidence. Counts are not probabilities.'

def trace(result):
    active=sorted(result['report']['activeEvidence'],key=lambda x:x['observationId'])
    worlds=[]
    for model in anchor()[0]['worlds']:
        w=model['id']
        assumptions=dict(zip(('a','b','c'),(v+'/1' for v in w[1:])))
        checks=[dict(observationId=o['observationId'],lineage=o['lineage'],variable=o['nodeId'],
                     expectedValue=assumptions[o['nodeId']],observedValue=o['value'],
                     compatible=assumptions[o['nodeId']]==o['value']) for o in active]
        blockers=sorted({c['lineage'] for c in checks if not c['compatible']})
        decisions=dict(target='constraint_satisfied' if int(w[1])+int(w[2])<=1 else 'constraint_refuted',
                       control_ok='constraint_satisfied' if w[3]=='1' else 'constraint_refuted')
        worlds.append(dict(id=w,assumptions=assumptions,decisions=decisions,survives=not blockers,blockingRoots=blockers,checks=checks))
    require([w['id'] for w in worlds if w['survives']]==result['claims']['target']['survivingWorlds']==result['claims']['control_ok']['survivingWorlds'])
    return dict(version=VERSION,caseDigest=result['caseDigest'],historyDigest=result['historyDigest'],worlds=worlds,qualification=QUAL)

def verify(bundle):
    try:
        require(keys(bundle,('version','events','trace')) and bundle['version']==VERSION)
        return canonical(trace(replay(bundle['events'])))==canonical(bundle['trace'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):
        return False

def main():
    expected=[['w001','w011'],['w001','w011','w101','w111'],['w001','w011'],[],['w111']]
    require(len(sys.argv)==len(expected)+1)
    first=None
    for i,(path,alive) in enumerate(zip(sys.argv[1:],expected)):
        with Path(path).open(encoding='utf-8') as f:
            bundle=bounded_load(f.read(262145),262144,24)
        require(verify(bundle))
        t=bundle['trace'];worlds=t['worlds']
        require([w['id'] for w in worlds if w['survives']]==alive)
        if i==0:first=worlds
        if i==2:require(worlds==first) # nine copies do not alter any world check
        if i==3:
            require(next(w for w in worlds if w['id']=='w001')['blockingRoots']==['sample_two'])
            require(next(w for w in worlds if w['id']=='w111')['blockingRoots']==['sample_one'])
        mutants=[]
        for field,value in (('caseDigest','sha256:'+'0'*64),('historyDigest','sha256:'+'0'*64),('qualification','proved empirical truth')):
            bad=deepcopy(bundle);bad['trace'][field]=value;mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'][0]['survives']=not worlds[0]['survives'];mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'][0]['blockingRoots']=[] if worlds[0]['blockingRoots'] else ['sample_one'];mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'][0]['assumptions']['a']='2/1';mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'][0]['decisions']['target']='constraint_refuted';mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'].reverse();mutants.append(bad)
        bad=deepcopy(bundle);bad['trace']['worlds'][0]['checks'][0]['compatible']=not worlds[0]['checks'][0]['compatible'];mutants.append(bad)
        bad=deepcopy(bundle);bad['events'][0]['sourceText']+=' ';mutants.append(bad)
        for bad in mutants:require(not verify(bad))
        print('ACCEPTED',Path(path).name,'surviving',len(alive),'REJECTED',len(mutants),'mutations')

if __name__=='__main__':main()
