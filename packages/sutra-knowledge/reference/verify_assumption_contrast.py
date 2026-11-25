#!/usr/bin/env python3
"""Independent reconstruction of discrete interventions from the pinned case and history."""
import json
import sys
from copy import deepcopy
from pathlib import Path
from verify import canonical, keys, recompute
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import replay, alignment, fixture
from verify_coverage_grid import audit as grid_audit, compact
VERSION='sutra-assumption-contrast/v1'
QUAL='Exact discrete contrast relative to surviving declared anchors and represented input values. Model-only changes may contradict active readings; evidence-compatible means not excluded by admitted readings, not feasible, causal, independent, probable or recommended. A finite incomplete grid cannot establish absence of a reversal. No case, observation, availability or capsule mutation.'
def decisive(s):return s in ('constraint_satisfied','constraint_refuted')
def analyze(anchor,rows,axes,complete):
    others=[]
    for row in rows:
        if row is anchor:continue
        changes=[dict(id=axis['id'],**{'from':a,'to':b}) for axis,a,b in zip(axes,anchor['values'],row['values']) if a!=b]
        others.append((row,changes))
    def opposite(x):return decisive(x[0]['decision']) and x[0]['decision']!=anchor['decision']
    singles=[x for x in others if len(x[1])==1]
    expected=sum(len(a['values'])-1 for a in axes)
    one_flip=[x for x in singles if opposite(x)]
    joint_flip=[x for x in others if len(x[1])>1 and opposite(x)]
    def witness(x):
        r,c=x
        return dict(worldIds=r['worldIds'],origin=r['origin'],assignment=r['values'],decision=r['decision'],compatible=r['compatible'],changes=c,blockers=r['blockers'],invalidOffers=r['invalidOffers'])
    def frontier(xs):
        # Enumerate each candidate's exact intervention set and compare every pair,
        # not the JavaScript ordered greedy elimination implementation.
        sets=[frozenset((c['id'],c['to']) for c in x[1]) for x in xs]
        minimal=[x for x,s in zip(xs,sets) if not any(t<s for t in sets)]
        minimal.sort(key=lambda x:(len(x[1]),compact(x[1])))
        return dict(count=len(xs),minimumChangedInputs=min((len(x[1]) for x in xs),default=None),minimalInterventions=[witness(x) for x in minimal])
    assessment='INCONCLUSIVE'
    if one_flip:assessment='SINGLE_FACTOR_FLIP_EXISTS'
    elif complete and len(singles)==expected and all(decisive(x[0]['decision']) for x in singles):
        if joint_flip:assessment='INTERACTION_ONLY_WITHIN_OBSERVED_DOMAINS'
        elif all(decisive(x[0]['decision']) for x in others):assessment='NO_FLIP_FOUND_IN_COMPLETE_GRID'
    return dict(anchor=dict(worldIds=anchor['worldIds'],assignment=anchor['values'],decision=anchor['decision']),oneFactor=dict(expected=expected,evaluated=len(singles),unresolved=sum(not decisive(x[0]['decision']) for x in singles),opposite=len(one_flip),assessment=assessment),modelContrast=frontier([x for x in others if opposite(x)]),evidenceCompatibleContrast=frontier([x for x in others if opposite(x) and x[0]['compatible'] is True]),evidenceExcludedContrast=frontier([x for x in others if opposite(x) and x[0]['compatible'] is False]),admissionBlockedContrast=frontier([x for x in others if opposite(x) and x[0]['compatible'] is None]),unresolvedAssignments=[witness(x) for x in others if not decisive(x[0]['decision']) or x[0]['compatible'] is None])
