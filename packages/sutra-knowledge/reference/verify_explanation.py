#!/usr/bin/env python3
"""Independent conditional-root support and next-observation explanation replay.
Uses sets over the independently reconstructed eight-world case, not JS masks.
No source truth, independence, or permission to discard evidence is certified.
"""
import sys
from copy import deepcopy
from itertools import combinations
from pathlib import Path
from verify import canonical, keys
from verify_conflict import bounded_load, require
from verify_debugger import anchor, replay, state, CLAIMS

VERSION = 'sutra-debugger-explanation/v1'
QUAL = ('A consistent evidence subset can support or refute a claim even when the full evidence is contradictory. '
        'Subset support is conditional, not authorization to discard conflicting evidence. Declared roots are not certified independent.')


def explain(result):
    universe = {w['id'] for w in anchor()[0]['worlds']}
    roots = sorted(result['groups'])
    require(len(universe) == 8 and len(roots) <= 4)
    active = result['report']['activeEvidence']
    compatible = {root: {w for w in universe if all(
        int(w[{'a': 1, 'b': 2, 'c': 3}[e['nodeId']]]) == int(e['value'].split('/')[0])
        for e in active if e['lineage'] == root)} for root in roots}
    claims = {k: dict(globalState=result['claims'][k]['state'], conditionalSupport=[], conditionalRefutation=[]) for k in CLAIMS}
    conflicts = []
    for size in range(len(roots) + 1):
        for group in combinations(roots, size):
            group_set = set(group)
            worlds = sorted(universe.intersection(*(compatible[r] for r in group)))
            if not worlds:
                if not any(set(c) <= group_set for c in conflicts):
                    conflicts.append(list(group))
                continue
            for k in CLAIMS:
                s = state(worlds, k)
                bucket = 'conditionalSupport' if s == 'SUPPORTED' else 'conditionalRefutation' if s == 'REFUTED' else None
                if bucket and not any(set(c['roots']) <= group_set for c in claims[k][bucket]):
                    claims[k][bucket].append(dict(roots=list(group), survivingWorlds=worlds))
    frontier = result['report']['frontier']
    if result['conflict']:
        next_action = dict(kind='adjudicate_conflict', conflict=result['conflict'], minimumRepairs=[
            dict(remove=c['removed'], states={k:c['claims'][k]['state'] for k in CLAIMS}) for c in result['diagnostics']['minimumCuts']])
    elif frontier and frontier['status'] == 'conditional_observation_plan':
        p = frontier['plan']
        next_action = dict(kind='observe', observationId=p['observationId'], cost=p['cost'], worstCost=p['worstCost'], bestCost=p['bestCost'], branches=[
            dict(outcome=b['outcome'], worlds=b['next']['worlds'], kind=b['next']['kind'], decision=b['next'].get('decision'), observationId=b['next'].get('observationId'), worstRemainingCost=b['next']['worstCost']) for b in p['branches']])
    elif frontier and frontier['status'] == 'insufficient_observations':
        next_action = dict(kind='impossible_with_available_observations', witness=frontier['witness'])
    elif frontier and frontier['status'] == 'invariant_decision':
        next_action = dict(kind='decision', decision=frontier['plan']['decision'])
    else:
        next_action = dict(kind='unverified')
    return dict(version=VERSION, caseDigest=result['caseDigest'], historyDigest=result['historyDigest'], claims=claims,
                minimalConflicts=conflicts, next=next_action, qualification=QUAL)


def verify(bundle):
    try:
        require(keys(bundle, ('version','events','explanation')) and bundle['version'] == VERSION)
        return canonical(explain(replay(bundle['events']))) == canonical(bundle['explanation'])
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError, UnicodeError, RecursionError):
        return False


def main():
    # Browser-produced conflicting, opposite conditional supports, planned and
    # impossible states must replay. Negative controls mutate the wire result.
    expected = ['adjudicate_conflict','adjudicate_conflict','observe','impossible_with_available_observations']
    require(len(sys.argv) == len(expected)+1)
    for i, (path, kind) in enumerate(zip(sys.argv[1:], expected)):
        with Path(path).open(encoding='utf-8') as f:
            bundle = bounded_load(f.read(262145), 262144, 24)
        require(verify(bundle) and bundle['explanation']['next']['kind'] == kind)
        e=bundle['explanation']
        if i==0:
            require(e['claims']['control_ok']['globalState']=='CONFLICTED')
            require([x['roots'] for x in e['claims']['control_ok']['conditionalSupport']]==[['sample_control']])
        elif i==1:
            require([x['roots'] for x in e['claims']['target']['conditionalSupport']]==[['sample_one']])
            require([x['roots'] for x in e['claims']['target']['conditionalRefutation']]==[['sample_three','sample_two']])
        elif i==2:
            require(e['next']['observationId']=='read_b' and e['next']['worstCost']==4)
        else:
            require(len(e['next']['witness'])==2)
        variants=[]
        for field, value in (('historyDigest','sha256:'+'0'*64),('qualification','verified truth'),('claims',{}),('next',{'kind':'decision','decision':'constraint_satisfied'})):
            bad=deepcopy(bundle);bad['explanation'][field]=value;variants.append(bad)
        bad=deepcopy(bundle);bad['events'][0]['sourceText']+=' ';variants.append(bad)
        if e['minimalConflicts']:
            bad=deepcopy(bundle);bad['explanation']['minimalConflicts']=[];variants.append(bad)
        if e['claims']['target']['conditionalSupport']:
            bad=deepcopy(bundle);bad['explanation']['claims']['target']['conditionalSupport'][0]['roots'].append('copy_01');variants.append(bad)
        if e['claims']['target']['conditionalRefutation']:
            bad=deepcopy(bundle);bad['explanation']['claims']['target']['conditionalRefutation']=[];variants.append(bad)
        if kind=='observe':
            bad=deepcopy(bundle);bad['explanation']['next']['worstCost']-=1;variants.append(bad)
            bad=deepcopy(bundle);bad['explanation']['next']['branches']=[];variants.append(bad)
        if kind=='impossible_with_available_observations':
            bad=deepcopy(bundle);bad['explanation']['next']['witness']=['w001','w001'];variants.append(bad)
        for bad in variants:require(not verify(bad))
        print('ACCEPTED',Path(path).name,kind,'REJECTED',len(variants),'mutations')


if __name__=='__main__':main()
