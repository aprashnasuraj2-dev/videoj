#!/usr/bin/env python3
"""Independent manifest-based oracle: graph traversal and combinations, not JS audit implementation."""
import json,sys,itertools,hashlib
from pathlib import Path
from collections import Counter
def source(s):
    fields=s.split(':');i=fields[0];return i,fields[1] if len(fields)>1 else i,fields[2] if len(fields)>2 else i
def target(t):
    rel=t.split('@')[0];parts=rel.split(':');return parts[0],parts[1] if len(parts)>1 else 's'
def components(spec,mode):
    rows=[source(s) for s in spec];neighbors={i:set() for i,_,_ in rows}
    for (i,l,b),(j,m,c) in itertools.combinations(rows,2):
        if (mode in ('cohort','lineage') and l==m) or (mode=='cohort' and b==c):neighbors[i].add(j);neighbors[j].add(i)
    groups=[];remaining=set(neighbors)
    while remaining:
        start=min(remaining);visited={start};pending=[start]
        while pending:
            for nxt in neighbors[pending.pop()]-visited:visited.add(nxt);pending.append(nxt)
        groups.append(''.join(sorted(visited)));remaining-=visited
    return groups
def oracle(case,mode):
    groups=components(case['sources'],mode);owner={s:g[0] for g in groups for s in g}
    edges=[{owner[s] for s in pair if s!='q'} for pair,state in map(target,case['targets']) if state in ('s','r')]
    if not edges:return dict(components=groups,cuts=[],status='NO_DECISIVE_TARGETS')
    if any(not e for e in edges):return dict(components=groups,cuts=[],status='NO_EXTERNAL_COHORT_CUT_COVERS_ALL_TARGETS')
    roots=sorted(g[0] for g in groups)
    for n in range(1,len(roots)+1):
        cuts=[''.join(x) for x in itertools.combinations(roots,n) if all(set(x)&e for e in edges)]
        if cuts:return dict(components=groups,cuts=sorted(cuts),status='MINIMUM_DECLARED_COHORT_CUT_FOUND')
    raise AssertionError('unreachable')
def main():
    raw=(Path(__file__).parent/'ancestry-development-cases.json').read_bytes()
    assert hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()=='0af4985a8c32eaef7a9073f5033b4d875f1bd774'
    cases=json.loads(raw)['cases'];actual=json.load(sys.stdin)
    assert actual['caseCount']==len(cases)==30
    results={r['id']:r for r in actual['results']};assert len(results)==30
    counts=Counter();over=[]
    for c in cases:
        r=results[c['id']];expected=c['expected'];model=oracle(c,'cohort')
        assert model==expected==r['observed'],(c['id'],model,expected,r['observed'])
        report=r['report'];assert report['decisionAuthority']=='NONE'
        assert all(g['independence']=='NOT_ESTABLISHED' for g in report['cohorts'])
        assert report['counts']['conservativeCohorts']==len(model['components'])
        for mode in ('artifact','lineage'):
            baseline=oracle(c,mode)
            if baseline['components']!=model['components']:counts[mode+'ComponentMismatch']+=1
            if baseline['cuts'] and model['cuts'] and len(baseline['cuts'][0])>len(model['cuts'][0]):counts[mode+'CutOverestimate']+=1;over.append(dict(id=c['id'],baseline=mode,naiveMinimum=len(baseline['cuts'][0]),cohortMinimum=len(model['cuts'][0])))
        counts[model['status']]+=1
    print(json.dumps(dict(profile='sutra-ancestry-independent-development/v1',cases=30,matched=30,counts=dict(counts),overestimates=over,qualification='Independent oracle implementation, same developer-specified manifest and declared graph assumptions; no empirical source independence or real failure probability.')))
if __name__=='__main__':main()