def audit(case_text,pin,event_text):
    base=replay(case_text,pin,event_text);shape=alignment(case_text);grid=grid_audit(case_text,pin,event_text)
    c=bounded_load(case_text,262144,9);groups={}
    for w in sorted(c['worlds'],key=lambda x:x['id']):
        receipts={r['id']:r['outcome'] for r in json.loads(recompute(w['graphText']))['receipts']}
        values=[receipts[a['id']]['value'] for a in grid['axes']]
        blockers=[]
        for r in sorted(base['report']['activeEvidence'],key=lambda r:r['observationId']):
            expected=receipts[r['nodeId']].get('value')
            if expected!=r['value']:blockers.append(dict(observationId=r['observationId'],lineage=r['lineage'],expected=expected,observed=r['value']))
        compatible=w['id'] in base['report']['survivingWorlds'];require(compatible==(not blockers))
        key=tuple(values);decision=receipts[w['constraintId']]['status']
        if key in groups:
            row=groups[key];require(row['decision']==decision and row['compatible']==compatible and row['blockers']==blockers);row['worldIds'].append(w['id'])
        else:groups[key]=dict(worldIds=[w['id']],values=values,origin='declared',decision=decision,compatible=compatible,blockers=blockers,invalidOffers=[])
    for x in grid['candidates']:
        values=[a['value'] for a in x['assignment']];key=tuple(values);require(key not in groups)
        groups[key]=dict(worldIds=[],values=values,origin='hypothetical',decision=x['decision'],compatible=x['compatible'],blockers=x['blockers'],invalidOffers=x['invalidOffers'])
    rows=sorted(groups.values(),key=lambda r:compact(r['values']));complete=grid['status']!='GRID_LIMIT_EXCEEDED'
    require(not complete or len(rows)==int(grid['gridSize']))
    return dict(version=VERSION,caseDigest=pin,eventDigest=base['eventDigest'],schemaDigest=shape['schemaDigest'],baselineState=base['state'],axes=grid['axes'],gridStatus=grid['status'],gridSize=grid['gridSize'],assignmentsEvaluated=len(rows),completeOverObservedValues=complete,anchors=[analyze(r,rows,grid['axes'],complete) for r in rows if r['origin']=='declared' and r['compatible'] and decisive(r['decision'])],qualification=QUAL)
def verify(b,pin):
    try:
        require(keys(b,('version','caseText','eventText','result')) and b['version']==VERSION)
        return canonical(audit(b['caseText'],pin,b['eventText']))==canonical(b['result'])
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
def interaction_fixture():
    c=json.loads(fixture());c['worlds']=[w for w in c['worlds'] if w['id']!='load_30_cap_40']
    for w in c['worlds']:
        g=json.loads(w['graphText']);target=g['nodes'].pop()
        g['nodes'].extend([dict(id='limit',kind='input',value='900',dimension=[0,0,0],basis='Synthetic product limit'),dict(id='product',kind='derive',op='mul',args=['load','capacity'])]);target['args']=['product','limit'];g['nodes'].append(target);w['graphText']=compact(g)
    return compact(c)
def main():
    args=sys.argv[1:]
    if len(args)==2 and args[0]!='--challenge':
        b=bounded_load(Path(args[0]).read_text(encoding='utf-8'),1048576,40);require(verify(b,args[1]));print('VERIFIED conditional discrete contrast');return
    require(len(args)==3 and args[0]=='--challenge');pin=rawhash(interaction_fixture())
    for filename,compatible in zip(args[1:],(True,False)):
        with Path(filename).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin));r=b['result'];idx=next(i for i,a in enumerate(r['anchors']) if 'load_10_cap_20' in a['anchor']['worldIds']);a=r['anchors'][idx]
        require(r['baselineState']=='SUPPORTED' and r['gridSize']=='6' and a['oneFactor']['assessment']=='INTERACTION_ONLY_WITHIN_OBSERVED_DOMAINS' and a['modelContrast']['minimumChangedInputs']==2 and a['evidenceCompatibleContrast']['count']==int(compatible) and a['evidenceExcludedContrast']['count']==int(not compatible))
        mutants=[]
        for key,value in (('baselineState','REFUTED'),('completeOverObservedValues',False),('gridSize','5'),('assignmentsEvaluated',0),('axes',[]),('qualification','empirical guarantee'),('eventDigest','sha256:'+'0'*64)):
            bad=deepcopy(b);bad['result'][key]=value;mutants.append(bad)
        for key,value in (('modelContrast',{}),('oneFactor',{}),('evidenceCompatibleContrast',{}),('evidenceExcludedContrast',{}),('admissionBlockedContrast',{}),('unresolvedAssignments',[{}])):
            bad=deepcopy(b);bad['result']['anchors'][idx][key]=value;mutants.append(bad)
        for key,value in (('changes',[]),('origin','declared'),('compatible',not compatible),('assignment',[]),('decision','constraint_satisfied')):
            bad=deepcopy(b);bad['result']['anchors'][idx]['modelContrast']['minimalInterventions'][0][key]=value;mutants.append(bad)
        for key in ('caseText','eventText'):
            bad=deepcopy(b);bad[key]+=' ';mutants.append(bad)
        for bad in mutants:require(not verify(bad,pin))
        print('ACCEPTED',Path(filename).name,'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
